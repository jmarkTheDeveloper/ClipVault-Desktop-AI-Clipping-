use std::ffi::CStr;
use std::fs;
use std::os::raw::c_char;
use std::path::Path;
use std::slice;
use std::time::{Duration, SystemTime};

/// Returns the version code of the ClipVault Rust Native Accelerator (e.g. 100 = v1.0.0).
#[no_mangle]
pub extern "C" fn clipvault_rust_version() -> u32 {
    100
}

/// Zero-allocation, in-place RGBA-over-RGB alpha compositor.
///
/// Blends a cropped region of an RGBA source buffer (`overlay_ptr`, shape: `ov_h x ov_w x 4`, uint8)
/// directly onto a target RGB video frame (`frame_ptr`, shape: `frame_h x frame_w x 3`, uint8)
/// at the bounding box `[y1..y2, x1..x2]` using exact fixed-point integer arithmetic:
/// `out = (fg * alpha + bg * (255 - alpha) + 128) >> 8`
///
/// Zero heap allocations, zero intermediate array copies.
#[no_mangle]
pub unsafe extern "C" fn blend_rgba_over_rgb_inplace(
    frame_ptr: *mut u8,
    frame_h: usize,
    frame_w: usize,
    overlay_ptr: *const u8,
    ov_h: usize,
    ov_w: usize,
    dst_y1: usize,
    dst_x1: usize,
    src_y1: usize,
    src_x1: usize,
    crop_h: usize,
    crop_w: usize,
) -> i32 {
    if frame_ptr.is_null() || overlay_ptr.is_null() {
        return -1;
    }
    if crop_h == 0 || crop_w == 0 {
        return 0;
    }
    if dst_y1 + crop_h > frame_h
        || dst_x1 + crop_w > frame_w
        || src_y1 + crop_h > ov_h
        || src_x1 + crop_w > ov_w
    {
        return -2;
    }

    let frame_len = frame_h.saturating_mul(frame_w).saturating_mul(3);
    let ov_len = ov_h.saturating_mul(ov_w).saturating_mul(4);
    let frame = slice::from_raw_parts_mut(frame_ptr, frame_len);
    let overlay = slice::from_raw_parts(overlay_ptr, ov_len);

    let frame_row_stride = frame_w * 3;
    let ov_row_stride = ov_w * 4;

    for row in 0..crop_h {
        let f_row_offset = (dst_y1 + row) * frame_row_stride + dst_x1 * 3;
        let o_row_offset = (src_y1 + row) * ov_row_stride + src_x1 * 4;

        let f_row = &mut frame[f_row_offset..f_row_offset + crop_w * 3];
        let o_row = &overlay[o_row_offset..o_row_offset + crop_w * 4];

        for col in 0..crop_w {
            let o_idx = col * 4;
            let alpha = o_row[o_idx + 3] as u32;

            // Fast path: completely transparent pixel (common in caption bounding boxes)
            if alpha == 0 {
                continue;
            }

            let f_idx = col * 3;
            // Fast path: completely opaque pixel
            if alpha == 255 {
                f_row[f_idx] = o_row[o_idx];
                f_row[f_idx + 1] = o_row[o_idx + 1];
                f_row[f_idx + 2] = o_row[o_idx + 2];
                continue;
            }

            let inv_alpha = 255 - alpha;
            let fg_r = o_row[o_idx] as u32;
            let fg_g = o_row[o_idx + 1] as u32;
            let fg_b = o_row[o_idx + 2] as u32;

            let bg_r = f_row[f_idx] as u32;
            let bg_g = f_row[f_idx + 1] as u32;
            let bg_b = f_row[f_idx + 2] as u32;

            f_row[f_idx] = ((fg_r * alpha + bg_r * inv_alpha + 128) >> 8) as u8;
            f_row[f_idx + 1] = ((fg_g * alpha + bg_g * inv_alpha + 128) >> 8) as u8;
            f_row[f_idx + 2] = ((fg_b * alpha + bg_b * inv_alpha + 128) >> 8) as u8;
        }
    }

    0
}

/// Critically-damped 2nd-order Spring-Damper trajectory solver with continuous deadzone anchoring.
///
/// Solves the virtual camera trajectory across `n` samples in native machine code.
#[no_mangle]
pub unsafe extern "C" fn solve_spring_damper_1d(
    targets_ptr: *const f64,
    out_ptr: *mut f64,
    n: usize,
    dt: f64,
    stiffness: f64,
    damping: f64,
    deadzone_px: f64,
    substeps: usize,
) -> i32 {
    if targets_ptr.is_null() || out_ptr.is_null() || n == 0 {
        return -1;
    }

    let targets = slice::from_raw_parts(targets_ptr, n);
    let out = slice::from_raw_parts_mut(out_ptr, n);

    let steps = if substeps == 0 { 4 } else { substeps };
    let sub_dt = dt / (steps as f64);

    let mut pos = targets[0];
    let mut vel = 0.0_f64;
    let mut anchor = targets[0];
    out[0] = pos;

    for i in 1..n {
        let raw_t = targets[i];
        let diff = raw_t - anchor;
        if diff.abs() > deadzone_px {
            // Continuous boundary shift (zero step-discontinuity)
            anchor = raw_t - diff.signum() * deadzone_px;
        }

        for _ in 0..steps {
            let force = stiffness * (anchor - pos) - damping * vel;
            vel += force * sub_dt;
            pos += vel * sub_dt;
        }
        out[i] = pos;
    }

    0
}

fn purge_dir_recursive(dir: &Path, min_age: Duration, is_root: bool) -> u64 {
    let mut freed_bytes: u64 = 0;
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return 0,
    };

    let now = SystemTime::now();
    let media_exts = [
        "mp4", "wav", "m4a", "webm", "mkv", "part", "ytdl", "temp", "tmp", "aac", "mp3",
    ];

    for entry in entries.flatten() {
        let path = entry.path();
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let is_old_enough = if min_age.is_zero() {
            true
        } else {
            match meta.modified() {
                Ok(mtime) => now.duration_since(mtime).unwrap_or(Duration::ZERO) >= min_age,
                Err(_) => false,
            }
        };

        if meta.is_dir() {
            let dir_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default();
            if !is_root || dir_name.starts_with("task_") {
                freed_bytes += purge_dir_recursive(&path, min_age, false);
                if is_old_enough {
                    let _ = fs::remove_dir(&path);
                }
            }
        } else if meta.is_file() && is_old_enough {
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_ascii_lowercase())
                .unwrap_or_default();
            let fname = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default();

            if media_exts.contains(&ext.as_str())
                || fname.starts_with("temp_")
                || fname.starts_with("full_source")
                || fname.starts_with("chunk_")
            {
                let size = meta.len();
                if fs::remove_file(&path).is_ok() {
                    freed_bytes += size;
                }
            }
        }
    }

    freed_bytes
}

/// Fast native directory sweeper that deletes stale temporary media files and task_* folders
/// inside `temp_dir_utf8` older than `min_age_secs` seconds.
/// Returns total bytes freed on disk.
#[no_mangle]
pub unsafe extern "C" fn purge_temp_directory_native(
    temp_dir_utf8: *const c_char,
    min_age_secs: u64,
) -> u64 {
    if temp_dir_utf8.is_null() {
        return 0;
    }
    let c_str = match CStr::from_ptr(temp_dir_utf8).to_str() {
        Ok(s) => s,
        Err(_) => return 0,
    };
    let root = Path::new(c_str);
    if !root.exists() || !root.is_dir() {
        return 0;
    }
    purge_dir_recursive(root, Duration::from_secs(min_age_secs), true)
}
