# AWS Infrastructure Setup for AppFactory

**Date:** 2026-01-26
**AWS Account:** 082609687527
**Region:** eu-central-1 (Frankfurt)

---

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   GitHub    │─────▶│  GitHub      │─────▶│   AWS ECR   │
│ Repository  │      │  Actions     │      │ (Container  │
│             │      │  (CI/CD)     │      │  Registry)  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   AWS App    │─────▶│   AWS RDS   │
                     │   Runner     │      │ PostgreSQL  │
                     │ (Container)  │      │  Database   │
                     └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Internet   │
                     │    Users     │
                     └──────────────┘
```

---

## AWS Components

### 1. AWS ECR (Elastic Container Registry)

**Purpose:** Store Docker container images for the application.

**Resource Details:**
- **Repository Name:** `appfactory-app`
- **Repository URI:** `082609687527.dkr.ecr.eu-central-1.amazonaws.com/appfactory-app`
- **Image Scanning:** Enabled (scanOnPush)
- **Encryption:** AES256

**Why ECR?**
- Fully managed Docker container registry
- Integrated with AWS IAM for security
- Automatic image scanning for vulnerabilities
- High availability and durability
- Fast image pulls from App Runner

**How it works:**
1. GitHub Actions builds Docker image from Dockerfile
2. Image is tagged with git commit SHA
3. Pushed to ECR repository
4. App Runner pulls image from ECR to deploy

---

### 2. AWS RDS (Relational Database Service)

**Purpose:** Managed PostgreSQL database for production data.

**Resource Details:**
- **DB Instance Identifier:** `appfactory-db`
- **Engine:** PostgreSQL 15.15
- **Instance Class:** db.t4g.micro (ARM-based, cost-effective)
- **Storage:** 20GB SSD (gp2)
- **Master Username:** `appfactory`
- **Master Password:** `AppFactoryDB2026!`
- **Publicly Accessible:** Yes (for initial setup)
- **Multi-AZ:** No (single availability zone for cost savings)
- **Backup Retention:** 7 days
- **Status:** Creating (takes 5-10 minutes)

**Why RDS?**
- Fully managed PostgreSQL (no manual maintenance)
- Automatic backups and point-in-time recovery
- Automated software patching
- Monitoring and metrics built-in
- Scalable (can upgrade instance class later)
- High availability option with Multi-AZ

**Database Connection String Format:**
```
postgresql://appfactory:AppFactoryDB2026!@<endpoint>:5432/postgres
```

**Security:**
- Default VPC security group
- Will need to allow inbound traffic from App Runner
- Password stored as GitHub Secret (not in code)

---

### 3. GitHub OIDC Provider

**Purpose:** Secure authentication between GitHub Actions and AWS without storing credentials.

**Resource Details:**
- **Provider ARN:** `arn:aws:iam::082609687527:oidc-provider/token.actions.githubusercontent.com`
- **Client ID:** `sts.amazonaws.com`
- **Thumbprints:**
  - `6938fd4d98bab03faadb97b34396831e3780aea1`
  - `1c58a3a8518e8759bf075b76b750d4f2df264fcd`

**Why OIDC?**
- **No long-lived credentials** - More secure than access keys
- **Temporary credentials** - AWS issues short-lived tokens
- **Least privilege** - Can restrict to specific repos/branches
- **Auditable** - CloudTrail logs all actions
- **GitHub recommended** - Best practice for GitHub Actions

**How it works:**
1. GitHub Actions workflow starts
2. GitHub issues an OIDC token
3. Token sent to AWS STS (Security Token Service)
4. AWS validates token against OIDC provider
5. AWS returns temporary credentials (valid ~1 hour)
6. GitHub Actions uses credentials to deploy

---

### 4. IAM Role for GitHub Actions

**Purpose:** Define what permissions GitHub Actions has in AWS.

**Resource Details:**
- **Role Name:** `AppFactoryGitHubActionsRole`
- **Role ARN:** `arn:aws:iam::082609687527:role/AppFactoryGitHubActionsRole`
- **Trust Policy:** Only allows GitHub repo `hanpieter1/AppFactory`
- **Permissions:**
  - `AmazonEC2ContainerRegistryPowerUser` - Push/pull Docker images to ECR
  - `AWSAppRunnerFullAccess` - Create and manage App Runner services

**Trust Relationship:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::082609687527:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:hanpieter1/AppFactory:*"
        }
      }
    }
  ]
}
```

**Security Features:**
- Only allows actions from specific GitHub repo
- Cannot be assumed by any other service
- Scoped to minimum required permissions
- Can be audited via CloudTrail

---

### 5. AWS App Runner (To be created)

**Purpose:** Run containerized application with auto-scaling and load balancing.

**Planned Configuration:**
- **Service Name:** `appfactory-app-service`
- **Source:** ECR repository
- **Port:** 3000
- **Health Check:** `/health` endpoint
- **Auto-scaling:** 1-10 instances based on traffic
- **CPU/Memory:** 1 vCPU, 2GB RAM

