/* ════════════════════════════════════════════════
   CybeWatch — Global Command Palette (Cmd+K)
   ════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── Styles ── */
const style = document.createElement('style');
style.textContent = `
.cp-backdrop {
  position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);
  z-index:99000;display:none;align-items:flex-start;justify-content:center;padding-top:14vh;
}
.cp-backdrop.open { display:flex; animation:cp-fade .15s ease; }
@keyframes cp-fade { from{opacity:0} to{opacity:1} }
.cp-box {
  width:560px;max-width:94vw;background:#0a1628;
  border:1px solid rgba(0,212,255,0.3);border-radius:14px;
  box-shadow:0 24px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(0,212,255,0.08);
  animation:cp-slide .18s cubic-bezier(.4,0,.2,1);overflow:hidden;
}
@keyframes cp-slide { from{opacity:0;transform:translateY(-12px) scale(.97)} to{opacity:1;transform:none} }
.cp-input-row {
  display:flex;align-items:center;gap:12px;padding:14px 16px;
  border-bottom:1px solid rgba(0,212,255,0.12);
}
.cp-icon { color:#0ea5e9;flex-shrink:0;opacity:.8; }
.cp-input {
  flex:1;background:none;border:none;outline:none;
  font-size:15px;color:#f1f5f9;font-family:inherit;caret-color:#0ea5e9;
}
.cp-input::placeholder { color:#334155; }
.cp-kbd-hint { font-family:'JetBrains Mono',monospace;font-size:10px;color:#334155;flex-shrink:0; }
.cp-results { max-height:360px;overflow-y:auto;padding:6px 0; }
.cp-results::-webkit-scrollbar { width:3px; }
.cp-results::-webkit-scrollbar-thumb { background:rgba(99,179,237,.2); border-radius:2px; }
.cp-section-label {
  font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
  color:#334155;padding:10px 16px 4px;font-family:'JetBrains Mono',monospace;
}
.cp-item {
  display:flex;align-items:center;gap:12px;padding:9px 16px;
  cursor:pointer;transition:background .12s;border-radius:0;
}
.cp-item:hover,.cp-item.selected {
  background:rgba(0,212,255,0.08);
}
.cp-item.selected { background:rgba(0,212,255,0.11); }
.cp-item-icon {
  width:30px;height:30px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;
}
.cp-item-text { flex:1;min-width:0; }
.cp-item-name { font-size:13px;color:#e2e8f0;font-weight:500; }
.cp-item-desc { font-size:10px;color:#475569;margin-top:1px; }
.cp-item-kbd { font-family:'JetBrains Mono',monospace;font-size:9px;color:#334155; }
.cp-empty { padding:28px;text-align:center;color:#334155;font-size:13px; }
.cp-footer {
  border-top:1px solid rgba(99,179,237,0.08);
  padding:8px 16px;display:flex;gap:14px;
  font-family:'JetBrains Mono',monospace;font-size:9px;color:#334155;
}
.cp-count { margin-left:auto; }
/* highlight match */
.cp-match { color:#0ea5e9;font-weight:700; }
`;
document.head.appendChild(style);

/* ── Build DOM ── */
const backdrop = document.createElement('div');
backdrop.className = 'cp-backdrop';
backdrop.id = 'cp-backdrop';
backdrop.innerHTML = `
<div class="cp-box" id="cp-box">
  <div class="cp-input-row">
    <svg class="cp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input class="cp-input" id="cp-input" placeholder="Search commands, alerts, pages…" autocomplete="off" spellcheck="false"/>
    <span class="cp-kbd-hint">ESC to close</span>
  </div>
  <div class="cp-results" id="cp-results"></div>
  <div class="cp-footer">
    <span>↑↓ navigate</span><span>↵ execute</span><span>ESC close</span>
    <span class="cp-count" id="cp-count"></span>
  </div>
</div>`;
document.body.appendChild(backdrop);

/* ── Commands ── */
const page = window.location.pathname.split('/').pop();

