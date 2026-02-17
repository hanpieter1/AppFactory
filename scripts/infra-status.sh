#!/bin/bash
# Check AWS App Runner service status

set -e

# Configuration
AWS_REGION="eu-central-1"
SERVICE_ARN="arn:aws:apprunner:eu-central-1:082609687527:service/typhoon-app-service/6bb78862b031454b9850d3a66e86cd38"
SERVICE_URL="https://nhu9kpwmmy.eu-central-1.awsapprunner.com"

echo "Checking App Runner service status..."
echo ""

# Get service details
SERVICE_INFO=$(aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region "$AWS_REGION" \
  --output json)

STATUS=$(echo "$SERVICE_INFO" | grep -o '"Status": "[^"]*"' | head -1 | cut -d'"' -f4)
SERVICE_NAME=$(echo "$SERVICE_INFO" | grep -o '"ServiceName": "[^"]*"' | head -1 | cut -d'"' -f4)

echo "Service: $SERVICE_NAME"
echo "Status:  $STATUS"
echo "Region:  $AWS_REGION"
echo "URL:     $SERVICE_URL"
echo ""

if [[ "$STATUS" == "RUNNING" ]]; then
  echo "Service is RUNNING - you are being billed for compute"
  echo ""
  echo "Health check:"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "  /health: OK (HTTP $HTTP_CODE)"
  else
    echo "  /health: FAILED (HTTP $HTTP_CODE)"
  fi
elif [[ "$STATUS" == "PAUSED" ]]; then
  echo "Service is PAUSED - no compute charges"
  echo ""
  echo "To resume: ./scripts/infra-start.sh"
else
  echo "Service is in state: $STATUS"
  echo "Check AWS console for details"
fi
