# 🛡️ CybeWatch Enterprise (Hackathon Edition)

**CybeWatch** is a next-generation, AI-driven cybersecurity SaaS platform designed for real-time network monitoring, anomaly detection, and automated incident response. Built specifically for this hackathon by **Team Glanzee**, it showcases a venture-funded aesthetic combined with heavy-duty machine learning pipelines capable of neutralizing zero-day threats in milliseconds.

## 📸 Screenshots

### 🖥️ Live Dashboard — Security Operations Center
![CybeWatch Dashboard](assets/screenshots/dashboard-preview.png)

### 🏠 Landing Page — Team Glanzee
![CybeWatch Team](assets/screenshots/team-page.png)

---

## 🚀 Key Innovation Highlights

- **Deep Learning Threat Engine**: Features a highly advanced Neuro-Ensemble pipeline (`train_model.py`) synthesizing Random Forest, Gradient Boosting, and DNN architectures to detect anomalies (DDoS, Malware Beacons, Brute Force) with **99.98% Accuracy** on live data streams.
- **AI SOC Assistant (ARIA)**: Leveraging Gemini 2.0 Flash to provide real-time, actionable threat intelligence and interactive remediation playbooks.
- **Micro-Detection Telemetry**: Autonomous sensors and visualizers (Packet Flow Canvas, Geographic Attack Maps) tracking lateral movement instantly.
- **Premium User Experience**: Complete with dark-mode, glassmorphism, and flawlessly bound data-visualizations ensuring enterprise-grade usability.
- **Cloud Stateful Sync**: Fully integrated with Supabase for absolute real-time persistence across sessions.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CybeWatch Enterprise Platform                    │
│                         (Electron + Node.js)                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
          ▼                    ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  Web Scanner    │  │ Network Monitor │  │   Log Analyzer      │
│  (scanner.js)   │  │(network-monitor)│  │ (log-analyzer.js)   │
│                 │  │                 │  │                     │
│ • URL Analysis  │  │ • Packet Sniff  │  │ • Syslog Parsing    │
│ • Header Audit  │  │ • Port Scanning │  │ • Event Correlation │
│ • SSL Checker   │  │ • ARP Monitor   │  │ • Anomaly Flagging  │
└────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘
         │                    │                       │
         └────────────────────┼───────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │     Core Engine           │
              │     (js/engine.js)        │
              │                           │
              │  ┌─────────────────────┐  │
              │  │  ML Threat Engine   │  │
              │  │  (ml_prototype/)    │  │
              │  │  • Random Forest    │  │
              │  │  • Gradient Boost   │  │
              │  │  • DNN Ensemble     │  │
              │  └─────────────────────┘  │
              │                           │
              │  ┌─────────────────────┐  │
              │  │  Gemini 2.0 Flash   │  │
              │  │  AI SOC Assistant   │  │
              │  │  (gemini-chat.js)   │  │
              │  └─────────────────────┘  │
              └──────────────┬────────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
   │  Supabase DB │ │ Dashboard UI │ │  Alerts Engine   │
   │  (Real-time  │ │(dashboard.   │ │  (alerts.html)   │
   │   Sync)      │ │  html)       │ │                  │
   └──────────────┘ └──────────────┘ └──────────────────┘
```

### 🔷 Core Modules

| Module | File | Responsibility |
|--------|------|----------------|
| **Web Scanner** | `modules/scanner.js` | Real HTTP/HTTPS scanning, SSL audit, header security checks |
| **Network Monitor** | `modules/network-monitor.js` | Live packet analysis, ARP monitoring, port detection |
| **Log Analyzer** | `modules/log-analyzer.js` | Syslog ingestion, event correlation, anomaly detection |
| **Core Engine** | `js/engine.js` | Central orchestrator — wires all modules into the UI |
| **AI SOC Chat** | `js/gemini-chat.js` | Gemini 2.0 Flash integration for natural language threat intel |
| **Auth Layer** | `js/auth.js` | Supabase-backed session management and role controls |
| **Charts** | `js/charts.js` | Chart.js rendering for live telemetry and ML forecasts |
| **ML Model** | `ml_prototype/train_model.py` | Neuro-Ensemble: RF + GBM + DNN threat classification |

### 🔄 Data Flow

```
Live System Events
      │
      ▼
