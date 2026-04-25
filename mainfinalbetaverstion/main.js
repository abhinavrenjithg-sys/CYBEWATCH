const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

// Load environment variables (.env)
require('dotenv').config();


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    title: "CybeWatch — Enterprise Security Intelligence",
    icon: path.join(__dirname, 'assets/favicon.ico'),
    backgroundColor: '#060912',
    show: false
  });

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
  });
}

/* ─── Native Metrics IPC ─── */
let lastCpuUsage = 0;
let lastTotalMs = 0;
let lastIdleMs = 0;

function getCpuUsage() {
  const cpus = os.cpus();
  let totalMs = 0;
  let idleMs = 0;
  cpus.forEach(cpu => {
    for (type in cpu.times) totalMs += cpu.times[type];
    idleMs += cpu.times.idle;
  });
  
  if (lastTotalMs === 0) {
    lastTotalMs = totalMs;
    lastIdleMs = idleMs;
    return 0;
  }
  
  const diffTotal = totalMs - lastTotalMs;
  const diffIdle = idleMs - lastIdleMs;
  lastTotalMs = totalMs;
  lastIdleMs = idleMs;
  
  return 100 * (1 - diffIdle / diffTotal);
}

ipcMain.handle('get-system-metrics', async () => {
  return {
    cpuUsage: getCpuUsage(),
    memoryUsage: 100 * (1 - os.freemem() / os.totalmem()),
    uptime: os.uptime(),
    platform: os.platform(),
    hostname: os.hostname()
  };
});


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
