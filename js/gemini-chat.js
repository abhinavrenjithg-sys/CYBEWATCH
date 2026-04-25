/* ════════════════════════════════════════════════
   CybeWatch — Gemini AI SOC Assistant
   ════════════════════════════════════════════════ */
'use strict';

(function(){
  // ── Config ──────────────────────────────────────
  const GEMINI_KEY = 'AIzaSyDKzyFY4RXqsMT5tj9AGA3k2HSF5S4ZKw8';
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

  const SYSTEM_PROMPT = `You are ARIA (Adaptive Response Intelligence Agent), a senior SOC AI assistant embedded in CybeWatch Enterprise security platform. You have deep expertise in:
- Incident response and triage methodology
- MITRE ATT&CK framework (all tactics, techniques, sub-techniques)
- Threat hunting and anomaly detection
- Network forensics, malware analysis, and reverse engineering
- SIEM rules, detection logic, sigma rules
- CVE analysis and vulnerability management
- APT groups (APT-29, APT-41, Lazarus, Charming Kitten, LockBit, etc.)
- UEBA and insider threat detection
- Automated response playbooks

**Pricing Policy**: CybeWatch is currently **free to use** for all enterprise customers. There are no paid plans active at this time.

Current platform context: CybeWatch Enterprise v2.4 SOC Dashboard.
Be concise, technical, and actionable. Format your responses clearly with markdown when helpful.
When asked about specific alerts or incidents, provide immediate triage steps.
If asked about blocking or technical actions, explain the exact commands/steps.
If asked about pricing, payment, or plans, state that the platform is currently free to use.`;

  let chatHistory = [];
  let isOpen = false;

  // ── Inject styles ───────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .aria-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 9000;
      width: 54px; height: 54px; border-radius: 50%;
      background: var(--grad-cyan-purple, linear-gradient(135deg,#0ea5e9,#8b5cf6));
      border: none; cursor: pointer; box-shadow: 0 4px 24px rgba(0,212,255,0.45);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: aria-pulse 3s ease infinite;
    }
    .aria-fab:hover { transform: scale(1.1); box-shadow: 0 6px 32px rgba(0,212,255,0.6); }
    .aria-fab svg { width: 24px; height: 24px; color: #fff; }
    .aria-badge {
      position: absolute; top: -2px; right: -2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #ef4444; border: 2px solid #060d1c;
      font-size: 8px; color: #fff; display: flex; align-items: center; justify-content: center;
      font-family: monospace; font-weight: 700;
    }
    @keyframes aria-pulse {
      0%,100% { box-shadow: 0 4px 24px rgba(0,212,255,0.45); }
      50% { box-shadow: 0 4px 36px rgba(168,85,247,0.7); }
    }

    .aria-panel {
      position: fixed; bottom: 88px; right: 24px; z-index: 9001;
      width: 380px; height: 560px; max-height: 80vh;
      background: #060d1c; border: 1px solid rgba(0,212,255,0.25);
      border-radius: 16px; display: flex; flex-direction: column;
      box-shadow: 0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,255,0.08);
      animation: aria-slide-up 0.25s cubic-bezier(.4,0,.2,1);
      overflow: hidden;
    }
    @keyframes aria-slide-up {
      from { opacity:0; transform: translateY(16px) scale(0.96); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }

    .aria-header {
      background: linear-gradient(135deg,rgba(0,212,255,0.08),rgba(168,85,247,0.08));
      border-bottom: 1px solid rgba(0,212,255,0.15);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .aria-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg,#0ea5e9,#8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
      box-shadow: 0 0 14px rgba(0,212,255,0.4);
      animation: aria-pulse 3s ease infinite;
    }
    .aria-header-info { flex: 1; }
    .aria-name { font-size: 13px; font-weight: 700; color: #f1f5f9; }
    .aria-status { font-size: 10px; color: #0ea5e9; font-family: 'JetBrains Mono',monospace; display: flex; align-items: center; gap: 5px; }
    .aria-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: aria-pulse 2s infinite; }
    .aria-close {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #64748b; font-size: 16px; transition: all 0.2s;
    }
    .aria-close:hover { border-color: #ef4444; color: #ef4444; }

    .aria-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    .aria-messages::-webkit-scrollbar { width: 3px; }
    .aria-messages::-webkit-scrollbar-thumb { background: rgba(99,179,237,0.2); border-radius: 2px; }

    .aria-msg { display: flex; gap: 8px; animation: aria-msg-in 0.3s ease; }
    @keyframes aria-msg-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .aria-msg.user { flex-direction: row-reverse; }
    .aria-msg-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
    }
    .aria-msg.bot  .aria-msg-avatar { background: linear-gradient(135deg,#0ea5e9,#8b5cf6); color:#fff; }
    .aria-msg.user .aria-msg-avatar { background: linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; }
    .aria-msg-bubble {
      max-width: 80%; padding: 9px 12px; border-radius: 12px;
      font-size: 12px; line-height: 1.6; word-break: break-word;
    }
    .aria-msg.bot  .aria-msg-bubble { background: rgba(99,179,237,0.08); border: 1px solid rgba(99,179,237,0.15); color: #cbd5e1; border-radius: 12px 12px 12px 2px; }
    .aria-msg.user .aria-msg-bubble { background: rgba(59,130,246,0.15);  border: 1px solid rgba(59,130,246,0.25); color: #e2e8f0; border-radius: 12px 12px 2px 12px; }
    .aria-msg-bubble code { background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px; font-size: 10px; font-family:'JetBrains Mono',monospace; color:#0ea5e9; }
    .aria-msg-bubble strong { color: #f1f5f9; }
    .aria-msg-bubble ul { margin: 4px 0; padding-left: 14px; }
    .aria-msg-bubble li { margin: 2px 0; }

    .aria-typing {
      display: flex; align-items: center; gap: 4px; padding: 10px 14px;
      background: rgba(99,179,237,0.05); border: 1px solid rgba(99,179,237,0.1);
      border-radius: 12px 12px 12px 2px; width: fit-content;
    }
    .aria-typing span {
      width: 5px; height: 5px; border-radius: 50%; background: #64748b;
      animation: aria-dot 1.2s ease infinite;
    }
    .aria-typing span:nth-child(2) { animation-delay: 0.2s; }
    .aria-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes aria-dot {
      0%,80%,100% { background:#334155; transform:scale(1); }
      40% { background:#0ea5e9; transform:scale(1.3); }
    }

    .aria-suggestions {
      padding: 0 12px 8px; display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0;
    }
    .aria-chip {
      background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.2);
      color: #94a3b8; padding: 4px 9px; border-radius: 12px;
      font-size: 10px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
      font-family: 'JetBrains Mono',monospace;
    }
    .aria-chip:hover { background: rgba(0,212,255,0.12); color: #0ea5e9; border-color: rgba(0,212,255,0.4); }

    .aria-footer {
      border-top: 1px solid rgba(0,212,255,0.1); padding: 10px 12px; flex-shrink: 0;
      display: flex; gap: 8px; align-items: flex-end;
    }
    .aria-input {
      flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(99,179,237,0.2);
      border-radius: 10px; color: #f1f5f9; font-family: inherit; font-size: 12px;
      padding: 8px 12px; outline: none; resize: none; max-height: 100px;
      transition: border-color 0.2s; line-height: 1.5;
    }
    .aria-input:focus { border-color: rgba(0,212,255,0.5); }
    .aria-input::placeholder { color: #334155; }
    .aria-send {
      width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
      background: linear-gradient(135deg,#0ea5e9,#8b5cf6);
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s, transform 0.2s; opacity: 0.9;
    }
    .aria-send:hover { opacity: 1; transform: scale(1.05); }
    .aria-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .aria-send svg { width: 14px; height: 14px; color: #fff; }

    .aria-clear { background: none; border: none; color: #334155; font-size: 10px; cursor: pointer; padding: 2px 4px; font-family: 'JetBrains Mono',monospace; transition: color 0.2s; }
    .aria-clear:hover { color: #64748b; }
  `;
  document.head.appendChild(style);

  // ── Create FAB ──────────────────────────────────
  const fab = document.createElement('button');
  fab.className = 'aria-fab';
  fab.title = 'Ask ARIA — AI SOC Assistant';
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3M6.343 6.343l-.707-.707M12 21v-1"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
    <div class="aria-badge" id="aria-badge" style="display:none">!</div>`;
  document.body.appendChild(fab);

  // ── Create Panel ────────────────────────────────
  const panel = document.createElement('div');
  panel.className = 'aria-panel';
  panel.style.display = 'none';

  const sess = (window.TW && TW.getSession) ? TW.getSession() : null;
  const userInitial = sess ? sess.name.charAt(0).toUpperCase() : 'U';

  const QUICK_PROMPTS = [
    'Explain DDoS mitigation',
    'What is APT-29?',
    'How to investigate SQLi?',
    'MITRE T1566 tactics',
    'Ransomware response steps',
  ];

  panel.innerHTML = `
    <div class="aria-header">
      <div class="aria-avatar">🤖</div>
      <div class="aria-header-info">
        <div class="aria-name">ARIA — AI SOC Assistant</div>
        <div class="aria-status"><div class="aria-status-dot"></div>Powered by Gemini 2.0 Flash</div>
      </div>
      <button class="aria-close" id="aria-close">✕</button>
    </div>
    <div class="aria-messages" id="aria-messages"></div>
    <div class="aria-suggestions" id="aria-suggestions">
      ${QUICK_PROMPTS.map(p=>`<button class="aria-chip" onclick="ariaQuick('${p}')">${p}</button>`).join('')}
    </div>
    <div class="aria-footer">
      <textarea class="aria-input" id="aria-input" placeholder="Ask about threats, IOCs, MITRE tactics…" rows="1"></textarea>
      <button class="aria-send" id="aria-send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>`;
  document.body.appendChild(panel);

  // ── Welcome message ─────────────────────────────
  function addWelcome(){
    const name = sess ? sess.name.split(' ')[0] : 'Analyst';
    addBotMessage(`👋 Hello **${name}**! I'm **ARIA**, your AI-powered SOC assistant.\n\nI can help you with:\n- **Threat analysis** & alert triage\n- **MITRE ATT&CK** technique explanations\n- **Incident response** steps & playbooks\n- **IOC lookups** & threat intelligence\n- **Malware** analysis & behavior patterns\n\nWhat do you need help with?`);
  }

  // ── Message rendering ───────────────────────────
  function renderMarkdown(text){
    return text
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/^- (.+)$/gm,'<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`)
      .replace(/\n/g,'<br>');
  }

  function addBotMessage(text){
    const msgs = document.getElementById('aria-messages');
    if(!msgs) return;
    const div = document.createElement('div');
    div.className = 'aria-msg bot';
    div.innerHTML = `<div class="aria-msg-avatar">🤖</div><div class="aria-msg-bubble">${renderMarkdown(text)}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    chatHistory.push({role:'model',parts:[{text}]});
  }

  function addUserMessage(text){
    const msgs = document.getElementById('aria-messages');
    if(!msgs) return;
    const div = document.createElement('div');
    div.className = 'aria-msg user';
    div.innerHTML = `<div class="aria-msg-avatar">${userInitial}</div><div class="aria-msg-bubble">${text.replace(/\n/g,'<br>')}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    chatHistory.push({role:'user',parts:[{text}]});
  }

  function showTyping(){
    const msgs = document.getElementById('aria-messages');
    if(!msgs) return null;
    const div = document.createElement('div');
    div.className = 'aria-msg bot'; div.id = 'aria-typing-indicator';
    div.innerHTML = `<div class="aria-msg-avatar">🤖</div><div class="aria-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  function hideTyping(){ const t=document.getElementById('aria-typing-indicator'); if(t) t.remove(); }

  // ── Gemini API call ─────────────────────────────
  async function callGemini(userText){
    const contents = [
      { role:'user', parts:[{text: SYSTEM_PROMPT + '\n\nUser: ' + userText}] },
      ...chatHistory.slice(-10).map(m=>({role:m.role, parts:m.parts})),
    ];
    const body = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 800 } };
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from model.';
  }

  // ── Send message ────────────────────────────────
  async function sendMessage(){
    const input = document.getElementById('aria-input');
    const sendBtn = document.getElementById('aria-send');
    if(!input) return;
    const text = input.value.trim();
    if(!text) return;

    // Clear suggestions after first message
    const sugg = document.getElementById('aria-suggestions');
    if(sugg) sugg.style.display='none';

    input.value = ''; input.style.height='auto';
    sendBtn.disabled = true;
    addUserMessage(text);
    const typing = showTyping();

    try {
      const reply = await callGemini(text);
      hideTyping();
      addBotMessage(reply);
      // Show badge if panel closed
      if(!isOpen){
        const badge = document.getElementById('aria-badge');
        if(badge) badge.style.display='flex';
      }
    } catch(e){
      hideTyping();
      addBotMessage(`⚠️ **Error connecting to Gemini:** ${e.message}\n\nPlease check your API key or network connection.`);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  window.ariaQuick = function(text){
    const input = document.getElementById('aria-input');
    if(input){ input.value = text; sendMessage(); }
  };

  // ── Toggle panel ────────────────────────────────
  function openPanel(){
    panel.style.display='flex'; isOpen=true;
    const badge=document.getElementById('aria-badge');
    if(badge) badge.style.display='none';
    if(!document.getElementById('aria-messages').children.length) addWelcome();
    setTimeout(()=>{ const i=document.getElementById('aria-input'); if(i) i.focus(); },200);
  }
  function closePanel(){ panel.style.display='none'; isOpen=false; }

  fab.addEventListener('click',()=>{ isOpen ? closePanel() : openPanel(); });
  document.getElementById('aria-close').addEventListener('click', closePanel);

  // ── Input auto-resize + enter to send ──────────
  document.getElementById('aria-input').addEventListener('input',function(){
    this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,100)+'px';
  });
  document.getElementById('aria-input').addEventListener('keydown',function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
  });
  document.getElementById('aria-send').addEventListener('click', sendMessage);

  // Auto-open on first visit with 3s delay (optional)
  // setTimeout(()=>{ if(!sessionStorage.getItem('aria_opened')){openPanel();sessionStorage.setItem('aria_opened','1');} }, 3000);

  // Close panel on outside click (except fab)
  document.addEventListener('click',function(e){
    if(isOpen && !panel.contains(e.target) && !fab.contains(e.target)) closePanel();
  });

})();
