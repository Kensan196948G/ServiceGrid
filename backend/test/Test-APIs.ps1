# Test-APIs.ps1 - APIテストスクリプト

param(
    [string]$DatabasePath = "../db/itsm.sqlite",
    [string]$SchemaPath = "../db/schema.sql"
)

Import-Module "$PSScriptRoot/../modules/DBUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/AuthUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/LogUtil.psm1" -Force
Import-Module "$PSScriptRoot/../modules/Config.psm1" -Force
Import-Module "$PSScriptRoot/../api/Auth.ps1" -Force
Import-Module "$PSScriptRoot/../api/Assets.ps1" -Force
Import-Module "$PSScriptRoot/../api/Incidents.ps1" -Force
Import-Module "$PSScriptRoot/../api/ServiceRequests.ps1" -Force

Write-Host "=== ITSM Platform API Test Suite ===" -ForegroundColor Green
Write-Host "Starting automated API tests..." -ForegroundColor Yellow

$TestResults = @{
    Passed = 0
    Failed = 0
    Total = 0
    Details = @()
}

function Test-Function {
    param(
        [string]$TestName,
        [scriptblock]$TestCode
    )
    
    $TestResults.Total++
    
    try {
        Write-Host "Testing: $TestName" -ForegroundColor Cyan
        
        $result = & $TestCode
        
        if ($result) {
            $TestResults.Passed++
            $TestResults.Details += "✓ $TestName - PASSED"
            Write-Host "✓ PASSED" -ForegroundColor Green
        } else {
            $TestResults.Failed++
            $TestResults.Details += "✗ $TestName - FAILED"
            Write-Host "✗ FAILED" -ForegroundColor Red
        }
    }
    catch {
        $TestResults.Failed++
        $TestResults.Details += "✗ $TestName - ERROR: $($_.Exception.Message)"
        Write-Host "✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "1. Database Initialization Test" -ForegroundColor Magenta
Test-Function "Initialize Database" {
    $result = Initialize-Database -DatabasePath $DatabasePath -SchemaPath $SchemaPath
    return $result
}

Write-Host "2. Configuration Tests" -ForegroundColor Magenta
Test-Function "Configuration Values" {
    $serverPort = Get-ConfigValue "Server.Port"
    $dbPath = Get-DatabasePath
    return ($serverPort -eq 8080) -and ($dbPath -eq "db/itsm.sqlite")
}

Test-Function "Configuration Validation" {
    return Test-ConfigValid
}

Write-Host "3. Authentication API Tests" -ForegroundColor Magenta
Test-Function "Login with Valid Credentials" {
    $loginData = @{
        username = "admin"
        password = "admin123"
    }
    $result = Invoke-Login -LoginData $loginData
    $script:TestToken = $result.Data.Token
    return $result.Status -eq 200 -and $script:TestToken
}

Test-Function "Login with Invalid Credentials" {
    $loginData = @{
        username = "admin"
        password = "wrongpassword"
    }
    $result = Invoke-Login -LoginData $loginData
    return $result.Status -eq 401
}

Test-Function "Token Validation" {
    if ($script:TestToken) {
        $result = Test-Token -Token $script:TestToken
        return $result.Status -eq 200 -and $result.Data.Valid
    }
    return $false
}

Test-Function "Get User Profile" {
    if ($script:TestToken) {
        $result = Get-UserProfile -Token $script:TestToken
        return $result.Status -eq 200 -and $result.Data.Username -eq "admin"
    }
    return $false
}

Write-Host "4. Assets API Tests" -ForegroundColor Magenta
Test-Function "Create Asset" {
    if ($script:TestToken) {
        $assetData = @{
            asset_no = "TEST001"
            name = "Test Server"
            type = "Server"
            user = "Test User"
            location = "Datacenter A"
            status = "Active"
        }
        $result = New-Asset -Token $script:TestToken -AssetData $assetData
        $script:TestAssetId = $result.Data.AssetId
        return $result.Status -eq 201 -and $script:TestAssetId
    }
    return $false
}

Test-Function "Get Assets List" {
    if ($script:TestToken) {
        $result = Get-Assets -Token $script:TestToken
        return $result.Status -eq 200 -and $result.Data.Assets
    }
    return $false
}

Test-Function "Get Single Asset" {
    if ($script:TestToken -and $script:TestAssetId) {
        $result = Get-Asset -Token $script:TestToken -AssetId $script:TestAssetId
        return $result.Status -eq 200 -and $result.Data.asset_no -eq "TEST001"
    }
    return $false
}

Test-Function "Update Asset" {
    if ($script:TestToken -and $script:TestAssetId) {
        $updateData = @{
            location = "Datacenter B"
        }
        $result = Update-Asset -Token $script:TestToken -AssetId $script:TestAssetId -AssetData $updateData
        return $result.Status -eq 200
    }
    return $false
}

Write-Host "5. Incidents API Tests" -ForegroundColor Magenta
Test-Function "Create Incident" {
    if ($script:TestToken) {
        $incidentData = @{
            title = "Test Incident"
            description = "This is a test incident"
            priority = "Medium"
            assignee = "admin"
        }
        $result = New-Incident -Token $script:TestToken -IncidentData $incidentData
        $script:TestIncidentId = $result.Data.IncidentId
        return $result.Status -eq 201 -and $script:TestIncidentId
    }
    return $false
}

Test-Function "Get Incidents List" {
    if ($script:TestToken) {
        $result = Get-Incidents -Token $script:TestToken
        return $result.Status -eq 200 -and $result.Data.Incidents
    }
    return $false
}

Test-Function "Update Incident Status" {
    if ($script:TestToken -and $script:TestIncidentId) {
        $updateData = @{
            status = "In Progress"
        }
        $result = Update-Incident -Token $script:TestToken -IncidentId $script:TestIncidentId -IncidentData $updateData
        return $result.Status -eq 200
    }
    return $false
}

Write-Host "6. Service Requests API Tests" -ForegroundColor Magenta
Test-Function "Create Service Request" {
    if ($script:TestToken) {
        $requestData = @{
            subject = "Test Service Request"
            detail = "This is a test service request"
            applicant = "test.user@company.com"
        }
        $result = New-ServiceRequest -Token $script:TestToken -RequestData $requestData
        $script:TestRequestId = $result.Data.RequestId
        return $result.Status -eq 201 -and $script:TestRequestId
    }
    return $false
}

Test-Function "Approve Service Request" {
    if ($script:TestToken -and $script:TestRequestId) {
        $approvalData = @{
            action = "approve"
            comments = "Test approval"
        }
        $result = Approve-ServiceRequest -Token $script:TestToken -RequestId $script:TestRequestId -ApprovalData $approvalData
        return $result.Status -eq 200
    }
    return $false
}

Write-Host "7. Database Operations Tests" -ForegroundColor Magenta
Test-Function "SQL Query Execution" {
    $query = "SELECT COUNT(*) as count FROM users"
    $result = Invoke-SqlQuery -Query $query -DatabasePath $DatabasePath
    return $result -and $result[0].count -gt 0
}

Test-Function "SQL Non-Query Execution" {
    $query = "UPDATE users SET display_name = 'Test Admin' WHERE username = 'admin'"
    $result = Invoke-SqlNonQuery -Query $query -DatabasePath $DatabasePath
    return $result -gt 0
}

Write-Host "8. Logging Tests" -ForegroundColor Magenta
Test-Function "Write Log Entry" {
    Write-LogEntry -Level "INFO" -Message "Test log entry" -Category "TEST" -User "test"
    $logs = Get-LogEntries -Limit 1
    return $logs -and $logs[0].Message -eq "Test log entry"
}

Test-Function "Write API Log" {
    Write-ApiLog -Method "GET" -Endpoint "/test" -StatusCode 200 -User "test"
    return Test-Path "logs/api_access.log"
}

Test-Function "Save Audit Log" {
    $result = Save-AuditLog -EventType "TEST_EVENT" -User "test" -Detail "Test audit entry"
    return $result
}

Write-Host "9. Cleanup Tests" -ForegroundColor Magenta
Test-Function "Logout" {
    if ($script:TestToken) {
        $result = Invoke-Logout -Token $script:TestToken
        return $result.Status -eq 200
    }
    return $false
}

Test-Function "Token Invalidation After Logout" {
    if ($script:TestToken) {
        $result = Test-Token -Token $script:TestToken
        return $result.Status -eq 401 -and -not $result.Data.Valid
    }
    return $false
}

Write-Host "=== Test Results Summary ===" -ForegroundColor Green
Write-Host "Total Tests: $($TestResults.Total)" -ForegroundColor White
Write-Host "Passed: $($TestResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($TestResults.Failed)" -ForegroundColor Red

$PassRate = if ($TestResults.Total -gt 0) { [Math]::Round(($TestResults.Passed / $TestResults.Total) * 100, 2) } else { 0 }
Write-Host "Pass Rate: $PassRate%" -ForegroundColor $(if ($PassRate -eq 100) { "Green" } elseif ($PassRate -ge 80) { "Yellow" } else { "Red" })

Write-Host "`n=== Detailed Results ===" -ForegroundColor Green
foreach ($detail in $TestResults.Details) {
    if ($detail.StartsWith("✓")) {
        Write-Host $detail -ForegroundColor Green
    } else {
        Write-Host $detail -ForegroundColor Red
    }
}

if ($TestResults.Failed -eq 0) {
    Write-Host "`n🎉 All tests passed! The ITSM Platform backend is ready for deployment." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some tests failed. Please review the errors above and fix the issues." -ForegroundColor Yellow
    exit 1
}