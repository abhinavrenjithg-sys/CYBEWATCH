/* ════════════════════════════════════════════
   CybeWatch — Authentication System
   ════════════════════════════════════════════ */
'use strict';

const USERS_DB = [
  { email:'admin@cybewatch.io',   pass:'Admin@123',   name:'Alex Chen',     role:'admin',   avatar:'AC', dept:'SOC Leadership' },
  { email:'analyst@cybewatch.io', pass:'Analyst@123', name:'Sara Miller',   role:'analyst', avatar:'SM', dept:'Threat Analysis' },
  { email:'viewer@cybewatch.io',  pass:'Viewer@123',  name:'Mike Johnson',  role:'viewer',  avatar:'MJ', dept:'Management' },
];

const ROLE_COLORS = { admin:'#8b5cf6', analyst:'#2563eb', viewer:'#10b981' };

function generateToken(user){
  const header  = btoa(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const payload = btoa(JSON.stringify({sub:user.email,name:user.name,role:user.role,iat:Date.now(),exp:Date.now()+3600000*8}));
  const sig     = btoa(Math.random().toString(36)).replace(/=/g,'');
  return `${header}.${payload}.${sig}`;
}

window.attemptLogin = function(email, pass, cb){
  const u = USERS_DB.find(u => u.email.toLowerCase()===email.toLowerCase() && u.pass===pass);
  if(!u){ cb(null,'Invalid credentials. Try admin@cybewatch.io / Admin@123'); return; }
  const token = generateToken(u);
  const session = { token, email:u.email, name:u.name, role:u.role, avatar:u.avatar, dept:u.dept, loginAt:Date.now() };
  sessionStorage.setItem('tw_session', JSON.stringify(session));
  cb(session);
};

window.oauthLogin = function(){
  // Simulate Google OAuth → picks admin role for demo
  const u = USERS_DB[0];
  const token = generateToken(u);
  const session = { token, email:u.email, name:u.name, role:u.role, avatar:u.avatar, dept:u.dept, loginAt:Date.now(), oauth:true };
  sessionStorage.setItem('tw_session', JSON.stringify(session));
  return session;
};

window.quickLogin = function(role){
  const u = USERS_DB.find(x=>x.role===role) || USERS_DB[0];
  const token = generateToken(u);
  const session = { token, email:u.email, name:u.name, role:u.role, avatar:u.avatar, dept:u.dept, loginAt:Date.now() };
  sessionStorage.setItem('tw_session', JSON.stringify(session));
  return session;
};

// Init login page
document.addEventListener('DOMContentLoaded', function(){
  // If already logged in, redirect
  if(TW.getSession()){ location.href='dashboard.html'; return; }

  const form     = document.getElementById('login-form');
  const emailIn  = document.getElementById('login-email');
  const passIn   = document.getElementById('login-pass');
  const errEl    = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');
  const passToggle = document.getElementById('pass-toggle');

  // Show/hide password
  if(passToggle){
    passToggle.addEventListener('click',()=>{
      const isPass = passIn.type==='password';
      passIn.type = isPass ? 'text' : 'password';
      passToggle.innerHTML = isPass
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
  }

  // Quick role buttons
  document.querySelectorAll('.quick-login-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const role = btn.dataset.role;
      const u = USERS_DB.find(x=>x.role===role);
      if(u){ emailIn.value=u.email; passIn.value=u.pass; }
    });
  });


  // Form submit
  if(form){
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const email=emailIn.value.trim(), pass=passIn.value;
      if(!email||!pass){ errEl.textContent='Please fill in all fields.'; errEl.style.display='block'; return; }
      btnLogin.disabled=true;
      btnLogin.innerHTML=`<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg> Authenticating…`;
      errEl.style.display='none';
      setTimeout(()=>{
        attemptLogin(email, pass, (sess, err)=>{
          if(err){
            errEl.textContent=err; errEl.style.display='block';
            btnLogin.disabled=false;
            btnLogin.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In';
          } else {
            location.href='dashboard.html';
          }
        });
      }, 800);
    });
  }
});
