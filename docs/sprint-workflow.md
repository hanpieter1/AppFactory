# Sprint Workflow

This document describes the agile sprint workflow for the Typhoon project using GitHub Projects.

## Project Board

**URL:** https://github.com/users/hanpieter1/projects/2

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
| **Sprint** | Items committed to current sprint |
| **In Progress** | Actively being worked on |
| **Review** | Ready for review/testing |
| **Done** | Completed and verified |

## Issue Fields

| Field | Type | Values |
|-------|------|--------|
| **Status** | Single Select | Backlog, Sprint, In Progress, Review, Done |
| **Iteration** | Iteration | 2-week sprints |
| **Story Points** | Number | 1, 2, 3, 5, 8, 13 (Fibonacci) |
| **Priority** | Single Select | High, Medium, Low |
| **Type** | Single Select | Feature, Bug, Tech Debt, Docs, Infrastructure |

## Sprint Ceremonies

### Sprint Planning (Monday, Week 1)

1. Review velocity from previous sprint
2. Pull items from Backlog into Sprint column
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
| `high-priority` | Must be done this sprint |
| `medium-priority` | Should be done if capacity allows |
| `low-priority` | Nice to have |
| `blocked` | Waiting on external dependency |
| `security` | Security-related work |
| `infrastructure` | Infrastructure/DevOps work |
| `documentation` | Documentation updates |

## GitHub Project Configuration

### Required Fields Setup

1. **Go to:** Project Settings → Fields
2. **Add Iteration field:**
   - Click "+" → "Iteration"
   - Duration: 2 weeks
   - Start date: Next Monday
3. **Add Story Points field:**
   - Click "+" → "Number"
   - Name: "Story Points"
4. **Add Priority field:**
   - Click "+" → "Single select"
   - Options: High, Medium, Low
5. **Add Type field:**
   - Click "+" → "Single select"
   - Options: Feature, Bug, Tech Debt, Docs, Infrastructure

### Board View Configuration

1. **Go to:** Project → Board view
2. **Configure columns:**
   - Click column header → "Edit column"
   - Set Status values for each column

### Roadmap View

1. **Add view:** Click "+" → "Roadmap"
2. **Group by:** Iteration
3. **Use for:** Release planning and timeline visibility

## Workflow Commands

### Moving Issues via CLI

```bash
# View project items
gh project item-list 2 --owner hanpieter1

# Move issue to different status (requires GraphQL)
gh api graphql -f query='...'
```

### Quick Issue Creation

```bash
# Create new issue with labels
gh issue create --title "[REQ-XXX] Feature Name" \
  --label "enhancement,medium-priority" \
  --body "## Summary\n..."
```
