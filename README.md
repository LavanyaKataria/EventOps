# EventOps — Real-Time Event Operations Command Center

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Gemini%20Powered-blue?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/Backend-Flask-black?style=for-the-badge&logo=flask" />
  <img src="https://img.shields.io/badge/Map-Leaflet.js-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Charts-Chart.js-orange?style=for-the-badge" />
</p>

<p align="center">
  <b>A unified, AI-powered mission control platform for managing mega-scale events — live geospatial mapping, crowd monitoring, incident command, volunteer dispatch, fleet tracking, and a Gemini AI Copilot in one interface.</b>
</p>

---

## Overview

EventOps replaces fragmented walkie-talkie-era ops with a single command center: real-time telemetry, geospatial situational awareness, AI-generated tactical recommendations, and one-click resource dispatch — built on a dark glassmorphism interface designed for high-stress control rooms.

---

## Modules

| Module | What it does |
|---|---|
| **Executive Command** | Live KPI overview — attendees, crowd density, incidents, volunteers, transport & emergency readiness (3s refresh) |
| **Crowd Monitor** | Zone-level capacity bars, trend indicators, and per-sector AI recommendations |
| **Incident Command** | Timestamped incident log with severity triage and geospatial pin placement |
| **Volunteer Dispatch** | Workload-aware board for balanced volunteer re-allocation |
| **Transit Ops** | Fleet tracking, shuttle bottleneck detection, route efficiency scoring |
| **AI Copilot** | Gemini-powered assistant answering natural-language operational queries |
| **Analytics Center** | Historical Chart.js dashboards for post-event analysis |

---

## Crisis Demo Panel

Inject live scenarios via the flame icon (bottom-right): **Crowd Surge**, **Medical Crisis**, **Shuttle Bottleneck**, or **Reset**. The system responds instantly with map alerts, telemetry spikes, and updated AI recommendations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, Flask |
| Mapping | Leaflet.js + CartoDB Dark Matter tiles |
| Charts | Chart.js |
| AI | Google Gemini API |
| Telemetry | Browser-native polling (3s intervals) |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/eventops.git
cd eventops
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Gemini API

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

> Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Run the application

```bash
python app.py
```

### 5. Open in browser---

http://127.0.0.1:5000

## Author

**Lavanya Kataria**
