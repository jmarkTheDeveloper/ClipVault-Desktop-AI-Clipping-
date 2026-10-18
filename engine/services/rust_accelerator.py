"""
ClipVault Hybrid Rust-Python Native Accelerator Bridge (`rust_accelerator.py`).

Loads the compiled Rust shared library (`engine/services/bin/clipvault_rust.dll`)
via zero-overhead C-FFI (`ctypes`) to execute hot-loop video frame compositing,
critically-damped virtual camera ODE solving, and zero-allocation disk sweeping
directly in native machine code alongside Python.
"""

import ctypes
import os
import numpy as np

_RUST_LIB = None
_RUST_VERSION = 0


def _load_rust_library():
    global _RUST_LIB, _RUST_VERSION
    if _RUST_LIB is not None:
        return _RUST_LIB

    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "bin", "clipvault_rust.dll"),
        os.path.join(os.path.dirname(base_dir), "rust_core", "target", "release", "clipvault_rust.dll"),
        os.path.join(base_dir, "bin", "libclipvault_rust.so"),
        os.path.join(base_dir, "bin", "libclipvault_rust.dylib"),
    ]

    for dll_path in candidates:
        if os.path.exists(dll_path):
            try:
                lib = ctypes.CDLL(dll_path)

                # 1. clipvault_rust_version() -> u32
                lib.clipvault_rust_version.argtypes = []
                lib.clipvault_rust_version.restype = ctypes.c_uint32

                # 2. blend_rgba_over_rgb_inplace(...) -> i32
                lib.blend_rgba_over_rgb_inplace.argtypes = [
                    ctypes.POINTER(ctypes.c_uint8),  # frame_ptr
                    ctypes.c_size_t,                 # frame_h
                    ctypes.c_size_t,                 # frame_w
                    ctypes.POINTER(ctypes.c_uint8),  # overlay_ptr
                    ctypes.c_size_t,                 # ov_h
                    ctypes.c_size_t,                 # ov_w
                    ctypes.c_size_t,                 # dst_y1
                    ctypes.c_size_t,                 # dst_x1
                    ctypes.c_size_t,                 # src_y1
                    ctypes.c_size_t,                 # src_x1
                    ctypes.c_size_t,                 # crop_h
                    ctypes.c_size_t,                 # crop_w
                ]
                lib.blend_rgba_over_rgb_inplace.restype = ctypes.c_int32

                # 3. solve_spring_damper_1d(...) -> i32
                lib.solve_spring_damper_1d.argtypes = [
                    ctypes.POINTER(ctypes.c_double),  # targets_ptr
                    ctypes.POINTER(ctypes.c_double),  # out_ptr
                    ctypes.c_size_t,                  # n
                    ctypes.c_double,                  # dt
                    ctypes.c_double,                  # stiffness
                    ctypes.c_double,                  # damping
                    ctypes.c_double,                  # deadzone_px
                    ctypes.c_size_t,                  # substeps
                ]
                lib.solve_spring_damper_1d.restype = ctypes.c_int32

                # 4. purge_temp_directory_native(temp_dir_utf8, min_age_secs) -> u64
                lib.purge_temp_directory_native.argtypes = [
                    ctypes.c_char_p,
                    ctypes.c_uint64,
                ]
                lib.purge_temp_directory_native.restype = ctypes.c_uint64

                # 5. Optional v2.0 exports (console scrollback unlocker, frame diff, audio RMS)
                if hasattr(lib, "configure_windows_console_native"):
                    lib.configure_windows_console_native.argtypes = []
                    lib.configure_windows_console_native.restype = ctypes.c_int32
                    try:
                        lib.configure_windows_console_native()
                    except Exception:
                        pass

                if hasattr(lib, "compute_frame_luma_diff_native"):
                    lib.compute_frame_luma_diff_native.argtypes = [
                        ctypes.POINTER(ctypes.c_uint8),
                        ctypes.POINTER(ctypes.c_uint8),
                        ctypes.c_size_t,
                        ctypes.c_size_t,
                        ctypes.c_size_t,
                    ]
                    lib.compute_frame_luma_diff_native.restype = ctypes.c_double

                if hasattr(lib, "compute_audio_rms_envelope_i16"):
                    lib.compute_audio_rms_envelope_i16.argtypes = [
                        ctypes.POINTER(ctypes.c_int16),
                        ctypes.c_size_t,
                        ctypes.c_size_t,
                        ctypes.POINTER(ctypes.c_float),
                        ctypes.c_size_t,
                    ]
                    lib.compute_audio_rms_envelope_i16.restype = ctypes.c_size_t

                _RUST_VERSION = int(lib.clipvault_rust_version())
                _RUST_LIB = lib
                print(f"[RUST-CORE] Native Rust Accelerator loaded (v{_RUST_VERSION / 100:.2f}) from {os.path.basename(dll_path)}")
                return _RUST_LIB
            except Exception as e:
                print(f"[RUST-CORE] Failed to load {dll_path}: {e}")

    return None


# Eagerly initialize on import
_load_rust_library()


def is_rust_available() -> bool:
    return _RUST_LIB is not None


def get_rust_version() -> int:
    return _RUST_VERSION


