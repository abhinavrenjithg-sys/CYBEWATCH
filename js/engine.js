/* ════════════════════════════════════════════════
   CybeWatch — Shared Threat Simulation Engine
   ════════════════════════════════════════════════ */

'use strict';

window.TW = window.TW || {};

/* ─── Native Persistence (Electron) ─── */
let fs, path, ipcRenderer;
try {
  // These only work in Electron/Node context — silently no-op in browser
  if (typeof require !== 'undefined') {
    fs = require('fs');
    path = require('path');
    ipcRenderer = require('electron').ipcRenderer;
    const dbDir = path.join(process.cwd(), 'database');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
  }
} catch(e) {
  fs = null; path = null; ipcRenderer = null;
  // Running in browser — all DB ops will use sessionStorage
}

TW.db = {
  getFilePath: (name) => (path ? path.join(process.cwd(), 'database', `${name}.json`) : null),
  save: (name, data) => {
    const json = JSON.stringify(data, null, 2);
    try { sessionStorage.setItem(`tw_${name}`, json); } catch(e){}
    const fp = TW.db.getFilePath(name);
    if (fp && fs) { try { fs.writeFileSync(fp, json); } catch(e){} }
  },
  load: (name, defaultData) => {
    const fp = TW.db.getFilePath(name);
    if (fp && fs) {
      try {
        if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
      } catch(e) { console.warn(`Error loading ${name}`, e); }
    }
    try {
      const sess = sessionStorage.getItem(`tw_${name}`);
      return sess ? JSON.parse(sess) : defaultData;
    } catch(e) { return defaultData; }
  }
};


/* ─── Seed data ─────────────────────────────── */
TW.CITIES = [
  {name:'New York',     lat:40.7, lon:-74.0},  {name:'Los Angeles',  lat:34.1, lon:-118.2},
  {name:'London',       lat:51.5, lon:-0.1},   {name:'Moscow',       lat:55.8, lon:37.6},
  {name:'Beijing',      lat:39.9, lon:116.4},  {name:'Tokyo',        lat:35.7, lon:139.7},
  {name:'Sydney',       lat:-33.9,lon:151.2},  {name:'São Paulo',    lat:-23.6,lon:-46.6},
  {name:'Lagos',        lat:6.5,  lon:3.4},    {name:'Dubai',        lat:25.2, lon:55.3},
  {name:'Singapore',    lat:1.3,  lon:103.8},  {name:'Paris',        lat:48.9, lon:2.3},
  {name:'Mumbai',       lat:19.1, lon:72.9},   {name:'Seoul',        lat:37.6, lon:127.0},
  {name:'Cairo',        lat:30.0, lon:31.2},   {name:'Toronto',      lat:43.7, lon:-79.4},
  {name:'Chicago',      lat:41.9, lon:-87.6},  {name:'Berlin',       lat:52.5, lon:13.4},
  {name:'Jakarta',      lat:-6.2, lon:106.8},  {name:'Bogotá',       lat:4.7,  lon:-74.1},
  {name:'Dhaka',        lat:23.8, lon:90.4},   {name:'Karachi',      lat:24.9, lon:67.0},
  {name:'Mexico City',  lat:19.4, lon:-99.1},  {name:'Istanbul',     lat:41.0, lon:29.0},
  {name:'Riyadh',       lat:24.7, lon:46.7},   {name:'Shanghai',     lat:31.2, lon:121.5},
];

