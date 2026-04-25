'use strict';
/**
 * CybeWatch — Real Log Analyzer
 * Reads actual log files (Windows Event Log via PowerShell, Apache/Nginx, syslog)
 * and classifies entries against threat patterns.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const readline = require('readline');

// ─── Threat Pattern Library ───────────────────────────────────────────────────
const PATTERNS = [
  { id: 'brute_ssh',    regex: /failed password for .* from ([\d.]+)/i,           label: 'SSH Brute Force',          severity: 'high',     category: 'Auth',    mitre: ['T1110'] },
  { id: 'brute_win',    regex: /Logon Failure.*Workstation Name: (\S+)/i,          label: 'Windows Auth Failure',     severity: 'high',     category: 'Auth',    mitre: ['T1110'] },
  { id: 'sqli_web',     regex: /(\%27|\'|--|union\s+select|or\s+1\s*=\s*1)/i,     label: 'SQL Injection Attempt',    severity: 'critical', category: 'Web App', mitre: ['T1190'] },
  { id: 'xss_web',      regex: /(<script|onerror=|onload=|javascript:)/i,          label: 'XSS Attempt',              severity: 'high',     category: 'Web App', mitre: ['T1059'] },
  { id: 'rce_attempt',  regex: /(cmd\.exe|powershell|\/bin\/sh|wget\s+http|curl\s+http)/i, label: 'RCE Attempt',    severity: 'critical', category: 'Endpoint', mitre: ['T1059'] },
  { id: 'path_trav',   regex: /(\.\.\/|\.\.\%2f|\.\.%5c|\.\.\\)/i,               label: 'Path Traversal',           severity: 'high',     category: 'Web App', mitre: ['T1083'] },
  { id: 'scan_4xx',     regex: /"\s*(GET|POST)\s+\S+\s+HTTP\S*"\s+(404|403|400)/i,label: 'Web Scan (4xx spike)',     severity: 'medium',   category: 'Network', mitre: ['T1595'] },
  { id: 'privesc',      regex: /(sudo|su -|privilege|elevated|UAC)/i,              label: 'Privilege Escalation',     severity: 'high',     category: 'Endpoint', mitre: ['T1068'] },
  { id: 'malware_hash', regex: /trojan|malware|virus|ransomware|backdoor|rootkit/i,label: 'Malware Indicator',       severity: 'critical', category: 'Endpoint', mitre: ['T1204'] },
  { id: 'exfil_dns',    regex: /dns.*query.*(base64|long_domain|tunnel)/i,         label: 'DNS Exfiltration',         severity: 'high',     category: 'Network', mitre: ['T1048'] },
  { id: 'policy_usb',  regex: /(removable|usb|mass storage|disk inserted)/i,      label: 'Policy — Removable Media', severity: 'medium',   category: 'Compliance', mitre: ['T1052'] },
  { id: 'fw_blocked',  regex: /(blocked|deny|DROP|REJECT)\s+.*from\s+([\d.]+)/i,  label: 'Firewall Block Event',     severity: 'low',      category: 'Network', mitre: [] },
];

// ─── Parse a single log line ──────────────────────────────────────────────────
function parseLine(line, source) {
  const results = [];
  for (const pat of PATTERNS) {
    const match = pat.regex.exec(line);
    if (match) {
      // Extract IP or hostname from match groups or line
      const ipMatch = line.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
      results.push({
        patternId: pat.id,
        label: pat.label,
        severity: pat.severity,
        category: pat.category,
        mitre: pat.mitre,
        srcIp: ipMatch ? ipMatch[1] : null,
        rawLine: line.trim(),
        source,
        ts: Date.now(),
        matchedGroup: match[1] || null,
      });
      break; // first match wins per line
    }
  }
  return results;
}

// ─── Read and analyse a file ─────────────────────────────────────────────────
function analyseFile(filePath, maxLines = 5000) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) return resolve({ ok: false, error: `File not found: ${filePath}`, findings: [] });
    const findings = [];
    let lineCount = 0;
    const rl = readline.createInterface({ input: fs.createReadStream(filePath, { encoding: 'utf8' }), crlfDelay: Infinity });
    rl.on('line', (line) => {
      lineCount++;
      if (lineCount > maxLines) { rl.close(); return; }
      const hits = parseLine(line, path.basename(filePath));
      findings.push(...hits);
    });
    rl.on('close', () => resolve({ ok: true, filePath, linesScanned: lineCount, findings }));
    rl.on('error', (e) => resolve({ ok: false, error: e.message, findings }));
  });
}

// ─── Read Windows Event Log via PowerShell ────────────────────────────────────
function readWindowsEventLog(logName = 'Security', maxEvents = 200) {
  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -NonInteractive -Command "Get-WinEvent -LogName '${logName}' -MaxEvents ${maxEvents} | Select-Object TimeCreated,Id,LevelDisplayName,Message | ConvertTo-Json -Compress"`;
    exec(cmd, { timeout: 15000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve({ ok: false, error: err.message, findings: [] });
      try {
        let events = JSON.parse(stdout);
        if (!Array.isArray(events)) events = [events];
        const findings = [];
        for (const ev of events) {
          const msg = ev.Message || '';
          const hits = parseLine(msg, `WinEvent:${logName}`);
          for (const h of hits) {
            h.ts = ev.TimeCreated ? new Date(ev.TimeCreated).getTime() : Date.now();
            h.eventId = ev.Id;
            h.level = ev.LevelDisplayName;
          }
          findings.push(...hits);
        }
        resolve({ ok: true, source: `Windows Event Log: ${logName}`, eventsRead: events.length, findings });
      } catch (e) {
        resolve({ ok: false, error: `JSON parse error: ${e.message}`, findings: [] });
      }
    });
  });
}

// ─── Auto-discover common log paths ──────────────────────────────────────────
function discoverLogFiles() {
  const candidates = [];
  const platform = os.platform();

  if (platform === 'win32') {
    candidates.push(
      'C:\\Windows\\System32\\winevt\\Logs\\Security.evtx',
      'C:\\inetpub\\logs\\LogFiles\\W3SVC1\\u_ex*.log',
      'C:\\Apache24\\logs\\access.log',
      'C:\\Apache24\\logs\\error.log',
      'C:\\nginx\\logs\\access.log',
      'C:\\nginx\\logs\\error.log',
      path.join(os.homedir(), 'AppData\\Local\\Temp\\cybewatch_test.log'),
    );
  } else {
    candidates.push(
      '/var/log/auth.log',
      '/var/log/secure',
      '/var/log/syslog',
      '/var/log/apache2/access.log',
      '/var/log/apache2/error.log',
      '/var/log/nginx/access.log',
      '/var/log/nginx/error.log',
      '/var/log/messages',
    );
  }

  return candidates.filter(p => {
    try { return !p.includes('*') && fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; }
  });
}

// ─── Analyse raw text (pasted in) ────────────────────────────────────────────
function analyseRawText(text, sourceName = 'Pasted Log') {
  const findings = [];
  const lines = text.split('\n');
  for (const line of lines.slice(0, 10000)) {
    const hits = parseLine(line, sourceName);
    findings.push(...hits);
  }
  return { ok: true, source: sourceName, linesScanned: lines.length, findings };
}

// ─── Aggregate findings with dedup + stats ────────────────────────────────────
function aggregateFindings(allFindings) {
  const bySev = { critical: 0, high: 0, medium: 0, low: 0 };
  const byCategory = {};
  const ipFreq = {};

  for (const f of allFindings) {
    if (bySev[f.severity] !== undefined) bySev[f.severity]++;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    if (f.srcIp) ipFreq[f.srcIp] = (ipFreq[f.srcIp] || 0) + 1;
  }

  const topIPs = Object.entries(ipFreq)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  return { total: allFindings.length, bySev, byCategory, topIPs };
}

// ─── Full scan: discover + analyse all available sources ────────────────────
async function runFullScan(onProgress) {
  const emit = (msg, pct) => { if (onProgress) onProgress({ msg, pct }); };
  const allFindings = [];
  const sources = [];

  emit('Discovering log sources…', 5);
  const files = discoverLogFiles();

  if (os.platform() === 'win32') {
    emit('Reading Windows Security Event Log…', 20);
    const secLog = await readWindowsEventLog('Security', 500);
    if (secLog.ok) { allFindings.push(...secLog.findings); sources.push({ name: 'Windows Security Log', eventsRead: secLog.eventsRead, findings: secLog.findings.length }); }

    emit('Reading Windows System Event Log…', 35);
    const sysLog = await readWindowsEventLog('System', 300);
    if (sysLog.ok) { allFindings.push(...sysLog.findings); sources.push({ name: 'Windows System Log', eventsRead: sysLog.eventsRead, findings: sysLog.findings.length }); }

    emit('Reading Windows Application Event Log…', 50);
    const appLog = await readWindowsEventLog('Application', 200);
    if (appLog.ok) { allFindings.push(...appLog.findings); sources.push({ name: 'Windows Application Log', eventsRead: appLog.eventsRead, findings: appLog.findings.length }); }
  }

  let pct = 60;
  for (const f of files) {
    emit(`Analysing ${path.basename(f)}…`, pct);
    const result = await analyseFile(f);
    if (result.ok) { allFindings.push(...result.findings); sources.push({ name: f, linesScanned: result.linesScanned, findings: result.findings.length }); }
    pct = Math.min(90, pct + 8);
  }

  emit('Aggregating results…', 95);
  const summary = aggregateFindings(allFindings);
  emit('Done.', 100);

  return {
    ok: true,
    ts: Date.now(),
    sources,
    findings: allFindings.slice(0, 1000),
    summary,
    hasRealData: sources.length > 0,
  };
}

module.exports = { runFullScan, analyseFile, analyseRawText, readWindowsEventLog, discoverLogFiles, PATTERNS };
