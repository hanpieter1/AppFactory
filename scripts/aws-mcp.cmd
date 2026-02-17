@echo off
set AWS_PROFILE=default
set AWS_REGION=eu-central-1
"C:\Users\hduy\.local\bin\uvx.exe" mcp-proxy-for-aws==1.1.6 "https://aws-mcp.eu-central-1.api.aws/mcp" --region eu-central-1 --log-level ERROR %*
