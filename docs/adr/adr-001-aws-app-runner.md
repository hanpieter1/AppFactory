# ADR-001: Use AWS App Runner for Deployment

**Status**: Accepted
**Date**: 2026-01-21
**Deciders**: [Team/Architects]

## Context

We need to choose a deployment platform for the AppFactory web application. The application is built with Node.js/TypeScript and requires:

- Automatic scaling based on traffic
- Minimal operational overhead
- Built-in load balancing
- HTTPS/SSL support
- Integration with AWS ecosystem
- Cost-effectiveness for variable workloads

### Options Considered

1. **AWS App Runner**
2. **AWS Elastic Beanstalk**
3. **AWS ECS with Fargate**
4. **AWS Lambda + API Gateway**
5. **EC2 with manual orchestration**

## Decision

We will use **AWS App Runner** as the primary deployment platform for AppFactory.

## Rationale

### Pros of AWS App Runner

- **Simplicity**: Minimal configuration required; just point to container image or source code
- **Automatic Scaling**: Built-in auto-scaling based on incoming traffic and resource utilization
- **Fully Managed**: No infrastructure management, patching, or server administration
- **Cost Efficient**: Pay only for resources used; scales down to minimal instances during low traffic
- **Fast Deployment**: Quick deployments with automatic rollback on failures
- **Built-in Features**: Load balancing, HTTPS, health checks, and observability out of the box
- **Container Support**: Native Docker support aligns with our containerization strategy
- **VPC Integration**: Can connect to private RDS databases and other VPC resources

### Cons and Mitigations

- **Limited Customization**: Less control over underlying infrastructure
  - *Mitigation*: App Runner provides sufficient configuration for our use case
- **AWS Lock-in**: Tied to AWS ecosystem
  - *Mitigation*: We use Docker containers, making migration feasible if needed
- **Cost at Scale**: May become expensive at very high scale
  - *Mitigation*: Can migrate to ECS/EKS if scaling needs exceed App Runner's sweet spot

### Comparison with Alternatives

**vs. Elastic Beanstalk**:
- App Runner is more modern and simpler
- Better auto-scaling capabilities
- Less legacy complexity

**vs. ECS/Fargate**:
- App Runner provides higher-level abstractions
- Less operational complexity
- ECS may be needed later if we need more control

**vs. Lambda**:
- Better for long-running HTTP applications
- No cold start issues
- Simpler state management

**vs. EC2**:
- No server management overhead
- Better cost efficiency with auto-scaling
- Faster time to market

## Consequences

### Positive

- Faster development velocity due to reduced DevOps overhead
- Built-in best practices for security, scaling, and monitoring
- Lower operational costs for small to medium scale
- Easy integration with other AWS services (RDS, S3, CloudWatch)

### Negative

- Team needs to learn App Runner specifics
- Less flexibility if we need custom infrastructure configurations
- Migration effort required if we outgrow App Runner

### Neutral

- Commit to AWS ecosystem (already aligned with project constraints)
- Need to containerize application (good practice regardless)

## Implementation Notes

- Use Docker multi-stage builds for optimized images
- Configure auto-scaling parameters based on load testing
- Set up CloudWatch alarms for monitoring
- Use App Runner VPC connector for private resource access
- Implement CI/CD pipeline to automate deployments from GitHub

## Related Decisions

- ADR-002: Database Selection (must support VPC integration)
- ADR-003: TypeScript Framework Selection (must be containerizable)

## References

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [App Runner Pricing](https://aws.amazon.com/apprunner/pricing/)
- [App Runner Best Practices](https://docs.aws.amazon.com/apprunner/latest/dg/best-practices.html)