TW.THREAT_TEMPLATES = [
  { id:'ddos',      label:'DDoS Attack',              sev:'critical', category:'Network',    mitre:['T1498','T1499'], impact:'Service Disruption',  msg:'Volumetric DDoS flood from %IP% — %N%k+ pps UDP/ICMP to tcp/443', aiInsight: 'Anomalous surge in UDP traffic (600% above baseline) detected from 50+ geographically distinct source IPs, strongly indicating a botnet-orchestrated exhaustion attack.' },
  { id:'c2',        label:'Malware C2 Beacon',        sev:'critical', category:'Endpoint',   mitre:['T1071','T1095'], impact:'Host Compromise',     msg:'Cobalt Strike beacon from host %HOST% → %IP%:443 (beaconing every 60s)', aiInsight: 'Consistent 60-second jittered heartbeats detected via encrypted tunnel. Pattern matches known Cobalt Strike Malleable C2 profiles often used by APT-29.' },
  { id:'ransomware',label:'Ransomware Activity',      sev:'critical', category:'Endpoint',   mitre:['T1486','T1490'], impact:'Data Destruction',    msg:'Mass file encryption detected on %HOST% — .locked extension — %N% files affected', aiInsight: 'Rapid succession of file rename and write operations on high-value directories followed by shadow copy deletion. Signatures align with BlackCat/ALPHV ransomware behaviors.' },
  { id:'brute',     label:'SSH Brute Force',          sev:'high',     category:'Auth',       mitre:['T1110','T1021'], impact:'Credential Theft',    msg:'%N% failed SSH logins from %IP% against 10.0.1.%N2% in 120s', aiInsight: 'Sequential login failures using common dictionary passwords. Source IP has high risk score and has been flagged by 4+ external threat feeds in the last 24h.' },
  { id:'phishing',  label:'Spear Phishing',           sev:'high',     category:'Email',      mitre:['T1566','T1204'], impact:'Initial Access',      msg:'Phishing link clicked by %USER%@corp.local — payload from %IP%', aiInsight: 'User interacted with a URI hosted on a newly registered domain (3 days old) with suspicious TLD. Malicious payload execution followed within 12 seconds.' },
  { id:'sqli',      label:'SQL Injection',            sev:'high',     category:'Web App',    mitre:['T1190','T1059'], impact:'Data Exfiltration',   msg:'SQLi detected in GET /api/users?id= from %IP% — UNION SELECT pattern', aiInsight: 'Injected characters (`\' OR 1=1`) detected in application layer logs. Payload attempted to dump user table schema via the `/api/users` endpoint.' },
  { id:'exfil',     label:'Data Exfiltration',        sev:'high',     category:'Network',    mitre:['T1041','T1048'], impact:'Data Breach',         msg:'Outbound spike: %N%MB to %IP% over DNS tunneling in 5 min', aiInsight: 'Unusually large TXT record responses detected on port 53. Ratio of upstream to downstream data indicates protocol tunneling for data exfiltration.' },
  { id:'lpe',       label:'Privilege Escalation',     sev:'high',     category:'Endpoint',   mitre:['T1068','T1134'], impact:'Lateral Movement',    msg:'SUID binary exploitation on %HOST% — root shell spawned from uid=%N2%', aiInsight: 'Process with low privilege user spawned a child process with effective UID 0 via `pkexec` vulnerability. Classic indicator of local privilege escalation.' },
  { id:'scan',      label:'Aggressive Port Scan',     sev:'medium',   category:'Network',    mitre:['T1046','T1595'], impact:'Reconnaissance',      msg:'Nmap-style scan from %IP% — %N% ports probed on 10.0.0.0/24 in 8s', aiInsight: 'Rapid TCP SYN packets across 100+ ports from a single source. Matches Nmap `-sS` stealth scan signature typically used during internal reconnaissance.' },
  { id:'anomaly',   label:'Traffic Anomaly',          sev:'medium',   category:'Network',    mitre:['T1571','T1008'], impact:'Potential C2 Comms',  msg:'Beaconing pattern detected: %IP% every %N2%s on non-standard port %PORT%', aiInsight: 'Recurring connection attempts on unusual port with fixed packet sizes. Heuristics suggest a dormant backdoor attempting to check-in with a remote listener.' },
  { id:'auth_fail', label:'Auth Bypass Attempt',      sev:'medium',   category:'Auth',       mitre:['T1078','T1550'], impact:'Unauthorized Access', msg:'JWT token replay attack from %IP% against /api/admin endpoint', aiInsight: 'Multiple requests using the same expired or stolen JWT from a new device/IP fingerprint. Likely credential replay attack.' },
  { id:'insider',   label:'Insider Threat Indicator', sev:'medium',   category:'UEBA',       mitre:['T1078','T1213'], impact:'Data Leakage',        msg:'%USER%@corp.local accessed %N% restricted files outside business hours', aiInsight: 'Access pattern deviates from user baseline (9:00-17:00). Concurrent downloads from SharePoint/OneDrive of confidential IP directories.' },
  { id:'vuln_scan', label:'Vulnerability Scan',       sev:'low',      category:'Network',    mitre:['T1595','T1592'], impact:'Reconnaissance',      msg:'CVE scanner from %IP% probing %N% endpoints for known exploits', aiInsight: 'Requests containing known vulnerability probes (e.g., Log4Shell JNDI lookups) targeting various public endpoints. Likely automated mass-scanning.' },
  { id:'policy',    label:'Policy Violation',         sev:'low',      category:'Compliance', mitre:['T1078'],         impact:'Compliance Risk',     msg:'USB device connected on %HOST% outside authorized list — %N2%GB drive', aiInsight: 'Non-encrypted removable media connected to a restricted asset. Violates internal policy section 4.2 regarding physical peripheral hygiene.' },
];