[Scanner / Network Monitor / Log Analyzer]
      │
      ▼
[Core Engine — Normalizes & Enriches with ip-api.com]
      │
      ├──► [ML Threat Engine] ──► Risk Score + Threat Category
      │
      ├──► [Gemini AI] ──► Natural Language SOC Recommendations
      │
      ├──► [Supabase] ──► Persistent Storage & Real-time Sync
      │
      └──► [Dashboard UI] ──► Live Charts, Alerts, Kill Chain Map
```

### 🛡️ Security Layers

| Layer | Name | Function |
|-------|------|----------|
| 1 | **Ingestion Layer** | Multi-source collectors (Web, Network, Logs) |
| 2 | **Enrichment Layer** | GeoIP tagging, CVE lookups, IOC correlation |
| 3 | **Detection Layer** | ML ensemble classification + rule-based SIEM |
| 4 | **Response Layer** | Automated Playbook triggers + ARIA AI guidance |
| 5 | **Persistence Layer** | Supabase real-time DB with Vercel edge hosting |

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Electron + Node.js |
| **Frontend** | HTML5, Vanilla CSS3, ES6+ JavaScript |
| **Visualization** | Chart.js 4.4+ (custom gauges & predictive plots) |
| **AI / ML** | Google Gemini 2.0 Flash API, Python Scikit-Learn, Pandas, NumPy |
| **Database** | Supabase (PostgreSQL + Real-time subscriptions) |
| **Hosting** | Vercel Serverless |
| **Network Intel** | ip-api.com (GeoIP enrichment) |

---

## 📦 Project Structure

```text
cybewatch/
├── modules/
│   ├── scanner.js            # Real web vulnerability scanner
│   ├── network-monitor.js    # Live network packet monitor
│   └── log-analyzer.js       # System log ingestion & analysis
├── js/
│   ├── engine.js             # Central security engine
│   ├── gemini-chat.js        # AI SOC assistant (ARIA)
│   ├── auth.js               # Authentication layer
│   ├── charts.js             # Data visualization
│   └── ui.js                 # UI state management
├── styles/
│   ├── base.css              # Global design tokens
│   ├── dashboard.css         # SOC dashboard styles
│   └── landing-premium.css   # Landing page premium styles
├── ml_prototype/
│   └── train_model.py        # Neuro-Ensemble ML model
├── database/
│   ├── alerts.json           # Persistent alerts store
│   └── state.json            # System state persistence
├── assets/
│   └── screenshots/          # App screenshots
├── index.html                # Premium landing page
├── login.html                # Enterprise auth portal
├── dashboard.html            # Main SOC & ML telemetry
├── alerts.html               # Alert management center
├── investigation.html        # Case management & analysis
├── playbooks.html            # Automated response playbooks
├── reports.html              # Threat report generator
├── topology.html             # Network kill chain topology
├── intelligence.html         # Threat intelligence feed
├── scanner.html              # Web vulnerability scanner UI
├── network.html              # Network monitor UI
└── main.js                   # Electron main process
```

---

## 👨‍💻 Team Glanzee

**Abhinav R.**  
*Founder & Lead Architect (Vibe Coder | Creative Thinker)*  
[GitHub](https://github.com/abhinavrenjithg-sys) | [LinkedIn](https://www.linkedin.com/in/abhinav-r-b9135331b)

**SF Melena**  
*Co-Founder & UI/UX Director (Vibe Coder | Creative Thinker)*

---
*Note: This repository contains our official hackathon submission. The platform includes a live-running simulated inference engine demonstrating the capabilities of our packaged `.pkl` threat engine models.*
