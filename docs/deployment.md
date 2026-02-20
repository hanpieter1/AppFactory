# Deployment Guide - AWS App Runner

**Version**: 2.0
**Last Updated**: 2026-02-18
**Status**: Template - Adapt for AppFactory deployment

## Overview

This guide covers deploying AppFactory to AWS App Runner using GitHub Actions for CI/CD.

## Architecture

```
GitHub Repository
    ↓ (on PR)
CI Pipeline (GitHub Actions)
    ↓ (on merge to main)
Build Docker Image
    ↓
AWS ECR (Elastic Container Registry)
    ↓
AWS App Runner
    ↓
AWS RDS PostgreSQL
```

## Prerequisites

### AWS Account Setup
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Access to create:
  - ECR repositories
  - App Runner services
  - RDS instances
  - IAM roles and policies
  - CloudWatch logs

### GitHub Setup
- GitHub repository with Actions enabled
- GitHub OIDC provider configured in AWS (recommended)
- Secrets configured in GitHub repository

## AWS Resources Setup

### 1. Create ECR Repository

```bash
# Create ECR repository for Docker images
aws ecr create-repository \
  --repository-name appfactory \
  --region eu-central-1 \
  --image-scanning-configuration scanOnPush=true

# Note the repository URI (needed for GitHub Actions)
export ECR_REPOSITORY=$(aws ecr describe-repositories \
  --repository-names appfactory \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository: $ECR_REPOSITORY"
```

### 2. Create RDS PostgreSQL Database

```bash
# Create DB subnet group (if not exists)
aws rds create-db-subnet-group \
  --db-subnet-group-name appfactory-db-subnet \
  --db-subnet-group-description "Subnet group for AppFactory DB" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Create security group for RDS
aws ec2 create-security-group \
  --group-name appfactory-db-sg \
  --description "Security group for AppFactory database" \
  --vpc-id vpc-xxxxx

# Allow App Runner to connect to RDS
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-apprunner-xxxxx

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier appfactory-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username appfactory \
  --master-user-password 'ChangeThisPassword!' \
  --allocated-storage 20 \
  --db-subnet-group-name appfactory-db-subnet \
  --vpc-security-group-ids sg-xxxxx \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --no-publicly-accessible

# Wait for DB to be available
aws rds wait db-instance-available \
  --db-instance-identifier appfactory-db

# Get DB endpoint
export DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier appfactory-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Database endpoint: $DB_ENDPOINT"
```

### 3. Create App Runner Service

For the first deployment, you can create the service manually. Subsequent deployments will be automated via GitHub Actions.

```bash
# Create IAM role for App Runner
aws iam create-role \
  --role-name AppFactoryAppRunnerRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "build.apprunner.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach ECR access policy
aws iam attach-role-policy \
  --role-name AppFactoryAppRunnerRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

# Create App Runner service (will be updated by CD pipeline)
# Note: Replace the placeholders with actual values
aws apprunner create-service \
  --service-name appfactory \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'"$ECR_REPOSITORY"':latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "3001",
          "DATABASE_URL": "postgresql://appfactory:ChangeThisPassword!@'"$DB_ENDPOINT"':5432/appfactory"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/AppFactoryAppRunnerRole"
    },
    "AutoDeploymentsEnabled": false
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }' \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }'

# Get App Runner service URL
export APP_URL=$(aws apprunner describe-service \
  --service-arn arn:aws:apprunner:eu-central-1:ACCOUNT_ID:service/appfactory/xxxxx \
  --query 'Service.ServiceUrl' \
  --output text)

echo "Application URL: https://$APP_URL"
```

## GitHub OIDC Setup (Recommended)

Instead of using long-lived AWS access keys, configure OIDC for secure, temporary credentials.

### 1. Create OIDC Provider in AWS

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2. Create IAM Role for GitHub Actions

```bash
# Create trust policy (save as trust-policy.json)
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/AppFactory:*"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://trust-policy.json

# Attach necessary policies
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# Create custom policy for App Runner
cat > apprunner-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:DescribeService",
        "apprunner:UpdateService",
        "apprunner:StartDeployment"
      ],
      "Resource": "arn:aws:apprunner:*:YOUR_ACCOUNT_ID:service/appfactory/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-name AppRunnerDeploy \
  --policy-document file://apprunner-policy.json
```

## GitHub Secrets Configuration

Configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

**Location**: https://github.com/hanpieter1/AppFactory/settings/secrets/actions

### Required Secrets (Current Working Setup)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key |
| `APP_RUNNER_SERVICE_ARN` | App Runner service ARN |

**Note**: The ECR repository name (`appfactory-app`) and region (`eu-central-1`) are configured directly in the workflow file.

### Current Working Values

```
APP_RUNNER_SERVICE_ARN: <to be configured after first deployment>
```

### Alternative: Using OIDC (For Production)

For enhanced security, consider using OIDC instead of access keys:
- `AWS_ROLE_ARN` - ARN of the GitHubActionsDeployRole

See the OIDC setup section above for configuration details.

### Setting Secrets via CLI

