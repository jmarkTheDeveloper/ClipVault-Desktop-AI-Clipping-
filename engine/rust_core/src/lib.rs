use std::ffi::CStr;
use std::fs;
use std::os::raw::c_char;
use std::path::Path;
use std::slice;
use std::time::{Duration, SystemTime};

/// Returns the version code of the ClipVault Rust Native Accelerator (e.g. 200 = v2.0.0).
#[no_mangle]
pub extern "C" fn clipvault_rust_version() -> u32 {
    200
}

#[cfg(target_os = "windows")]
mod win_console {
    use std::ffi::c_void;

    const GENERIC_READ_WRITE: u32 = 0xC000_0000;
    const FILE_SHARE_READ_WRITE: u32 = 0x0000_0003;
    const OPEN_EXISTING: u32 = 3;
    const INVALID_HANDLE_VALUE: isize = -1;
    const ENABLE_MOUSE_INPUT: u32 = 0x0010;
    const ENABLE_QUICK_EDIT_MODE: u32 = 0x0040;
    const ENABLE_EXTENDED_FLAGS: u32 = 0x0080;

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct Coord {
        x: i16,
        y: i16,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct SmallRect {
        left: i16,
        top: i16,
        right: i16,
        bottom: i16,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct ConsoleScreenBufferInfo {
        dw_size: Coord,
        dw_cursor_position: Coord,
        w_attributes: u16,
        sr_window: SmallRect,
        dw_maximum_window_size: Coord,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn CreateFileA(
            lp_file_name: *const u8,
            dw_desired_access: u32,
            dw_share_mode: u32,
            lp_security_attributes: *const c_void,
            dw_creation_disposition: u32,
            dw_flags_and_attributes: u32,
            h_template_file: *const c_void,
        ) -> isize;
        fn GetConsoleMode(h_console_handle: isize, lp_mode: *mut u32) -> i32;
        fn SetConsoleMode(h_console_handle: isize, dw_mode: u32) -> i32;
        fn GetConsoleScreenBufferInfo(
            h_console_output: isize,
            lp_console_screen_buffer_info: *mut ConsoleScreenBufferInfo,
        ) -> i32;
        fn SetConsoleScreenBufferSize(h_console_output: isize, dw_size: Coord) -> i32;
        fn CloseHandle(h_object: isize) -> i32;
    }

    pub unsafe fn unlock_console_scrolling() -> i32 {
        let mut status = 0;
        let h_in = CreateFileA(
            b"CONIN$\0".as_ptr(),
            GENERIC_READ_WRITE,
            FILE_SHARE_READ_WRITE,
            std::ptr::null(),
            OPEN_EXISTING,
            0,
            std::ptr::null(),
        );
        if h_in != INVALID_HANDLE_VALUE && h_in != 0 {
            let mut mode: u32 = 0;
            if GetConsoleMode(h_in, &mut mode) != 0 {
                // Clear ENABLE_MOUSE_INPUT (0x10) so mouse-wheel events scroll the console
                // scrollbar instead of being swallowed by CONIN$, and clear ENABLE_QUICK_EDIT_MODE (0x40)
                // so clicking inside the CMD window never pauses/freezes execution.
                let new_mode = (mode & !(ENABLE_MOUSE_INPUT | ENABLE_QUICK_EDIT_MODE))
                    | ENABLE_EXTENDED_FLAGS;
                if SetConsoleMode(h_in, new_mode) != 0 {
                    status = 1;
                }
            }
            let _ = CloseHandle(h_in);
        }

        let h_out = CreateFileA(
            b"CONOUT$\0".as_ptr(),
            GENERIC_READ_WRITE,
            FILE_SHARE_READ_WRITE,
            std::ptr::null(),
            OPEN_EXISTING,
            0,
            std::ptr::null(),
        );
        if h_out != INVALID_HANDLE_VALUE && h_out != 0 {
            let mut info = ConsoleScreenBufferInfo {
                dw_size: Coord { x: 120, y: 9001 },
                dw_cursor_position: Coord { x: 0, y: 0 },
                w_attributes: 0,
                sr_window: SmallRect {
                    left: 0,
                    top: 0,
                    right: 119,
                    bottom: 29,
                },
                dw_maximum_window_size: Coord { x: 120, y: 9001 },
            };
            if GetConsoleScreenBufferInfo(h_out, &mut info) != 0 && info.dw_size.y < 3000 {
                let target_size = Coord {
                    x: info.dw_size.x.max(120),
                    y: 9001,
                };
                let _ = SetConsoleScreenBufferSize(h_out, target_size);
            }
            let _ = CloseHandle(h_out);
        }
        status
    }
}

/// Unlocks Windows Console (CMD) mouse-wheel scrolling and 9000-line scrollback buffer while
/// keeping QuickEdit click-freeze disabled.
#[no_mangle]
pub unsafe extern "C" fn configure_windows_console_native() -> i32 {
    #[cfg(target_os = "windows")]
    {
        win_console::unlock_console_scrolling()
    }
    #[cfg(not(target_os = "windows"))]
    {
        0
    }
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

/// Zero-allocation 3-zone (Left / Center / Right) RGB frame difference metric for instant
/// camera-cut detection without allocating intermediate float32 arrays.
/// Returns the maximum zone mean absolute difference in [0.0, 255.0], or -1.0 on error.
#[no_mangle]
pub unsafe extern "C" fn compute_frame_luma_diff_native(
    frame_a_ptr: *const u8,
    frame_b_ptr: *const u8,
    height: usize,
    width: usize,
    stride_step: usize,
) -> f64 {
    if frame_a_ptr.is_null() || frame_b_ptr.is_null() || height == 0 || width < 3 {
        return -1.0;
    }

    let total_bytes = height.saturating_mul(width).saturating_mul(3);
    let a = slice::from_raw_parts(frame_a_ptr, total_bytes);
    let b = slice::from_raw_parts(frame_b_ptr, total_bytes);

    let step = if stride_step == 0 { 2 } else { stride_step };
    let third_w = width / 3;
    let row_stride = width * 3;

    let mut zone_sums = [0u64; 3];
    let mut zone_counts = [0u64; 3];

    let mut r = 0;
    while r < height {
        let row_base = r * row_stride;
        let mut c = 0;
        while c < width {
            let idx = row_base + c * 3;
            let dr = (a[idx] as i32 - b[idx] as i32).unsigned_abs() as u64;
            let dg = (a[idx + 1] as i32 - b[idx + 1] as i32).unsigned_abs() as u64;
            let db = (a[idx + 2] as i32 - b[idx + 2] as i32).unsigned_abs() as u64;
            let diff = (dr + dg + db) / 3;

            let z = if c < third_w {
                0
            } else if c < third_w * 2 {
                1
            } else {
                2
            };
            zone_sums[z] += diff;
            zone_counts[z] += 1;
            c += step;
        }
        r += step;
    }

    let mut max_zone_diff = 0.0_f64;
    let mut total_sum = 0u64;
    let mut total_cnt = 0u64;
    for z in 0..3 {
        total_sum += zone_sums[z];
        total_cnt += zone_counts[z];
        if zone_counts[z] > 0 {
            let zd = (zone_sums[z] as f64) / (zone_counts[z] as f64);
            if zd > max_zone_diff {
                max_zone_diff = zd;
            }
        }
    }

    let global_diff = if total_cnt > 0 {
        (total_sum as f64) / (total_cnt as f64)
    } else {
        0.0
    };

    0.55 * global_diff + 0.45 * max_zone_diff
}

/// Zero-allocation sliding-window RMS audio energy envelope calculator for 16-bit PCM samples.
/// Writes `num_windows` normalized RMS values in `[0.0, 1.0]` to `out_rms_ptr`.
#[no_mangle]
pub unsafe extern "C" fn compute_audio_rms_envelope_i16(
    samples_ptr: *const i16,
    num_samples: usize,
    window_size: usize,
    out_rms_ptr: *mut f32,
    max_windows: usize,
) -> usize {
    if samples_ptr.is_null() || out_rms_ptr.is_null() || num_samples == 0 || window_size == 0 {
        return 0;
    }

    let samples = slice::from_raw_parts(samples_ptr, num_samples);
    let n_win = (num_samples / window_size).min(max_windows);
    let out = slice::from_raw_parts_mut(out_rms_ptr, n_win);

    for w in 0..n_win {
        let start = w * window_size;
        let slice_w = &samples[start..start + window_size];
        let mut sum_sq: u64 = 0;
        for &s in slice_w {
            let v = s as i64;
            sum_sq += (v * v) as u64;
        }
        let mean_sq = (sum_sq as f64) / (window_size as f64);
        let rms = (mean_sq.sqrt() / 32768.0).min(1.0) as f32;
        out[w] = rms;
    }

    n_win
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
