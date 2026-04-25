'use strict';
/**
 * CybeWatch — Real Network Monitor
 * Uses Node.js os, child_process, and net to:
 *  1. Track real TCP/UDP connections via netstat
 *  2. Detect port scan patterns (many ports from same IP in short window)
 *  3. Detect high connection rate (DoS-like behaviour)
 *  4. Monitor real CPU/Memory/Net I/O from the OS
 */

const { exec } = require('child_process');
const os = require('os');
const EventEmitter = require('events');

const monitor = new EventEmitter();

// ─── Track connection state ───────────────────────────────────────────────────
const connHistory = new Map(); // ip -> { ports: Set, count, firstSeen, lastSeen }
const SCAN_THRESHOLD_PORTS = 15;  // distinct ports from same IP = suspicious
const DOS_THRESHOLD_CONNS = 40;   // connections from same IP in window = suspicious
const WINDOW_MS = 30000;          // 30-second sliding window
let _isRunning = false;
let _pollInterval = null;

// ─── Parse Windows netstat output ─────────────────────────────────────────────
function parseNetstatWindows(output) {
  const conns = [];
  const lines = output.split('\n');
  for (const line of lines) {
    // Example: TCP    192.168.1.5:50221      93.184.216.34:443      ESTABLISHED
    const match = line.trim().match(/^(TCP|UDP)\s+(\S+)\s+(\S+)\s+(\S+)?/i);
    if (!match) continue;
    const proto = match[1].toUpperCase();
    const local = match[2];
    const remote = match[3];
    const state = match[4] || '';
    if (remote === '*:*' || remote === '0.0.0.0:0' || remote.startsWith('[::]:')) continue;
    const remParts = remote.split(':');
    const remPort = parseInt(remParts[remParts.length - 1], 10);
    const remIp = remParts.slice(0, -1).join(':').replace(/[\[\]]/g, '');
    if (!remIp || remIp === '0.0.0.0' || remIp === '127.0.0.1' || remIp === '::1') continue;
    conns.push({ proto, local, remoteIp: remIp, remotePort: remPort, state: state.trim() });
  }
  return conns;
}

// ─── Parse Linux/macOS netstat output ─────────────────────────────────────────
function parseNetstatUnix(output) {
  const conns = [];
  const lines = output.split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const proto = parts[0];
    if (!proto.startsWith('tcp') && !proto.startsWith('udp')) continue;
    const remoteAddr = parts[4];
    if (!remoteAddr || remoteAddr === '*:*') continue;
    const idx = remoteAddr.lastIndexOf(':');
    const remIp = remoteAddr.substring(0, idx);
    const remPort = parseInt(remoteAddr.substring(idx + 1), 10);
    if (!remIp || remIp === '0.0.0.0' || remIp === '127.0.0.1') continue;
    conns.push({ proto, remoteIp: remIp, remotePort: remPort, state: parts[5] || '' });
  }
  return conns;
}

// ─── Run netstat and get real connections ─────────────────────────────────────
function getNetConnections() {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const cmd = isWin ? 'netstat -ano -p TCP' : 'netstat -tn';
    exec(cmd, { timeout: 8000 }, (err, stdout) => {
      if (err) return resolve([]);
      const parsed = isWin ? parseNetstatWindows(stdout) : parseNetstatUnix(stdout);
      resolve(parsed);
    });
  });
}

// ─── Get network interface stats ──────────────────────────────────────────────
function getNetworkStats() {
  const ifaces = os.networkInterfaces();
  const stats = { interfaces: [], totalAddresses: 0 };
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.internal) continue;
      stats.interfaces.push({ name, address: addr.address, family: addr.family, mac: addr.mac });
      stats.totalAddresses++;
    }
  }
  return stats;
}

