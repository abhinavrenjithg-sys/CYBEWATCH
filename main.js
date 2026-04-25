const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
require('dotenv').config();

// ─── Real Backend Modules ─────────────────────────────────────────────────────
const { scanTarget }     = require('./modules/scanner');
const netMon             = require('./modules/network-monitor');
const logAnalyzer        = require('./modules/log-analyzer');

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false },
    title: 'CybeWatch — Enterprise Security Intelligence',
    icon: path.join(__dirname, 'assets/favicon.ico'),
    backgroundColor: '#060912',
    show: false,
  });
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());

  // Push real net-monitor events to the renderer
  netMon.monitor.on('tick', (data) => {
    if (!win.isDestroyed()) win.webContents.send('net:tick', data);
  });
  netMon.monitor.on('threat', (threats) => {
    if (!win.isDestroyed()) win.webContents.send('net:threat', threats);
  });
}

// ─── CPU helper ───────────────────────────────────────────────────────────────
let _lastTotal = 0, _lastIdle = 0;
function getCpuUsage() {
  const cpus = os.cpus();
  let total = 0, idle = 0;
  cpus.forEach(c => { for (const k in c.times) total += c.times[k]; idle += c.times.idle; });
  if (_lastTotal === 0) { _lastTotal = total; _lastIdle = idle; return 0; }
  const dt = total - _lastTotal, di = idle - _lastIdle;
  _lastTotal = total; _lastIdle = idle;
  return dt > 0 ? Math.round(100 * (1 - di / dt)) : 0;
}

// ─── IPC: System Metrics (existing) ──────────────────────────────────────────
ipcMain.handle('get-system-metrics', async () => ({
  cpuUsage:    getCpuUsage(),
  memoryUsage: Math.round(100 * (1 - os.freemem() / os.totalmem())),
  memFreeGB:   (os.freemem()  / 1e9).toFixed(2),
  memTotalGB:  (os.totalmem() / 1e9).toFixed(2),
  uptime:      os.uptime(),
  platform:    os.platform(),
  hostname:    os.hostname(),
}));

// ─── IPC: Web Vulnerability Scanner ──────────────────────────────────────────
ipcMain.handle('scanner:start', async (event, targetUrl) => {
  // Stream progress back as events
  const sender = event.sender;
  const results = await scanTarget(targetUrl, (progress) => {
    if (!sender.isDestroyed()) sender.send('scanner:progress', progress);
  });
  return results;
});

// ─── IPC: Network Monitor ─────────────────────────────────────────────────────
ipcMain.handle('netmon:start', async () => {
  netMon.start(3000);
  return { ok: true };
});
ipcMain.handle('netmon:stop', async () => {
  netMon.stop();
  return { ok: true };
});
ipcMain.handle('netmon:snapshot', async () => {
  return netMon.getSnapshot();
});

// ─── IPC: Log Analyzer ───────────────────────────────────────────────────────
ipcMain.handle('logs:scan-all', async (event) => {
  const sender = event.sender;
  const results = await logAnalyzer.runFullScan((progress) => {
    if (!sender.isDestroyed()) sender.send('logs:progress', progress);
  });
  return results;
});

ipcMain.handle('logs:analyse-file', async (event, filePath) => {
  return await logAnalyzer.analyseFile(filePath);
});

ipcMain.handle('logs:analyse-text', async (event, rawText, sourceName) => {
  return logAnalyzer.analyseRawText(rawText, sourceName || 'Pasted Log');
});

ipcMain.handle('logs:discover', async () => {
  return logAnalyzer.discoverLogFiles();
});

ipcMain.handle('logs:windows-event', async (event, logName, maxEvents) => {
  return await logAnalyzer.readWindowsEventLog(logName || 'Security', maxEvents || 200);
});

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  // Start network monitor automatically
  netMon.start(3000);
});

app.on('window-all-closed', () => {
  netMon.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
