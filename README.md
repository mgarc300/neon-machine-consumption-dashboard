# ⚡ Industrial Machinery Consumption Monitor (Neon Postgres)

A real-time telemetry and electrical consumption monitoring dashboard for industrial machinery, powered by **Neon Serverless PostgreSQL**.

## 📊 Features

- **Real-Time Telemetry Tracking:** Monitors Active Power (kW), Voltage (V), Current (A), and Cumulative Energy (kWh).
- **Interactive UI Dashboard:** Built with Chart.js and modern dark-mode industrial UI (`public/dashboard.html`).
- **Cost & Efficiency Analytics:** Calculates load factors and estimated energy costs (€/kWh).
- **Automated Dispatching:** Generates and emails executive HTML & Excel reports to plant supervisors.
- **Serverless PostgreSQL Backend:** Fast time-series queries using composite indexes on Neon Postgres.

## 🏭 Monitored Machinery

1. **`CNC-MILL-01`**: 5-Axis CNC Machining Center (22.0 kW)
2. **`INJ-MOLD-02`**: Hydraulic Injection Molding 350T (45.0 kW)
3. **`AIR-COMP-01`**: Rotary Screw Air Compressor (30.0 kW)
4. **`IND-OVEN-01`**: Continuous Curing Conveyor Oven (55.0 kW)

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/mgarc300/neon-machine-consumption-dashboard.git
   cd neon-machine-consumption-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and paste your Neon DATABASE_URL
   ```

4. Run migrations and seed data:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Run monitoring CLI:
   ```bash
   npm start
   ```

6. Open the Dashboard:
   Open `public/dashboard.html` in your web browser.
