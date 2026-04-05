// ══════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURACIÓN — URLs de cada hoja-año (CSV publicado)
// ══════════════════════════════════════════════════════════════
const HOJAS = {
  '2020': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=1538594452&single=true&output=csv',
  '2021': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=1427254816&single=true&output=csv',
  '2022': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=16812674&single=true&output=csv',
  '2023': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=0&single=true&output=csv',
  '2024': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=18117452&single=true&output=csv',
  '2025': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=1856444725&single=true&output=csv',
  '2026': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=1981676917&single=true&output=csv',
};
const URL_EGRESOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=24617374&single=true&output=csv';
// ══════════════════════════════════════════════════════════════

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sept','oct','nov','dic'];
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const MES_HEADER = {
  'enero':'ene','febrero':'feb','marzo':'mar','abril':'abr',
  'mayo':'may','junio':'jun','julio':'jul','agosto':'ago',
  'septiembre':'sept','setiembre':'sept','sep':'sept','sept':'sept',
  'octubre':'oct','noviembre':'nov','diciembre':'dic',
  'ene':'ene','feb':'feb','mar':'mar','abr':'abr','may':'may',
  'jun':'jun','jul':'jul','ago':'ago','oct':'oct','nov':'nov','dic':'dic'
};
const MES_NUM = {1:'ene',2:'feb',3:'mar',4:'abr',5:'may',6:'jun',
                 7:'jul',8:'ago',9:'sept',10:'oct',11:'nov',12:'dic'};

// ── ESTADO GLOBAL ──────────────────────────────────────────────
let SOCIOS  = [];
let APORTES = {};
let EGRESOS = [];   // [{fecha,dni,nombre,monto,motivo,anio,mes}]
let loaded  = false;

// ── UTILS ──────────────────────────────────────────────────────
function parseCSV(text) {
  return text.trim().split('\n').map(line => {
    const cols = []; let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim().replace(/^"|"$/g,'')); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim().replace(/^"|"$/g,''));
    return cols;
  });
}

function limpiarMonto(s) {
  if (!s || !s.trim()) return 0;
  const n = parseFloat(s.replace(/,/g,'.').replace(/[^\d.]/g,''));
  return isNaN(n) ? 0 : n;
}

function fmtS(n) {
  if (!n) return '—';
  return 'S/ ' + Math.abs(n).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function parseFecha(str) {
  let p = str.split('/');
  if (p.length === 3) { return { anio: parseInt(p[2]), mes: MES_NUM[parseInt(p[1])] }; }
  p = str.split('-');
  if (p.length === 3) { return { anio: parseInt(p[0]), mes: MES_NUM[parseInt(p[1])] }; }
  const d = new Date(str);
  return { anio: d.getFullYear(), mes: MES_NUM[d.getMonth()+1] };
}

// ── CARGA HOJAS (orden: DNI, NOMBRE, meses) ───────────────────
async function cargarHoja(anio, url) {
  const res = await fetch(url);
  const rows = parseCSV(await res.text());
  const hdr = rows[0].map(h => h.trim().toLowerCase());

  const iDni = hdr.findIndex(h => h === 'dni');
  const iNom = hdr.findIndex(h => h === 'nombre');
  const idxM = {};
  hdr.forEach((h, i) => { const k = MES_HEADER[h]; if (k) idxM[k] = i; });

  const out = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const dni = (r[iDni] || '').trim();
    const nom = (r[iNom] || '').trim();
    if (!dni || !nom) continue;

    if (!SOCIOS.find(s => s.dni === dni)) {
      SOCIOS.push({ nombre: nom, dni });
    }
    const mesesS = {};
    MESES.forEach(m => { if (idxM[m] !== undefined) { const v = limpiarMonto(r[idxM[m]]); if (v > 0) mesesS[m] = v; }});
    out[dni] = mesesS;
  }
  return out;
}

// ── CARGA EGRESOS ──────────────────────────────────────────────
async function cargarEgresosCSV(url) {
  const res = await fetch(url);
  const rows = parseCSV(await res.text());
  const hdr = rows[0].map(h => h.trim().toLowerCase());

  const iF = hdr.findIndex(h => h === 'fecha');
  const iD = hdr.findIndex(h => h === 'dni');
  const iN = hdr.findIndex(h => h.includes('nombre'));
  const iM = hdr.findIndex(h => h.includes('monto'));
  const iMo = hdr.findIndex(h => h.includes('motivo'));

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const fecha = (r[iF] || '').trim();
    const dni = (r[iD] || '').trim();
    if (!dni || !fecha) continue;
    const { anio, mes } = parseFecha(fecha);
    out.push({ fecha, dni, nombre: (r[iN]||'').trim(), monto: limpiarMonto(r[iM]), motivo: (r[iMo]||'').trim(), anio: String(anio), mes });
  }
  return out;
}

