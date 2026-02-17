#!/bin/bash
# Stop/Pause AWS App Runner service to save costs
# This pauses the service - you stop paying for compute but keep the URL

set -e

# Configuration
AWS_REGION="eu-central-1"
SERVICE_ARN="arn:aws:apprunner:eu-central-1:082609687527:service/typhoon-app-service/6bb78862b031454b9850d3a66e86cd38"

echo "Pausing App Runner service..."
echo "Service: $SERVICE_ARN"
echo ""

# Check current status
STATUS=$(aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region "$AWS_REGION" \
  --query 'Service.Status' \
  --output text)

echo "Current status: $STATUS"

if [[ "$STATUS" == "PAUSED" ]]; then
  echo "Service is already paused."
  exit 0
fi

if [[ "$STATUS" != "RUNNING" ]]; then
  echo "Service is not in RUNNING state (current: $STATUS). Cannot pause."
  exit 1
fi

# Pause the service
aws apprunner pause-service \
  --service-arn "$SERVICE_ARN" \
  --region "$AWS_REGION"

echo ""
echo "Pause initiated. Waiting for service to pause..."

# Wait for pause to complete
for i in {1..30}; do
  STATUS=$(aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$AWS_REGION" \
    --query 'Service.Status' \
    --output text)

  echo "Status: $STATUS"

  if [[ "$STATUS" == "PAUSED" ]]; then
    echo ""
    echo "Service paused successfully!"
    echo "You are no longer paying for compute resources."
    echo ""
    echo "To resume, run: ./scripts/infra-start.sh"
    exit 0
  fi

  sleep 10
done

echo "Timeout waiting for pause. Check AWS console."
