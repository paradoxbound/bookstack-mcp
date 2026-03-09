# Security Policy

## Supported Versions

Only the latest release is actively maintained with security updates.

| Version | Supported |
| ------- | --------- |
| 2.6.1   | yes       |
| < 2.6   | no        |

## Secrets and Credentials Policy

### Operator credentials (BOOKSTACK_TOKEN_ID / BOOKSTACK_TOKEN_SECRET)

**Storage:**
- Pass credentials via environment variables only — never hardcode them in source files or configuration checked into version control
- For Docker: use `-e` flags or a secrets manager; never bake tokens into the image
- For local use: store in a `.env` file excluded from git via `.gitignore`; never commit `.env`

**Access:**
- Create a dedicated BookStack API user with the minimum permissions required (read-only unless write operations are needed)
- Do not share tokens across environments (development, staging, production should each have their own token)

**Rotation:**
- Rotate tokens immediately if exposure is suspected
- Rotate tokens periodically as part of routine security hygiene (recommended: every 90 days)
- Revoke old tokens promptly after rotation via BookStack Settings → Users → API Tokens

### CI/CD secrets

This project uses no manually stored CI/CD secrets. The only secret in the pipeline is `GITHUB_TOKEN`, which is auto-provisioned by GitHub Actions for each workflow run with scoped, short-lived credentials, and is automatically revoked when the run completes.

### Reporting exposed credentials

