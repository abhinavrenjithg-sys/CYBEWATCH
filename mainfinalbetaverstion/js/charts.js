/* ════════════════════════════════════════════════
   CybeWatch — Chart.js Initializations
   ════════════════════════════════════════════════ */
'use strict';

const MAX_PTS = 60;
let trafficChart, donutChart, predChart;
const traffic = { normal:Array(MAX_PTS).fill(0), suspicious:Array(MAX_PTS).fill(0), blocked:Array(MAX_PTS).fill(0) };

function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

window.initTrafficChart=function(){
  const ctx=document.getElementById('traffic-chart');
  if(!ctx) return;
  const labels=Array(MAX_PTS).fill('');
  trafficChart=new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Normal',    data:[...traffic.normal],     borderColor:'#2563eb',backgroundColor:'rgba(59,130,246,0.07)',  borderWidth:1.5,fill:true,tension:0.4,pointRadius:0},
        {label:'Suspicious',data:[...traffic.suspicious], borderColor:'#eab308',backgroundColor:'rgba(245,158,11,0.06)',  borderWidth:1.5,fill:true,tension:0.4,pointRadius:0},
        {label:'Blocked',   data:[...traffic.blocked],    borderColor:'#ef4444',backgroundColor:'rgba(255,45,85,0.05)',   borderWidth:1.5,fill:true,tension:0.4,pointRadius:0},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:true,position:'top',align:'end',labels:{color:'#64748b',font:{family:"'JetBrains Mono',monospace",size:9},boxWidth:8,padding:8}},
        tooltip:{backgroundColor:'rgba(6,13,28,0.95)',borderColor:'rgba(99,179,237,0.2)',borderWidth:1,titleColor:'#f1f5f9',bodyColor:'#94a3b8',bodyFont:{family:"'JetBrains Mono',monospace",size:10}},
      },
      scales:{
        x:{display:false},
        y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#334155',font:{family:"'JetBrains Mono',monospace",size:9},maxTicksLimit:5},border:{display:false}}
      }
    }
  });
};

window.pushTrafficData=function(n,s,b){
  traffic.normal.push(n);     traffic.normal.shift();
  traffic.suspicious.push(s); traffic.suspicious.shift();
  traffic.blocked.push(b);    traffic.blocked.shift();
  if(!trafficChart) return;
  trafficChart.data.datasets[0].data=[...traffic.normal];
  trafficChart.data.datasets[1].data=[...traffic.suspicious];
  trafficChart.data.datasets[2].data=[...traffic.blocked];
  trafficChart.update('none');
};

window.setTrafficFilter=function(f){
  if(!trafficChart) return;
  document.querySelectorAll('.traffic-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.filter===f));
  trafficChart.data.datasets[0].hidden=!(f==='all');
  trafficChart.data.datasets[1].hidden=!(f==='all'||f==='suspicious');
  trafficChart.data.datasets[2].hidden=!(f==='all'||f==='blocked');
  trafficChart.update('none');
};

window.initDonutChart=function(){
  const ctx=document.getElementById('donut-chart');
  if(!ctx) return;
  donutChart=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['DDoS','Malware','Phishing','Brute Force','SQL Injection','Other'],
      datasets:[{data:[1,1,1,1,1,1],backgroundColor:['#ef4444','#f97316','#eab308','#8b5cf6','#2563eb','#10b981'],borderColor:'#0a1528',borderWidth:3,hoverOffset:8}]
    },
    options:{responsive:true,maintainAspectRatio:true,aspectRatio:2,cutout:'74%', circumference:180, rotation:-90,
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'rgba(6,13,28,0.95)',borderColor:'rgba(99,179,237,0.2)',borderWidth:1,titleColor:'#f1f5f9',bodyColor:'#94a3b8',bodyFont:{family:"'JetBrains Mono',monospace",size:10}}
      }
    }
  });
};

window.updateDonut=function(){
  if(!donutChart) return;
  const c=TW.countBySev();
  const cats = {ddos:0,c2:0,ransomware:0,brute:0,phishing:0,sqli:0,exfil:0,lpe:0,scan:0,anomaly:0,auth_fail:0,insider:0,vuln_scan:0,policy:0};
  TW.alerts.filter(a=>a.status!=='resolved').forEach(a=>{if(cats[a.tplId]!==undefined) cats[a.tplId]++;});
  const ddos=cats.ddos+cats.c2+cats.ransomware;
  const malware=cats.c2+cats.lpe;
  const phish=cats.phishing;
  const brute=cats.brute;
  const sqli=cats.sqli;
  const other=cats.exfil+cats.scan+cats.anomaly+cats.auth_fail+cats.insider+cats.vuln_scan+cats.policy;
  donutChart.data.datasets[0].data=[ddos||1,malware||1,phish||1,brute||1,sqli||1,other||1];
  donutChart.update('none');
  const total=TW.alerts.filter(a=>a.status!=='resolved').length;
  const el=document.getElementById('donut-total');
  if(el) el.textContent=total;
};

