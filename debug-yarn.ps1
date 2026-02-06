# Debug script for Yarn workspace error
$logPath = "f:\nextjs\dadih-server\.cursor\debug.log"

function Log-Debug {
    param($sessionId, $runId, $hypothesisId, $location, $message, $data)
    $logEntry = @{
        sessionId = $sessionId
        runId = $runId
        hypothesisId = $hypothesisId
        location = $location
        message = $message
        data = $data
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    } | ConvertTo-Json -Compress
    Add-Content -Path $logPath -Value $logEntry
}

$sessionId = "debug-session"
$runId = "run1"

# Hypothesis A: Missing package.json
Log-Debug -sessionId $sessionId -runId $runId -hypothesisId "A" -location "debug-yarn.ps1:15" -message "Checking if package.json exists" -data @{
    path = "f:\nextjs\shadcn-dashboard\package.json"
    exists = (Test-Path "f:\nextjs\shadcn-dashboard\package.json")
}

# Hypothesis B: Parent workspace configuration
Log-Debug -sessionId $sessionId -runId $runId -hypothesisId "B" -location "debug-yarn.ps1:20" -message "Checking parent .yarnrc.yml" -data @{
    path = "f:\nextjs\.yarnrc.yml"
    exists = (Test-Path "f:\nextjs\.yarnrc.yml")
    content = if (Test-Path "f:\nextjs\.yarnrc.yml") { Get-Content "f:\nextjs\.yarnrc.yml" -Raw } else { $null }
}

# Hypothesis C: Root package.json check
Log-Debug -sessionId $sessionId -runId $runId -hypothesisId "C" -location "debug-yarn.ps1:25" -message "Checking root package.json" -data @{
    path = "f:\nextjs\package.json"
    exists = (Test-Path "f:\nextjs\package.json")
}

# Hypothesis D: Workspace references in yarn.lock
$yarnLockPath = "f:\nextjs\shadcn-dashboard\yarn.lock"
if (Test-Path $yarnLockPath) {
    $workspaceRefs = Select-String -Path $yarnLockPath -Pattern "@workspace:" | Select-Object -First 10
    Log-Debug -sessionId $sessionId -runId $runId -hypothesisId "D" -location "debug-yarn.ps1:32" -message "Workspace references in yarn.lock" -data @{
        count = ($workspaceRefs | Measure-Object).Count
        references = $workspaceRefs.Line
    }
}

# Hypothesis E: Current directory and Yarn context
Log-Debug -sessionId $sessionId -runId $runId -hypothesisId "E" -location "debug-yarn.ps1:40" -message "Current directory and Yarn context" -data @{
    currentDir = (Get-Location).Path
    yarnVersion = (yarn --version 2>&1 | Out-String).Trim()
    yarnrcExists = (Test-Path ".yarnrc.yml")
    yarnrcLocalExists = (Test-Path ".yarnrc.local.yml")
}

Write-Output "Debug logs written to $logPath"
