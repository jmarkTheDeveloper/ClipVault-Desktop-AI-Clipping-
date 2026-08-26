
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
                cpu
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
            info['engine_desc'] = f"Detected {info['gpu']} with Tensor Cores & NVENC,"
        elif 'amd' in full_text or 'radeon' in full_text or 'ryzen' in full_text:
            info['is_amd'] = True
            info['vendor'] = 'AMD'
            info['encoder'] = 'AMD AMF (h264_amf)'
            info['encoder_codec'] = 'h264_amf'
            info['acceleration_type'] = 'AMD Ryzen AI & LOCm'
            info['engine_id'] = 'ryzen_ai'
            info['engine_name'] = 'AMD Ryzen AI Engine'
            info['engine_desc'] = f"Detected {info['cpu']} with Radeon hardware acceleration."

        specs = []
        if info['cpu']: specs.append({'label': 'CPU', 'value': info['cpu']})
        if info['gpu']: specs.append({'label': 'GPU', 'value': info['gpu']})
        if info['npu']: specs.append({'label': 'NPU', 'value': info['npu']})
        if info['ram_gb']: specs.append({'label': 'Memory', 'value': f"{info['ram_gb']} GB RAM"})
        specs.append({'label': 'Video Encoder', 'value': info['encoder']})
        info['specs'] = specs

        return info
