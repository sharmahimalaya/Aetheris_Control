# Aetheris Control — Smart City Fleet Predictive Maintenance

A production-grade **Smart City Fleet Monitoring Dashboard** that combines a **PyTorch Transformer** deep learning model with a **real-time spatial simulation** to predict vehicle failures before they happen. Vehicles autonomously navigate a city road network, and the system continuously estimates their **Remaining Useful Life (RUL)** — automatically re-routing critically degraded units to maintenance depots.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [How It Works](#how-it-works)
  - [The ML Model](#the-ml-model)
  - [The Simulation](#the-simulation)
  - [Predictive Routing](#predictive-routing)
- [Deployment](#deployment)
- [Configuration](#configuration)

---

## Overview

Imagine a city with a fleet of autonomous vehicles — delivery trucks, patrol units, emergency responders. Each vehicle generates continuous sensor telemetry (temperature, vibration, speed, brake wear, etc.) as it drives through different terrains.

**Aetheris Control** is the command center that watches all of them in real-time. It feeds their rolling sensor data into a Transformer neural network, which predicts how many operational cycles each vehicle has left before failure. When a vehicle's predicted RUL drops into critical territory, the system autonomously diverts it to the nearest maintenance depot — no human intervention required.

---

## Key Features

| Feature | Description |
|---|---|
| **Real-Time RUL Prediction** | A PyTorch Transformer model ingests rolling 30-timestep sensor sequences and outputs a Remaining Useful Life estimate every tick. |
| **Spatial Simulation** | 12 vehicles navigate a Manhattan-style city road grid with intersections, highways, urban roads, and off-road segments. |
| **Autonomous Routing** | Vehicles with critically low RUL are automatically re-routed to the nearest maintenance depot. After servicing, they resume their original mission. |
| **Live Operations Map** | An interactive SVG-based map renders the full road network, vehicle positions, headings, terrain types, and hub locations in real-time. |
| **Live Telemetry Panel** | Select any vehicle to see its real-time sensor charts (temperature, vibration, speed, brake wear) and a historical RUL trend line. |
| **Fleet Command Panel** | A sortable, filterable sidebar showing all vehicles with status badges, RUL bars, mission info, and terrain indicators. |
| **Alert System** | Automatic alerts are generated when any vehicle transitions between Normal → Warning → Critical states. |
| **Mission System** | Each vehicle is assigned randomized missions (Delivery, Pickup, Patrol, Emergency, etc.) with progress tracking. |
| **Dark Theme UI** | A sleek, glassmorphic dark interface built with Tailwind CSS and Framer Motion animations. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Operations   │  │ Fleet Command│  │  Live Telemetry   │ │
│  │ Map (SVG)    │  │ Panel        │  │  & Sensor Charts  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘ │
│         │                 │                    │            │
│         └─────────┬───────┘────────────────────┘            │
│                   │                                         │
│         ┌─────────▼─────────┐                               │
│         │  useFleetSimulation│  (Core simulation hook)      │
│         │  - Sensor generation                              │
│         │  - Vehicle movement                               │
│         │  - Pathfinding (A*)                               │
│         │  - Mission management                             │
│         └─────────┬─────────┘                               │
│                   │  POST /predict (every tick)              │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                      │
│                                                             │
│         ┌─────────────────────────────┐                     │
│         │  /predict endpoint          │                     │
│         │  Receives: 30×24 tensor     │                     │
│         │  Returns:  { RUL, status }  │                     │
│         └─────────────┬───────────────┘                     │
│                       │                                     │
│         ┌─────────────▼───────────────┐                     │
│         │  TransformerModel (PyTorch) │                     │
│         │  - Linear embedding (24→64) │                     │
│         │  - 2-layer Transformer Enc  │                     │
│         │  - 4 attention heads        │                     │
│         │  - Final FC → 1 (RUL)       │                     │
│         └─────────────────────────────┘                     │
│                                                             │
│         Pre-trained on NASA C-MAPSS FD001 dataset           │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.12** | Runtime |
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **PyTorch** | Deep learning framework (Transformer model) |
| **Pandas** | Data loading and manipulation (training pipeline) |
| **Scikit-learn** | Feature scaling (StandardScaler) |
| **NumPy** | Numerical operations |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI library |
| **TypeScript** | Type-safe development |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Animations and transitions |
| **Recharts** | Sensor and RUL trend charts |
| **Axios** | HTTP client for API calls |
| **Lucide React** | Icon library |
| **date-fns** | Date/time formatting |

---

## Project Structure

```
spatial_predictive_model/
│
├── backend/
│   ├── api/
│   │   └── main.py                  # FastAPI app with /predict endpoint
│   ├── models/
│   │   └── transformer.py           # PyTorch Transformer architecture
│   ├── preprocessing/
│   │   ├── data_loader.py           # Loads raw NASA C-MAPSS data
│   │   ├── preprocess.py            # Feature scaling + RUL normalization
│   │   └── sequence_builder.py      # Builds 30-step sliding windows
│   ├── training/
│   │   ├── train.py                 # Model training script
│   │   └── evaluate.py              # RMSE/MAE evaluation script
│   ├── saved_models/
│   │   └── model.pth                # Pre-trained model weights (~2.2 MB)
│   ├── utils/
│   │   ├── config.py                # Hyperparameters & settings
│   │   └── metrics.py               # RMSE and MAE functions
│   └── requirements.txt             # Python dependencies
│
└── frontend/
    ├── app/
    │   ├── components/
    │   │   ├── Dashboard/
    │   │   │   ├── OperationsMap.tsx     # Interactive city map (SVG)
    │   │   │   ├── LiveTelemetry.tsx     # Real-time sensor charts
    │   │   │   ├── FleetCommandPanel.tsx # Vehicle list sidebar
    │   │   │   ├── VehicleCard.tsx       # Individual vehicle card
    │   │   │   ├── LiveSensorChart.tsx   # Recharts sensor graphs
    │   │   │   ├── RULTrendChart.tsx     # RUL history chart
    │   │   │   ├── AlertPanel.tsx        # Alert feed
    │   │   │   ├── DetailView.tsx        # Expanded vehicle detail
    │   │   │   ├── FleetGrid.tsx         # Grid layout wrapper
    │   │   │   └── MiniMap.tsx           # Miniature map preview
    │   │   ├── Layout/
    │   │   │   ├── Header.tsx            # Top navigation bar
    │   │   │   └── ThemeToggle.tsx       # Dark/light mode toggle
    │   │   └── ThemeProvider.tsx         # Theme context provider
    │   ├── hooks/
    │   │   └── useFleetSimulation.ts     # Core simulation engine
    │   ├── utils/
    │   │   └── simulation.ts            # Vehicle physics, pathfinding, road network
    │   ├── types/
    │   │   └── fleet.ts                 # TypeScript type definitions
    │   ├── dashboard/
    │   │   └── page.tsx                 # Main dashboard page
    │   ├── layout.tsx                   # Root layout
    │   ├── page.tsx                     # Redirects to /dashboard
    │   └── globals.css                  # Global styles & design tokens
    ├── package.json
    └── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 20+** and **npm**
- **Git**

### Backend Setup

```bash
# Navigate to the backend
cd backend

# (Optional) Create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the API server
python -m uvicorn api.main:app --port 8001
```

The API will be available at `http://localhost:8001`. The model weights are loaded from `saved_models/model.pth` on startup.

### Frontend Setup

```bash
# Navigate to the frontend
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The dashboard will be available at `http://localhost:3000` and will automatically redirect to `/dashboard`.

> **Note**: The frontend expects the backend to be running on port `8001`. Both servers must be running simultaneously for the RUL predictions to work.

---

## How It Works

### The ML Model

The predictive engine is a **Transformer Encoder** neural network trained on the **NASA C-MAPSS FD001** turbofan engine degradation dataset.

**Training Pipeline:**
1. **Data Loading** — Raw sensor readings are loaded from the C-MAPSS text files (21 sensor channels + 3 operational settings per engine per cycle).
2. **Preprocessing** — RUL labels are computed and clipped to a maximum of 125 cycles. All features are standardized using `StandardScaler`.
3. **Sequence Building** — A sliding window of 30 consecutive timesteps creates input sequences. Each sequence maps to the RUL at the final timestep.
4. **Model** — A 2-layer Transformer Encoder with 4 attention heads and a 64-dimensional embedding processes each sequence. The output of the last timestep is passed through a fully connected layer to produce a single RUL prediction.

**Hyperparameters:**
| Parameter | Value |
|---|---|
| Sequence length | 30 timesteps |
| Model dimension | 64 |
| Attention heads | 4 |
| Encoder layers | 2 |
| Dropout | 0.1 |
| Learning rate | 0.0005 |
| Batch size | 64 |
| Epochs | 30 |
| RUL clipping max | 125 cycles |

### The Simulation

The frontend runs a fully client-side spatial simulation:

- **12 vehicles** are spawned on a procedurally defined city road network composed of graph nodes and edges.
- Each vehicle generates **synthetic sensor readings** every 600ms tick, with values influenced by terrain type (Highway, Urban, Off-road) and accumulated degradation.
- Vehicles follow computed **A\* shortest paths** between intersections, with smooth interpolated movement and heading rotation.
- Sensor data is buffered (last 50 readings) and the most recent 30 are sent to the backend `/predict` endpoint as a `30×24` feature matrix.

### Predictive Routing

The system implements a closed-loop predictive maintenance cycle:

1. **Monitor** — Continuous sensor data is collected and fed to the Transformer model.
2. **Predict** — The model returns a smoothed RUL estimate using exponential moving average (EMA) filtering to prevent erratic jumps.
3. **Decide** — When RUL drops below 20 (Critical), the vehicle's current mission is aborted.
4. **Reroute** — The vehicle is autonomously re-routed to the nearest maintenance hub via A* pathfinding.
5. **Service** — The vehicle enters a maintenance cooldown period at the depot. Its degradation counter and sensors are reset.
6. **Resume** — After maintenance, the vehicle is assigned a new mission and returns to normal operations with a restored RUL.

---

## Deployment

This project is configured for deployment on **Render** as two separate Web Services:

### Backend (Python Web Service)
| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn api.main:app --host 0.0.0.0 --port $PORT` |

### Frontend (Node Web Service)
| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Environment Variable | `NEXT_PUBLIC_API_URL` = `https://<backend-url>/predict` |

---

## Configuration

### Backend (`utils/config.py`)

```python
CONFIG = {
    "sequence_length": 30,   # Input window size
    "batch_size": 64,        # Training batch size
    "learning_rate": 0.0005, # Adam optimizer LR
    "epochs": 30,            # Training epochs
    "rul_max": 125,          # RUL normalization ceiling
    "model_dim": 64          # Transformer d_model
}
```

### Frontend (`hooks/useFleetSimulation.ts`)

| Constant | Default | Description |
|---|---|---|
| `FLEET_SIZE` | 12 | Number of simulated vehicles |
| `TICK_INTERVAL_MS` | 600 | Simulation tick rate in milliseconds |
| `HISTORY_BUFFER` | 50 | Sensor readings kept per vehicle |
| `SEQUENCE_LENGTH` | 30 | Timesteps sent to the model |
| `BATCH_SIZE` | 12 | Vehicles predicted per tick |
| `RUL_EMA_ALPHA` | 0.3 | Smoothing factor for RUL updates |

---

## License

This project is for educational and demonstration purposes.

---

<p align="center">
  Built with PyTorch, Next.js, and FastAPI
</p>
