import { query, checkConnection, closePool } from './client.js';
import { createMachine } from '../services/machines.js';
import { recordReading } from '../services/consumption.js';
import { fileURLToPath } from 'url';

export const SAMPLE_MACHINES = [
  {
    id: 'CNC-MILL-01',
    name: '5-Axis CNC Machining Center',
    machineType: 'Machining',
    model: 'DMG Mori DMU 50',
    location: 'Production Bay A',
    nominalPowerKw: 22.0,
  },
  {
    id: 'INJ-MOLD-02',
    name: 'Hydraulic Injection Molding 350T',
    machineType: 'Plastic Molding',
    model: 'Engel Victory 350',
    location: 'Production Bay B',
    nominalPowerKw: 45.0,
  },
  {
    id: 'AIR-COMP-01',
    name: 'Rotary Screw Air Compressor',
    machineType: 'Utilities',
    model: 'Atlas Copco GA 30+',
    location: 'Utility Room 1',
    nominalPowerKw: 30.0,
  },
  {
    id: 'IND-OVEN-01',
    name: 'Continuous Curing Conveyor Oven',
    machineType: 'Thermal Processing',
    model: 'Despatch PBC2-16',
    location: 'Production Bay C',
    nominalPowerKw: 55.0,
  },
];

/**
 * Generates and seeds sample machinery and 24-hour telemetry into Neon Postgres.
 */
export async function seedDatabase() {
  console.log('🌱 Starting database seeding process...');

  const connStatus = await checkConnection();
  if (!connStatus.ok) {
    console.warn('\n⚠️  Notice: Cannot connect to Neon Postgres right now (DATABASE_URL not configured).');
    console.warn('Here are the 4 sample machines prepared for ingestion once DATABASE_URL is set:');
    console.table(SAMPLE_MACHINES);
    return { success: false, reason: 'unconfigured_connection', machines: SAMPLE_MACHINES };
  }

  console.log('🏭 Registering sample machines in inventory...');
  for (const m of SAMPLE_MACHINES) {
    await createMachine(m);
    console.log(`  ✓ Registered: [${m.id}] ${m.name}`);
  }

  console.log('⏱️ Generating 24 hours of timestamped consumption telemetry...');
  const now = new Date();
  const totalSteps = 48; // Every 30 minutes for 24 hours
  let totalReadingsCreated = 0;

  for (const machine of SAMPLE_MACHINES) {
    let cumulativeKwh = 1000.0 + Math.random() * 500.0;

    for (let step = totalSteps; step >= 0; step--) {
      const readingTime = new Date(now.getTime() - step * 30 * 60 * 1000);
      
      // Simulate realistic load fluctuation (60% to 95% nominal when active)
      const isShiftActive = (readingTime.getHours() >= 6 && readingTime.getHours() <= 22);
      const loadFactor = isShiftActive ? (0.6 + Math.random() * 0.35) : (0.1 + Math.random() * 0.1);
      const activePowerKw = parseFloat((machine.nominalPowerKw * loadFactor).toFixed(3));
      
      // Accumulate energy: 0.5 hours * activePowerKw
      cumulativeKwh += (activePowerKw * 0.5);
      
      const voltageV = parseFloat((398 + Math.random() * 5).toFixed(1)); // ~400V 3-phase
      const currentA = parseFloat(((activePowerKw * 1000) / (Math.sqrt(3) * voltageV * 0.9)).toFixed(1));
      const status = isShiftActive ? 'OPERATIONAL' : 'IDLE';

      await recordReading({
        machineId: machine.id,
        recordedAt: readingTime,
        activePowerKw,
        totalKwh: parseFloat(cumulativeKwh.toFixed(3)),
        voltageV,
        currentA,
        status,
      });

      totalReadingsCreated++;
    }
  }

  console.log(`✅ Seeding complete! Inserted ${SAMPLE_MACHINES.length} machines and ${totalReadingsCreated} telemetry readings.`);
  return { success: true, machineCount: SAMPLE_MACHINES.length, readingsCount: totalReadingsCreated };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(async () => {
      await closePool();
      process.exit(0);
      })
    .catch(async (err) => {
      await closePool();
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}