/* ── AI Risk Forecast Simulation Model (Holt-Winters Inspired) ── */
class RiskForecastModel {
  constructor() {
    this.history = [];
    this.predictions = [];
    // Seed initial history
    let base = 30;
    for(let i=0; i<12; i++) {
      base += (Math.random()-0.3)*12;
      this.history.push(Math.max(10, Math.min(95, base)));
    }
    this.recalculate();
  }
  
  recalculate() {
    this.predictions = Array(11).fill(null);
    let last = this.history[this.history.length-1];
    
    // Bridge the gap: make the 12th element (index 11) of predictions match the last historical point
    this.predictions.push(last);
    
    let momentum = (last - this.history[this.history.length-2]) * 0.6;
    
    for(let i=0; i<6; i++) {
      let noise = (Math.random()-0.5)*8;
      // High-risk presentation bias: pull towards 90 instead of 50
      let next = last + momentum + noise + (90 - last)*0.1; 
      next = Math.max(20, Math.min(99, next));
      this.predictions.push(next);
      last = next;
      momentum *= 0.6; // decay momentum
    }
  }

  tick() {
    // Bias actual risk significantly higher for a more dramatic, active attack presentation
    let realScore = window.TW && window.TW.state ? window.TW.state.score : 20;
    // Base risk + extra padding to keep the chart in the "high danger" zone (75-95%)
    let actualRisk = (100 - realScore) * 1.2 + 15; 
    let lastHistory = this.history[this.history.length-1];
    
    // Add jitter and larger movements for dramatic visual effect
    let newTick = lastHistory + (actualRisk - lastHistory)*0.2 + (Math.random()-0.5)*10;
    
    this.history.shift();
    this.history.push(Math.max(10, Math.min(98, newTick)));
    this.recalculate();
  }
}

const riskModel = new RiskForecastModel();

window.initPredictionChart = function() {
  const ctx = document.getElementById('pred-chart');
  if(!ctx) return;
  
  function getLabels() {
    const baseLabels=[];
    const now=new Date();
    for(let i=11;i>=0;i--){
      const t=new Date(now.getTime()-i*60000); // 1-minute historical intervals for demo
      baseLabels.push(t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0'));
    }
    for(let i=1;i<=6;i++){
      const t=new Date(now.getTime()+i*60000); // 1-minute forward intervals
      baseLabels.push(t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0')+'⁺');
    }
    return baseLabels;
  }

  predChart = new Chart(ctx, {
    type:'line',
    data:{
      labels: getLabels(),
      datasets:[
        {label:'Historical Risk',  data:[...riskModel.history],borderColor:'#2563eb',backgroundColor:'rgba(59,130,246,0.08)',borderWidth:2,fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#2563eb'},
        {label:'AI Prediction',    data:[...riskModel.predictions], borderColor:'#8b5cf6',backgroundColor:'rgba(168,85,247,0.07)',borderWidth:2,fill:true,tension:0.4,borderDash:[5,3],pointRadius:3,pointBackgroundColor:'#8b5cf6',spanGaps:true},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:true,position:'top',align:'end',labels:{color:'#64748b',font:{family:"'JetBrains Mono',monospace",size:9},boxWidth:8,padding:8}},
        tooltip:{backgroundColor:'rgba(6,13,28,0.95)',borderColor:'rgba(99,179,237,0.2)',borderWidth:1,titleColor:'#f1f5f9',bodyColor:'#94a3b8'},
        annotation:{annotations:{zone:{type:'box',xMin:11.5,xMax:17.5,backgroundColor:'rgba(168,85,247,0.04)',borderColor:'rgba(168,85,247,0.2)',borderWidth:1}}}
      },
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#334155',font:{family:"'JetBrains Mono',monospace",size:8},maxRotation:0},border:{display:false}},
        y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#334155',font:{family:"'JetBrains Mono',monospace",size:9},callback:v=>v+'%'},border:{display:false}}
      }
    }
  });

  // Hackathon Live Refresh: Tick the simulated model every 3 seconds to look actively intelligent
  setInterval(() => {
    riskModel.tick();
    predChart.data.labels = getLabels();
    predChart.data.datasets[0].data = [...riskModel.history];
    predChart.data.datasets[1].data = [...riskModel.predictions];
    predChart.update('none'); // Update without full redraw
  }, 3000);
};

/* ── Packet flow canvas ── */
let pkNodes=[], pkPackets=[];
window.initPacketCanvas=function(){
  const canvas=document.getElementById('packet-canvas');
  if(!canvas) return;
  function resize(){ canvas.width=canvas.offsetWidth||500; canvas.height=canvas.offsetHeight||120; buildNodes(); }
  window.addEventListener('resize',()=>{ resize(); });
  resize();
  animate();
};
function buildNodes(){
  const canvas=document.getElementById('packet-canvas');
  if(!canvas) return;
  const W=canvas.width,H=canvas.height;
  const labels=['INET','FW','IDS','LB','WEB','APP','DB','SIEM'];
  pkNodes=labels.map((l,i)=>({x:(i+1)*W/(labels.length+1),y:H/2+(i%2===0?-15:15),label:l}));
}
function spawnPkt(type='normal'){
  if(pkNodes.length<2) return;
  const si=Math.floor(Math.random()*pkNodes.length);
  let di; do{di=Math.floor(Math.random()*pkNodes.length);}while(di===si);
  const colors={normal:'#2563eb',suspicious:'#eab308',blocked:'#ef4444'};
  pkPackets.push({si,di,t:0,spd:0.012+Math.random()*0.01,color:colors[type]||colors.normal});
}
function animate(){
  const canvas=document.getElementById('packet-canvas');
  if(!canvas){requestAnimationFrame(animate);return;}
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  // Draw connections
  for(let i=0;i<pkNodes.length-1;i++){
    ctx.beginPath();ctx.moveTo(pkNodes[i].x,pkNodes[i].y);ctx.lineTo(pkNodes[i+1].x,pkNodes[i+1].y);
    ctx.strokeStyle='rgba(99,179,237,0.08)';ctx.lineWidth=1;ctx.stroke();
  }
  // Draw nodes
  pkNodes.forEach(n=>{
    ctx.beginPath();ctx.arc(n.x,n.y,6,0,Math.PI*2);
    ctx.fillStyle='#0a1528';ctx.strokeStyle='rgba(0,212,255,0.4)';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();
    ctx.fillStyle='#64748b';ctx.font="7px 'JetBrains Mono',monospace";ctx.textAlign='center';
    ctx.fillText(n.label,n.x,n.y+(n.y<H/2?-10:18));
  });
  // Draw packets
  pkPackets.forEach(p=>{
    p.t=Math.min(1,p.t+p.spd);
    const src=pkNodes[p.si],dst=pkNodes[p.di];
    const x=src.x+(dst.x-src.x)*p.t, y=src.y+(dst.y-src.y)*p.t;
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);
    ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fill();ctx.shadowBlur=0;
  });
  pkPackets=pkPackets.filter(p=>p.t<1);
  if(Math.random()<0.3) spawnPkt(Math.random()<0.6?'normal':Math.random()<0.6?'suspicious':'blocked');
  requestAnimationFrame(animate);
}

