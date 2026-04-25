'use strict';
const https = require('https');
const http = require('http');
const { URL } = require('url');
const tls = require('tls');

function request(targetUrl, options = {}) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(targetUrl); } catch(e) { return resolve({ ok: false, error: 'Invalid URL' }); }
    const proto = parsed.protocol === 'https:' ? https : http;
    const req = proto.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { 'User-Agent': 'CybeWatch-Scanner/2.0', ...(options.headers || {}) },
      timeout: options.timeout || 8000,
      rejectUnauthorized: false,
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (body.length < 30000) body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, ok: true }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    if (options.body) req.write(options.body);
    req.end();
  });
}

function checkTLS(hostname, port = 443) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: 5000 }, () => {
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      const daysLeft = cert.valid_to ? Math.floor((new Date(cert.valid_to) - new Date()) / 86400000) : -1;
      socket.destroy();
      resolve({ ok: true, protocol, subject: cert.subject?.CN || 'N/A', issuer: cert.issuer?.O || 'N/A', validTo: cert.valid_to, isExpired: daysLeft < 0, daysLeft, selfSigned: cert.issuer?.CN === cert.subject?.CN });
    });
    socket.on('error', (e) => resolve({ ok: false, error: e.message }));
    socket.setTimeout(5000, () => { socket.destroy(); resolve({ ok: false, error: 'TLS Timeout' }); });
  });
}

async function checkSecurityHeaders(baseRes) {
  const h = baseRes.headers || {};
  const findings = [];
  const required = [
    { header: 'strict-transport-security', label: 'HSTS Missing', sev: 'high', rec: 'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' },
    { header: 'x-content-type-options', label: 'X-Content-Type-Options Missing', sev: 'medium', rec: 'Add: X-Content-Type-Options: nosniff' },
    { header: 'x-frame-options', label: 'X-Frame-Options Missing', sev: 'medium', rec: 'Add: X-Frame-Options: DENY' },
    { header: 'content-security-policy', label: 'Content-Security-Policy Missing', sev: 'high', rec: "Add a strict CSP: Content-Security-Policy: default-src 'self'" },
    { header: 'referrer-policy', label: 'Referrer-Policy Missing', sev: 'low', rec: 'Add: Referrer-Policy: strict-origin-when-cross-origin' },
    { header: 'permissions-policy', label: 'Permissions-Policy Missing', sev: 'low', rec: 'Add: Permissions-Policy: geolocation=(), camera=(), microphone=()' },
  ];
  for (const c of required) {
    const val = h[c.header];
    if (!val) {
      findings.push({ type: 'MISSING_HEADER', label: c.label, severity: c.sev, detail: `Response header "${c.header}" is absent.`, recommendation: c.rec });
    } else {
      if (c.header === 'content-security-policy' && val.includes("'unsafe-inline'"))
        findings.push({ type: 'WEAK_HEADER', label: 'Weak CSP — unsafe-inline', severity: 'medium', detail: `CSP contains 'unsafe-inline' which enables XSS.`, recommendation: "Remove 'unsafe-inline' and use nonce-based CSP." });
      if (c.header === 'content-security-policy' && val.includes("'unsafe-eval'"))
        findings.push({ type: 'WEAK_HEADER', label: 'Weak CSP — unsafe-eval', severity: 'medium', detail: `CSP contains 'unsafe-eval'.`, recommendation: "Remove 'unsafe-eval' from CSP." });
    }
  }
  const leakHeaders = ['server', 'x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version'];
  for (const lh of leakHeaders) {
    if (h[lh]) findings.push({ type: 'INFO_DISCLOSURE', label: `Info Disclosure (${lh})`, severity: 'low', detail: `"${lh}: ${h[lh]}" reveals server tech.`, recommendation: `Suppress the "${lh}" response header.` });
  }
  return findings;
}

async function checkSQLi(targetUrl) {
  const findings = [];
  const parsed = new URL(targetUrl);
  const params = [...parsed.searchParams.keys()];
  const testParams = params.length ? params : ['id', 'q', 'search', 'page'];
  const payloads = ["'", "' OR '1'='1", "' OR 1=1--", "1' AND SLEEP(0)--", "' UNION SELECT NULL--"];
  const dbErrors = [/sql syntax/i,/mysql_fetch/i,/ORA-\d{5}/i,/pg_query/i,/sqlite_/i,/microsoft sql server/i,/unclosed quotation/i,/quoted string not properly terminated/i,/syntax error.*sql/i,/Warning.*mysql/i];

  for (const key of testParams.slice(0, 2)) {
    for (const payload of payloads) {
      const u = new URL(parsed.toString());
      u.searchParams.set(key, payload);
      const res = await request(u.toString());
      if (!res.ok) continue;
      for (const pat of dbErrors) {
        if (pat.test(res.body)) {
          findings.push({ type: 'SQL_INJECTION', label: 'SQL Injection Detected', severity: 'critical', detail: `Param "${key}" with payload "${payload}" triggered a DB error matching pattern: ${pat.source}`, recommendation: 'Use parameterized queries. Never concatenate user input into SQL strings.', url: u.toString() });
          break;
        }
      }
      await new Promise(r => setTimeout(r, 150));
    }
  }
  return findings;
}