// ── CARGAR TODO ────────────────────────────────────────────────
async function cargarTodo() {
  if (loaded) return;

  const prom = Object.entries(HOJAS).map(async ([anio, url]) => {
    try { APORTES[anio] = await cargarHoja(anio, url); }
    catch(e) { console.warn('Error hoja', anio, e); APORTES[anio] = {}; }
  });
  prom.push(
    (async () => {
      try { EGRESOS = await cargarEgresosCSV(URL_EGRESOS); }
      catch(e) { console.warn('Error egresos', e); EGRESOS = []; }
    })()
  );
  await Promise.all(prom);
  loaded = true;
  actualizarTotalAcciones();
}

// ── TOTAL ACCIONES GLOBAL ──────────────────────────────────────
function actualizarTotalAcciones() {
  let ingT = 0, egrT = 0;
  for (const porDni of Object.values(APORTES)) {
    for (const meses of Object.values(porDni)) { ingT += Object.values(meses).reduce((a,b)=>a+b,0); }
  }
  egrT = EGRESOS.reduce((s,e) => s + e.monto, 0);
  const neto = ingT - egrT;

  const el = document.getElementById('totalAcciones');
  if (el) {
    el.style.display = 'block';
    document.getElementById('taIngresos').textContent = fmtS(ingT);
    document.getElementById('taEgresos').textContent = fmtS(egrT);
    document.getElementById('taNeto').textContent = fmtS(neto);
  }
}

// ── EGRESOS HELPER ─────────────────────────────────────────────
function egresosDelSocio(dni) { return EGRESOS.filter(e => e.dni === dni); }

function egresosMesAnio(dni, anio, mes) {
  return EGRESOS.filter(e => e.dni === dni && e.anio === anio && e.mes === mes);
}

// ── AUTOCOMPLETADO ─────────────────────────────────────────────
const buscarInput = document.getElementById('buscarInput');
const sugBox      = document.getElementById('sugerencias');

buscarInput.addEventListener('input', async () => {
  const q = buscarInput.value.trim().toLowerCase();
  if (q.length < 2) { sugBox.style.display='none'; sugBox.innerHTML=''; return; }
  try { await cargarTodo(); } catch(e) {}
  renderSugerencias(filtrar(q).slice(0, 7));
});

function filtrar(q) {
  return SOCIOS.filter(s => s.nombre.toLowerCase().includes(q) || s.dni.includes(q));
}

function renderSugerencias(matches) {
  if (!matches.length) { sugBox.style.display='none'; return; }
  sugBox.style.display = 'block';
  sugBox.innerHTML = '';
  matches.forEach(s => {
    const d = document.createElement('div');
    d.className = 'sug-item';
    d.innerHTML = `<div class="sug-left"><span class="sug-n">${s.n}.</span><span>${s.nombre}</span></div><span class="sug-dni">${s.dni}</span>`;
    d.onclick = () => seleccionar(s.dni);
    sugBox.appendChild(d);
  });
}

function seleccionar(dni) {
  const s = SOCIOS.find(x => x.dni === dni);
  if (!s) return;
  buscarInput.value = s.nombre;
  sugBox.style.display = 'none';
  mostrarDashboard(s);
}

// ── BUSCAR ─────────────────────────────────────────────────────
async function buscar() {
  const q    = buscarInput.value.trim().toLowerCase();
  const err  = document.getElementById('errorMsg');
  const load = document.getElementById('loadingMsg');
  err.classList.remove('show');

  if (!q) { err.textContent = 'Escribe tu apellido, nombre o DNI.'; err.classList.add('show'); return; }

  load.classList.add('show');
  try { await cargarTodo(); }
  catch(e) { load.classList.remove('show'); err.textContent = 'Error al cargar datos.'; err.classList.add('show'); return; }
  load.classList.remove('show');

  const matches = filtrar(q);
  if (!matches.length) { err.textContent = 'No se encontró ningún socio.'; err.classList.add('show'); return; }
  if (matches.length === 1) { seleccionar(matches[0].dni); return; }
  renderSugerencias(matches);
}