def rust_blend_rgba_inplace(
    frame: np.ndarray,
    overlay: np.ndarray,
    dst_y1: int,
    dst_x1: int,
    src_y1: int,
    src_x1: int,
    crop_h: int,
    crop_w: int,
) -> bool:
    """
    Executes zero-allocation RGBA-over-RGB alpha blending directly in-place on `frame`
    using the Rust native SIMD core. Returns True if handled by Rust, False otherwise.
    """
    if _RUST_LIB is None:
        return False

    if (
        not frame.flags["C_CONTIGUOUS"]
        or not frame.flags["WRITEABLE"]
        or frame.dtype != np.uint8
        or not overlay.flags["C_CONTIGUOUS"]
        or overlay.dtype != np.uint8
    ):
        return False

    fh, fw = frame.shape[0], frame.shape[1]
    oh, ow = overlay.shape[0], overlay.shape[1]

    frame_ptr = frame.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8))
    overlay_ptr = overlay.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8))

    rc = _RUST_LIB.blend_rgba_over_rgb_inplace(
        frame_ptr,
        fh,
        fw,
        overlay_ptr,
        oh,
        ow,
        int(dst_y1),
        int(dst_x1),
        int(src_y1),
        int(src_x1),
        int(crop_h),
        int(crop_w),
    )
    return rc == 0


def rust_solve_spring_damper_1d(
    targets: np.ndarray,
    dt: float,
    stiffness: float,
    damping: float,
    deadzone_px: float,
    substeps: int = 4,
) -> np.ndarray | None:
    """
    Solves the 2nd-order critically-damped virtual camera trajectory in native Rust.
    Returns the smoothed trajectory array, or None if Rust is unavailable.
    """
    if _RUST_LIB is None or len(targets) == 0:
        return None

    t_arr = np.ascontiguousarray(targets, dtype=np.float64)
    out_arr = np.empty_like(t_arr, dtype=np.float64)

    t_ptr = t_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double))
    out_ptr = out_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double))

    rc = _RUST_LIB.solve_spring_damper_1d(
        t_ptr,
        out_ptr,
        len(t_arr),
        float(dt),
        float(stiffness),
        float(damping),
        float(deadzone_px),
        int(substeps),
    )
    if rc == 0:
        return out_arr
    return None


def rust_purge_temp_directory(temp_dir: str, min_age_secs: int = 0) -> int | None:
    """
    Sweeps and deletes stale temporary media files and task_* directories in native Rust.
    Returns total bytes freed on disk, or None if Rust is unavailable.
    """
    if _RUST_LIB is None or not temp_dir:
        return None

    encoded_path = os.path.abspath(temp_dir).encode("utf-8")
    freed = _RUST_LIB.purge_temp_directory_native(encoded_path, int(max(0, min_age_secs)))
    return int(freed)


def rust_compute_frame_luma_diff(frame_a: np.ndarray, frame_b: np.ndarray, stride_step: int = 2) -> float | None:
    """
    Computes a zero-allocation 3-zone (Left/Center/Right) + global RGB frame difference in native Rust.
    Returns difference score in [0.0, 255.0], or None if unavailable.
    """
    if _RUST_LIB is None or not hasattr(_RUST_LIB, "compute_frame_luma_diff_native"):
        return None
    if (
        frame_a.shape != frame_b.shape
        or frame_a.dtype != np.uint8
        or frame_b.dtype != np.uint8
        or frame_a.ndim != 3
        or frame_a.shape[2] < 3
    ):
        return None

    fa = np.ascontiguousarray(frame_a)
    fb = np.ascontiguousarray(frame_b)
    h, w = fa.shape[0], fa.shape[1]
    ptr_a = fa.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8))
    ptr_b = fb.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8))
    val = float(_RUST_LIB.compute_frame_luma_diff_native(ptr_a, ptr_b, int(h), int(w), int(max(1, stride_step))))
    return val if val >= 0.0 else None


def rust_compute_audio_rms_envelope(samples_i16: np.ndarray, window_size: int = 1600) -> np.ndarray | None:
    """
    Computes a zero-allocation sliding-window RMS audio energy envelope for 16-bit PCM audio in native Rust.
    """
    if _RUST_LIB is None or not hasattr(_RUST_LIB, "compute_audio_rms_envelope_i16"):
        return None
    if samples_i16 is None or len(samples_i16) < window_size or window_size <= 0:
        return None

    arr = np.ascontiguousarray(samples_i16, dtype=np.int16)
    max_win = len(arr) // window_size
    if max_win <= 0:
        return None

    out = np.empty(max_win, dtype=np.float32)
    s_ptr = arr.ctypes.data_as(ctypes.POINTER(ctypes.c_int16))
    o_ptr = out.ctypes.data_as(ctypes.POINTER(ctypes.c_float))
    n_written = int(_RUST_LIB.compute_audio_rms_envelope_i16(s_ptr, len(arr), int(window_size), o_ptr, int(max_win)))
    return out[:n_written] if n_written > 0 else None


def unlock_windows_console_scrolling() -> None:
    """
    Ensures Windows Console (conhost.exe) has mouse-wheel scrolling enabled and QuickEdit freeze disabled.
    """
    if os.name != "nt":
        return
    try:
        if _RUST_LIB is not None and hasattr(_RUST_LIB, "configure_windows_console_native"):
            if _RUST_LIB.configure_windows_console_native() == 1:
                return
        kernel32 = ctypes.windll.kernel32
        h_in = kernel32.CreateFileW("CONIN$", 0xC0000000, 3, None, 3, 0, None)
        if h_in not in (0, -1, 0xFFFFFFFF, 0xFFFFFFFFFFFFFFFF):
            mode = ctypes.c_uint32(0)
            if kernel32.GetConsoleMode(h_in, ctypes.byref(mode)):
                # Clear ENABLE_MOUSE_INPUT (0x10) and ENABLE_QUICK_EDIT_MODE (0x40), set ENABLE_EXTENDED_FLAGS (0x80)
                new_mode = (mode.value & ~0x0050) | 0x0080
                kernel32.SetConsoleMode(h_in, ctypes.c_uint32(new_mode))
            kernel32.CloseHandle(h_in)
    except Exception:
        pass


unlock_windows_console_scrolling()