```bash
# Using GitHub CLI
gh secret set AWS_ACCESS_KEY_ID --body "YOUR_ACCESS_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_SECRET_KEY"
gh secret set APP_RUNNER_SERVICE_ARN --body "arn:aws:apprunner:eu-central-1:082609687527:service/appfactory-app-service/6bb78862b031454b9850d3a66e86cd38"
```

## Deployment Process

### Automated Deployment (Main Branch)

When code is merged to `main`:

1. GitHub Actions triggers the CD pipeline
2. Pipeline runs all CI checks (lint, type-check, tests, build)
3. Configures AWS credentials using access keys
4. Logs in to Amazon ECR
5. Builds Docker image with git SHA tag
6. Pushes image to ECR (both SHA tag and `latest`)
7. Waits for App Runner service to be in RUNNING state (up to 5 minutes)
8. Triggers App Runner deployment via `start-deployment`
9. Waits for deployment to complete
10. Runs smoke tests (`/health` and `/api/status`)
11. Generates deployment summary with URLs

**Live Application URL**: *To be configured after deployment*

### Manual Deployment

```bash
# Build Docker image locally
docker build -t appfactory:latest .

# Tag for ECR
docker tag appfactory:latest $ECR_REPOSITORY:latest

# Login to ECR
aws ecr get-login-password --region eu-central-1 | \
  docker login --username AWS --password-stdin $ECR_REPOSITORY

# Push to ECR
docker push $ECR_REPOSITORY:latest

# Trigger App Runner deployment
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-central-1:ACCOUNT_ID:service/appfactory/xxxxx
```

## Monitoring Deployment

### Check Deployment Status

```bash
# App Runner service status
aws apprunner describe-service \
  --service-arn YOUR_SERVICE_ARN \
  --query 'Service.Status'

# Recent operations
aws apprunner list-operations \
  --service-arn YOUR_SERVICE_ARN \
  --max-results 10
```

### View Logs

```bash
# App Runner logs (goes to CloudWatch)
aws logs tail /aws/apprunner/appfactory/application --follow
```

### Smoke Test

```bash
# Test health endpoint
curl https://YOUR_APP_URL/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2026-01-30T12:00:00.000Z",
  "database": true
}

# Test status endpoint
curl https://YOUR_APP_URL/api/status

# Expected response contains
{
  "application": {
    "name": "AppFactory",
    ...
  }
}
```

## Rollback Procedure

If deployment fails or issues are detected:

### Option 1: Rollback via App Runner Console
1. Go to AWS App Runner console
2. Select the AppFactory service
3. Go to "Deployments" tab
4. Click "Roll back" on the last successful deployment

### Option 2: Deploy Previous Image

```bash
# List recent images
aws ecr describe-images \
  --repository-name appfactory \
  --query 'sort_by(imageDetails,& imagePushedAt)[-5:]'

# Update service to use specific image
aws apprunner update-service \
  --service-arn YOUR_SERVICE_ARN \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'"$ECR_REPOSITORY"':PREVIOUS_SHA"
    }
  }'
```

## Cost Optimization

### Development Environment
- Use `db.t3.micro` for RDS (within free tier for 12 months)
- App Runner: 1 vCPU, 2 GB memory (pay per use)
- Enable auto-pause for App Runner if inactive

### Production Considerations
- Right-size App Runner instances based on load
- Use RDS reserved instances for cost savings
- Configure appropriate CloudWatch log retention
- Enable App Runner auto-scaling based on request volume

## Troubleshooting

### App Runner Service Won't Start

```bash
# Check logs for errors
aws logs tail /aws/apprunner/appfactory/application --since 5m

# Common issues:
# - DATABASE_URL incorrect
# - Port mismatch (ensure container exposes 3000)
# - Health check failing (check /health endpoint)
```

### Database Connection Fails

```bash
# Verify security group allows App Runner ingress
# Check DB endpoint is correct
# Test connection from App Runner container
```

### Deployment Stuck

```bash
# Check operation status
aws apprunner list-operations --service-arn YOUR_SERVICE_ARN

# If stuck, consider:
# 1. Cancel operation
# 2. Review logs for errors
# 3. Fix issue and redeploy
```

## Security Checklist

- [ ] Database credentials stored in AWS Secrets Manager or Parameter Store
- [ ] RDS not publicly accessible
- [ ] Security groups configured with least privilege
- [ ] App Runner service logs enabled
- [ ] Container image scanning enabled in ECR
- [ ] HTTPS enforced (App Runner provides this by default)
- [ ] IAM roles follow least privilege principle
- [ ] Secrets rotation configured

## Next Steps (v2)

- [ ] Move infrastructure to Terraform
- [ ] Add staging environment
- [ ] Implement blue-green deployments
- [ ] Add custom domain and SSL certificate
- [ ] Configure auto-scaling policies
- [ ] Set up CloudWatch dashboards
- [ ] Implement automated database backups verification
- [ ] Add performance monitoring (X-Ray)

---

**For questions or issues, refer to the troubleshooting section or check CloudWatch logs.**
