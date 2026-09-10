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
    def purge_temp_dir(max_age_hours: float = 1.0) -> Dict[str, Any]:
        """
        Scans TEMP_DIR and purges orphaned temporary video slices, audio files, and frames older than max_age_hours.
        """
        stats = {"deleted_files": 0, "freed_bytes": 0, "errors": 0}
        try:
            temp_path = Path(TEMP_DIR).resolve()
            if not temp_path.exists():
                return stats

            now = time.time()
            cutoff_seconds = max_age_hours * 3600

            for entry in temp_path.glob("*"):
                if entry.is_file():
                    try:
                        file_age = now - entry.stat().st_mtime
                        if file_age > cutoff_seconds or entry.suffix in ['.tmp', '.part', '.ytdl']:
                            size = entry.stat().st_size
                            entry.unlink(missing_ok=True)
                            stats["deleted_files"] += 1
                            stats["freed_bytes"] += size
                    except Exception as err:
                        stats["errors"] += 1

            freed_mb = round(stats["freed_bytes"] / (1024 * 1024), 2)
            if stats["deleted_files"] > 0:
                print(f"🧹 [SystemGuard]: Purged {stats['deleted_files']} temporary files ({freed_mb} MB freed).")
        except Exception as e:
            print(f"⚠️ [SystemGuard]: Temp purge warning: {e}")

        return stats

    @staticmethod
    def reclaim_memory():
        """
        Executes explicit Python garbage collection and clears system caches to reclaim RAM.
        """
        try:
            # Reclaim Python object references
            uncollected = gc.collect()
            
            # Optional PyTorch CUDA VRAM cache release if loaded
            if "torch" in sys.modules:
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception:
                    pass

            return uncollected
        except Exception as e:
            print(f"⚠️ [SystemGuard]: Memory reclaim warning: {e}")
            return 0