// ─── Analyse connections for threats ─────────────────────────────────────────
function analyseConnections(conns) {
  const alerts = [];
  const now = Date.now();

  // Update history
  for (const conn of conns) {
    const { remoteIp, remotePort } = conn;
    if (!connHistory.has(remoteIp)) {
      connHistory.set(remoteIp, { ports: new Set(), count: 0, firstSeen: now, lastSeen: now });
    }
    const rec = connHistory.get(remoteIp);
    rec.ports.add(remotePort);
    rec.count++;
    rec.lastSeen = now;
  }

  // Prune old entries
  for (const [ip, rec] of connHistory.entries()) {
    if (now - rec.firstSeen > WINDOW_MS) connHistory.delete(ip);
  }

  // Detect port scanning: many distinct ports from single IP
  for (const [ip, rec] of connHistory.entries()) {
    if (rec.ports.size >= SCAN_THRESHOLD_PORTS) {
      alerts.push({
        type: 'PORT_SCAN',
        remoteIp: ip,
        detail: `${rec.ports.size} distinct ports probed from ${ip} within ${WINDOW_MS / 1000}s window.`,
        ports: [...rec.ports].sort((a,b) => a - b),
        severity: rec.ports.size > 30 ? 'critical' : 'high',
        ts: now,
      });
    }
    // DoS-like: huge connection count from one IP
    if (rec.count >= DOS_THRESHOLD_CONNS) {
      alerts.push({
        type: 'HIGH_CONN_RATE',
        remoteIp: ip,
        detail: `${rec.count} connections from ${ip} in ${WINDOW_MS / 1000}s. Possible DoS.`,
        severity: rec.count > 100 ? 'critical' : 'high',
        ts: now,
      });
    }
  }

  return alerts;
}

// ─── Collect real system metrics ───────────────────────────────────────────────
let _lastCpuTimes = null;
function getCpuPercent() {
  const cpus = os.cpus();
  let total = 0, idle = 0;
  cpus.forEach(c => {
    for (const k of Object.keys(c.times)) total += c.times[k];
    idle += c.times.idle;
  });
  if (!_lastCpuTimes) { _lastCpuTimes = { total, idle }; return 0; }
  const dt = total - _lastCpuTimes.total;
  const di = idle - _lastCpuTimes.idle;
  _lastCpuTimes = { total, idle };
  return dt > 0 ? Math.round(100 * (1 - di / dt)) : 0;
}

function getSystemMetrics() {
  return {
    cpu: getCpuPercent(),
    memUsed: Math.round(100 * (1 - os.freemem() / os.totalmem())),
    memFreeGB: (os.freemem() / 1e9).toFixed(2),
    memTotalGB: (os.totalmem() / 1e9).toFixed(2),
    uptime: os.uptime(),
    platform: os.platform(),
    hostname: os.hostname(),
    loadAvg: os.loadavg(),
    netStats: getNetworkStats(),
    ts: Date.now(),
  };
}

// ─── Start / Stop monitor ─────────────────────────────────────────────────────
function start(intervalMs = 3000) {
  if (_isRunning) return;
  _isRunning = true;
  console.log('[NetMonitor] Started — polling every', intervalMs, 'ms');

  async function poll() {
    if (!_isRunning) return;
    try {
      const conns = await getNetConnections();
      const metrics = getSystemMetrics();
      const threats = analyseConnections(conns);
      monitor.emit('tick', { conns, metrics, threats, ts: Date.now() });
      if (threats.length) monitor.emit('threat', threats);
    } catch (e) {
      console.error('[NetMonitor] Poll error:', e.message);
    }
    if (_isRunning) _pollInterval = setTimeout(poll, intervalMs);
  }

  poll();
}

function stop() {
  _isRunning = false;
  if (_pollInterval) { clearTimeout(_pollInterval); _pollInterval = null; }
  connHistory.clear();
  console.log('[NetMonitor] Stopped.');
}

function getSnapshot() {
  return { metrics: getSystemMetrics(), connectionCount: connHistory.size };
}

module.exports = { monitor, start, stop, getSnapshot, getSystemMetrics };