If you discover that credentials have been accidentally committed or exposed, rotate them immediately, then report the incident privately using the process in the [Reporting a Vulnerability](#reporting-a-vulnerability) section below.

## Threat Model and Attack Surface Analysis

This section documents the attack surface, trust boundaries, and identified threats for this project. It is reviewed and updated at each release.

### Attack Surface

**Trust boundaries:**
- **MCP client → MCP server (stdio):** The server is spawned as a local subprocess by the MCP client (e.g. Claude Desktop, LibreChat). Communication is over stdio; no network socket is exposed. The client is considered trusted.
- **MCP server → BookStack API (HTTPS):** All requests are authenticated with a Bearer token. The server enforces HTTPS and rejects plain-HTTP base URLs at startup.
- **Operator → MCP server (environment variables):** `BOOKSTACK_BASE_URL`, `BOOKSTACK_TOKEN_ID`, `BOOKSTACK_TOKEN_SECRET`, and `BOOKSTACK_ENABLE_WRITE` are supplied at deployment time by the operator. They are not accepted from MCP clients or end users.

**Entry points:**
- MCP tool input parameters (validated by Zod schemas before use)
- Environment variables (read once at startup; never re-read or logged)
- BookStack API responses (relayed to the MCP client; not interpreted by the server)

**Critical code paths:**
- Credential loading and HTTP request construction (`packages/core/src/bookstack-client.ts`)
- Write operation gating — `BOOKSTACK_ENABLE_WRITE` check before registering write tools (`packages/stdio/src/index.ts`)
- HTTPS enforcement — URL validation at startup rejects non-HTTPS base URLs
- Tool input validation — Zod schemas on all MCP tool parameters

### 1. API credential exposure (HIGH)

**Risk:** `BOOKSTACK_TOKEN_ID` and `BOOKSTACK_TOKEN_SECRET` grant full API access to the BookStack instance. If leaked — via environment variable logging, process listings, config files committed to git, or container inspection — an attacker gains complete read/write access to BookStack.

**Mitigations:**
- Tokens are read from environment variables only; never hardcoded or logged
- `.env` is listed in `.gitignore`
- CI/CD uses no manually stored secrets (`GITHUB_TOKEN` is auto-provisioned per run)
- README advises HTTPS, dedicated users with limited permissions, and regular token rotation

### 2. Unintended write operations (HIGH)

**Risk:** Write tools (create/update/delete for books, pages, chapters, etc.) could be invoked by a malicious prompt, a confused AI model, or misconfiguration, causing data loss or corruption in BookStack.

**Mitigations:**
- Write tools are not registered unless `BOOKSTACK_ENABLE_WRITE=true` is explicitly set
- Write operations are disabled by default; the server exposes only read tools in the default configuration

### 3. Prompt injection via BookStack content (MEDIUM)

**Risk:** BookStack pages returned to the MCP client could contain adversarial instructions designed to manipulate the AI model into taking unintended actions (e.g. exfiltrating content, invoking write tools).

**Mitigations:**
- The MCP server is a passive relay; it does not interpret or act on page content itself
- Write operations require explicit opt-in (`BOOKSTACK_ENABLE_WRITE=true`), limiting the blast radius
- Operators should use a BookStack API user scoped to the minimum required permissions

### 4. Insecure transport (MEDIUM)

**Risk:** If BookStack is accessed over plain HTTP, API tokens and content are transmitted in cleartext and vulnerable to interception.

**Mitigations:**
- The server rejects `BOOKSTACK_BASE_URL` values that do not use `https://` and exits with an error on startup
- Operators are responsible for ensuring their BookStack instance has a valid TLS certificate

### 5. Supply chain compromise (MEDIUM)

**Risk:** A compromised npm dependency or GitHub Action could inject malicious code into the build or runtime.

**Mitigations:**
- All GitHub Actions are pinned to exact commit SHAs
- `npm audit` runs on every CI build and fails on high/critical vulnerabilities
- OSV Scanner and Trivy scan dependencies and the Docker image on every build
- Dependabot opens weekly PRs for outdated packages and the Docker base image
- SLSA Level 2 provenance attestation on every released Docker image
- `npm ci` used in all builds to enforce the lock file

### 6. Server-Side Request Forgery via BOOKSTACK_BASE_URL (LOW)

**Risk:** If an operator sets `BOOKSTACK_BASE_URL` to an internal network address, the server could be used to probe or interact with internal services.

**Mitigations:**
- `BOOKSTACK_BASE_URL` is operator-supplied at deployment time; it is not accepted from end users or MCP clients
- Operators are responsible for ensuring the URL points to a legitimate BookStack instance

## Vulnerability and License Remediation Policy

### Vulnerability remediation thresholds

| Severity | Enforcement | Remediation target |
|----------|-------------|-------------------|
| **CRITICAL** | Blocks release — Trivy gate fails with `--exit-code 1` | Must be resolved before any new release is published |
| **HIGH** | Fails CI — `npm audit --audit-level=high` blocks merge | Must be resolved within 30 days of discovery |
| **MEDIUM** | Flagged by OSV Scanner and Trivy (SARIF uploaded to GitHub Security tab) | Addressed via Dependabot PRs on a best-effort basis |
| **LOW** | Flagged by scanners | Addressed via Dependabot PRs on a best-effort basis |

Vulnerabilities in dependencies that do not affect the deployed product are documented in [`vex.json`](vex.json) with a machine-readable justification and are excluded from gate failures (see [VEX Document](#vex-document) below).

### License policy

- **Runtime dependencies** (shipped in the Docker image and via npm): only OSI-approved permissive licenses are permitted — MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, and equivalents.
- **Development dependencies** (build tools, test frameworks, type definitions): same permissive licenses preferred; copyleft licenses (GPL, LGPL) are acceptable since dev dependencies are not distributed.
- **This project** is licensed under MIT.

New dependencies must be reviewed for license compatibility before being added. Incompatible licenses must be flagged and either replaced or explicitly approved.

## VEX Document

A [VEX (Vulnerability Exploitability eXchange)](https://openvex.dev/) document is maintained at [`vex.json`](vex.json) in OpenVEX format. When a vulnerability scanner reports a CVE in a dependency that does not affect this project — for example, a vulnerable code path that is never called, or a CVE present only in a development dependency not shipped in the Docker image — a statement is added to `vex.json` with a machine-readable justification.

Trivy reads `vex.json` automatically during both PR and release scans, suppressing confirmed non-applicable findings from gate failures.

**To add a VEX statement**, append an entry to the `statements` array in `vex.json`:

```json
{
  "vulnerability": { "name": "CVE-YYYY-NNNNN" },
  "products": [{ "@id": "pkg:github/paradoxbound/bookstack-mcp" }],
  "status": "not_affected",
  "justification": "vulnerable_code_not_in_execute_path",
  "impact_statement": "Brief explanation of why this CVE does not affect the deployed product."
}
```

Valid `justification` values: `component_not_present`, `vulnerable_code_not_present`, `vulnerable_code_not_in_execute_path`, `vulnerable_code_cannot_be_controlled_by_adversary`, `inline_mitigations_already_exist`.

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately using GitHub's Security Advisory feature:
https://github.com/paradoxbound/bookstack-mcp/security/advisories/new

You can expect an acknowledgement within 7 days and a patch or mitigation
within 30 days where feasible. We will credit reporters in the advisory
unless you request otherwise.

Once a fix is released, the GitHub Security Advisory will be published publicly and a CVE will be requested where appropriate. Security fixes are also noted in [CHANGELOG.md](CHANGELOG.md) under the relevant release.
