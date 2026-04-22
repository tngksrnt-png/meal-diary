$desktop = [Environment]::GetFolderPath('Desktop')

$oldUrl = Join-Path $desktop 'ReNA HR Dashboard.url'
if (Test-Path $oldUrl) { Remove-Item $oldUrl -Force }

$lnkPath = Join-Path $desktop 'ReNA HR Dashboard.lnk'
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnkPath)
$sc.TargetPath = 'powershell.exe'
$sc.Arguments = '-ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\dev\test\scripts\start-dashboard.ps1"'
$sc.WorkingDirectory = 'C:\dev\test'
$sc.WindowStyle = 7
$sc.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,14"
$sc.Description = 'ReNA HR Dashboard - auto start dev server and open browser'
$sc.Save()

Write-Output "Created: $lnkPath"
