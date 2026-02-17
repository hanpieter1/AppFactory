#!/bin/bash
# Start/Resume AWS App Runner service
# This resumes a paused service - billing resumes

set -e

# Configuration
AWS_REGION="eu-central-1"
SERVICE_ARN="arn:aws:apprunner:eu-central-1:082609687527:service/typhoon-app-service/6bb78862b031454b9850d3a66e86cd38"
SERVICE_URL="https://nhu9kpwmmy.eu-central-1.awsapprunner.com"

echo "Resuming App Runner service..."
echo "Service: $SERVICE_ARN"
echo ""

# Check current status
STATUS=$(aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region "$AWS_REGION" \
  --query 'Service.Status' \
  --output text)

echo "Current status: $STATUS"

if [[ "$STATUS" == "RUNNING" ]]; then
  echo "Service is already running."
  echo "URL: $SERVICE_URL"
  exit 0
fi

if [[ "$STATUS" != "PAUSED" ]]; then
  echo "Service is not in PAUSED state (current: $STATUS). Cannot resume."
  exit 1
fi

# Resume the service
aws apprunner resume-service \
  --service-arn "$SERVICE_ARN" \
  --region "$AWS_REGION"

echo ""
echo "Resume initiated. Waiting for service to start..."

# Wait for service to be running
for i in {1..30}; do
  STATUS=$(aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$AWS_REGION" \
    --query 'Service.Status' \
    --output text)

  echo "Status: $STATUS"

  if [[ "$STATUS" == "RUNNING" ]]; then
    echo ""
    echo "Service is running!"
    echo "URL: $SERVICE_URL"
    echo ""
    echo "Testing health endpoint..."
    curl -s "$SERVICE_URL/health" | head -c 200
    echo ""
    exit 0
  fi

  sleep 10
done

echo "Timeout waiting for service. Check AWS console."
