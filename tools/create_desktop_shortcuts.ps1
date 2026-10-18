# Create Desktop & Start Menu Shortcuts for ClipVault and Lock Taskbar Icon
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$StartMenuPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$ProjectDir = Split-Path -Parent $PSScriptRoot
$IconPath = Join-Path $ProjectDir "public\icon.ico"
$ElectronExe = Join-Path $ProjectDir "node_modules\electron\dist\electron.exe"
$RceditExe = Join-Path $ProjectDir "node_modules\electron-winstaller\vendor\rcedit.exe"

# 0. Stamp uncompressed BMP icon.ico directly into electron.exe PE header so Windows Taskbar never shows a blank icon
if ((Test-Path $RceditExe) -and (Test-Path $ElectronExe) -and (Test-Path $IconPath)) {
    try {
        & $RceditExe $ElectronExe --set-icon $IconPath --set-version-string "ProductName" "ClipVault" --set-version-string "FileDescription" "ClipVault" 2>$null
        Write-Host "[OK] Stamped ClipVault icon into electron.exe PE resources"
    } catch {}
}

# 1. Consumer Product Shortcut
$ConsumerLnk = Join-Path $DesktopPath "ClipVault (Consumer).lnk"
$Shortcut1 = $WshShell.CreateShortcut($ConsumerLnk)
$Shortcut1.TargetPath = Join-Path $ProjectDir "start_consumer_app.bat"
$Shortcut1.WorkingDirectory = $ProjectDir
$Shortcut1.IconLocation = "$IconPath,0"
$Shortcut1.Description = "ClipVault AI Video Studio - Consumer Product"
$Shortcut1.Save()
Write-Host "[OK] Created Consumer Product shortcut on Desktop: $ConsumerLnk"

# 2. Developer Studio Shortcut
$DevLnk = Join-Path $DesktopPath "ClipVault (Developer Studio).lnk"
$Shortcut2 = $WshShell.CreateShortcut($DevLnk)
$Shortcut2.TargetPath = Join-Path $ProjectDir "start_developer_app.bat"
$Shortcut2.WorkingDirectory = $ProjectDir
$Shortcut2.IconLocation = "$IconPath,0"
$Shortcut2.Description = "ClipVault AI Video Studio - Developer Studio (Live HMR)"
$Shortcut2.Save()
Write-Host "[OK] Created Developer Studio shortcut on Desktop: $DevLnk"

# 3. Start Menu Shortcut for Windows 11 AppUserModelID Taskbar Icon Resolution
if (Test-Path $ElectronExe) {
    $StartLnk = Join-Path $StartMenuPath "ClipVault.lnk"
    $Shortcut3 = $WshShell.CreateShortcut($StartLnk)
    $Shortcut3.TargetPath = $ElectronExe
    $Shortcut3.Arguments = "`"$ProjectDir`""
    $Shortcut3.WorkingDirectory = $ProjectDir
    $Shortcut3.IconLocation = "$IconPath,0"
    $Shortcut3.Description = "ClipVault"
    $Shortcut3.Save()
    Write-Host "[OK] Updated Start Menu shortcut: $StartLnk"
}

# 4. Notify Windows 11 Shell (SHChangeNotify SHCNE_ASSOCCHANGED) to flush stale taskbar icon cache
try {
    $code = @'
    using System;
    using System.Runtime.InteropServices;
    public class IconCacheRefresh {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
        public static void Refresh() {
            SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
        }
    }
'@
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
    [IconCacheRefresh]::Refresh()
    Write-Host "[OK] Flushed Windows Shell icon cache via SHChangeNotify"
} catch {}
