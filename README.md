# JustChange

> A real-time MTR Bus tracking web application built with **React**, **TypeScript**, and **Leaflet**.

JustChange visualizes real-time MTR Bus operations in Hong Kong by combining official MTR open datasets with live ETA data. Users can explore bus routes, view stop locations, monitor live bus positions, and check upcoming arrival times on an interactive map.

---

## ✨ Features

* 🚌 View live MTR Bus locations
* 🗺️ Interactive map powered by OpenStreetMap and Leaflet
* 📍 Display every bus stop on the selected route
* ⏱️ Real-time Estimated Time of Arrival (ETA)
* 🚏 View the next upcoming stops for each bus
* ↔️ Switch between outbound and inbound directions
* 🌐 English and Traditional Chinese interface
* 🔄 Refresh live data on demand
* 🔍 Automatic map focus when a route is selected
* 🔁 Support for circular routes

---

## 📸 Preview
<img width="1920" height="1079" alt="image" src="https://github.com/user-attachments/assets/2c017876-29a2-4ec5-9f7b-b1bf8ea87249" />

```

---

## 🛠 Tech Stack

| Category     | Technology              |
| ------------ | ----------------------- |
| Frontend     | React 19                |
| Language     | TypeScript              |
| Build Tool   | Vite                    |
| Styling      | Tailwind CSS v4         |
| Mapping      | React Leaflet + Leaflet |
| Map Provider | OpenStreetMap           |
| Data Format  | CSV + JSON              |
| Linting      | ESLint                  |

---

## 🏗 Architecture

```text
                  Official Open Data
                         │
      ┌──────────────────┴──────────────────┐
      │                                     │
 Route Information CSV              Bus Stop CSV
      │                                     │
      └──────────────┬──────────────────────┘
                     │
              Parse Route Data
                     │
               User Selects Route
                     │
                     ▼
          Request Real-time ETA API
                     │
              Receive Live Bus Data
                     │
      ┌──────────────┴──────────────┐
      │                             │
 Bus Locations                ETA Information
      │                             │
      └──────────────┬──────────────┘
                     │
          Render Interactive Map
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js 20+
* npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Jason107206/justchange.git
cd justchange
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## 📂 Project Structure

```text
justchange/
├── src/
│   ├── App.tsx
│   ├── App.css
│   └── ...
├── data/
│   ├── mtr_bus_routes.csv
│   └── mtr_bus_stops.csv
├── public/
├── package.json
└── README.md
```

---

## 📊 Data Sources

This project uses official open datasets provided by the Hong Kong Government and MTR Corporation.

### MTR Bus ETA

Provides real-time bus locations and estimated arrival times.

https://data.gov.hk/en-data/dataset/mtr-mtr_bus-mtr-bus-eta-data/resource/98585d90-bd1b-440f-8d42-debc678106aa

### MTR Bus Route Information

Provides route names, route identifiers, and operational information.

https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities/resource/be7cf93b-26f3-4f5b-901b-ab9cf6ee03fb

### MTR Bus Stop Information

Provides stop sequence, stop names, and geographic coordinates.

https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities/resource/6a14b654-b589-486b-ae70-4b345b8e9073

---

## ⚙️ How It Works

1. Load MTR bus routes and stop information from official CSV datasets.
2. Allow users to select a route and travel direction.
3. Request real-time ETA data from the MTR Bus API.
4. Match live vehicle data with route and stop information.
5. Display buses and stops on an interactive map.
6. Show upcoming stops and arrival countdowns for each vehicle.

---

## 💡 Technical Highlights

* Built with **React 19** and **TypeScript**
* Uses **React Hooks** for state management
* Implements a custom CSV parser without external parsing libraries
* Integrates multiple public datasets into a unified route model
* Displays live bus locations using **React Leaflet**
* Supports bilingual user interfaces (English and Traditional Chinese)
* Automatically formats ETA information into human-readable countdowns

---

## 📄 License

This project is intended for educational and demonstration purposes.

Transport data is provided by the Hong Kong Government Open Data Portal and MTR Corporation.
