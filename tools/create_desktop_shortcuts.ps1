# Create Desktop Shortcuts for ClipVault AI Video Studio
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ProjectDir = Split-Path -Parent $PSScriptRoot
$IconPath = Join-Path $ProjectDir "public\icon.ico"

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
