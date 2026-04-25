/* ════════════════════════════════════════════════
   CybeWatch — Shared UI (sidebar, nav, toasts)
   ════════════════════════════════════════════════ */
'use strict';

/* ── Clock ── */
function updateClock(){
  const n=new Date(),pad=v=>String(v).padStart(2,'0');
  const el=document.getElementById('topbar-clock');
  if(el) el.textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}
setInterval(updateClock,1000); updateClock();

/* ── Sidebar toggle ── */
window.initSidebar=function(){
  const sidebar=document.querySelector('.sidebar');
  const toggle=document.getElementById('sidebar-toggle');
  if(!sidebar||!toggle) return;
  const collapsed=sessionStorage.getItem('tw_sidebar')==='1';
  if(collapsed) sidebar.classList.add('collapsed');
  toggle.addEventListener('click',()=>{
    sidebar.classList.toggle('collapsed');
    sessionStorage.setItem('tw_sidebar', sidebar.classList.contains('collapsed')?'1':'0');
  });
};

/* ── Active nav item ── */
window.setActiveNav=function(id){
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.nav===id);
  });
};

/* ── Notification toggle state ── */
window.notificationsEnabled = function(){
  return sessionStorage.getItem('tw_notif') !== '0';
};

window.applyNotifButtonState = function(){
  const btn = document.getElementById('notif-toggle-btn');
  if(!btn) return;
  const on = notificationsEnabled();
  btn.title = on ? 'Notifications ON — click to mute' : 'Notifications MUTED — click to enable';
  btn.style.opacity   = on ? '1'  : '0.45';
  btn.style.color     = on ? ''   : '#475569';
  btn.style.borderColor = on ? '' : 'var(--border)';
  const dot = btn.querySelector('.notif-dot');
  if(dot) dot.style.display = on ? '' : 'none';
  /* Swap bell SVG paths */
  const svg = btn.querySelector('svg');
  if(svg){
    svg.innerHTML = on
      ? '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>'
      : '<path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  }
};

window.toggleNotifications = function(){
  const enabled = !notificationsEnabled();
  sessionStorage.setItem('tw_notif', enabled ? '1' : '0');
  applyNotifButtonState();
  /* Always show this confirmation toast regardless of mute state */
  _showRawToast(
    enabled ? 'Notifications Enabled' : 'Notifications Muted',
    enabled ? 'You will now receive alert popups.' : 'Alert popups are muted. Alerts still log to the table.',
    enabled ? 'success' : 'info', 3500
  );
};

/* ── Internal toast renderer (bypasses mute check) ── */
function _showRawToast(title, msg, type, duration){
  let container = document.getElementById('toast-container');
  if(!container){
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { critical:'\uD83D\uDD34', high:'\uD83D\uDFE0', medium:'\uD83D\uDFE1', success:'\u2705', info:'\uD83D\uDD35' };
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = '<div class="toast-icon">' + (icons[type] || '\u2139\uFE0F') + '</div>'
    + '<div class="toast-body"><div class="toast-title">' + title + '</div><div class="toast-msg">' + msg + '</div></div>'
    + '<div style="margin-left:auto;color:var(--text-3);font-size:16px;cursor:pointer" onclick="this.parentElement.remove()">\u00D7</div>';
  container.appendChild(t);
  t.addEventListener('click', function(){ t.remove(); });
  setTimeout(function(){ t.classList.add('toast-fade'); setTimeout(function(){ t.remove(); }, 300); }, duration);
}

/* ── Public toast (respects mute state) ── */
window.showToast = function(title, msg, type, duration){
  if(type === undefined) type = 'info';
  if(duration === undefined) duration = 5000;
  if(!notificationsEnabled()) return;
  _showRawToast(title, msg, type, duration);
};

/* ── Listen to TW engine for toast notifications ── */
if(window.TW){
  TW.on('alert:new', function(a){
    if(a.sev === 'critical' || a.sev === 'high'){
      showToast(a.label, a.msg.substring(0,80) + '\u2026', a.sev, 7000);
    }
  });
}

/* ── Threat level bar ── */
window.updateThreatLevel=function(level){
  const labels=['','LOW','GUARDED','ELEVATED','HIGH','CRITICAL'];
  const colors=['','#10b981','#2563eb','#eab308','#ef4444','#ef4444'];
  for(let i=1;i<=5;i++){
    const bar=document.getElementById('tl-bar-'+i);
    if(!bar) continue;
    bar.className='tl-bar'+(i<=level?` l${i}`:'');
  }
  const txt=document.getElementById('tl-text');
  if(txt){
    txt.textContent=labels[level];
    txt.style.color=colors[level];
    txt.style.textShadow=`0 0 10px ${colors[level]}`;
  }
};

/* ── User card population ── */
window.populateUserCard=function(){
  const sess=TW.getSession();
  if(!sess) return;
  const nameEl=document.getElementById('user-display-name');
  const roleEl=document.getElementById('user-display-role');
  const avatarEl=document.getElementById('user-avatar');
  if(nameEl) nameEl.textContent=sess.name;
  if(roleEl) roleEl.textContent=sess.role.toUpperCase();
  if(avatarEl) avatarEl.textContent=sess.name.charAt(0).toUpperCase();
};

/* ── Nav alert badge ── */
window.updateNavBadge=function(){
  const counts=TW.countBySev();
  const total=counts.critical+counts.high+counts.medium;
  const badge=document.getElementById('alert-nav-badge');
  if(badge){
    badge.textContent=total>0?Math.min(total,99):'';
    badge.style.display=total>0?'':'none';
  }
};

/* ── Cloud Indicator ── */
window.updateCloudStatus = function(connected) {
    const panels = document.querySelectorAll('.topbar-actions');
    panels.forEach(panel => {
        let indicator = panel.querySelector('#cloud-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'cloud-indicator';
            indicator.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;background:var(--bg-2);border:1px solid var(--border);font-size:9px;font-family:var(--font-mono);font-weight:700;transition:all 0.3s;';
            panel.prepend(indicator);
        }
        indicator.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.6-3.7-4.5-6.6-4.5-3.3 0-6.1 2.3-6.9 5.4C2.4 11.5 1 13.3 1 15.5 1 18 3 20 5.5 20h12"/></svg> ${connected ? 'CLOUD CONNECTED' : 'OFFLINE MODE'}`;
        indicator.style.color = connected ? 'var(--cyan)' : 'var(--text-4)';
        indicator.style.borderColor = connected ? 'rgba(0,212,255,0.3)' : 'var(--border)';
        indicator.style.boxShadow = connected ? '0 0 10px rgba(0,212,255,0.2)' : 'none';
    });
};

if (window.TW) {
    TW.on('cloud:status', status => updateCloudStatus(status));
}

/* ── Live Log Stream UI ── */
window.initLiveStream = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    TW.on('stream:data', (entry) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;font-family:var(--font-mono);font-size:9px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.02);animation:fadeIn 0.2s;';
        
        const ts = `<span style="color:var(--text-4);flex-shrink:0;">[${TW.formatTS(entry.ts)}]</span>`;
        const svc = `<span style="color:var(--cyan);width:60px;flex-shrink:0;">${entry.service}</span>`;
        const lvl = `<span style="color:${entry.level==='WARN'?'var(--medium)':'var(--text-3)'};width:35px;flex-shrink:0;">${entry.level}</span>`;
        const msg = `<span style="color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${entry.msg}</span>`;
        
        row.innerHTML = `${ts} ${svc} ${lvl} ${msg}`;
        container.prepend(row);
        
        if (container.children.length > 50) container.lastElementChild.remove();
    });
};

/* ── Role-based UI ── */
window.applyRoleUI=function(){
  const sess=TW.getSession();
  if(!sess) return;
  const isViewer=sess.role==='viewer';
  const isAnalyst=sess.role==='analyst';
  
  document.querySelectorAll('[data-require-perm]').forEach(el=>{
    const perm=el.dataset.requirePerm;
    if(!TW.can(perm)){
      el.style.opacity='0.4';
      el.style.pointerEvents='none';
      el.title='Insufficient permissions';
    }
  });

  if(isViewer){
    document.querySelectorAll('.admin-only, .analyst-only').forEach(el=>el.style.display='none');
    document.querySelectorAll('button:not(.notif-btn):not(#sidebar-toggle)').forEach(el=>{
        if(!el.classList.contains('btn-ghost')) {
            el.disabled = true;
            el.style.opacity = '0.5';
            el.title = 'View-only access';
        }
    });
  }
  if(isAnalyst){
    document.querySelectorAll('.admin-only').forEach(el=>el.style.display='none');
  }
};

/* ── Logout ── */
window.logout=function(){
  sessionStorage.removeItem('tw_session');
  location.href='index.html';
};

/* ── Shared init for all dashboard pages ── */
window.initDashPage=function(navId){
  const sess=TW.requireAuth();
  if(!sess) return false;
  initSidebar();
  setActiveNav(navId);
  populateUserCard();
  applyRoleUI();
  updateNavBadge();
  applyNotifButtonState();
  TW.startSimulation();
  TW.on('state:update', s=>{
    updateThreatLevel(s.threatLevel);
    updateNavBadge();
  });
  return true;
};

/* ── BG Particle Canvas (shared) ── */
window.initBgParticles=function(canvasId){/* disabled for corporate theme */};

TW.toggleTheme = function() {
    const root = document.documentElement;
    if (root.getAttribute('data-theme') === 'dark') {
        root.removeAttribute('data-theme');
        localStorage.setItem('tw_theme', 'light');
    } else {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('tw_theme', 'dark');
    }
    
    // Re-render charts for new colors if they exist on the page
    if(typeof initTrafficChart === 'function') initTrafficChart();
    if(typeof initDonutChart === 'function') initDonutChart();
    if(typeof initPredictionChart === 'function') initPredictionChart();
}

// Initialize theme from storage (default to dark if not set, typical for security tools)
const savedTheme = localStorage.getItem('tw_theme');
if (savedTheme === 'dark' || !savedTheme) {
    document.documentElement.setAttribute('data-theme', 'dark');
} else {
    document.documentElement.removeAttribute('data-theme');
}

TW.requirePro = function(featureName) {
  const plan = TW.getPlan();
  if (plan === 'free') {
    window.showUpgradeModal(featureName);
    return false;
  }
  return true;
};

window.showUpgradeModal = function(featureName) {
  let modal = document.getElementById('upgrade-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'upgrade-modal';
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;" onclick="this.parentElement.style.display='none'"></div>
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-1);border:1px solid var(--border-2);padding:32px;border-radius:16px;z-index:9999;width:100%;max-width:440px;box-shadow:0 24px 80px rgba(0,0,0,0.5);text-align:center;">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--grad-blue-cyan);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <h3 style="font-size:20px;font-weight:700;color:var(--text-1);margin-bottom:8px;">Unlock ${featureName}</h3>
        <p style="font-size:14px;color:var(--text-2);line-height:1.6;margin-bottom:24px;">This is a premium feature included in the Professional and Enterprise tiers. Upgrade today to access advanced features like AI Correlation, Data Exports, and UEBA.</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn btn-ghost" onclick="this.closest('#upgrade-modal').style.display='none'">Maybe Later</button>
          <a href="pricing.html" class="btn btn-primary" style="text-decoration:none;">View Plans</a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'block';
};

window.exportData = function(type) {
  // Free tier override: actively allow exports for portfolio demonstration
  const btn = event ? event.currentTarget : document.querySelector('button[onclick*="exportData"]');
  const oldText = btn ? btn.innerHTML : 'Export';
  if(btn) {
      btn.innerHTML = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Exporting...`;
      btn.disabled = true;
  }
  
  if (type === 'pdf') {
    const target = document.querySelector('.dash-grid-main') || document.body;
    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin:       10,
        filename:     `CybeWatch-report-${new Date().toISOString().slice(0,10)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#09090b', windowWidth: 1600 },
        jsPDF:        { unit: 'mm', format: 'a3', orientation: 'landscape' }
      };
      
      // Temporarily fix styling that might break print
      const originalHeight = target.style.height;
      target.style.height = 'auto';
      target.style.overflow = 'visible';

      html2pdf().set(opt).from(target).save().then(() => {
        target.style.height = originalHeight;
        target.style.overflow = '';
        if(btn){
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
        showToast('Export Complete', 'Successfully generated corporate PDF report.', 'success');
      }).catch(err => {
         if(btn){ btn.innerHTML = oldText; btn.disabled = false; }
         showToast('Export Failed', 'An error occurred during rendering.', 'critical');
      });
    } else {
        if(btn){ btn.innerHTML = oldText; btn.disabled = false; }
        showToast('Export Failed', 'PDF engine (html2pdf) not loaded.', 'critical');
    }
  } else {
    setTimeout(() => {
      if(btn){ btn.innerHTML = oldText; btn.disabled = false; }
      showToast('Export Complete', `Successfully generated corporate ${type.toUpperCase()} report.`, 'success');
    }, 1500);
  }
};
