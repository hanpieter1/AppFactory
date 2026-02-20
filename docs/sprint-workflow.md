# Sprint Workflow

This document describes the agile sprint workflow for the AppFactory project using GitHub Projects.

## Project Board

**URL:** https://github.com/users/hanpieter1/projects/4

## Sprint Cadence

- **Sprint Duration:** 2 weeks
- **Sprint Planning:** First Monday of sprint
- **Daily Standup:** Check board status daily
- **Sprint Review:** Last Friday of sprint
- **Retrospective:** After sprint review

## Board Columns

| Column | Description |
|--------|-------------|
| **Backlog** | Prioritized items not yet scheduled |
| **Todo** | Items committed to current sprint |
| **In Progress** | Actively being worked on |
| **Review** | Ready for review/testing |
| **Done** | Completed and verified |

## Issue Fields

| Field | Type | Values |
|-------|------|--------|
| **Status** | Single Select | Backlog, Todo, In Progress, Review, Done |
| **Iteration** | Iteration | 2-week sprints |
| **Story Points** | Number | 1, 2, 3, 5, 8, 13 (Fibonacci) |
| **Priority** | Single Select | High, Medium, Low |
| **Type** | Single Select | Feature, Bug, Tech Debt, Docs, Infrastructure |

## Sprint Ceremonies

### Sprint Planning (Monday, Week 1)

1. Review velocity from previous sprint
2. Pull items from Backlog into Todo column
3. Assign story points to new items
4. Commit to sprint goal

### Daily Workflow

1. Move items to "In Progress" when starting work
2. Move to "Review" when ready for testing/review
3. Move to "Done" when verified complete

### Sprint Review (Friday, Week 2)

1. Demo completed items
2. Gather feedback
3. Close completed issues

### Retrospective

1. What went well?
2. What could improve?
3. Action items for next sprint

## Velocity Tracking

Track velocity using GitHub Projects Insights:
- Sum of story points completed per sprint
- Use 3-sprint average for capacity planning

## Labels

| Label | Purpose |
|-------|---------|
| `Epic 1: User Management` | User management stories |
| `Epic 2: Master Data` | Master data management stories |
| `Epic 3: Project Portfolio` | Portfolio management stories |
| ... | (18 epic labels total) |
| `high-priority` | Must be done this sprint |
| `blocked` | Waiting on external dependency |
| `security` | Security-related work |
| `infrastructure` | Infrastructure/DevOps work |
| `documentation` | Documentation updates |

## GitHub Project Configuration

### Project Board IDs

| Setting | Value |
|---------|-------|
| **Project Number** | 4 |
| **Project ID** | `PVT_kwHOAa4VUM4BPfU8` |
| **Status Field ID** | `PVTSSF_lAHOAa4VUM4BPfU8zg94ixw` |
| **Backlog Option** | `4f49f65f` |
| **Todo Option** | `81823f8b` |
| **In Progress Option** | `89ca0d47` |
| **Review Option** | `ee6790a5` |
| **Done Option** | `82137673` |

## Workflow Commands

### Picking Up an Issue

```bash
# Use the pickup-issue script
./scripts/pickup-issue.sh <issue-number>

# Or on PowerShell
.\scripts\pickup-issue.ps1 <issue-number>
```

This will:
1. Assign the issue to you
2. Set project status to "In Progress"
3. Create a feature branch
4. Checkout the branch

### Quick Issue Creation

```bash
# Create new issue with labels
gh issue create --title "X.Y Description" \
  --label "Epic X: Label Name" \
  --body "## User Story
**As** a <role>
**I want to** <goal>
**So that** <benefit>

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2"
```

### View Project Items

```bash
# List project items
gh project item-list 4 --owner hanpieter1

# List issues by label
gh issue list --repo hanpieter1/AppFactory --label "Epic 3: Project Portfolio"
```
