# Security Policy

## Supported Versions

Only the latest release is actively maintained with security updates.

| Version | Supported |
| ------- | --------- |
| 2.5.x   | yes       |
| < 2.5   | no        |

## Security Assessment

This section documents the most likely and impactful security risks for this project.

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
- README advises using HTTPS for all production BookStack instances
- No enforcement at the server level; operators are responsible for BookStack TLS configuration

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

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately using GitHub's Security Advisory feature:
https://github.com/paradoxbound/bookstack-mcp/security/advisories/new

You can expect an acknowledgement within 7 days and a patch or mitigation
within 30 days where feasible. We will credit reporters in the advisory
unless you request otherwise.
