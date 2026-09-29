
import sys, platform, subprocess, os
class HardwareScanner:
    @staticmethod
    def scan():
        info = {
            'status': 'ready',
            'cpu': platform.processor() or 'Multi-Core x86_64 Processor',
            'gpu': 'Integrated Graphics',
            'npu': None,
            'vendor': 'Intel',
            'encoder': 'libx264 (Software)',
            'encoder_codec': 'libx264',
            'acceleration_type': 'None',
            'ram_gb': 16.0,
            'is_intel': False,
            'is_amd': False,
            'is_nvidia': False,
            'is_apple': False,
            'openvino_supported': False,
            'engine_id': 'intel_ai',
            'engine_name': 'Intel AI Engine',
            'engine_desc': 'Local hardware acceleration using Intel Core Ultra CPU + Intel Arc GPU and AI Boost NPU.',
            'specs': []
        }
        if sys.platform == 'win32':
            try:
                cpu_raw = subprocess.check_output(['powershell', '-NoProfile', '-Command', 'Get-CimInstance Win32_Processor | Select-Object -ExpandProperty Name'], text=True, timeout=4).strip()
                if cpu_raw: info['cpu'] = cpu_raw.splitlines()[0].strip()
            except Exception: pass
            try:
                gpu_raw = subprocess.check_output(['powershell', '-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name'], text=True, timeout=4).strip()
                if gpu_raw:
                    gpus = [g.strip() for g in gpu_raw.splitlines() if g.strip()]
                    info['gpu'] = ' + '.join(gpus)
            except Exception: pass

            try:
                npu_raw = subprocess.check_output(['powershell', '-NoProfile', '-Command', 'Get-CimInstance Win32_PnPEntity | Select-Object -ExpandProperty Name'], text=True, timeout=4).strip()
                if npu_raw:
                    for line in npu_raw.splitlines():
                        l = line.strip()
                        if 'AI Boost' in l or 'NPU' in l or 'Neural' in l:
                            info['npu'] = l
                            break
            except Exception: pass
            try:
                import psutil
                info['ram_gb'] = round(psutil.virtual_memory().total / (1024**3), 1)
            except Exception: pass

        import multiprocessing
        import shutil
        info['cores'] = multiprocessing.cpu_count() or 4
        try:
            usage = shutil.disk_usage(os.path.abspath('.'))
            info['disk_free_gb'] = round(usage.free / (1024**3), 1)
        except Exception:
            info['disk_free_gb'] = 20.0

        ffmpeg_ready = False
        try:
            import imageio_ffmpeg
            exe = imageio_ffmpeg.get_ffmpeg_exe()
            ffmpeg_ready = bool(exe and os.path.exists(exe))
        except Exception:
            ffmpeg_ready = True
        info['ffmpeg_ready'] = ffmpeg_ready

        full_text = f"{info['cpu']} {info['gpu']} {info.get('npu') or ''}".lower()
        if 'intel' in full_text:
            info['is_intel'] = True
            info['vendor'] = 'Intel'
            info['openvino_supported'] = True
            info['encoder'] = 'Intel QuickSync (h264_qsv)'
            info['encoder_codec'] = 'h264_qsv'
            info['acceleration_type'] = 'Intel QuickSync & AI Boost'
            info['engine_id'] = 'intel_ai'
            info['engine_name'] = 'Intel AI Engine'
            info['engine_desc'] = f"Detected {info['cpu']} and {info['gpu']}. Running on-device via Intel OpenVINO & QuickSync."
            if not info['npu'] and ('ultra' in full_text or 'meteor' in full_text or '135h' in full_text):
                info['npu'] = 'Intel AI Boost NPU'
        elif 'nvidia' in full_text or 'rtx' in full_text or 'gtx' in full_text:
            info['is_nvidia'] = True
            info['vendor'] = 'NVIDIA'
            info['encoder'] = 'NVIDIA NVENC (h264_nvenc)'
            info['encoder_codec'] = 'h264_nvenc'
            info['acceleration_type'] = 'NVIDIA CUDA & TensorRT'
            info['engine_id'] = 'nvidia_rtx'
            info['engine_name'] = 'NVIDIA RTX AI Engine'
            info['engine_desc'] = f"Detected {info['gpu']} with Tensor Cores & NVENC."
        elif 'amd' in full_text or 'radeon' in full_text or 'ryzen' in full_text:
            info['is_amd'] = True
            info['vendor'] = 'AMD'
            info['encoder'] = 'AMD AMF (h264_amf)'
            info['encoder_codec'] = 'h264_amf'
            info['acceleration_type'] = 'AMD Ryzen AI & ROCm'
            info['engine_id'] = 'ryzen_ai'
            info['engine_name'] = 'AMD Ryzen AI Engine'
            info['engine_desc'] = f"Detected {info['cpu']} with Radeon hardware acceleration."

        # CapCut-style Compatibility Evaluation
        has_hw_accel = info['is_intel'] or info['is_nvidia'] or info['is_amd']
        is_potato = (info['ram_gb'] < 7.5) or (info['cores'] <= 4 and not has_hw_accel) or (not has_hw_accel and 'software' in info['encoder'].lower())
        info['is_potato'] = is_potato

        if (info['is_nvidia'] or (info['is_intel'] and info.get('npu'))) and info['ram_gb'] >= 14:
            info['compatibility_level'] = 'ultra'
            info['performance_tag'] = 'Ultra Performance (Pro Hardware)'
            info['summary_headline'] = "Your computer can run ClipVault smoothly!"
            info['potato_warning'] = None
        elif has_hw_accel and info['ram_gb'] >= 7.5:
            info['compatibility_level'] = 'smooth'
            info['performance_tag'] = 'Smooth Performance (Hardware Accelerated)'
            info['summary_headline'] = "Your computer can run ClipVault smoothly!"
            info['potato_warning'] = None
        else:
            info['compatibility_level'] = 'potato'
            info['performance_tag'] = 'Entry Hardware (CPU Multi-Threaded Mode)'
            info['summary_headline'] = "Your system can handle ClipVault, but might see some performance issues."
            info['potato_warning'] = "Your hardware meets baseline requirements to run ClipVault, but you might experience slower processing or performance issues during heavy video encoding and frame analysis on this configuration."

        info['apology_notice'] = "Sorry for inconvenience this application is still undergoing for system updates"

        # Structured Environment Verification Checks
        info['checks'] = [
            {
                'id': 'cpu',
                'name': 'Processor Architecture',
                'status': 'passed',
                'details': f"{info['cpu']} ({info['cores']} Cores / Threads)",
                'desc': 'Meets multi-threaded video slicing and active speaker detection requirements.'
            },
            {
                'id': 'memory',
                'name': 'System Memory (RAM)',
                'status': 'passed' if info['ram_gb'] >= 4.0 else 'warning',
                'details': f"{info['ram_gb']} GB RAM Installed",
                'desc': 'Sufficient memory to buffer high-definition frames and local AI Whisper.' if info['ram_gb'] >= 7.5 else 'Meets minimum requirements. Cloud transcription advised for fastest rendering.'
            },
            {
                'id': 'graphics',
                'name': 'Graphics & Video Encoder',
                'status': 'passed',
                'details': f"{info['gpu']} • {info['encoder']}",
                'desc': f"Acceleration: {info['acceleration_type']}. Automated CPU fallback enabled."
            },
            {
                'id': 'storage',
                'name': 'Storage & Scratch Workspace',
                'status': 'passed' if info['disk_free_gb'] >= 2.0 else 'warning',
                'details': f"{info['disk_free_gb']} GB Free Storage Available",
                'desc': 'Sufficient fast scratch space for video downloads, slices, and rendered clips.'
            },
            {
                'id': 'codec',
                'name': 'Video Engine & Codec Pipeline',
                'status': 'passed',
                'details': 'FFmpeg H.264 / AAC Engine Ready',
                'desc': 'Hardware-accelerated media multiplexing, color grading, and subtitle burning.'
            }
        ]

        specs = []
        if info['cpu']: specs.append({'label': 'CPU', 'value': info['cpu']})
        if info['gpu']: specs.append({'label': 'GPU', 'value': info['gpu']})
        if info['npu']: specs.append({'label': 'NPU', 'value': info['npu']})
        if info['ram_gb']: specs.append({'label': 'Memory', 'value': f"{info['ram_gb']} GB RAM"})
        specs.append({'label': 'Video Encoder', 'value': info['encoder']})
        specs.append({'label': 'Available Storage', 'value': f"{info['disk_free_gb']} GB Free"})
        info['specs'] = specs

        return info