TW.MITIGATIONS = {
  ddos:      ['Activate scrubbing center — null-route attack sources at ISP level','Deploy rate limiting: 1k pps per source IP via netfilter','Enable anycast routing to distribute DDoS traffic globally','Alert upstream provider to activate BGP blackhole routing','Scale compute resources; auto-scaling group triggered'],
  c2:        ['Immediately isolate %HOST% from network segment via VLAN ACL','Kill process tree traced to beacon — PID extraction via EDR','Block %IP% and C2 range at firewall with geo-block rule','Capture memory dump for forensic analysis before kill','Reset all credentials used on compromised host, revoke tokens'],
  ransomware:['Immediately quarantine %HOST% from all network segments','Snapshot clean backups; initiate restoration workflow','Block lateral movement: disable SMB shares on adjacent hosts','Activate incident response team — severity: P0','Preserve disk image; pursue forensic chain-of-custody'],
  brute:     ['Block %IP% at perimeter firewall — add to blocklist feed','Enable account lockout after 5 attempts on targeted accounts','Force MFA enrollment for all SSH accounts immediately','Rotate all SSH keys on attacked hosts','Review auth logs for successful logins from same IP range'],
  phishing:  ['Quarantine email in %USER% mailbox; block sender domain','Force password reset for %USER% — session revocation','Scan affected workstation for downloaded malware artifacts','Block %IP% and associated domain at proxy/DNS level','Alert all staff — send security awareness notification'],
  sqli:      ['Apply WAF rule to block UNION SELECT patterns from %IP%','Parameterize vulnerable query — emergency patch deployment','Audit database access logs for exfiltrated records','Rotate database credentials; enable slow query logging','Notify DBA team — review affected stored procedures'],
  exfil:     ['Block %IP% and ASN at firewall — emergency egress rule','Capture and analyze DNS tunnel packets for forensics','Disable affected user account pending investigation','Notify legal/compliance team — potential data breach','Review DLP policies — increase sensitivity thresholds'],
  default:   ['Block source IP %IP% at perimeter firewall','Escalate to Tier 2 SOC analyst for investigation','Collect and preserve relevant logs with chain-of-custody','Open incident ticket and notify system owner','Apply compensating controls while root cause is analyzed'],
};

TW.USERS = ['admin.chen','sara.miller','devops.raj','m.okonkwo','k.petrov','l.santos','a.mueller','t.yamamoto'];
TW.HOSTS = ['ws-corp-042','srv-app-01','db-prod-03','srv-web-15','ws-corp-118','srv-api-02','dc-prod-01','kafka-01'];