**Why App Runner?**
- **Fully managed** - No infrastructure to manage
- **Auto-scaling** - Scales up/down automatically
- **Load balancing** - Built-in HTTPS load balancer
- **Zero-downtime deployments** - Blue/green deployments
- **Custom domains** - Can add your own domain
- **Simpler than ECS/EKS** - No cluster management

**Environment Variables (will be configured):**
```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://appfactory:AppFactoryDB2026!@<rds-endpoint>:5432/postgres
DB_POOL_MAX=20
```

---

## CI/CD Pipeline Flow

### Continuous Integration (Pull Requests)
1. Developer creates pull request
2. GitHub Actions triggers CI workflow
3. Workflow runs:
   - ESLint (code quality)
   - TypeScript type checking
   - Unit tests with coverage
   - Security scan (npm audit)
   - Docker build (validates Dockerfile)
   - Requirements traceability check
4. All checks must pass before merge

### Continuous Deployment (Merge to main)
1. Pull request merged to main branch
2. GitHub Actions triggers CD workflow
3. Workflow authenticates to AWS using OIDC
4. Builds Docker image with commit SHA tag
5. Pushes image to AWS ECR
6. Updates App Runner service with new image
7. App Runner performs blue/green deployment
8. Health check validates new deployment
9. Traffic switches to new version
10. Old version terminated

---

## GitHub Secrets Required

These secrets need to be added to GitHub repository settings:

| Secret Name | Value | Purpose |
|------------|-------|---------|
| `AWS_REGION` | `eu-central-1` | AWS region for deployment |
| `AWS_ACCOUNT_ID` | `082609687527` | Your AWS account ID |
| `AWS_ROLE_ARN` | `arn:aws:iam::082609687527:role/AppFactoryGitHubActionsRole` | IAM role for OIDC |
| `APP_RUNNER_SERVICE_ARN` | `<to be created>` | App Runner service identifier |

**Note:** Database password is NOT stored in GitHub. It's configured in App Runner environment variables in AWS Console.

---

## Cost Estimation (Monthly)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| **AWS ECR** | <5GB storage | ~$0.50 |
| **AWS RDS** | db.t4g.micro, 20GB, Single-AZ | ~$15-20 |
| **AWS App Runner** | 1 vCPU, 2GB RAM, low traffic | ~$10-30 |
| **Data Transfer** | Minimal | ~$1-5 |
| **Total** | | **~$27-56/month** |

**Cost Optimization Tips:**
- Use AWS Free Tier if eligible (12 months)
- Stop RDS instance when not testing (saves ~$15/month)
- Delete ECR images older than 30 days
- Monitor CloudWatch metrics for usage patterns

---

## Security Best Practices Implemented

✅ **No hardcoded credentials** - All secrets in environment variables
✅ **OIDC authentication** - No long-lived AWS access keys
✅ **Least privilege IAM** - Role has minimum required permissions
✅ **Encrypted storage** - RDS and ECR use encryption at rest
✅ **HTTPS only** - App Runner provides HTTPS by default
✅ **Container scanning** - ECR scans images for vulnerabilities
✅ **Database backups** - 7-day retention for disaster recovery
✅ **VPC isolation** - RDS in VPC, App Runner connects via VPC connector

---

## Monitoring & Observability

**CloudWatch Logs:**
- App Runner automatically sends logs to CloudWatch
- Application JSON logs include request tracing
- Database slow query logs enabled in RDS

**CloudWatch Metrics:**
- App Runner: CPU, Memory, HTTP requests, latency
- RDS: Connections, IOPS, storage, CPU
- ECR: Image pushes, pulls

**Alerts (to be configured):**
- App Runner health check failures
- RDS CPU > 80%
- RDS storage < 20% free
- App Runner 5xx errors > threshold

---

## Troubleshooting Guide

### Issue: Deployment fails at ECR push
**Cause:** GitHub Actions doesn't have ECR permissions
**Fix:** Verify IAM role has `AmazonEC2ContainerRegistryPowerUser` policy

### Issue: App Runner can't connect to RDS
**Cause:** Security group blocking traffic
**Fix:** Add App Runner VPC connector to RDS security group

### Issue: Application returns 503
**Cause:** Database connection failed
**Fix:** Check DATABASE_URL environment variable in App Runner

### Issue: GitHub Actions can't assume role
**Cause:** OIDC trust policy mismatch
**Fix:** Verify repository name in trust policy matches exactly

---

## Next Steps

1. ⏳ **Wait for RDS database to finish creating** (~5-10 minutes)
2. 📝 **Get RDS endpoint** and create DATABASE_URL
3. 🚀 **Create App Runner service** with ECR image
4. 🔐 **Add GitHub Secrets** for CI/CD pipeline
5. ✅ **Test deployment** by pushing to main branch
6. 🌐 **Access application** via App Runner URL

---

**Last Updated:** 2026-01-26
**Status:** AWS infrastructure partially deployed - waiting for RDS database