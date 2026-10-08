$ErrorActionPreference = 'Stop'
$kitchenRoot = $PSScriptRoot
$pythonRuntime = Join-Path (Split-Path $kitchenRoot) '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonRuntime)) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) { throw 'Install Python or run the hosted GitHub Pages version.' }
    $pythonRuntime = $pythonCommand.Source
}
$listener = Get-NetTCPConnection -State Listen -LocalPort 8766 -ErrorAction SilentlyContinue
if (-not $listener) {
    Start-Process -FilePath $pythonRuntime -ArgumentList @('-m', 'http.server', '8766', '--bind', '127.0.0.1', '--directory', ('"' + $kitchenRoot + '"')) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $kitchenRoot 'server.log') -RedirectStandardError (Join-Path $kitchenRoot 'server-error.log')
}
Start-Process 'http://127.0.0.1:8766'