async function checkXSS(targetUrl) {
  const findings = [];
  const parsed = new URL(targetUrl);
  const params = [...parsed.searchParams.keys()];
  const testParams = params.length ? params : ['q', 'search', 'name'];
  const payloads = ['<script>alert(1)</script>', '"><script>alert(1)</script>', "'><img src=x onerror=alert(1)>", '<svg onload=alert(1)>'];

  for (const key of testParams.slice(0, 2)) {
    for (const payload of payloads) {
      const u = new URL(parsed.toString());
      u.searchParams.set(key, payload);
      const res = await request(u.toString());
      if (!res.ok) continue;
      if (res.body.includes('<script>alert(1)</script>') || res.body.includes('onerror=alert(1)') || res.body.includes('<svg onload=alert(1)>')) {
        findings.push({ type: 'XSS', label: 'Reflected XSS Detected', severity: 'high', detail: `Param "${key}" with payload "${payload}" was reflected unencoded in the response.`, recommendation: 'HTML-encode all user input before rendering. Implement a strict Content-Security-Policy.', url: u.toString() });
      }
      await new Promise(r => setTimeout(r, 120));
    }
  }
  return findings;
}

async function checkSensitiveFiles(targetUrl) {
  const findings = [];
  const parsed = new URL(targetUrl);
  const base = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
  const paths = [
    { p: '/.git/config', label: 'Git Config Exposed', sev: 'critical', detail: 'Git repo config file is publicly accessible.' },
    { p: '/.env', label: '.env File Exposed', sev: 'critical', detail: '.env file with secrets is accessible.' },
    { p: '/phpinfo.php', label: 'PHP Info Page Exposed', sev: 'high', detail: 'PHP configuration details are public.' },
    { p: '/admin', label: 'Admin Panel Accessible', sev: 'medium', detail: 'Admin interface has no auth check at this path.' },
    { p: '/.DS_Store', label: '.DS_Store Exposed', sev: 'medium', detail: 'Reveals directory listing on macOS servers.' },
    { p: '/backup.zip', label: 'Backup Archive Exposed', sev: 'critical', detail: 'Backup archive may contain source code or credentials.' },
    { p: '/config.json', label: 'config.json Exposed', sev: 'high', detail: 'Config file may contain API keys or secrets.' },
    { p: '/wp-config.php', label: 'WordPress Config Exposed', sev: 'critical', detail: 'WordPress config with DB credentials is accessible.' },
  ];
  for (const item of paths) {
    const res = await request(base + item.p);
    if (res.ok && res.status === 200 && res.body.length > 20) {
      findings.push({ type: 'SENSITIVE_FILE', label: item.label, severity: item.sev, detail: item.detail + ` (${base + item.p} → HTTP 200, ${res.body.length} bytes)`, recommendation: 'Block access via server config (deny rules / .htaccess).', url: base + item.p });
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return findings;
}

async function scanTarget(targetUrl, onProgress) {
  const results = { target: targetUrl, startTime: Date.now(), findings: [], summary: {}, tls: null, error: null };
  const emit = (msg, pct) => { if (onProgress) onProgress({ msg, pct }); };
  try {
    const parsed = new URL(targetUrl);
    emit('Connecting to target…', 5);
    const baseRes = await request(targetUrl);
    if (!baseRes.ok) { results.error = `Cannot reach target: ${baseRes.error}`; return results; }

    emit(`Connected — HTTP ${baseRes.status}. Checking TLS…`, 15);
    if (parsed.protocol === 'https:') {
      results.tls = await checkTLS(parsed.hostname, parsed.port || 443);
      const tls = results.tls;
      if (tls.ok && tls.isExpired) results.findings.push({ type: 'TLS_EXPIRED', label: 'TLS Certificate Expired', severity: 'critical', detail: `Cert expired on ${tls.validTo}.`, recommendation: 'Renew TLS certificate immediately.' });
      else if (tls.ok && tls.daysLeft < 30) results.findings.push({ type: 'TLS_EXPIRING', label: 'TLS Cert Expiring Soon', severity: 'high', detail: `Cert expires in ${tls.daysLeft} days.`, recommendation: 'Renew certificate before expiry.' });
      if (tls.ok && tls.selfSigned) results.findings.push({ type: 'TLS_SELF_SIGNED', label: 'Self-Signed TLS Certificate', severity: 'medium', detail: 'Cert is self-signed. Browsers will warn users.', recommendation: "Use a CA-signed certificate (e.g., Let's Encrypt)." });
    } else {
      results.findings.push({ type: 'NO_HTTPS', label: 'No HTTPS', severity: 'critical', detail: 'Traffic served over plain HTTP. All data is unencrypted.', recommendation: 'Enable HTTPS with a valid TLS certificate.' });
    }

    emit('Auditing security headers…', 30);
    results.findings.push(...await checkSecurityHeaders(baseRes));
    emit('Testing for SQL Injection…', 50);
    results.findings.push(...await checkSQLi(targetUrl));
    emit('Testing for XSS…', 65);
    results.findings.push(...await checkXSS(targetUrl));
    emit('Scanning for sensitive exposed files…', 82);
    results.findings.push(...await checkSensitiveFiles(targetUrl));
    emit('Generating report…', 98);

    results.endTime = Date.now();
    results.duration = ((results.endTime - results.startTime) / 1000).toFixed(1);
    const bySev = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of results.findings) { if (bySev[f.severity] !== undefined) bySev[f.severity]++; }
    results.summary = { total: results.findings.length, ...bySev };
    emit('Scan complete.', 100);
  } catch (e) {
    results.error = e.message;
  }
  return results;
}

module.exports = { scanTarget };
