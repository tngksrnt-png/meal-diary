$ErrorActionPreference = 'SilentlyContinue'
$projectRoot = 'C:\dev\test'
$port = 3000
$url = "http://localhost:$port"

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if (-not $listening) {
    Start-Process -FilePath 'cmd.exe' `
        -ArgumentList '/c', 'npm run dev' `
        -WorkingDirectory $projectRoot `
        -WindowStyle Minimized

    $maxWait = 90
    $elapsed = 0
    while ($elapsed -lt $maxWait) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -lt 500) { break }
        } catch { }
    }
}

Start-Process $url
