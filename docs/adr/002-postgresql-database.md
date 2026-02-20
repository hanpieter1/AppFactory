# ADR-002: Use PostgreSQL on AWS RDS for Database

**Status**: Accepted
**Date**: 2026-01-21
**Deciders**: Team
**Context**: REQ-014

## Context

We need to choose a database for our reference application that will demonstrate database connectivity, health checks, and basic operations while being suitable for learning CI/CD patterns.

## Decision

We will use **PostgreSQL 15+ on AWS RDS** as our database.

## Alternatives Considered

### 1. PostgreSQL on RDS (Selected)
**Pros:**
- Industry-standard relational database
- ACID compliance for data integrity
- Excellent Node.js support (pg, pg-pool)
- Strong typing and schema enforcement
- Great for learning SQL and migrations
- Managed service (automated backups, updates)
- Wide developer familiarity

**Cons:**
- Always-on cost (even when idle)
- Requires VPC networking setup
- More complex than DynamoDB for simple use cases
- Need to manage connection pooling

### 2. Amazon DynamoDB
**Pros:**
- True serverless (pay per request)
- Scales to zero
- No server management
- Fast key-value operations
- Built-in time-to-live (TTL)

**Cons:**
- NoSQL requires different mental model
- Less familiar to many developers
- Query limitations vs SQL
- More expensive at low scale
- Harder to demonstrate traditional database patterns

### 3. Amazon Aurora Serverless v2
**Pros:**
- PostgreSQL compatible
- Scales to zero (cost savings)
- Auto-scaling capacity
- Excellent performance

**Cons:**
- More expensive minimum capacity
- More complex pricing
- Overkill for learning project
- Additional configuration complexity

### 4. SQLite (Local file)
**Pros:**
- Zero operational overhead
- No separate database server
- Fast for small datasets
- Easy local development

**Cons:**
- Not suitable for cloud deployment
- No connection pooling learning
- Doesn't demonstrate production patterns
- Limited concurrency

## Rationale

PostgreSQL on RDS is the best choice because:

1. **Learning Value**: Demonstrates real-world database patterns
   - Connection pooling
   - Health checks
   - Migrations
   - Backup/recovery

2. **Industry Relevance**: Most common database in web applications
   - Transferable skills
   - Standard SQL knowledge
   - Common in job requirements

3. **Node.js Ecosystem**: Excellent library support
   - `pg` driver is mature and well-maintained
   - `pg-pool` for connection pooling
   - TypeScript support

4. **AWS Integration**: RDS is production-ready
   - Automated backups
   - Point-in-time recovery
   - Security groups and VPC
   - CloudWatch metrics

5. **Development Experience**: Easy local development
   - Can run PostgreSQL in Docker locally
   - Same database locally and in production
   - Good tooling (pgAdmin, psql)

## Consequences

### Positive
- ✅ Learn connection pooling patterns
- ✅ Practice SQL and database design
- ✅ Understand RDS deployment and management
- ✅ Same database locally (Docker) and production
- ✅ Strong typing and schema validation
- ✅ ACID transactions
- ✅ Excellent monitoring and logging

### Negative
- ⚠️ Always-on cost (even for idle dev environment)
- ⚠️ Need to manage connection pooling
- ⚠️ Requires VPC networking configuration
- ⚠️ Need backup and recovery strategy

### Mitigation
- Use db.t3.micro for dev (free tier eligible)
- Can stop RDS instance when not in use
- Connection pooling is valuable to learn
- VPC setup is one-time configuration

## Implementation Details

### Database Configuration
```typescript
{
  host: process.env.DB_HOST,
  port: 5432,
  database: 'appfactory',
  user: 'appfactory',
  password: process.env.DB_PASSWORD,
  max: 20, // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}
```

### Local Development
- Use Docker Compose to run PostgreSQL locally
- Same version as RDS (15+)
- Consistent environment variables

### Production
- AWS RDS PostgreSQL 15.4+
- db.t3.micro for v1 (can scale up)
- Automated backups enabled
- Multi-AZ for v2 (if needed)

## Migration Path

If requirements change:

**To DynamoDB**: Unlikely to be beneficial, would require significant refactoring

**To Aurora Serverless**: Easy migration if cost optimization needed
- Aurora is PostgreSQL-compatible
- Minimal code changes
- Better for variable workloads

**To self-managed PostgreSQL**: Possible but not recommended
- More operational overhead
- Lose RDS benefits
- Only if cost is major concern

## Schema Strategy (v1)

For v1, keep it minimal:
- Manual SQL for initial schema
- No migration framework yet (add in v2)
- Simple tables for demo purposes

```sql
-- Example: Simple health check table
CREATE TABLE health_checks (
  id SERIAL PRIMARY KEY,
  checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL
);
```

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [node-postgres Documentation](https://node-postgres.com/)
- REQ-014: Database Requirements

## Review

This decision should be reviewed if:
- Cost becomes prohibitive
- Need for NoSQL patterns emerges
- Serverless scaling becomes critical
- Different database features required
