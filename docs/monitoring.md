# Monitoring and Alerting

**Version**: 2.0
**Last Updated**: 2026-02-18

## Overview

This document covers monitoring, logging, and alerting strategies for the AppFactory application running on AWS App Runner.

## Logging Strategy

### Log Format

All application logs use structured JSON format:

```json
{
  "timestamp": "2026-01-21T12:00:00.000Z",
  "level": "info",
  "message": "Database connection established",
  "requestId": "abc-123-def-456",
  "context": {
    "database": "appfactory",
    "pool": {
      "total": 10,
      "idle": 8
    }
  }
}
```

### Log Levels

- **error**: Errors requiring immediate attention (database down, unhandled exceptions)
- **warn**: Warning conditions (high connection pool usage, slow queries)
- **info**: General information (server started, endpoint accessed)
- **debug**: Debugging information (not enabled in production)

### What to Log

✅ **Do Log:**
- Request start/end with duration
- Database queries and duration
- External API calls
- Authentication attempts
- Error conditions with stack traces
- Application startup/shutdown
- Health check results

❌ **Don't Log:**
- Passwords or secrets
- Personally identifiable information (PII)
- Full request/response bodies (unless debugging)
- Credit card or payment information

## CloudWatch Logs

### Log Groups

App Runner automatically creates CloudWatch log groups:

```
/aws/apprunner/appfactory/application    # Application logs
/aws/apprunner/appfactory/service        # App Runner service logs
```

### Accessing Logs

**Via AWS Console:**
1. Go to CloudWatch → Log groups
2. Select `/aws/apprunner/appfactory/application`
3. View log streams (one per container instance)

**Via AWS CLI:**

```bash
# Tail application logs
aws logs tail /aws/apprunner/appfactory/application --follow

# Get logs from last hour
aws logs tail /aws/apprunner/appfactory/application --since 1h

# Filter logs by level
aws logs filter-log-events \
  --log-group-name /aws/apprunner/appfactory/application \
  --filter-pattern '{ $.level = "error" }' \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### Log Retention

Configure retention to balance cost and compliance:

```bash
# Set retention to 30 days
aws logs put-retention-policy \
  --log-group-name /aws/apprunner/appfactory/application \
  --retention-in-days 30
```

### Log Insights Queries

**Error rate over time:**
```
filter level = "error"
| stats count() by bin(5m)
```

**Request duration percentiles:**
```
filter message = "Request completed"
| stats avg(duration), pct(duration, 50), pct(duration, 95), pct(duration, 99) by bin(5m)
```

**Database connection pool status:**
```
filter message = "Connection pool status"
| stats avg(context.pool.idle), max(context.pool.total) by bin(5m)
```

**Top error messages:**
```
filter level = "error"
| stats count() by message
| sort count desc
| limit 10
```

## CloudWatch Metrics

### Application Metrics

App Runner provides built-in metrics:

- **Requests**: Total number of requests
- **RequestsPerSecond**: Request rate
- **ActiveInstances**: Number of running instances
- **CPU**: CPU utilization percentage
- **Memory**: Memory utilization percentage
- **Http2xxStatusCount**: Successful requests
- **Http4xxStatusCount**: Client errors
- **Http5xxStatusCount**: Server errors

### Custom Metrics

Publish custom application metrics:

```typescript
// Example: Publishing custom metric
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

async function publishMetric(name: string, value: number) {
  await cloudwatch.putMetricData({
    Namespace: 'AppFactory/Application',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: 'Count',
      Timestamp: new Date()
    }]
  });
}