const COMMANDS = [
  /* Navigation */
  { group:'Navigate', icon:'📊', bg:'rgba(99,102,241,0.15)', name:'Go to Dashboard',       desc:'Main SOC operations view',                action:()=>go('dashboard.html') },
  { group:'Navigate', icon:'🚨', bg:'rgba(255,68,68,0.15)',  name:'Go to Alerts',           desc:'Alert management and triage',              action:()=>go('alerts.html') },
  { group:'Navigate', icon:'🔍', bg:'rgba(16,185,129,0.15)', name:'Go to Investigation',    desc:'Case workspace and incident response',      action:()=>go('investigation.html') },
  { group:'Navigate', icon:'🌐', bg:'rgba(0,212,255,0.15)',  name:'Go to Threat Intel',     desc:'IOCs, APT campaigns, UEBA, malware',        action:()=>go('intelligence.html') },
  /* Alert actions */
  { group:'Alerts', icon:'🔴', bg:'rgba(255,45,85,0.15)',    name:'Show Critical Alerts',   desc:'Filter table to CRITICAL severity only',    action:()=>filterAlerts('critical') },
  { group:'Alerts', icon:'🟠', bg:'rgba(245,158,11,0.15)',   name:'Show High Alerts',       desc:'Filter table to HIGH severity only',         action:()=>filterAlerts('high') },
  { group:'Alerts', icon:'📋', bg:'rgba(99,179,237,0.15)',   name:'Show Open Alerts',       desc:'Filter to unresolved open alerts',           action:()=>filterAlerts('','open') },
  { group:'Alerts', icon:'✅', bg:'rgba(16,185,129,0.15)',   name:'Show All Alerts',        desc:'Clear all filters',                         action:()=>filterAlerts('all','all') },
  { group:'Alerts', icon:'💾', bg:'rgba(99,179,237,0.15)',   name:'Export Alerts CSV',      desc:'Download all alerts as CSV file',            action:()=>runFn('exportCSV') },
  /* System */
  { group:'System', icon:'🔔', bg:'rgba(245,158,11,0.15)',   name:'Toggle Notifications',   desc:'Mute or unmute alert popup toasts',          action:()=>runFn('toggleNotifications') },
  { group:'System', icon:'◀',  bg:'rgba(99,102,241,0.15)',   name:'Toggle Sidebar',         desc:'Collapse or expand the navigation sidebar',  action:()=>{ document.getElementById('sidebar-toggle')?.click(); } },
  { group:'System', icon:'🚪', bg:'rgba(255,45,85,0.15)',    name:'Sign Out',               desc:'Logout and return to login page',            action:()=>runFn('logout') },
  /* AI */
  { group:'AI (ARIA)', icon:'🤖', bg:'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(168,85,247,0.15))', name:'Open ARIA Chat',    desc:'Ask the AI SOC assistant a question',      action:()=>{ document.getElementById('aria-fab')?.click(); closePalette(); } },
  { group:'AI (ARIA)', icon:'⚡', bg:'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(168,85,247,0.15))', name:'Analyze Latest Alert', desc:'ARIA AI analysis on most recent alert', action:analyzeLatest },
  /* Quick Info */
  { group:'Info', icon:'ℹ️', bg:'rgba(99,179,237,0.1)', name:'About CybeWatch', desc:'Version, platform info', action:()=>{ showToast && showToast('CybeWatch Enterprise','v2.4 | Gemini 2.0 Flash | ip-api.com intelligence','info',5000); closePalette(); } },
];

function go(url){ closePalette(); setTimeout(()=>location.href=url,120); }
function runFn(fn){ closePalette(); setTimeout(()=>{ if(window[fn]) window[fn](); },120); }
function filterAlerts(sev,status){
  closePalette();
  if(page!=='alerts.html'){ sessionStorage.setItem('cp_sev',sev||''); sessionStorage.setItem('cp_status',status||''); go('alerts.html'); return; }
  setTimeout(()=>{
    const sf=document.getElementById('sev-filter');
    const stf=document.getElementById('status-filter');
    if(sf&&sev) sf.value=sev;
    if(stf&&status) stf.value=status;
    if(window.renderAlerts) renderAlerts();
  },150);
}
function analyzeLatest(){
  closePalette();
  if(page!=='alerts.html'){ go('alerts.html'); return; }
  setTimeout(()=>{
    const latest=TW.alerts[0];
    if(!latest) return;
    if(window.openDrawer) openDrawer(latest.id);
    setTimeout(()=>{ if(window.analyzeAlertWithAI) analyzeAlertWithAI(latest.id); },400);
  },200);
}

/* ── Rendering ── */
let selectedIdx=0;
let filtered=[];

