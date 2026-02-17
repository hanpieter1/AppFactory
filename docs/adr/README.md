# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records (ADRs) for the Typhoon project.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences.

## Format

Each ADR follows this structure:

- **Title**: Short descriptive title
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: The issue motivating this decision
- **Decision**: The change proposed or agreed upon
- **Consequences**: The resulting context after applying the decision

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](adr-001-aws-app-runner.md) | Use AWS App Runner for Deployment | Accepted | 2026-01-21 |
| [ADR-002](adr-002-database-choice.md) | Database Selection | Proposed | 2026-01-21 |
| [ADR-003](adr-003-typescript-framework.md) | TypeScript Framework Selection | Proposed | 2026-01-21 |

## Creating a New ADR

1. Copy the template from `adr-template.md`
2. Name it `adr-XXX-short-title.md` where XXX is the next number
3. Fill in all sections
4. Submit for review
5. Update this index once accepted
