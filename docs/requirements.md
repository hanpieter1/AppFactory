# AppFactory - Requirements Document

**Status**: Active
**Last Updated**: 2026-02-18
**Version**: 1.0
**Project Type**: AI-First Business Application Platform

## Purpose

This document provides an overview of the AppFactory Suite requirements, organized into 18 epics covering the complete Mendix Application Lifecycle Management alternative. All user stories are tracked as [GitHub Issues](https://github.com/hanpieter1/AppFactory/issues) on [Project Board #4](https://github.com/users/hanpieter1/projects/4).

## Functional Requirements

### Epic 1: User Management (Issues #1-#6)
User account CRUD, role assignment, profile management, password management, audit logging, bulk operations.

### Epic 2: Master Data (Issues #7-#16)
AppFactory instance management, customer CRUD, project types, Mendix certification levels, skill categories, assessment templates, environment types, department/team structure, business domains, SLA definitions.

### Epic 3: Project Portfolio (Issues #17-#26)
Project creation with portfolio metadata (UID, status lifecycle, AppSize, Complexity, AlertLevel), project detail views, status transitions, archiving, team assignment, environment linking, documentation links, version tracking, dependency mapping, project duplication.

### Epic 4: Governance Templates (Issues #27-#34)
Activity templates, governance checklists, milestone templates, risk categories, review cadence, compliance rules, approval workflows, template versioning.

### Epic 5: Activity Tracking (Issues #35-#42)
Activity creation from templates, status workflows, time logging, linking to governance milestones, bulk updates, recurring activities, activity comments, activity export.

### Epic 6: Checklist Execution (Issues #43-#50)
Checklist instantiation, item completion, evidence uploads, review/approval flow, checklist progress tracking, non-conformity logging, corrective actions, checklist audit trail.

### Epic 7: Maturity Assessments (Issues #51-#58)
Assessment creation, questionnaire completion, scoring calculations, maturity level determination, assessment comparison, improvement planning, assessment scheduling, benchmark data.

### Epic 8: Playbook Templates (Issues #59-#66)
Playbook collection templates, category/item structure, completion tracking, playbook instantiation, progress dashboards, playbook versioning, content library, playbook sharing.

### Epic 9: Certification Tracking (Issues #67-#74)
Employee certification records, expiry tracking, renewal reminders, certification verification, training plan linking, certification reports, bulk import, certification dashboard.

### Epic 10: Skill Matrix (Issues #75-#82)
Skill definitions, proficiency levels, employee skill mapping, skill gap analysis, development plans, team capability views, skill search, skill trend tracking.

### Epic 11: Resource Planning (Issues #83-#90)
Capacity overview, project staffing, availability tracking, allocation conflicts, resource requests, utilization reports, bench tracking, forecast planning.

### Epic 12: Documentation Wiki (Issues #91-#98)
Documentation containers, rich text editing, document categories, version history, search, access control, document templates, document linking.

### Epic 13: Dashboard Analytics (Issues #99-#108)
Dashboard overview on login, KPI widgets, portfolio status charts, resource utilization graphs, assessment trend charts, certification distribution, activity completion rates, custom dashboard configuration, data export, scheduled reports.

### Epic 14: Notification System (Issues #109-#116)
In-app notifications, email notifications, notification preferences, deadline reminders, status change alerts, weekly digest, notification center, notification templates.

### Epic 15: Integration API (Issues #117-#124)
REST API for external integration, Mendix API connector, SSO/SAML integration, webhook support, API rate limiting, API documentation, bulk data import/export, integration logging.

### Epic 16: Export & Reporting (Issues #125-#132)
Data export (CSV/Excel), project status reports, assessment reports, playbook reports, resource reports, certification reports, custom report builder, scheduled exports.

### Epic 17: Audit & Compliance (Issues #133-#140)
Audit trail logging, compliance dashboard, data retention policies, GDPR compliance tools, access logs, change history, audit report generation, regulatory mapping.

### Epic 18: System Administration (Issues #141-#150)
System configuration, tenant management, backup/restore, performance monitoring, feature toggles, system health dashboard, license management, migration tools, environment configuration, system announcements.

## Non-Functional Requirements

### NFR-001: Performance
- API response time < 200ms for standard CRUD operations
- Dashboard load time < 2 seconds
- Support 100 concurrent users

### NFR-002: Security
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- HTTPS only in production
- Security headers (helmet.js)

### NFR-003: Code Quality
- 80%+ test coverage
- ESLint + Prettier compliance
- TypeScript strict mode
- Automated CI/CD pipeline

### NFR-004: Deployment
- Dockerized application
- AWS App Runner deployment
- Automated CI (GitHub Actions)
- Automated CD on merge to main

### NFR-005: Data
- PostgreSQL database
- Migration-based schema management
- Connection pooling
- Date handling (UTC-safe)

## Technical Stack

- **Runtime**: Node.js 20, TypeScript 5+, Express
- **Database**: PostgreSQL 15 (via pg pool)
- **Frontend**: Vanilla HTML/CSS/JS (single-page app)
- **Container**: Docker
- **Cloud**: AWS App Runner, ECR
- **CI/CD**: GitHub Actions
- **Auth**: JWT (access + refresh tokens), bcrypt

## Foundational Infrastructure (Complete)

These components were ported from the Typhoon reference project:

- [x] Express app with middleware stack
- [x] PostgreSQL connection pooling with migrations
- [x] JWT authentication with refresh tokens
- [x] Role-based access control (RBAC)
- [x] Module system with entity/route access
- [x] User management (CRUD + role assignment)
- [x] Client management (CRUD)
- [x] CI pipeline (lint, type-check, test, build, Docker)
- [x] CD pipeline (ECR push, App Runner deploy)
- [x] 582 automated tests (28 test suites)

## Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-02-18 | 1.0 | Initial requirements document for AppFactory Suite |
