# AI-First Development Workflow

**Version**: 2.0
**Last Updated**: 2026-02-18

## Overview

This document defines how AI agents (primarily Claude Code) work within the AppFactory project to maintain quality, consistency, and traceability throughout the development lifecycle.

## Core Principles

### 1. Requirements-Driven Development
- All work must trace back to a user story ID (US-XXX)
- User stories are tracked in [GitHub Issues](https://github.com/hanpieter1/AppFactory/issues)
- PRs and commits must reference story IDs

### 2. Small, Focused Changes
- One feature per PR
- Keep PRs under 400 lines of code when possible
- Each commit should be atomic and reversible

### 3. Test-First Mindset
- Write tests alongside code
- Maintain 80%+ code coverage
- Tests must pass before merge

### 4. Documentation as Code
- Update docs in the same PR as code changes
- Keep README, requirements, and ADRs in sync
- Document "why" not just "what"

## Agent Roles

### Development Agent (Claude Code)
**Responsibilities:**
- Implement features based on requirements
- Write unit and integration tests
- Update documentation
- Follow coding standards
- Create focused PRs

**Guardrails:**
- Must read existing code before suggesting changes
- Must update issue status when working on user stories
- Must include tests with every feature
- Must run linting and tests locally before committing
- Must keep changes minimal and focused

### Quality Agent (CI Pipeline + Claude)
**Responsibilities:**
- Run automated checks on every PR
- Validate code quality and test coverage
- Check security vulnerabilities
- Verify requirements traceability

**Checks Performed:**
- ESLint and Prettier compliance
- TypeScript type checking
- Unit and integration tests
- Code coverage threshold (80%)
- Security scanning (npm audit)
- Secret scanning
- Docker build verification
- User story traceability validation

### Security Agent (CI + Manual Review)
**Responsibilities:**
- Scan dependencies for vulnerabilities
- Check for exposed secrets
- Validate secure coding practices
- Monitor for OWASP Top 10 vulnerabilities

**Checks Performed:**
- npm audit for dependency vulnerabilities
- git-secrets or similar for secret scanning
- Container image scanning
- Block merge if high/critical vulnerabilities found

## Coding Standards

### TypeScript
```typescript
// Use strict mode
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true

// Prefer interfaces for object shapes
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: boolean;
}

// Use async/await over promises
async function checkHealth(): Promise<HealthCheckResponse> {
  // ...
}

// Proper error handling
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw new AppError('Operation failed', 500);
}
```

### Naming Conventions
- **Files**: kebab-case (`health-check.ts`)
- **Classes**: PascalCase (`DatabaseService`)
- **Functions/Variables**: camelCase (`getDatabaseStatus`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase with descriptive names (`HealthCheckResponse`)

### Project Structure
```
src/
├── app.ts              # Express app setup
├── server.ts           # Server entry point
├── config/            # Configuration
│   └── database.ts
├── routes/            # Route handlers
│   ├── health.ts
│   └── api/
│       └── status.ts
├── services/          # Business logic
│   └── database.service.ts
├── middleware/        # Express middleware
│   ├── logger.ts
│   ├── error-handler.ts
│   └── request-id.ts
└── utils/             # Utilities
    └── logger.ts
```

### Logging Standards
```typescript
// Use structured JSON logging
logger.info('Database connection established', {
  requestId: req.id,
  database: config.database.name,
  pool: {
    total: pool.totalCount,
    idle: pool.idleCount
  }
});

// Log levels
logger.error()  // Errors requiring immediate attention
logger.warn()   // Warning conditions
logger.info()   // General information
logger.debug()  // Debugging information (not in prod)

// Always include request ID for tracing
// Never log sensitive data (passwords, tokens, PII)
```

### Error Handling
```typescript
// Custom error classes
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

// Centralized error handling middleware
app.use(errorHandler);

// Always return consistent error format
{
  "error": {
    "message": "Database connection failed",
    "code": "DB_CONNECTION_ERROR",
    "timestamp": "2026-01-21T12:00:00.000Z",
    "requestId": "abc-123"
  }
}
```

## Testing Strategy

### Unit Tests
- Test individual functions and classes in isolation
- Mock external dependencies
- Fast execution (< 5 seconds total)
- Naming: `*.test.ts` or `*.spec.ts`

```typescript
describe('DatabaseService', () => {
  it('should return true when database is reachable', async () => {
    const service = new DatabaseService(mockPool);
    const result = await service.ping();
    expect(result).toBe(true);
  });
});
```

### Integration Tests
- Test API endpoints end-to-end
- Use test database
- Verify database interactions
- Naming: `*.integration.test.ts`

```typescript
describe('GET /health', () => {
  it('should return 200 when healthy', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });
});
```

### Coverage Requirements
- Overall: 80% minimum
- Critical paths (health checks, DB): 100%
- Utilities: 90%

## PR Workflow

### Creating a PR

1. **Branch naming**: `feature/issue-XXX-short-description-username`

2. **PR Title Format**:
   ```
   [US-XXX] Brief description of change
   ```

3. **PR Description Template**:
   ```markdown
   ## User Story
   Closes #XXX

   ## What Changed
   - List of changes
   - What was added/modified/removed

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed
   - [ ] All tests passing locally

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Documentation updated
   - [ ] Issue status updated
   - [ ] No new warnings or errors
   - [ ] Security considerations addressed
   ```

### PR Checklist (AI Agent)

Before submitting a PR, the AI agent must verify:

- [ ] User story ID included in title or commits
- [ ] Tests added for new functionality
- [ ] All existing tests passing
- [ ] Code coverage meets threshold (80%)
- [ ] No linting errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Documentation updated
- [ ] Issue status updated on project board
- [ ] No secrets or sensitive data committed
- [ ] Docker build succeeds
- [ ] Changes are minimal and focused

### PR Review Process

**Human Review Focus:**
- Business logic correctness
- Security implications
- Architecture decisions
- User experience

**Automated Review (CI):**
- Code quality (linting, formatting)
- Tests passing
- Security scanning
- Build verification

## When AI Can Act Autonomously

The AI agent can proceed without asking when:

### ✅ Autonomous Actions
- Implementing features with clear requirements
- Writing unit and integration tests
- Fixing linting/formatting issues
- Updating documentation to match code
- Adding logging statements
- Fixing obvious bugs with clear root cause
- Refactoring within a single file for clarity
- Adding type definitions
- Updating dependencies (minor/patch versions)

### ❓ Requires Human Decision

- Adding new dependencies (major versions)
- Changing architecture or design patterns
- Modifying API contracts (endpoints, response formats)
- Security-related changes
- Database schema changes
- Changing CI/CD pipeline behavior
- Updating production configuration
- Removing features or endpoints
- Breaking changes

## Security Baseline

### Required Practices
- ✅ No secrets in code repository
- ✅ Environment variables for configuration
- ✅ Dependency scanning enabled
- ✅ Secret scanning enabled
- ✅ Regular security updates
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input sanitization)
- ✅ HTTPS only in production
- ✅ Security headers (helmet.js)

### Prohibited Actions
- ❌ Committing .env files
- ❌ Hardcoding credentials
- ❌ Disabling security features
- ❌ Skipping security scans
- ❌ Using vulnerable dependencies
- ❌ Exposing stack traces in production
- ❌ Logging sensitive data

## Requirements Traceability

### Commit Message Format
```
feat: Short description (#XXX)

Longer description if needed.

- Specific change 1
- Specific change 2
```

### Code Comments (when needed)
```typescript
// US-001: Health check must include database status
const dbStatus = await databaseService.ping();
```

### Test Descriptions
```typescript
// US-001: Health endpoint returns database status
it('should include database status in health check', () => {
  // ...
});
```

## CI/CD Integration

### Local Development (mirrors CI)
```bash
# What CI runs - developers should run this before pushing
npm run lint        # ESLint + Prettier
npm run type-check  # TypeScript
npm test            # Jest tests
npm run build       # Production build
```

### CI Pipeline (GitHub Actions)
- Triggered on: Pull requests
- Steps:
  1. Checkout code
  2. Install dependencies
  3. Lint and format check
  4. Type checking
  5. Run tests with coverage
  6. Security scanning
  7. Build Docker image
  8. User story traceability check

### CD Pipeline (GitHub Actions)
- Triggered on: Merge to main
- Steps:
  1. Run CI checks
  2. Build Docker image
  3. Push to AWS ECR
  4. Deploy to AWS App Runner
  5. Smoke test deployed endpoint
  6. Notify on failure

## Maintenance and Evolution

### Updating This Workflow
- Changes require team discussion
- Document rationale in ADR
- Update version and date
- Communicate changes to all agents

### Continuous Improvement
- Review workflow quarterly
- Incorporate lessons learned
- Update based on project evolution
- Keep documentation in sync with practice

## Quick Reference

### Commands
```bash
npm run dev       # Start development server
npm test          # Run all tests
npm run lint      # Lint and format check
npm run build     # Production build
```

### Links
- [Requirements](requirements.md)
- [Architecture Decisions](adr/)
- [Deployment Guide](deployment.md)
- [Monitoring](monitoring.md)
- [User Story Definition](user-story-definition.md)
- [Sprint Workflow](sprint-workflow.md)

---

**Remember**: This is a living document. When you find something that works better, update this guide and share with the team.