function rnd(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function rndIP(){return `${rnd(1,223)}.${rnd(1,254)}.${rnd(1,254)}.${rnd(1,254)}`;}
function rndItem(arr){return arr[rnd(0,arr.length-1)];}
function rndPort(){return rndItem([8080,4444,9001,31337,1337,443,53,2222,8443,3306]);}

TW.formatAlert = function(tpl){
  return tpl.msg
    .replace(/%IP%/g,   rndIP())
    .replace(/%HOST%/g, rndItem(TW.HOSTS))
    .replace(/%USER%/g, rndItem(TW.USERS))
    .replace(/%N%/g,    rnd(100,9999))
    .replace(/%N2%/g,   rnd(1,254))
    .replace(/%PORT%/g, rndPort());
};

TW.getMitigations = function(tplId){
  const steps = TW.MITIGATIONS[tplId] || TW.MITIGATIONS.default;
  return steps.map(s => s.replace(/%IP%/g, rndIP()).replace(/%HOST%/g, rndItem(TW.HOSTS)).replace(/%USER%/g, rndItem(TW.USERS)));
};

/* ─── Alert Store ─── */
TW.alerts = TW.db.load('alerts', []);
let alertIdCounter = TW.alerts.length ? Math.max(...TW.alerts.map(a=>a.id)) : 0;


TW.addAlert = function(tpl){
  if(!tpl) tpl = rndItem(TW.THREAT_TEMPLATES);
  const ip = rndIP();
  const host = rndItem(TW.HOSTS);
  const user = rndItem(TW.USERS);
  const alert = {
    id: ++alertIdCounter,
    tplId: tpl.id,
    label: tpl.label,
    sev: tpl.sev,
    category: tpl.category,
    impact: tpl.impact,
    mitre: tpl.mitre,
    msg: TW.formatAlert(tpl),
    srcIp: ip,
    host: host,
    user: user,
    ts: Date.now(),
    status: 'new',
    assignee: null,
    aiInsight: tpl.aiInsight || 'No detailed AI analysis available for this alert type.',
  };
  TW.alerts.unshift(alert);
  if(TW.alerts.length > 200) TW.alerts = TW.alerts.slice(0,200);
  
  // Local Save
  TW.db.save('alerts', TW.alerts);
  
  // Cloud Sync (Async)
  if (TW.cloud) {
    TW.cloud.saveAlert(alert).then(success => {
      if (success) console.log(`Cloud Sync Success: Alert ${alert.id}`);
      TW.emit('cloud:sync', { success, type: 'alert' });
    });
  }

  TW.emit('alert:new', alert);
  return alert;
};


/* ─── Log Ingestion Engine ─── */
TW.ingestLogs = function(rawJson) {
  try {
    const logs = JSON.parse(rawJson);
    const logArray = Array.isArray(logs) ? logs : [logs];
    let ingestedCount = 0;
    
    logArray.forEach(log => {
      const tpl = TW.parseLog(log);
      if (tpl) {
        const a = TW.addAlert(tpl);
        // Overwrite random data with log data if available
        if (log.src_ip) a.srcIp = log.src_ip;
        if (log.host)   a.host = log.host;
        if (log.user)   a.user = log.user;
        if (log.message) a.msg = log.message;
        if (log.timestamp) a.ts = new Date(log.timestamp).getTime();
        ingestedCount++;
      }
    });
    
    TW.db.save('alerts', TW.alerts);
    return { success: true, count: ingestedCount };
  } catch(e) {
    return { success: false, error: e.message };
  }
};

TW.parseLog = function(log) {
  // Map raw log fields to threat templates
  const msg = (log.message || '').toLowerCase();
  const cat = (log.category || log.type || '').toLowerCase();
  
  if (msg.includes('ddos') || cat.includes('ddos')) return TW.THREAT_TEMPLATES.find(t=>t.id==='ddos');
  if (msg.includes('brute') || cat.includes('auth')) return TW.THREAT_TEMPLATES.find(t=>t.id==='brute');
  if (msg.includes('sql') || cat.includes('web')) return TW.THREAT_TEMPLATES.find(t=>t.id==='sqli');
  if (msg.includes('beacon') || msg.includes('c2')) return TW.THREAT_TEMPLATES.find(t=>t.id==='c2');
  if (msg.includes('ransom') || msg.includes('encrypt')) return TW.THREAT_TEMPLATES.find(t=>t.id==='ransomware');
  
  return rndItem(TW.THREAT_TEMPLATES);
};


/* ─── Event Bus ─── */
TW._listeners = {};
TW.on  = function(ev, fn){ (TW._listeners[ev]=TW._listeners[ev]||[]).push(fn); };
TW.emit= function(ev, data){ (TW._listeners[ev]||[]).forEach(fn=>fn(data)); };

/* ─── Streaming Simulation ─── */
TW.stream = {
  active: false,
  buffer: [],
  maxSize: 100,
  start: function() {
    this.active = true;
    this.tick();
  },
  tick: function() {
    if(!this.active) return;
    const count = rnd(5, 15);
    for(let i=0; i<count; i++) {
      const entry = {
        ts: Date.now(),
        service: rndItem(['NGINX','AUTH_SVC','DB_POOL','KAFKA','TRAFFIC_GEN','SOAR_ENGINE']),
        level: rndItem(['INFO','DEBUG','WARN','INFO','INFO']),
        msg: this.rndLogMsg()
      };
      this.buffer.unshift(entry);
      TW.emit('stream:data', entry);
    }
    if(this.buffer.length > this.maxSize) this.buffer = this.buffer.slice(0, this.maxSize);
    setTimeout(() => this.tick(), rnd(500, 2000));
  },
  rndLogMsg: function() {
    const msgs = [
      'Connection established from %IP%',
      'Worker pool health: OK (Active: %N%)',
      'Cache miss on key: user:%USER%',
      'DNS query resolved for internal.srv.%N2%',
      'Payload scanned (Size: %N%kb) - Score: %N2%',
      'Heartbeat acknowledged from %HOST%',
      'Session validated for %USER%@corp.local'
    ];
    return rndItem(msgs)
      .replace(/%IP%/g, rndIP())
      .replace(/%HOST%/g, rndItem(TW.HOSTS))
      .replace(/%USER%/g, rndItem(TW.USERS))
      .replace(/%N%/g, rnd(10, 1000))
      .replace(/%N2%/g, rnd(1, 20));
  }
};

/* ─── Simulation Loop ─── */
TW.state = TW.db.load('state', {
  events: 0, threats: 0, blocked: 0, score: 92, threatLevel: 3, tick: 0
});


TW.geoAttacks = [];

TW.mapLatLonToXY = function(lat, lon, W, H){
  const x = (lon + 180) / 360 * W;
  const y = (90 - lat) / 180 * H;
  return {x, y};
};

TW.spawnGeoAttack = function(sev){
  const src = rndItem(TW.CITIES);
  let dst;
  do { dst = rndItem(TW.CITIES); } while(dst === src);
  TW.geoAttacks.push({ src, dst, progress: 0, sev, pulseR: 0, done: false });
  if(TW.geoAttacks.length > 20) TW.geoAttacks.shift();
};

TW.startSimulation = function(){
  if(TW._simRunning) return;
  TW._simRunning = true;

  // Cloud Status Check
  if (window.SupabaseClient) {
    window.SupabaseClient.from('alerts').select('count', { count: 'exact', head: true })
      .then(({ error }) => {
        TW.cloudConnected = !error;
        TW.emit('cloud:status', TW.cloudConnected);
      });
  }
  if(TW.alerts.length < 20){
    const sevs = ['critical','critical','high','high','high','medium','medium','medium','low'];
    for(let i=0;i<25;i++){
      const tpl = TW.THREAT_TEMPLATES.find(t=>t.sev === rndItem(sevs)) || rndItem(TW.THREAT_TEMPLATES);
      const a = TW.addAlert(tpl);
      a.ts -= rnd(0, 3600000); // spread over last hour
      a.status = rndItem(['new','acknowledged','investigating','resolved']);
    }
    TW.alerts.sort((a,b)=>b.ts-a.ts);
    sessionStorage.setItem('tw_alerts', JSON.stringify(TW.alerts));
  }

  // Seed geo attacks
  for(let i=0;i<5;i++) TW.spawnGeoAttack(rndItem(['critical','high','medium']));

  // Start data stream
  TW.stream.start();

  setInterval(async ()=>{
    TW.state.tick++;
    const s = TW.state;
    s.events = rnd(600,1400);

    // Electron Native Integration: Read real PC resources instead of fake data
    if (ipcRenderer) {
      try {
        const stats = await ipcRenderer.invoke('get-system-metrics');
        s.cpu = stats.cpuUsage;
        s.mem = stats.memoryUsage;
        s.uptime = stats.uptime;
      } catch (e) {
        console.error("Electron IPC Error:", e)
      }
    }

    if(Math.random() < 0.35){
      const tpl = rndItem(TW.THREAT_TEMPLATES);
      const a = TW.addAlert(tpl);
      s.threats = Math.min(s.threats+1, 99);
      if(Math.random()<0.65){ s.blocked++; }
      TW.spawnGeoAttack(tpl.sev);
      s.score = Math.max(40, Math.min(99,
        s.score - (tpl.sev==='critical'?3:tpl.sev==='high'?1:0) + (Math.random()<0.2?1:0)
      ));
      if(s.threats>20) s.threatLevel=5;
      else if(s.threats>14) s.threatLevel=4;
      else if(s.threats>7)  s.threatLevel=3;
      else if(s.threats>3)  s.threatLevel=2;
      else                   s.threatLevel=1;
      TW.emit('state:update', s);
    }
    if(s.tick % 25 === 0) s.threats = Math.max(0, s.threats-1);
    sessionStorage.setItem('tw_state', JSON.stringify(s));
    TW.db.save('state', s);

  }, 1200);
};

/* ─── Auth helpers ─── */
TW.getSession = function(){
  try { 
    const sess = JSON.parse(sessionStorage.getItem('tw_session'));
    if(sess && sess.name && sess.role) return sess;
    return null;
  } catch(e){ return null; }
};
TW.requireAuth = function(){
  const sess = TW.getSession();
  if(!sess){ location.href = 'login.html'; return null; }
  return sess;
};
TW.getPlan = function(){
  // All features free/accessible for now
  return 'enterprise';
};
TW.can = function(action){
  const sess = TW.getSession();
  if(!sess) return false;
  const perms = {
    admin:    ['view','respond','investigate','admin','settings'],
    analyst:  ['view','respond','investigate'],
    viewer:   ['view'],
  };
  return (perms[sess.role]||[]).includes(action);
};

/* ─── Helpers ─── */
TW.formatTime = function(ts){
  const d = new Date(ts), now = new Date();
  const diff = Math.floor((now-d)/1000);
  if(diff<60)  return `${diff}s ago`;
  if(diff<3600)return `${Math.floor(diff/60)}m ago`;
  if(diff<86400)return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString();
};
TW.formatTS = function(ts){
  return new Date(ts).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
};
TW.sevColor = function(sev){
  return {critical:'var(--critical)',high:'var(--high)',medium:'var(--medium)',low:'var(--low)'}[sev]||'var(--text-3)';
};
TW.countBySev = function(){
  return {
    critical: TW.alerts.filter(a=>a.sev==='critical'&&a.status!=='resolved').length,
    high:     TW.alerts.filter(a=>a.sev==='high'    &&a.status!=='resolved').length,
    medium:   TW.alerts.filter(a=>a.sev==='medium'  &&a.status!=='resolved').length,
    low:      TW.alerts.filter(a=>a.sev==='low'     &&a.status!=='resolved').length,
  };
};

// ── Hackathon "Red Team Simulator" Logic ──
window.triggerRedTeamSequence = function() {
  if(window.TW && window.TW.state) {
    window.TW.state.score = 5;
    window.TW.state.threats = 99;
    window.TW.state.threatLevel = 5;
  }
  
  if(window.showToast) {
    window.showToast('🚨 ZERO-DAY DETECTED', 'Massive inbound breach signatures detected on core routers.', 'critical', 8000);
    setTimeout(() => window.showToast('⚠️ LATERAL MOVEMENT', 'Compromise spreading to internal subnets.', 'critical', 6000), 1000);
  }

  document.body.classList.add('breach-mode');
  
  // Rapidly spawn critical attacks on the globe
  let breachInterval = setInterval(() => {
    if(window.TW && window.TW.spawnGeoAttack) {
      for(let i=0; i<8; i++) window.TW.spawnGeoAttack('critical');
    }
  }, 100);
  
  // Clean up visual overload after 10 seconds
  setTimeout(() => {
    clearInterval(breachInterval);
    document.body.classList.remove('breach-mode');
    if(window.showToast) window.showToast('Automated Containment', 'SOAR playbook successfully contained the threat.', 'success', 5000);
    if(window.TW && window.TW.state) window.TW.state.score = 88;
  }, 10000);
};
