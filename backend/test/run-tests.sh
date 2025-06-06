#!/bin/bash

echo "=== ITSM Platform Backend Test Runner ==="
echo "Checking PowerShell availability..."

if command -v pwsh &> /dev/null; then
    echo "PowerShell Core (pwsh) found. Running tests..."
    pwsh -File Test-APIs.ps1
elif command -v powershell &> /dev/null; then
    echo "PowerShell (powershell) found. Running tests..."
    powershell -File Test-APIs.ps1
else
    echo "PowerShell not found. Please install PowerShell Core to run tests."
    echo "Visit: https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell"
    echo ""
    echo "For Ubuntu/Debian:"
    echo "  sudo apt-get install -y wget apt-transport-https software-properties-common"
    echo "  wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb"
    echo "  sudo dpkg -i packages-microsoft-prod.deb"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install -y powershell"
    echo ""
    echo "Alternative: Run tests manually on Windows PowerShell environment."
    exit 1
fi