function renderResults(q){
  q=(q||'').toLowerCase().trim();
  filtered=q ? COMMANDS.filter(c=>`${c.name} ${c.desc} ${c.group}`.toLowerCase().includes(q)) : COMMANDS;

  if(!filtered.length){
    document.getElementById('cp-results').innerHTML=`<div class="cp-empty">No commands match "<strong>${q}</strong>"</div>`;
    document.getElementById('cp-count').textContent='';
    return;
  }

  selectedIdx=0;
  const groups=[...new Set(filtered.map(c=>c.group))];
  let html='';
  groups.forEach(g=>{
    html+=`<div class="cp-section-label">${g}</div>`;
    filtered.filter(c=>c.group===g).forEach(c=>{
      const idx=filtered.indexOf(c);
      const nameH=highlight(c.name,q);
      const descH=highlight(c.desc,q);
      html+=`<div class="cp-item${idx===0?' selected':''}" data-idx="${idx}" onclick="window._cpExec(${idx})">
        <div class="cp-item-icon" style="background:${c.bg}">${c.icon}</div>
        <div class="cp-item-text">
          <div class="cp-item-name">${nameH}</div>
          <div class="cp-item-desc">${descH}</div>
        </div>
      </div>`;
    });
  });
  document.getElementById('cp-results').innerHTML=html;
  document.getElementById('cp-count').textContent=`${filtered.length} result${filtered.length!==1?'s':''}`;
}

function highlight(text,q){
  if(!q) return text;
  const idx=text.toLowerCase().indexOf(q.toLowerCase());
  if(idx===-1) return text;
  return text.substring(0,idx)+'<span class="cp-match">'+text.substring(idx,idx+q.length)+'</span>'+text.substring(idx+q.length);
}

function updateSelection(){
  document.querySelectorAll('.cp-item').forEach((el,i)=>{
    el.classList.toggle('selected',+el.dataset.idx===selectedIdx);
    if(+el.dataset.idx===selectedIdx) el.scrollIntoView({block:'nearest'});
  });
}

window._cpExec=function(idx){
  const cmd=filtered[idx];
  if(cmd) cmd.action();
};

/* ── Open / close ── */
function openPalette(){
  backdrop.classList.add('open');
  const input=document.getElementById('cp-input');
  input.value='';
  renderResults('');
  setTimeout(()=>input.focus(),30);
}
function closePalette(){
  backdrop.classList.remove('open');
}

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown',function(e){
  // Cmd+K or Ctrl+K to open
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){
    e.preventDefault();
    backdrop.classList.contains('open') ? closePalette() : openPalette();
    return;
  }
  if(!backdrop.classList.contains('open')) return;

  if(e.key==='Escape'){ e.preventDefault(); closePalette(); return; }
  if(e.key==='ArrowDown'){ e.preventDefault(); selectedIdx=Math.min(selectedIdx+1,filtered.length-1); updateSelection(); return; }
  if(e.key==='ArrowUp'){ e.preventDefault(); selectedIdx=Math.max(selectedIdx-1,0); updateSelection(); return; }
  if(e.key==='Enter'){ e.preventDefault(); const cmd=filtered[selectedIdx]; if(cmd) cmd.action(); return; }
});

document.getElementById('cp-input').addEventListener('input',function(){
  renderResults(this.value);
});

// Close on backdrop click
backdrop.addEventListener('click',function(e){
  if(e.target===backdrop) closePalette();
});

// Apply any pending filters from navigation
window.addEventListener('DOMContentLoaded',function(){
  const psev=sessionStorage.getItem('cp_sev');
  const pst=sessionStorage.getItem('cp_status');
  if(psev||pst){
    sessionStorage.removeItem('cp_sev'); sessionStorage.removeItem('cp_status');
    const sf=document.getElementById('sev-filter');
    const stf=document.getElementById('status-filter');
    if(sf&&psev) sf.value=psev;
    if(stf&&pst) stf.value=pst;
    if(window.renderAlerts) setTimeout(renderAlerts,200);
  }
});

/* ── Inject Cmd+K hint badge into topbar ── */
setTimeout(function(){
  const clock=document.getElementById('topbar-clock');
  if(clock&&!document.getElementById('cp-hint-badge')){
    const badge=document.createElement('button');
    badge.id='cp-hint-badge';
    badge.onclick=openPalette;
    badge.title='Open Command Palette (Cmd+K)';
    badge.style.cssText='background:rgba(99,179,237,0.06);border:1px solid rgba(99,179,237,0.15);border-radius:6px;color:#475569;font-family:"JetBrains Mono",monospace;font-size:10px;padding:4px 8px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .2s;';
    badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>⌘K';
    badge.onmouseenter=()=>{badge.style.borderColor='rgba(0,212,255,0.3)';badge.style.color='#94a3b8';};
    badge.onmouseleave=()=>{badge.style.borderColor='rgba(99,179,237,0.15)';badge.style.color='#475569';};
    clock.parentElement.insertBefore(badge,clock);
  }
},500);

})();
