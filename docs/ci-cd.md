# BookStack MCP — CI/CD Pipeline

## Workflow overview

| Workflow | Trigger | Purpose |
|---|---|---|
| `functional-tests.yml` | PR + push to main | Build, type-check, npm audit, OSV scan, run tests |
| `docker-publish.yml` | PR + push to main | PR: Dockerfile validate + full CD pre-check. Post-merge: build, verify, merge manifest, tag, clean up |
| `codeql.yml` | PR + push to main + weekly | SAST scanning; blocks merge on HIGH/CRITICAL findings |
| `scorecard.yml` | Push to main + weekly | OpenSSF Scorecard assessment |
| `dependency-review.yml` | PR | Block new vulnerable/malicious dependencies |

## PR job sequence (`docker-publish.yml`)

```
pull_request → main (same-repo PRs only)
  ↓
build-and-push (matrix: amd64 + arm64)   fail-fast=true
  │  build only — validates Dockerfile compiles cleanly (no push)
  ↓ both must succeed
pre-merge-cd-check
  ├── build + push :pr-{n}-amd64 and :pr-{n}-arm64 to GHCR
  ├── verify both PR arch images exist in registry
  ├── create + verify test manifest :pr-{n}
  ├── assert version not already tagged in registry
  └── clean up all :pr-{n}-* images (always, even on failure)
```

`pre-merge-cd-check` only runs on same-repo PRs. Fork PRs cannot push to GHCR and will not have this check required.

## Post-merge job sequence (`docker-publish.yml`)

```
push to main
  ↓
check-version
  ├── read version from packages/stdio/package.json
  └── check if git tag vX.Y.Z already exists → if yes, skip release jobs
  ↓ new version only
build-and-push (matrix: amd64 + arm64)   fail-fast=true
  ├── push :latest-amd64 and :latest-arm64 staging tags to GHCR
  └── generate SLSA Level 2 provenance attestation via actions/attest-build-provenance
  ↓ both must succeed
verify
  └── inspect both digests in GHCR via imagetools inspect
  ↓ either missing → cleanup job runs, workflow fails
merge
  ├── assert version tag not already in registry
  ├── create multi-arch manifest (:latest, :X.Y.Z, :X.Y, :X)
  ├── verify manifest is pullable
  ├── create git tag vX.Y.Z (idempotent)
  └── delete staging tags (:latest-amd64, :latest-arm64) via GHCR REST API
  ↓ any step fails → cleanup job runs
cleanup (runs on verify or merge failure)
  └── delete :latest-amd64 and :latest-arm64 from GHCR via REST API
```

## Version tagging convention

- Version is always read from `packages/stdio/package.json` (the published npm package).
- The root `package.json` is `private: true` and is **not** the version source.
- Bumping `packages/stdio/package.json` version and merging to main triggers a full release.
- If the version tag already exists in GHCR, the `check-version` job gates all release jobs — pipeline-only merges (no version bump) skip release steps cleanly.
- The git tag (`vX.Y.Z`) is created **after** the registry manifest is verified — never before.
- Multi-arch manifest tags created: `:latest`, `:X.Y.Z`, `:X.Y`, `:X`

## GHCR tag deletion pattern

The pipeline deletes staging tags via the GHCR REST API:

```bash
# 1. Find the version ID by tag name
GET {PKG_API}/versions

# 2. Delete by version ID
DELETE {PKG_API}/versions/{VERSION_ID}
```

Owner-type routing (handles personal vs organisation repos):

```bash
OWNER_TYPE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/users/${OWNER}" | jq -r '.type')
if [ "$OWNER_TYPE" = "Organization" ]; then
  PKG_API="https://api.github.com/orgs/${OWNER}/packages/container/${PKG}"
else
  PKG_API="https://api.github.com/user/packages/container/${PKG}"
fi
```

## Required branch protection rules

These settings must be configured in GitHub → Settings → Branches → main. They cannot be enforced from workflow files.

| Setting | Value |
|---|---|
| Require status checks to pass before merging | Enabled |
| Required checks | `test`, `build-and-push (amd64, linux/amd64)`, `build-and-push (arm64, linux/arm64)`, `pre-merge-cd-check`, `CodeQL` |
| Require branches to be up to date before merging | Enabled |
| Restrict who can push to matching branches | Enabled (block direct pushes to main) |
| Do not allow bypassing the above settings | Enabled |

Without these rules, GitHub allows the merge button regardless of workflow outcomes.

## Security scanning

| Tool | Scope | Failure threshold |
|---|---|---|
| `npm audit --audit-level=high` | Full npm dependency tree (including dev deps) | HIGH and CRITICAL vulnerabilities |
| OSV Scanner | Full recursive dependency tree | Any OSV advisory match |
| Trivy | Docker image | CRITICAL vulnerabilities in shipped image |
| GitHub Dependency Review | Dependency diff on each PR | New vulnerable or malicious dependencies |
| CodeQL | TypeScript/JavaScript source | `error`-level (HIGH/CRITICAL) SAST findings |

A VEX document (`vex.json` at repo root) records confirmed non-applicable CVEs. Trivy reads it automatically via `--vex vex.json` to suppress those findings from gate failures.

## SLSA provenance

Every post-merge Docker image build generates a SLSA Level 2 provenance attestation via `actions/attest-build-provenance`. To verify:

```bash
gh attestation verify \
  oci://ghcr.io/paradoxbound/bookstack-mcp:2.6.1 \
  --owner paradoxbound
```

## Trivy DB caching

The Trivy vulnerability database is cached using `actions/cache@v4` with a weekly cache key (`date +%Y-%U`) to avoid redundant downloads on every run.