// Usage
await publishMetric('DatabaseQueryDuration', queryDuration);
```

### Viewing Metrics

**Via AWS Console:**
1. CloudWatch → Metrics → All metrics
2. Browse: AppRunner → Service
3. Select metrics for AppFactory service

**Via AWS CLI:**

```bash
# Get CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/AppRunner \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=appfactory \
  --start-time $(date -u -d '1 hour ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 300 \
  --statistics Average
```

## Alerting

### CloudWatch Alarms

#### 1. High Error Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name appfactory-high-error-rate \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name Http5xxStatusCount \
  --namespace AWS/AppRunner \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=appfactory \
  --treat-missing-data notBreaching
```

#### 2. High CPU Usage Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name appfactory-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/AppRunner \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=appfactory \
  --treat-missing-data notBreaching
```

#### 3. Health Check Failure Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name appfactory-health-check-failed \
  --alarm-description "Alert when health checks fail" \
  --metric-name HealthCheckFailed \
  --namespace AWS/AppRunner \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=appfactory
```

### SNS Topic for Notifications

```bash
# Create SNS topic
aws sns create-topic --name appfactory-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:appfactory-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Update alarms to send to SNS
aws cloudwatch put-metric-alarm \
  --alarm-name appfactory-high-error-rate \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:appfactory-alerts \
  # ... other parameters
```

## Health Checks

### App Runner Health Check Configuration

App Runner is configured to monitor the `/health` endpoint:

- **Path**: `/health`
- **Interval**: 10 seconds
- **Timeout**: 5 seconds
- **Healthy threshold**: 1
- **Unhealthy threshold**: 5

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-21T12:00:00.000Z",
  "database": true,
  "uptime": 3600
}
```

### Monitoring Health Checks

```bash
# Check current health status
aws apprunner describe-service \
  --service-arn YOUR_SERVICE_ARN \
  --query 'Service.HealthCheckConfiguration'

# View health check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/AppRunner \
  --metric-name HealthCheckFailed \
  --dimensions Name=ServiceName,Value=appfactory \
  --start-time $(date -u -d '1 hour ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 60 \
  --statistics Sum
```

## Dashboard

### CloudWatch Dashboard (v2)

Create a comprehensive dashboard:

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/AppRunner", "RequestsPerSecond", {"stat": "Sum"}],
          [".", "Http2xxStatusCount", {"stat": "Sum"}],
          [".", "Http4xxStatusCount", {"stat": "Sum"}],
          [".", "Http5xxStatusCount", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Request Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/AppRunner", "CPUUtilization"],
          [".", "MemoryUtilization"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Resource Utilization"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/aws/apprunner/appfactory/application'\n| filter level = \"error\"\n| stats count() by bin(5m)",
        "region": "us-east-1",
        "title": "Error Rate"
      }
    }
  ]
}
```

## Distributed Tracing (Future Enhancement)

For v2, consider adding AWS X-Ray:

- Trace requests across services
- Identify performance bottlenecks
- Visualize service dependencies
- Detect anomalies

## Performance Monitoring

### Key Metrics to Track

1. **Response Time**
   - p50, p95, p99 latencies
   - Target: < 200ms for p95

2. **Throughput**
   - Requests per second
   - Concurrent requests

3. **Error Rate**
   - 4xx errors (client errors)
   - 5xx errors (server errors)
   - Target: < 0.1% error rate

4. **Resource Utilization**
   - CPU usage
   - Memory usage
   - Database connection pool

5. **Database Performance**
   - Query duration
   - Connection pool usage
   - Failed connections

### Setting Up Alerts

Priority levels:

- **P1 (Critical)**: Service down, health checks failing
  - Action: Immediate response
  - Notification: SMS + Email

- **P2 (High)**: High error rate, degraded performance
  - Action: Within 30 minutes
  - Notification: Email

- **P3 (Medium)**: Resource warnings, approaching limits
  - Action: Within 4 hours
  - Notification: Email (digest)

## Daily Monitoring Checklist

- [ ] Check error rate in CloudWatch
- [ ] Review recent deployments
- [ ] Check resource utilization trends
- [ ] Review top errors in logs
- [ ] Verify backup status (RDS)
- [ ] Check security scan results

## Incident Response

### When Alarms Fire

1. **Acknowledge**: Confirm receipt of alert
2. **Assess**: Check dashboards and logs
3. **Diagnose**: Identify root cause
4. **Mitigate**: Roll back or apply hotfix
5. **Resolve**: Verify resolution
6. **Document**: Post-mortem and lessons learned

### Useful Commands During Incidents

```bash
# Quick health check
curl https://YOUR_APP_URL/health

# Check recent errors
aws logs tail /aws/apprunner/appfactory/application \
  --since 10m \
  --filter-pattern "error"

# Current deployment status
aws apprunner describe-service \
  --service-arn YOUR_SERVICE_ARN \
  --query 'Service.Status'

# List recent deployments
aws apprunner list-operations \
  --service-arn YOUR_SERVICE_ARN \
  --max-results 5
```

## Cost Monitoring

Track CloudWatch costs:

- Log ingestion costs
- Metric storage
- Alarm evaluations
- Dashboard usage

Optimization tips:

- Set appropriate log retention
- Use log sampling for high-volume logs
- Archive old logs to S3
- Use metric filters instead of custom metrics when possible

---

**Remember**: Good monitoring is proactive, not reactive. Set up alerts before you need them.