/* ── Geo Attack Canvas (3D Globe via Globe.gl) ── */
window.initGeoCanvas = function(){
  const container = document.getElementById('geo-canvas');
  if(!container || !window.Globe) {
    console.warn('Globe.gl not loaded or container not found');
    return;
  }

  const globe = Globe()(container)
    .backgroundColor('rgba(0,0,0,0)')
    .showGlobe(true)
    .showAtmosphere(true)
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.15)
    .width(container.offsetWidth)
    .height(container.offsetHeight);

  const globeMaterial = globe.globeMaterial();
  globeMaterial.color.set('#0a1528');
  globeMaterial.emissive.set('#02040c');
  globeMaterial.wireframe = true;
  globeMaterial.transparent = true;
  globeMaterial.opacity = 0.6;

  // Add cities
  if(window.TW && window.TW.CITIES) {
    globe.pointsData(window.TW.CITIES)
      .pointLat('lat')
      .pointLng('lon')
      .pointColor(() => '#38bdf8')
      .pointAltitude(0.01)
      .pointRadius(0.5);
  }

  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.enableZoom = false;
  globe.pointOfView({ altitude: 2.2 });

  window.addEventListener('resize', () => {
    if(container.offsetWidth && container.offsetHeight) {
      globe.width(container.offsetWidth);
      globe.height(container.offsetHeight);
    }
  });

  function updateGlobe() {
    if(window.TW && window.TW.geoAttacks) {
      const arcs = window.TW.geoAttacks.map(atk => {
        const sc = atk.sev==='critical'?'#ef4444':atk.sev==='high'?'#f97316':'#00d4ff';
        return {
          startLat: atk.src.lat,
          startLng: atk.src.lon,
          endLat: atk.dst.lat,
          endLng: atk.dst.lon,
          color: sc
        };
      });

      globe.arcsData(arcs)
        .arcColor('color')
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(1000)
        .arcAltitude(0.3)
        .arcStroke(1.2);

      TW.geoAttacks.forEach(atk => {
        atk.progress = (atk.progress || 0) + 0.008;
        if(atk.progress >= 1) atk.done = true;
      });
      TW.geoAttacks = TW.geoAttacks.filter(a => !a.done);
      
      const cnt = document.getElementById('attack-count');
      if(cnt) cnt.textContent = TW.geoAttacks.length + ' active attack' + (TW.geoAttacks.length !== 1 ? 's' : '');
    }
    requestAnimationFrame(updateGlobe);
  }
  updateGlobe();
};