// ── DASHBOARD ──────────────────────────────────────────────────
function mostrarDashboard(socio) {
  sugBox.style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';

  document.getElementById('uNombre').textContent = socio.nombre;
  document.getElementById('uMeta').textContent = 'DNI ' + socio.dni;

  const anios = Object.keys(HOJAS).sort();
  let totalIng = 0, totalEgr = 0;

  // Calcular totales
  anios.forEach(anio => {
    const ms = (APORTES[anio]||{})[socio.dni] || {};
    totalIng += Object.values(ms).reduce((a,b)=>a+b, 0);
  });
  totalEgr = egresosDelSocio(socio.dni).reduce((s,e)=>s+e.monto, 0);

  document.getElementById('uIngresos').textContent = fmtS(totalIng);
  document.getElementById('uEgresos').textContent = fmtS(totalEgr);
  document.getElementById('uNeto').textContent = fmtS(totalIng - totalEgr);

  // Grilla de años
  const grid = document.getElementById('aportesGrid');
  grid.innerHTML = '';

  anios.forEach(anio => {
    const mesesSocio = (APORTES[anio]||{})[socio.dni] || {};
    const totalAnioIng = Object.values(mesesSocio).reduce((a,b)=>a+b, 0);
    const egrAnio = egresosDelSocio(socio.dni).filter(e => e.anio === anio);
    const totalAnioEgr = egrAnio.reduce((s,e)=>s+e.monto, 0);

    const blk = document.createElement('div');
    blk.className = 'year-block';

    // Header del año
    let rightHTML = `<span class="year-total year-ing">+${fmtS(totalAnioIng)}</span>`;
    if (totalAnioEgr > 0) rightHTML += `<span class="year-total year-egr">-${fmtS(totalAnioEgr)}</span>`;
    rightHTML += `<span class="year-chevron">▶</span>`;

    const hdr = document.createElement('div');
    hdr.className = 'year-header';
    hdr.innerHTML = `<span class="year-label">${anio}</span><div class="year-right">${rightHTML}</div>`;

    const body = document.createElement('div');
    body.className = 'year-body';
    const tieneDatos = Object.keys(mesesSocio).length > 0 || egrAnio.length > 0;

    if (tieneDatos) {
      const rowsDiv = document.createElement('div');
      rowsDiv.className = 'month-rows';

      MESES.forEach((m, i) => {
        const val = mesesSocio[m] || 0;
        const row = document.createElement('div');
        row.className = 'month-row';
        row.style.animationDelay = (i * 30) + 'ms';
        row.innerHTML = `<span class="month-name">${MESES_FULL[i]}</span>
          <span class="month-aporte ${val > 0 ? 'pagado' : 'nopago'}">${val > 0 ? fmtS(val) : 'sin aporte'}</span>`;
        rowsDiv.appendChild(row);

        // Egresos de este mes
        const egrMes = egresosMesAnio(socio.dni, anio, m);
        egrMes.forEach(eg => {
          const eRow = document.createElement('div');
          eRow.className = 'egreso-row';
          eRow.style.animationDelay = (i * 30 + 15) + 'ms';
          eRow.innerHTML = `<div class="egreso-info"><span class="egreso-fecha">${eg.fecha}</span><span class="egreso-motivo">${eg.motivo}</span></div>
            <span class="egreso-monto">-${fmtS(eg.monto)}</span>`;
          rowsDiv.appendChild(eRow);
        });
      });
      body.appendChild(rowsDiv);
    } else {
      const emp = document.createElement('div');
      emp.className = 'year-empty';
      emp.textContent = 'Sin movimientos este año.';
      body.appendChild(emp);
    }

    hdr.addEventListener('click', () => blk.classList.toggle('open'));
    blk.appendChild(hdr);
    blk.appendChild(body);
    grid.appendChild(blk);
  });

  document.getElementById('dashboard').style.display = 'block';
}

// ── VOLVER ─────────────────────────────────────────────────────
function volverLogin() {
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
  buscarInput.value = '';
  sugBox.style.display = 'none';
  document.getElementById('errorMsg').classList.remove('show');
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  buscarInput.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
  // Pre-cargar datos para mostrar total de acciones
  try { await cargarTodo(); } catch(e) { console.warn('Init load error', e); }
});
