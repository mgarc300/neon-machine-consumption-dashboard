import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMachinesMonitoringData } from './monitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateExcelReport() {
  console.log('📊 Generando informe en formato Microsoft Excel (.xlsx)...');

  const data = await getMachinesMonitoringData();

  // 1. Hoja 1: Resumen y Estado de las 4 Máquinas
  const summaryRows = [
    { 'MÉTRICA GLOBAL': 'Total Máquinas Monitorizadas', 'VALOR': `${data.summary.totalMachines} unidades` },
    { 'MÉTRICA GLOBAL': 'Potencia Instantánea Combinada', 'VALOR': `${data.summary.currentTotalKw} kW` },
    { 'MÉTRICA GLOBAL': 'Consumo Total Acumulado (24h)', 'VALOR': `${data.summary.grandTotalKwh} kWh` },
    { 'MÉTRICA GLOBAL': 'Coste Energético Estimado (24h)', 'VALOR': `${data.summary.grandTotalCost} € (a 0.18 €/kWh)` },
    { 'MÉTRICA GLOBAL': 'Factor de Carga Promedio Planta', 'VALOR': `${data.summary.avgLoadFactor} %` },
  ];

  const machineRows = data.machines.map((m) => ({
    'ID Máquina': m.id,
    'Nombre': m.name,
    'Tipo': m.type,
    'Ubicación': m.location,
    'Potencia Nominal (kW)': m.nominalPowerKw,
    'Potencia Actual (kW)': m.currentPowerKw,
    'Consumo 24h (kWh)': m.totalKwh,
    'Coste Est. 24h (€)': m.totalCost,
    'Factor Carga (%)': m.loadPercentage,
    'Tensión (V)': m.voltageV,
    'Intensidad (A)': m.currentA,
    'Estado Operativo': m.status,
  }));

  // 2. Hoja 2: Curva Horaria de las Últimas 24 Horas
  const hourlyRows = data.timeline.map((hour, idx) => {
    const row = { 'Hora': hour };
    let totalKw
    data.machines.forEach((m) => {
      const val = m.hourlyPower[idx] || 0;
      row[`${m.id} (kW)`] = val;
      totalKw += val;
    });
    row['Potencia Total Planta (kW)'] = parseFloat(totalKw.toFixed(2));
    return row;
  });


  // Crear Workbook de Excel
  const wb = XLSX.utils.book_new();

  // Crear hojas
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  const wsMachines = XLSX.utils.json_to_sheet(machineRows);
  const wsHourly = XLSX.utils.json_to_sheet(hourlyRows);


  wsMachines['!cols'] = [
    { wch: 15 },
    { wch: 32 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
  ];


  XLSX.utils.book_append_sheet(wb, wsMachines, 'Detalle_4_Maquinas');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_KPIs');
  XLSX.utils.book_append_sheet(wb, wsHourly, 'Curva_Consumo_24h');


  const outputPathRoot = path.join(__dirname, '../../consumo_maquinas_dashboard.xlsx');
  const outputPathReports = path.join(__dirname, '../../reports/consumo_maquinas_dashboard.xlsx');

  XLSX.writeFile(wb, outputPathRoot);
  XLSX.writeFile(wb, outputPathReports);

  console.log(`✅ Archivo Excel generado con éxito:`);
  console.log(`   📁 ${outputPathRoot}`);

  return { outputPathRoot, outputPathReports };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateExcelReport()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error generando Excel:', err);
      process.exit(1);
    });
}

export default {
  generateExcelReport,
};
