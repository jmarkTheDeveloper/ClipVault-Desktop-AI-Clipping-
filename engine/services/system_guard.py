import os
import sys
import gc
import time
import shutil
from pathlib import Path
from typing import Tuple, Dict, Any

from config import TEMP_DIR, OUTPUT_DIR

class SystemGuard:
    """
    System Protection & Resource Management Service.
    Provides automatic disk space validation, temporary storage auto-purging,
    and aggressive RAM/VRAM memory garbage collection.
    """

    @staticmethod
    def check_disk_space(target_path: Path = TEMP_DIR, min_free_gb: float = 2.0) -> Tuple[bool, float, str]:
        """
        Validates available disk space before heavy download/render jobs start.
        Returns (has_sufficient_space: bool, available_gb: float, message: str)
        """
        try:
            target_path = Path(target_path).resolve()
            target_path.mkdir(parents=True, exist_ok=True)
            usage = shutil.disk_usage(target_path)
            free_gb = round(usage.free / (1024 ** 3), 2)
            
            if free_gb < min_free_gb:
                msg = f"Low disk space alert: {free_gb} GB available on {target_path.anchor}. At least {min_free_gb} GB required."
                return False, free_gb, msg
            
            return True, free_gb, f"{free_gb} GB free space available."
        except Exception as e:
            # Fallback if disk usage query fails
            return True, 999.0, f"Disk space query warning: {e}"

    @staticmethod
    def purge_temp_dir(max_age_hours: float = 0.05) -> Dict[str, Any]:
        """
        Scans TEMP_DIR and purges temporary video slices, audio files, task_* folders, and frames.
        Uses the native Rust filesystem sweeper (`clipvault_rust.dll`) first for zero-overhead cleanup.
        """
        stats = {"deleted_files": 0, "freed_bytes": 0, "errors": 0}
        try:
            temp_path = Path(TEMP_DIR).resolve()
            if not temp_path.exists():
                return stats

            cutoff_seconds = max(0.0, max_age_hours) * 3600

            # Fast-path 1: Native Rust Directory Sweeper
            try:
                from services.rust_accelerator import rust_purge_temp_directory
                rust_freed = rust_purge_temp_directory(str(temp_path), int(cutoff_seconds))
                if rust_freed is not None and rust_freed > 0:
                    stats["freed_bytes"] += int(rust_freed)
                    stats["deleted_files"] += 1
            except Exception:
                pass

            now = time.time()
            for entry in list(temp_path.iterdir()):
                try:
                    age = now - entry.stat().st_mtime
                    if entry.is_dir():
                        if age > cutoff_seconds or entry.name.startswith("task_"):
                            dir_bytes = sum(f.stat().st_size for f in entry.rglob("*") if f.is_file())
                            shutil.rmtree(entry, ignore_errors=True)
                            if not entry.exists():
                                stats["deleted_files"] += 1
                                stats["freed_bytes"] += dir_bytes
                    elif entry.is_file():
                        if (
                            age > cutoff_seconds
                            or entry.suffix.lower() in ('.tmp', '.part', '.ytdl', '.wav', '.m4a', '.mp4', '.webm', '.mkv')
                        ):
                            size = entry.stat().st_size
                            entry.unlink(missing_ok=True)
                            stats["deleted_files"] += 1
                            stats["freed_bytes"] += size
                except Exception:
                    stats["errors"] += 1

            freed_mb = round(stats["freed_bytes"] / (1024 * 1024), 2)
            if stats["deleted_files"] > 0 or stats["freed_bytes"] > 0:
                print(f"🧹 [SystemGuard]: Purged temporary items ({freed_mb} MB freed).")
        except Exception as e:
            print(f"⚠️ [SystemGuard]: Temp purge warning: {e}")

        return stats

    @staticmethod
    def reclaim_memory():
        """
        Executes explicit multi-generation garbage collection, unloads heavy AI transcription weights,
        compacts the C runtime heap, and trims the Windows OS process working set to immediately free RAM.
        """
        try:
            # 1. Unload cached Faster-Whisper CTranslate2 model (~600MB - 1.4GB RAM) when task completes
            try:
                from services.whisper_transcriber import WhisperSingleton
                WhisperSingleton.unload_model()
            except Exception:
                pass

            # 2. Multi-generation Python garbage collection
            uncollected = 0
            for gen in (2, 1, 0):
                uncollected += gc.collect(gen)

            # 3. Release PyTorch CUDA VRAM cache if loaded
            if "torch" in sys.modules:
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception:
                    pass

            # 4. Windows OS C-Heap compaction & Working Set trim (returns freed pages to Windows Task Manager)
            if sys.platform == "win32":
                try:
                    import ctypes
                    try:
                        ctypes.cdll.msvcrt._heapmin()
                    except Exception:
                        pass
                    handle = ctypes.windll.kernel32.GetCurrentProcess()
                    try:
                        ctypes.windll.psapi.EmptyWorkingSet(handle)
                    except Exception:
                        pass
                    ctypes.windll.kernel32.SetProcessWorkingSetSizeEx(
                        handle,
                        ctypes.c_size_t(-1),
                        ctypes.c_size_t(-1),
                        0,
                    )
                except Exception:
                    pass

            return uncollected
        except Exception as e:
            print(f"⚠️ [SystemGuard]: Memory reclaim warning: {e}")
            return 0

