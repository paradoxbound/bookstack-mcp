# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.5.6] - 2026-03-08

### Added
- Property-based fuzz tests using `fast-check` and `@fast-check/vitest` (#58)
- `CONTRIBUTING.md` contribution guide (#60)
- `CHANGELOG.md` and automated GitHub Releases on each version bump (#61)

### Fixed
- API list filters now use bracket notation (`filter[key]=value`) in `getPages` and `getChapters` (#50)
- Delete tests clean up correctly on failure (#49)
- `apk upgrade --no-cache` in Docker runtime stage to patch CVE-2026-22184 (CRITICAL zlib buffer overflow) (#63)

### Security
- Top-level `permissions: read-all` added to all CI workflows for least-privilege token scopes (#57)
- Updated `SECURITY.md` with real vulnerability reporting link and supported version policy (#59)
- Bumped `aquasecurity/trivy-action` to 0.35.0 to fix Trivy binary download and restore vulnerability scanning (#62)

### Dependencies
- Bumped `node` base image from 24-alpine to 25-alpine (#43)
- Bumped `typescript` to 5.9.3 (#33)
- Bumped `@types/node` to 25.3.5 (#54)
- Bumped `tsx` to 4.21.0 (#39)
- Bumped `actions/checkout` to v6 (#46), `actions/setup-node` to v6 (#47), `actions/cache` to v5 (#45)
- Bumped `github/codeql-action` to v4 (#44), `ossf/scorecard-action` to 2.4.3 (#42)
- Applied StepSecurity hardening to workflow runners (#41)

## [2.5.4] - 2026-02-28

### Fixed
- API list filters now use bracket notation (`filter[key]=value`) in `getPages` and `getChapters` (#50)

## [2.5.3] - 2026-02-27

### Fixed
- API list filters now use bracket notation (`filter[key]=value`) in `getBooks`, `getShelves`, and `getAttachments` (#40)

### Added
- Credential-free unit tests for `BookStackClient` (13 tests, `vi.stubGlobal` pattern) (#27)
- OpenSSF Scorecard workflow (#26)
- 429 retry with backoff in `BookStackClient.request()` honouring `Retry-After` header (#28)
- npm and Trivy DB caching in CI (#24)

### Changed
- Release pipeline now gated on version bump detection — pipeline-only merges skip release steps cleanly (#25)

### Dependencies
- Bumped `actions/attest-build-provenance` to v4 (#32), `actions/upload-artifact` to v7 (#31)
- Bumped `aquasecurity/trivy-action` to 0.34.1 (#30), `actions/checkout` to v6 (#29)

## [2.5.2] - 2026-02-26

### Added
- Full security scanning suite: npm audit, Dependabot, Trivy, CodeQL, OSV Scanner (#20)
- SLSA Level 2 provenance attestation for Docker images (#20)
- Pre-merge CD check job for same-repo PRs — validates Docker images build and push before merge (#19)
- Trivy database caching using GHCR source with ECR fallback (#22)

### Changed
- Upgraded base image to Node 24 (#20)

## [2.5.0] - 2026-02-20

### Changed
- Refactored to monorepo structure: `packages/core` (BookStack API client, native `fetch`) and `packages/stdio` (MCP server, stdio transport)
- Removed axios dependency — all HTTP via native `fetch` only
- Error handling now uses `error.status` / `error.response` (no axios patterns)

### Added
- Multi-arch Docker image (amd64 + arm64) published to GHCR

## [2.4.0] - 2026-02-20

### Added
- System and admin read-only tools (system info, maintenance, audit log, users, roles, webhooks, content permissions, recycle bin)

## [2.3.0] - 2026-02-20

### Added
- Comments API support: list, create, update, delete comments on pages

## [2.2.0] - 2026-02-20

### Added
- Complete CRUD operations: create/update/delete for books, chapters, pages, shelves, attachments
- Functional test suite with global setup/teardown and seed data management
- Write operations gated behind `BOOKSTACK_ENABLE_WRITE=true` environment variable

## [2.1.0] - 2026-02-19

### Added
- Initial release: BookStack MCP server with stdio transport
- Read tools: list and get books, shelves, chapters, pages, attachments, search
- Export tools: PDF, HTML, plain text, Markdown page exports
- Response enhancement: URLs, content previews, human-friendly dates, word counts
- LibreChat and Claude Desktop integration

[Unreleased]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.5.6...HEAD
[2.5.6]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.5.4...v2.5.6
[2.5.4]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.5.3...v2.5.4
[2.5.3]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.5.2...v2.5.3
[2.5.2]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.5.0...v2.5.2
[2.5.0]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/paradoxbound/bookstack-mcp/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/paradoxbound/bookstack-mcp/releases/tag/v2.1.0
