const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Estados Financieros');
});

function validarAsientos(asientos) {
  const tiposValidos = ['activo', 'pasivo', 'capital', 'ingreso', 'gasto', 'aportacion', 'retiro', 'utilidad', 'operacion', 'inversion', 'financiamiento'];

  for (const asiento of asientos) {
    if (typeof asiento.tipo !== 'string' || typeof asiento.monto !== 'number') {
      return 'Cada asiento debe tener un tipo (string) y un monto (number).';
    }
    if (!tiposValidos.includes(asiento.tipo)) {
      return `Tipo de asiento inválido: ${asiento.tipo}`;
    }
    if (['activo', 'pasivo', 'aportacion'].includes(asiento.tipo) && asiento.monto < 0) {
      return `El monto no puede ser negativo para el tipo: ${asiento.tipo}`;
    }
  }
  return null;
}

function calcularBalanceGeneral(asientos) {
  let activos = 0, pasivos = 0, capital = 0;
  if (!asientos || asientos.length === 0) return { activos, pasivos, capital, balance: 0 };

  asientos.forEach(asiento => {
    if (asiento.tipo === 'activo') activos += asiento.monto;
    else if (asiento.tipo === 'pasivo') pasivos += asiento.monto;
    else if (asiento.tipo === 'capital') capital += asiento.monto;
  });
  return { activos, pasivos, capital, balance: activos - (pasivos + capital) };
}

function calcularEstadoResultados(asientos) {
  let ingresos = 0, gastos = 0;
  if (!asientos) return { ingresos, gastos, utilidadNeta: 0 };

  asientos.forEach(asiento => {
    if (asiento.tipo === 'ingreso') ingresos += asiento.monto;
    else if (asiento.tipo === 'gasto') gastos += asiento.monto;
  });
  return { ingresos, gastos, utilidadNeta: ingresos - gastos };
}

function calcularCambiosCapital(asientos) {
  let aportaciones = 0, retiros = 0, utilidad = 0;
  if (!asientos) return { aportaciones, retiros, utilidad, capitalFinal: 0 };

  asientos.forEach(asiento => {
    if (asiento.tipo === 'aportacion') aportaciones += asiento.monto;
    else if (asiento.tipo === 'retiro') retiros += asiento.monto;
    else if (asiento.tipo === 'utilidad') utilidad += asiento.monto;
  });
  return { aportaciones, retiros, utilidad, capitalFinal: aportaciones - retiros + utilidad };
}

function calcularFlujosEfectivo(asientos) {
  let operacion = 0, inversion = 0, financiamiento = 0;
  if (!asientos) return { operacion, inversion, financiamiento, flujoNeto: 0 };

  asientos.forEach(asiento => {
    if (asiento.tipo === 'operacion') operacion += asiento.monto;
    else if (asiento.tipo === 'inversion') inversion += asiento.monto;
    else if (asiento.tipo === 'financiamiento') financiamiento += asiento.monto;
  });
  return { operacion, inversion, financiamiento, flujoNeto: operacion + inversion + financiamiento };
}

app.post('/api/estados-financieros', (req, res) => {
  const { asientos } = req.body;

  if (!Array.isArray(asientos)) {
    return res.status(400).json({ error: 'Se requiere un arreglo de asientos contables.' });
  }

  const error = validarAsientos(asientos);
  if (error) {
    return res.status(400).json({ error });
  }

  const balanceGeneral = calcularBalanceGeneral(asientos);
  const estadoResultados = calcularEstadoResultados(asientos);
  const cambiosCapital = calcularCambiosCapital(asientos);
  const flujosEfectivo = calcularFlujosEfectivo(asientos);

  res.json({ balanceGeneral, estadoResultados, cambiosCapital, flujosEfectivo });
});

function agregarSeccionExcel(sheet, titulo, objeto) {
  if (objeto && Object.keys(objeto).length > 0) {
    sheet.addRow([titulo]);
    sheet.addRow(Object.keys(objeto));
    sheet.addRow(Object.values(objeto));
    sheet.addRow([]);
  }
}

app.post('/api/exportar/excel', async (req, res) => {
  const { balanceGeneral, estadoResultados, cambiosCapital, flujosEfectivo } = req.body;

  if (!balanceGeneral || !estadoResultados || !cambiosCapital || !flujosEfectivo) {
    return res.status(400).json({ error: 'Faltan uno o más estados financieros en la solicitud.' });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Estados Financieros');

  agregarSeccionExcel(sheet, 'Balance General', balanceGeneral);
  agregarSeccionExcel(sheet, 'Estado de Resultados', estadoResultados);
  agregarSeccionExcel(sheet, 'Cambios en el Capital', cambiosCapital);
  agregarSeccionExcel(sheet, 'Flujos de Efectivo', flujosEfectivo);

  res.setHeader('Content-Disposition', 'attachment; filename=estados-financieros.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  await workbook.xlsx.write(res);
  res.end();
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
