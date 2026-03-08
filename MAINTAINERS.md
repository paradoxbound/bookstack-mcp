# Maintainers

This file lists the project members with access to sensitive resources
(GitHub repository admin, GHCR registry, GitHub Actions secrets).

| GitHub username | Role | Access |
|-----------------|------|--------|
| [@paradoxbound](https://github.com/paradoxbound) | Sole maintainer | Repository admin, GHCR registry owner, GitHub Actions secrets |

## Sensitive resources

- **GitHub repository** — `https://github.com/paradoxbound/bookstack-mcp`
- **GitHub Container Registry (GHCR)** — `ghcr.io/paradoxbound/bookstack-mcp`
- **GitHub Actions secrets** — `GITHUB_TOKEN` (auto-provisioned per workflow run; no manually stored secrets)

## Adding collaborators

Before any contributor is granted escalated permissions to sensitive resources (repository admin, GHCR registry, GitHub Actions secrets), the following review must take place:

1. **Track record** — the candidate must have a history of contributions to this project (merged pull requests, issues, or equivalent) demonstrating familiarity with the codebase and project standards
2. **Identity verification** — the candidate's GitHub account must be consistent with their stated identity and show a credible contribution history
3. **Explicit approval** — the sole maintainer (@paradoxbound) must explicitly approve the permission grant before it is applied
4. **Least privilege** — permissions are scoped to the minimum required for the collaborator's role; full admin access is only granted when necessary

This review applies to all permission escalations, including adding repository collaborators, granting package registry access, and any other resource listed in the Sensitive resources section above.

## Origin

This project is a fork of [ttpears/bookstack-mcp](https://github.com/ttpears/bookstack-mcp).
The upstream project is maintained independently and has no access to this repository's resources.
