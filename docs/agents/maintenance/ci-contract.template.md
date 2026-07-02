# CI contract (project template)

Copy to `ci-contract.md` — defines what CI must run (architecture may author requirements; maintenance implements).

## Triggers

| Event | Branches |
|-------|----------|
| push | |
| pull_request | |

## Required jobs

| Job | Command | Must pass |
|-----|---------|-----------|
| check | | yes |
| test | | yes |
| build | | optional |

## Branch protection (design)

- Default integration branch:
- Required checks:
