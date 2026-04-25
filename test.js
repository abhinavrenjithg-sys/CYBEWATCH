
if(!TW.requireAuth()) location.href='index.html';
const ANALYSTS=['S. Miller','A. Chen','R. Patel','K. Okonkwo','L. Santos','A. Mueller'];

let cases = [];
try { 
  cases = JSON.parse(sessionStorage.getItem('tw_cases') || 'null') || [];
  if (!Array.isArray(cases)) cases = [];
} catch(e) {}

// Force recreate if empty or corrupted structure
if(cases.length === 0 || !cases[0] || !cases[0].id || !Array.isArray(cases[0].tags)){
  const now=Date.now();
  cases=[
    {id:'INC-001',title:'APT-29 Lateral Movement Campaign',sev:'critical',status:'in-progress',assignee:'A. Chen',created:now-7200000,updated:now-1800000,tags:['APT','Lateral Movement','Credential Theft'],summary:'Russian APT-29 group detected performing lateral movement across 3 servers after initial phishing compromise of admin.chen account.',linked_alerts: [1,3,5],notes:[{author:'A. Chen',ts:now-5400000,text:'Initial triage complete. Confirmed Cobalt Strike beacon from ws-corp-042. Isolating host now.'},{ author:'S. Miller',ts:now-3600000,text:'Forensic image captured. Reviewing with memory analysis tool. Found persistence via registry run key: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\SecurityUpdate.'}],response_log:['[09:22:14] Host ws-corp-042 isolated from network','[09:24:01] Malicious process tree terminated','[09:25:33] Firewall rules deployed - block 185.220.0.0/16','[09:30:12] Credentials reset for admin.chen','[09:35:44] Full EDR scan initiated on adjacent hosts']},
    {id:'INC-002',title:'DDoS Attack — Production API Gateway',sev:'high',status:'open',assignee:'R. Patel',created:now-3600000,updated:now-900000,tags:['DDoS','Availability'],summary:'Volumetric UDP flood targeting api-gateway.corp.local on port 443. Peak traffic 2.4 Gbps. Partial service degradation.',linked_alerts:[2,7],notes:[{author:'R. Patel',ts:now-2700000,text:'Confirmed DDoS attack from botnet. Contacted ISP to activate BGP blackhole. Scrubbing center traffic redirected.'}],response_log:['[10:15:30] Alert triggered — 2.4 Gbps traffic spike','[10:16:02] Scrubbing center activated','[10:17:45] BGP blackhole routing enabled']},
    {id:'INC-003',title:'SQL Injection — Public Web Application',sev:'high',status:'in-progress',assignee:'S. Miller',created:now-86400000,updated:now-43200000,tags:['Web App','SQLi','Data Breach'],summary:'Successful SQL injection attack on /api/orders endpoint. Attacker may have exfiltrated customer PII. GDPR notification may be required.',linked_alerts:[4],notes:[{author:'S. Miller',ts:now-80000000,text:'Database audit logs confirm 3,847 records accessed. Customer emails and order history exposed. Legal team notified.'}],response_log:['[Yesterday 14:30] SQLi payload detected in WAF logs','[Yesterday 14:32] WAF rule created to block pattern','[Yesterday 15:00] DB audit initiated']},
    {id:'INC-004',title:'Insider Threat — Unauthorized Data Access',sev:'medium',status:'open',assignee:'K. Okonkwo',created:now-172800000,updated:now-86400000,tags:['Insider Threat','UEBA','Data Access'],summary:'UEBA engine flagged m.okonkwo accessing 847 restricted files outside business hours over 3 consecutive nights.',linked_alerts:[],notes:[],response_log:[]},
    {id:'INC-005',title:'Phishing Campaign — Finance Department',sev:'medium',status:'closed',assignee:'L. Santos',created:now-604800000,updated:now-432000000,tags:['Phishing','Initial Access'],summary:'Targeted spear phishing campaign against 12 finance employees. 2 credential harvester clicks. Passwords reset. No further compromise.',linked_alerts:[],notes:[{author:'L. Santos',ts:now-500000000,text:'Investigation closed. All affected accounts secured. Security awareness training scheduled for finance team.'}],response_log:['Phishing emails quarantined','Credential resets forced for 2 users','Domain blocked in proxy/DNS']},
  ];
  sessionStorage.setItem('tw_cases',JSON.stringify(cases));
}

function saveCases(){ sessionStorage.setItem('tw_cases',JSON.stringify(cases)); }

let caseFilter='all', currentCaseId=null;
function setCaseFilter(f){
  caseFilter=f;
  document.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('active',b.dataset.status===f));
  renderCaseList();
}
function renderCaseList(){
  const q=(document.getElementById('case-search').value||'').toLowerCase();
  let data=[...cases].filter(c=>c&&c.id);
  if(caseFilter!=='all') data=data.filter(c=>c.status===caseFilter);
  if(q) data=data.filter(c=>((c.title||'')+(c.summary||'')+(c.tags||[]).join('')).toLowerCase().includes(q));
  const el=document.getElementById('case-list');
  el.innerHTML=data.map(c=>`
    <div class="case-item ${c.id===currentCaseId?'selected':''}" onclick="openCase('${c.id}')">
      <div class="status-dot ${c.status}"></div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <div class="case-id">${c.id}</div>
          <span class="badge badge-${c.sev}" style="font-size:8px;">${c.sev.toUpperCase()}</span>
        </div>
        <div class="case-title" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.title}</div>
        <div class="case-meta">${c.assignee} · ${TW.formatTime(c.updated)}</div>
      </div>
    </div>`).join('') || '<div class="empty-state" style="padding:20px 0;"><p>No cases found</p></div>';
}

function openCase(id){
  currentCaseId=id;
  renderCaseList();
  const c=cases.find(x=>x.id===id);
  if(!c) return;
  document.getElementById('case-title-header').textContent=c.title;
  document.getElementById('case-meta-header').textContent=`${c.id} · Assigned to ${c.assignee} · Updated ${TW.formatTime(c.updated)}`;
  document.getElementById('case-actions').classList.remove('hidden');
  document.getElementById('case-actions').innerHTML=`
    <select id="case-status-sel" style="background:var(--bg-2);border:1px solid var(--border-2);color:var(--text-1);padding:6px 10px;border-radius:var(--radius-xs);font-size:11px;">
      ${['open','in-progress','closed'].map(s=>`<option value="${s}" ${c.status===s?'selected':''}>${s}</option>`).join('')}
    </select>
    <select id="case-assign-sel" style="background:var(--bg-2);border:1px solid var(--border-2);color:var(--text-1);padding:6px 10px;border-radius:var(--radius-xs);font-size:11px;">
      ${ANALYSTS.map(a=>`<option value="${a}" ${c.assignee===a?'selected':''}>${a}</option>`).join('')}
    </select>
    <button class="btn btn-primary" onclick="saveCase('${id}')" style="padding:6px 12px;font-size:11px;">Save</button>`;

  const linked=TW.alerts.filter(a=>(c.linked_alerts||[]).includes(a.id));
  
  // Kill chain determination
  const tgs = (c.tags||[]).join(' ').toLowerCase();
  const stages = [
    { n: 'Recon & Dev', active: true }, // Always assumed
    { n: 'Initial Access', active: tgs.includes('phish') || tgs.includes('exploit') || tgs.includes('access') || tgs.includes('brute') || tgs.includes('ddos') },
    { n: 'Execution', active: tgs.includes('exec') || tgs.includes('payload') || tgs.includes('malware') || tgs.includes('credential') || tgs.includes('sql') },
    { n: 'Lateral Movement', active: tgs.includes('lateral') || tgs.includes('pivot') },
    { n: 'Exfiltration / Impact', active: tgs.includes('exfil') || tgs.includes('leak') || tgs.includes('breach') || tgs.includes('ransom') }
  ];
  const killChainHTML = `<div class="kill-chain">
    ${stages.map(s => `<div class="kc-stage ${s.active?'active':''}"><div class="kc-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg></div>${s.n}</div>`).join('')}
  </div>`;

  document.getElementById('case-detail-body').innerHTML=`
    <div>
      <div class="drawer-section-title">MITRE ATT&CK Kill-Chain</div>
      ${killChainHTML}
    </div>
    <div>
      <div class="drawer-section-title">Summary</div>
      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-xs);padding:12px;font-size:12px;color:var(--text-2);line-height:1.6;">${c.summary}</div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    </div>
    ${linked.length?`<div>
      <div class="drawer-section-title">Linked Alerts (${linked.length})</div>
      ${linked.map(a=>`<div class="mini-alert ${a.sev}" onclick="window.open('alerts.html?id=${a.id}')" style="margin-bottom:4px;cursor:pointer;">
        <div style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${TW.sevColor(a.sev)};margin-top:4px;"></div>
        <div style="flex:1;"><div style="font-size:11px;font-weight:600;color:var(--text-1);">${a.label}</div>
        <div style="font-size:9px;color:var(--text-3);font-family:var(--font-mono);">${a.srcIp} · ${TW.formatTime(a.ts)}</div></div>
        <span class="badge badge-${a.sev}" style="font-size:8px;">${a.sev.toUpperCase()}</span></div>`).join('')}
    </div>`:''}
    ${c.response_log.length?`<div>
      <div class="drawer-section-title">Response Log</div>
      <div class="response-log-mini">${c.response_log.map(l=>`<div class="log-line ${l.includes('SUCCESS')||l.includes('isolated')||l.includes('reset')||l.includes('blocked')?'success':l.includes('initiated')||l.includes('ALERT')?'warn':''}">${l}</div>`).join('')}</div>
    </div>`:''}
    <div>
      <div class="drawer-section-title">Investigation Notes (${c.notes.length})</div>
      <div id="notes-list">${c.notes.map(n=>`<div class="note-item"><div class="note-meta">${n.author} · ${new Date(n.ts).toLocaleString()}</div><div class="note-text">${n.text}</div></div>`).join('')}</div>
      <div style="margin-top:8px;" data-require-perm="investigate">
        <textarea class="note-input" id="note-input" placeholder="Add investigation note… (Ctrl+Enter to submit)"></textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:6px;gap:8px;">
          <button class="btn btn-primary" onclick="addNote('${id}')" style="font-size:11px;padding:7px 14px;">Add Note</button>
        </div>
      </div>
    </div>
    <div>
      <div class="drawer-section-title">Automated Response Playbook</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <button class="btn btn-ghost" onclick="runPlaybook('${id}','block')" style="font-size:11px;padding:6px 12px;" data-require-perm="respond">🛡 Block IPs</button>
        <button class="btn btn-ghost" onclick="runPlaybook('${id}','isolate')" style="font-size:11px;padding:6px 12px;" data-require-perm="respond">🔒 Isolate Host</button>
        <button class="btn btn-ghost" onclick="runPlaybook('${id}','scan')" style="font-size:11px;padding:6px 12px;" data-require-perm="respond">🔍 Full Scan</button>
        <button class="btn btn-danger" onclick="runPlaybook('${id}','report')" style="font-size:11px;padding:6px 12px;" data-require-perm="investigate">📄 Gen Report</button>
      </div>
      <div id="playbook-log" class="response-log-mini" style="max-height:80px;"></div>
    </div>`;

  document.getElementById('note-input').addEventListener('keydown',function(e){
    if(e.ctrlKey&&e.key==='Enter') addNote(id);
  });
  applyRoleUI();
}

function saveCase(id){
  const c=cases.find(x=>x.id===id);
  if(!c) return;
  c.status=document.getElementById('case-status-sel').value;
  c.assignee=document.getElementById('case-assign-sel').value;
  c.updated=Date.now();
  saveCases(); renderCaseList();
  showToast('Case Updated',`${c.id} saved successfully`,'success');
}

function addNote(id){
  const c=cases.find(x=>x.id===id); if(!c) return;
  const inp=document.getElementById('note-input');
  const text=inp.value.trim(); if(!text) return;
  const sess=TW.getSession();
  c.notes.push({author:sess?sess.name:'Analyst',ts:Date.now(),text});
  c.updated=Date.now();
  inp.value='';
  saveCases();
  const nl=document.getElementById('notes-list');
  const noteEl=document.createElement('div');noteEl.className='note-item animate-fadeIn';
  noteEl.innerHTML=`<div class="note-meta">${sess?sess.name:'Analyst'} · Just now</div><div class="note-text">${text}</div>`;
  nl.appendChild(noteEl);
  showToast('Note Added','Investigation note saved','success',3000);
}

function createCase(){
  const title=prompt('Case title:'); if(!title) return;
  const sess=TW.getSession();
  const newCase={id:`INC-${String(cases.length+1).padStart(3,'0')}`,title,sev:'medium',status:'open',assignee:sess?sess.name:'Analyst',created:Date.now(),updated:Date.now(),tags:['New'],summary:title,linked_alerts:[],notes:[],response_log:[]};
  cases.unshift(newCase);
  saveCases(); renderCaseList(); openCase(newCase.id);
  showToast('Case Created',`${newCase.id} created`,'success');
}

function runPlaybook(caseId,action){
  if(action === 'report' && !TW.requirePro('Automated Incident Reporting')) return;
  const c=cases.find(x=>x.id===caseId); if(!c) return;
  const log=document.getElementById('playbook-log'); if(!log) return;
  const msgs={
    block:['[RUNNING] Querying threat intel for malicious IPs…','[ACTION] Blocking 14 IPs at firewall…','[SUCCESS] 14 IPs blocked. Rules deployed.'],
    isolate:['[RUNNING] Identifying compromised hosts…','[ACTION] Isolating host from network segment…','[SUCCESS] Host isolated. VLAN reassigned.'],
    scan:['[RUNNING] Initializing EDR scan engine…','[ACTION] Scanning 247 endpoints…','[SUCCESS] Scan complete. 2 threats quarantined.'],
    report:['[RUNNING] Collecting evidence artifacts…','[ACTION] Compiling PDF incident report…','[SUCCESS] Report generated: '+caseId+'-IR-'+Date.now().toString(36).toUpperCase()+'.pdf'],
  };
  const steps=msgs[action]||[];
  steps.forEach((msg,i)=>{
    setTimeout(()=>{
      const line=document.createElement('div');
      line.className='log-line '+(msg.includes('SUCCESS')?'success':msg.includes('ACTION')?'warn':'info');
      line.textContent=msg;
      log.appendChild(line);
      log.scrollTop=log.scrollHeight;
      if(i===steps.length-1){c.response_log.push(msg);saveCases();}
    },i*1000);
  });
}

/* ── Ingestor Logic ── */
function openIngestor(){ document.getElementById('ingest-modal').style.display='block'; }
function closeIngestor(){ document.getElementById('ingest-modal').style.display='none'; }
function processIngestion(){
  const raw = document.getElementById('ingest-input').value.trim();
  if(!raw) return;
  const res = TW.ingestLogs(raw);
  if(res.success){
    showToast('Ingestion Successful', `Successfully processed ${res.count} log events. Check Alerts table.`, 'success');
    closeIngestor();
    document.getElementById('ingest-input').value = '';
    updateNavBadge();
  } else {
    showToast('Ingestion Failed', `Error: ${res.error}`, 'critical');
  }
}

function switchInvTab(tab) {
  document.querySelectorAll('.inv-tab').forEach(e => e.classList.remove('active'));
  document.querySelector(`.inv-tab[onclick="switchInvTab('${tab}')"]`).classList.add('active');
  if (tab === 'cases') {
    document.getElementById('lay-cases').style.display = 'grid';
    document.getElementById('lay-hunt').style.display = 'none';
  } else {
    document.getElementById('lay-cases').style.display = 'none';
    document.getElementById('lay-hunt').style.display = 'flex';
    runHuntQuery();
  }
}

function runHuntQuery() {
  const q = (document.getElementById('hunt-input').value || '').toLowerCase();
  const start = performance.now();
  
  // Basic Splunk-like logic
  let filtered = TW.alerts.filter(a => {
    let match = true;
    if(q.includes('source.ip=')) {
      const matchStr = q.split('source.ip=')[1].split(' ')[0].replace(/['"]/g,'');
      if(matchStr !== '*' && !a.srcIp.toLowerCase().includes(matchStr.replace('*',''))) match = false;
    }
    if(q.includes('host=')) {
      const matchStr = q.split('host=')[1].split(' ')[0].replace(/['"]/g,'');
      if(matchStr !== '*' && !a.host.toLowerCase().includes(matchStr.replace('*',''))) match = false;
    }
    if(q.includes('status=')) {
      const matchStr = q.split('status=')[1].split(' ')[0].replace(/['"]/g,'');
      if(matchStr === 'fail' && !a.category.toLowerCase().includes('auth')) match = false;
    }
    if(q && !q.includes('=')) {
      if(!a.msg.toLowerCase().includes(q) && !a.srcIp.includes(q)) match = false;
    }
    return match;
  });

  const dur = Math.round(performance.now() - start);
  const stats = document.getElementById('hunt-stats');
  stats.style.display = 'block';
  stats.textContent = `Matched ${filtered.length} logs in ${dur}ms`;

  const bdy = document.getElementById('hunt-res-body');
  if(!filtered.length) {
    bdy.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#8b949e;">No logs match your search.</td></tr>`;
  } else {
    // Generate synthetic log lines from alert templates just to visualize Hunt view realistically
    bdy.innerHTML = filtered.slice(0, 50).map(a => {
      let rawMsg = a.msg;
      if (q && !q.includes('=')) {
        rawMsg = rawMsg.replace(new RegExp(q, 'gi'), m => `<span class="highlighted">${m}</span>`);
      }
      return `<tr>
        <td>${new Date(a.ts).toISOString().replace('T',' ').substring(0,19)}</td>
        <td>${a.host}</td>
        <td>${a.srcIp}</td>
        <td style="word-break:break-word;">${rawMsg}</td>
      </tr>`;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  populateUserCard(); initSidebar(); applyNotifButtonState(); applyNotifButtonState(); applyRoleUI();
  updateThreatLevel(TW.state.threatLevel);
  TW.startSimulation();
  renderCaseList();
  if(cases.length) openCase(cases[0].id);
  TW.on('alert:new',a=>{updateNavBadge();updateThreatLevel(TW.state.threatLevel);});
  TW.on('state:update',s=>{updateThreatLevel(s.threatLevel);updateNavBadge();});
});
