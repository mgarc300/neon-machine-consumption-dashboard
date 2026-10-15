import { checkConnection, closePool } from './db/client.js';
import { listMachines } from './services/machines.js';
import { getLatestReading, getAggregatedConsumption } from './services/consumption.js';

async function main() {
  console.log('================================================================');
  console.log('⚡ Industrial Machinery Consumption Monitor (Neon Postgres) ⚡');
  console.log('================================================================\n');

  const connection = await checkConnection();

  if (!connection.ok) {
    console.log('\n📌 Neon Database Setup Instructions:');
    console.log('1. Go to https://console.neon.tech and create a free project.');
    console.log('2. Copy your connection string (e.g., postgresql://neondb_owner:***@ep-***.neon.tech/neondb?sslmode=require).');
    console.log('3. Create a .env file from .env.example:');
    console.log('     copy .env.example .env');
    console.log('4. Paste your connection string into DATABASE_URL.');
    console.log('5. Run database migration and seed sample data:');
    console.log('     npm run db:migrate');
    console.log('     npm run db:seed');
    console.log('6. Run this monitor again:');
    console.log('     npm start\n');
    return;
  }

  try {
    // 1. Directory of Machines
    console.log('\n🏭 1. REGISTERED MACHINERY INVENTORY:');
    const machines = await listMachines();
    if (machines.length === 0) {
      console.log('No machines found. Run `npm run db:seed` to populate sample data.');
    } else {
      console.table(
        machines.map((m) => ({
          ID: m.id,
          Name: m.name,
          Type: m.machine_type,
          Location: m.location,
          'Nominal (kW)': m.nominal_power_kw,
        }))
      );
    }

    // 2. Real-time Telemetry (Latest Readings)
    console.log('\n⚡ 2. REAL-TIME CONSUMPTION (LATEST READINGS):');
    console.log(' Latest readings fetched from Neon Postgres.');
    const latestReadings = await getLatestReading();
    if (!latestReadings || latestReadings.length === 0) {
      console.log('No telemetry readings recorded yet.');
    } else {
      console.table(
        latestReadings.map((r) => (r{
          'Machine ID': r.machine_id,
          'Machine Name': r.machine_name,
          'Power (kW)': r.active_power_kw,
          'Cumulative (kWh)': r.total_kwh,
          'Voltage (V)': r.voltage_v,
          'Current (A)': r.current_a,
          Status: r.status,
          'Last Recorded': new Date(r.recorded_at).toLocaleTimeString(),
        }))
      );
    }

    // 3. Aggregated Metrics (Last 24 Hours)
    console.log('\n📊 3. AGGREGATED CONSUMPTION SUMMARY (LAST 24 HOURS):');
    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const aggregates = await getAggregatedConsumption({ startDate: past24Hours });
    if (aggregates.length === 0) {
      console.log('No data available in the selected window.');
    } else {
      console.table(
        aggregates.map((a) => ({
          'Machine ID': a.machine_id,
          Name: a.machine_name,
          'Samples': a.sample_count,
          'Total Energy (kWh)': a.total_kwh_consumed,
          'Avg Power (kW)': a.avg_power_kw,
          'Peak Load (kW)': a.peak_power_kw,
          'Min Load (kW)': a.min_power_kw,
        }))
      );
    }

    console.log('\n✅ All consumption metrics queried successfully.');
  } catch (err) {
    console.error('❌ Error querying consumption data:', err);
  } finally {
    await closePool();
  }
}

main();
