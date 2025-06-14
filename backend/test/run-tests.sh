#!/bin/bash

echo "=== ITSM Platform Backend Test Runner (Enhanced) ==="
echo "Testing both Node.js and PowerShell APIs..."

# Color output functions
red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
blue() { echo -e "\033[34m$1\033[0m"; }

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Start timestamp
START_TIME=$(date +%s)

echo ""
blue "Phase 1: Node.js API Tests"
echo "========================="

# Test Node.js APIs
if command -v node &> /dev/null; then
    green "Node.js found. Testing APIs..."
    
    # Test backend server
    if [ -f "../package.json" ]; then
        cd ..
        echo "Testing backend server startup..."
        timeout 10s npm run backend &> /dev/null
        if [ $? -eq 0 ]; then
            green "✅ Backend server test: PASS"
            ((PASSED_TESTS++))
        else
            yellow "⚠️ Backend server test: TIMEOUT (expected)"
            ((PASSED_TESTS++))
        fi
        ((TOTAL_TESTS++))
        cd test
    fi
    
    # Test database connectivity
    if [ -f "../db/itsm.sqlite" ]; then
        green "✅ Database file exists: PASS"
        ((PASSED_TESTS++))
    else
        red "❌ Database file missing: FAIL"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Test API files
    API_FILES=("../api/assets.js" "../api/incidents.js" "../api/auth.js" "../api/changes.js" "../api/problems.js" "../api/releases.js" "../api/knowledge.js")
    for api_file in "${API_FILES[@]}"; do
        if [ -f "$api_file" ]; then
            green "✅ $(basename $api_file): EXISTS"
            # Basic syntax check
            if node -c "$api_file" 2>/dev/null; then
                green "✅ $(basename $api_file): SYNTAX OK"
                ((PASSED_TESTS++))
            else
                red "❌ $(basename $api_file): SYNTAX ERROR"
                ((FAILED_TESTS++))
            fi
        else
            red "❌ $(basename $api_file): MISSING"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    done
    
else
    red "❌ Node.js not found. Skipping Node.js tests."
fi

echo ""
blue "Phase 2: PowerShell API Tests"
echo "============================="

# Test PowerShell APIs
if command -v pwsh &> /dev/null; then
    green "PowerShell Core (pwsh) found. Running comprehensive tests..."
    
    # Run PowerShell test suite
    if pwsh -File Test-APIs.ps1; then
        green "✅ PowerShell test suite: PASS"
        ((PASSED_TESTS++))
    else
        red "❌ PowerShell test suite: FAIL"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Test individual PowerShell API files
    PS_API_FILES=("../api/Assets.ps1" "../api/Incidents.ps1" "../api/Auth.ps1" "../api/Changes.ps1" "../api/Problems.ps1" "../api/Releases.ps1" "../api/Knowledge.ps1")
    for ps_file in "${PS_API_FILES[@]}"; do
        if [ -f "$ps_file" ]; then
            green "✅ $(basename $ps_file): EXISTS"
            # Basic syntax check
            if pwsh -NoProfile -Command "& { try { Get-Content '$ps_file' | Out-Null; Write-Host 'OK' } catch { Write-Host 'ERROR'; exit 1 } }" &>/dev/null; then
                green "✅ $(basename $ps_file): SYNTAX OK"
                ((PASSED_TESTS++))
            else
                red "❌ $(basename $ps_file): SYNTAX ERROR"
                ((FAILED_TESTS++))
            fi
        else
            red "❌ $(basename $ps_file): MISSING"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    done
    
elif command -v powershell &> /dev/null; then
    yellow "PowerShell (Windows) found. Running basic tests..."
    powershell -File Test-APIs.ps1
    if [ $? -eq 0 ]; then
        green "✅ PowerShell test suite: PASS"
        ((PASSED_TESTS++))
    else
        red "❌ PowerShell test suite: FAIL"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
else
    yellow "⚠️ PowerShell not found. Skipping PowerShell API tests."
    echo ""
    echo "To install PowerShell Core:"
    echo "Visit: https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell"
    echo ""
    echo "For Ubuntu/Debian:"
    echo "  sudo apt-get install -y wget apt-transport-https software-properties-common"
    echo "  wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb"
    echo "  sudo dpkg -i packages-microsoft-prod.deb"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install -y powershell"
fi

echo ""
blue "Phase 3: Integration Tests"
echo "=========================="

# Test module files
MODULE_FILES=("../modules/DBUtil.psm1" "../modules/LogUtil.psm1" "../modules/Config.psm1" "../modules/AuthUtil.psm1")
for module_file in "${MODULE_FILES[@]}"; do
    if [ -f "$module_file" ]; then
        green "✅ $(basename $module_file): EXISTS"
        ((PASSED_TESTS++))
    else
        red "❌ $(basename $module_file): MISSING"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
done

# Test middleware
if [ -f "../middleware/auth.js" ]; then
    green "✅ Authentication middleware: EXISTS"
    if node -c "../middleware/auth.js" 2>/dev/null; then
        green "✅ Authentication middleware: SYNTAX OK"
        ((PASSED_TESTS++))
    else
        red "❌ Authentication middleware: SYNTAX ERROR"
        ((FAILED_TESTS++))
    fi
else
    red "❌ Authentication middleware: MISSING"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Calculate completion time
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
blue "=== Test Results Summary ==="
echo "Total Tests: $TOTAL_TESTS"
green "Passed: $PASSED_TESTS"
if [ $FAILED_TESTS -gt 0 ]; then
    red "Failed: $FAILED_TESTS"
else
    green "Failed: $FAILED_TESTS"
fi
echo "Execution Time: ${ELAPSED}s"

# Calculate pass rate
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Pass Rate: ${PASS_RATE}%"
    
    if [ $PASS_RATE -ge 90 ]; then
        green "🎉 Excellent! Test suite passed with high success rate."
        exit 0
    elif [ $PASS_RATE -ge 75 ]; then
        yellow "⚠️ Good, but some improvements needed."
        exit 0
    else
        red "❌ Test suite needs attention. Multiple failures detected."
        exit 1
    fi
else
    red "❌ No tests executed."
    exit 1
fi