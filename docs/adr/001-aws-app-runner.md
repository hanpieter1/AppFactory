# ADR-001: Use AWS App Runner for Container Deployment

**Status**: Accepted
**Date**: 2026-01-21
**Deciders**: Team
**Context**: REQ-015

## Context

We need to choose a deployment platform for our containerized Node.js application. The application is a simple API with database connectivity and needs to be deployed to AWS with minimal operational overhead.

## Decision

We will use **AWS App Runner** as our container deployment platform for v1.

## Alternatives Considered

### 1. AWS App Runner (Selected)
**Pros:**
- Simplest AWS container deployment option
- Fully managed (no EC2 instances to manage)
- Auto-scaling built-in
- Automatic load balancing
- HTTPS by default
- Pay-per-use pricing model
- Perfect for learning and prototyping

**Cons:**
- Less control over infrastructure
- Limited networking options
- Cannot run background workers (only HTTP services)
- Newer service with fewer community resources

### 2. Amazon ECS with Fargate
**Pros:**
- More control over infrastructure
- Better networking options (VPC, security groups)
- Can run background tasks and workers
- Mature service with extensive documentation
- Better for complex architectures

**Cons:**
- More complex setup and configuration
- Requires load balancer management
- More operational overhead
- Higher learning curve

### 3. AWS Lambda + API Gateway
**Pros:**
- True serverless (scales to zero)
- Pay only for execution time
- No server management
- Automatic scaling

**Cons:**
- Cold start latency
- 15-minute execution timeout
- Different programming model
- Database connection pooling challenges
- More complex for traditional web apps

### 4. Amazon Elastic Beanstalk
**Pros:**
- Simple deployment model
- Good for traditional web applications
- Supports Docker containers

**Cons:**
- Feels legacy compared to modern options
- Less flexible than ECS
- Auto-scaling can be unpredictable

## Rationale

For this project's goals (learning AI-first CI/CD workflow), AWS App Runner is the optimal choice because:

1. **Minimal Infrastructure Complexity**: Focus on application and CI/CD, not infrastructure management
2. **Fast Iteration**: Quick deployments without ECS task definition complexity
3. **Cost-Effective for Learning**: Pay-per-use model is ideal for development and learning
4. **Production-Ready**: Despite simplicity, it's a production-grade service
5. **Easy Migration Path**: Can move to ECS later if more control is needed

## Consequences

### Positive
- ✅ Very fast setup and deployment
- ✅ Minimal AWS infrastructure knowledge required
- ✅ Automatic scaling and load balancing
- ✅ HTTPS and custom domains supported
- ✅ CloudWatch integration out-of-the-box
- ✅ Good developer experience

### Negative
- ⚠️ Limited VPC networking options (may complicate RDS access)
- ⚠️ Cannot run background jobs (would need separate Lambda or ECS)
- ⚠️ Less control over deployment strategy
- ⚠️ Vendor lock-in to AWS App Runner

### Mitigation
- For v2, if we need more control, we can migrate to ECS with minimal changes (same container)
- Background jobs can be added via Lambda or separate ECS tasks if needed
- VPC connector for App Runner can solve most networking limitations

## Implementation Notes

1. Use App Runner's automatic deployment from ECR
2. Configure health checks on `/health` endpoint
3. Set environment variables via App Runner configuration
4. Use App Runner's built-in CloudWatch Logs integration
5. Start with 1 vCPU, 2GB RAM (can adjust based on load)

## Migration Path (if needed in v2)

If we outgrow App Runner, migration to ECS is straightforward:
1. Create ECS task definition using same container image
2. Set up Application Load Balancer
3. Configure ECS service with Fargate
4. Update CI/CD to deploy to ECS instead
5. Zero code changes required (same container)

## References

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [App Runner Pricing](https://aws.amazon.com/apprunner/pricing/)
- REQ-015: Deployment Platform Requirements

## Review

This decision should be reviewed if:
- Application needs background workers
- Complex VPC networking requirements emerge
- Need for blue-green deployments
- Cost becomes prohibitive
- App Runner lacks required features
