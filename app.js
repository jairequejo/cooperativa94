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
const URL_PRESTAMOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ870L-sHnnVC-k788HMHvSua9XccZ5pAF1Uaa4DI3mFHr8EVoeSUJq9Y0_B9xkMvIqYwal3423W0vw/pub?gid=205656499&single=true&output=csv';
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
let SOCIOS    = [];
let APORTES   = {};
let EGRESOS   = [];
let PRESTAMOS = [];
let loaded    = false;
let prestamosLoaded = false;
let socioActual = null;

// ── UTILS ──────────────────────────────────────────────────────
function sinTildes(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
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
  return Math.abs(n).toLocaleString('es-PE', {minimumFractionDigits:0, maximumFractionDigits:0});
}

function parseFecha(str) {
  let p = str.split('/');
  if (p.length === 3) { return { anio: parseInt(p[2]), mes: MES_NUM[parseInt(p[1])] }; }
  p = str.split('-');
  if (p.length === 3) { return { anio: parseInt(p[0]), mes: MES_NUM[parseInt(p[1])] }; }
  const d = new Date(str);
  return { anio: d.getFullYear(), mes: MES_NUM[d.getMonth()+1] };
}

// ── CARGA HOJAS ───────────────────────────────────────────────
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

  const iF  = hdr.findIndex(h => h === 'fecha');
  const iD  = hdr.findIndex(h => h === 'dni');
  const iN  = hdr.findIndex(h => h.includes('nombre'));
  const iM  = hdr.findIndex(h => h.includes('monto'));
  const iMo = hdr.findIndex(h => h.includes('motivo'));

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const fecha = (r[iF] || '').trim();
    const dni   = (r[iD] || '').trim();
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
    document.getElementById('taEgresos').textContent  = fmtS(egrT);
    document.getElementById('taNeto').textContent     = 'S/ ' + (neto * 10).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
}

// ── EGRESOS HELPERS ────────────────────────────────────────────
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
  const qn = sinTildes(q.toLowerCase());
  return SOCIOS.filter(s =>
    sinTildes(s.nombre.toLowerCase()).includes(qn) || s.dni.includes(q)
  );
}

function renderSugerencias(matches) {
  if (!matches.length) { sugBox.style.display='none'; return; }
  sugBox.style.display = 'block';
  sugBox.innerHTML = '';
  matches.forEach(s => {
    const d = document.createElement('div');
    d.className = 'sug-item';
    d.innerHTML = `<div class="sug-left"><span>${s.nombre}</span></div><span class="sug-dni">${s.dni}</span>`;
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
  socioActual = socio;
  sugBox.style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';
  document.querySelector('header').classList.add('compact');

  document.getElementById('uNombre').textContent = socio.nombre;
  document.getElementById('uMeta').textContent   = 'DNI ' + socio.dni;

  const anios = Object.keys(HOJAS).sort();
  let totalIng = 0, totalEgr = 0;

  anios.forEach(anio => {
    const ms = (APORTES[anio]||{})[socio.dni] || {};
    totalIng += Object.values(ms).reduce((a,b)=>a+b, 0);
  });
  totalEgr = egresosDelSocio(socio.dni).reduce((s,e)=>s+e.monto, 0);

  document.getElementById('uIngresos').textContent = fmtS(totalIng);
  document.getElementById('uEgresos').textContent  = fmtS(totalEgr);
  document.getElementById('uNeto').textContent     = fmtS(totalIng - totalEgr);

  const billetera = (totalIng - totalEgr) * 10;
  document.getElementById('uBilletera').textContent = 'S/ ' + Math.abs(billetera).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});

  const grid = document.getElementById('aportesGrid');
  grid.innerHTML = '';

  anios.forEach(anio => {
    const mesesSocio   = (APORTES[anio]||{})[socio.dni] || {};
    const totalAnioIng = Object.values(mesesSocio).reduce((a,b)=>a+b, 0);
    const egrAnio      = egresosDelSocio(socio.dni).filter(e => e.anio === anio);
    const totalAnioEgr = egrAnio.reduce((s,e)=>s+e.monto, 0);

    const blk = document.createElement('div');
    blk.className = 'year-block';

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
          <span class="month-aporte ${val > 0 ? 'pagado' : 'nopago'}">${val > 0 ? fmtS(val) : 'sin acciones'}</span>`;
        rowsDiv.appendChild(row);

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

  // Reset tabs al abrir dashboard
  switchTab('movimientos');
  // Pre-cargar préstamos en background
  cargarPrestamos();
}

// ── VOLVER ─────────────────────────────────────────────────────
function volverLogin() {
  document.getElementById('dashboard').style.display  = 'none';
  document.getElementById('loginScreen').style.display = 'block';
  document.querySelector('header').classList.remove('compact');
  buscarInput.value = '';
  sugBox.style.display = 'none';
  document.getElementById('errorMsg').classList.remove('show');
}

// ══════════════════════════════════════════════════════════════
//  SISTEMA DE TABS
// ══════════════════════════════════════════════════════════════
function switchTab(tab) {
  const tabMov = document.getElementById('tabMovimientos');
  const tabPre = document.getElementById('tabPrestamos');
  const panelMov = document.getElementById('panelMovimientos');
  const panelPre = document.getElementById('panelPrestamos');

  tabMov.classList.toggle('active', tab === 'movimientos');
  tabPre.classList.toggle('active', tab === 'prestamos');
  panelMov.style.display = tab === 'movimientos' ? 'block' : 'none';
  panelPre.style.display = tab === 'prestamos' ? 'block' : 'none';

  if (tab === 'prestamos' && socioActual) {
    renderPrestamos(socioActual.dni);
  }
}

// ══════════════════════════════════════════════════════════════
//  PRÉSTAMOS — Carga y renderizado
// ══════════════════════════════════════════════════════════════
async function cargarPrestamos() {
  if (prestamosLoaded) return;
  try {
    const res = await fetch(URL_PRESTAMOS);
    const rows = parseCSV(await res.text());
    const hdr = rows[0].map(h => h.trim().toLowerCase());

    const iDni    = hdr.findIndex(h => h === 'dni');
    const iNom    = hdr.findIndex(h => h.includes('nombre'));
    const iFecha  = hdr.findIndex(h => h.includes('fecha'));
    const iPrest  = hdr.findIndex(h => h.includes('prestamo'));
    const iInter  = hdr.findIndex(h => h.includes('interes') || h.includes('interés'));
    const iTotal  = hdr.findIndex(h => h.includes('total de cuotas') || h.includes('total cuotas'));
    const iMonto  = hdr.findIndex(h => h.includes('monto a pagar'));
    const iCuota  = hdr.findIndex(h => h.includes('cuota fija'));
    const iPagadas= hdr.findIndex(h => h.includes('cuotas pagadas') || h.includes('pagadas'));
    const iSaldo  = hdr.findIndex(h => h.includes('saldo'));

    PRESTAMOS = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const dni = (r[iDni] || '').trim();
      if (!dni) continue;

      PRESTAMOS.push({
        dni,
        nombre:       (r[iNom] || '').trim(),
        fecha:        (r[iFecha] || '').trim(),
        prestamo:     limpiarMonto(r[iPrest]),
        interes:      limpiarMonto(r[iInter]),
        totalCuotas:  parseInt(r[iTotal]) || 0,
        montoPagar:   limpiarMonto(r[iMonto]),
        cuotaFija:    limpiarMonto(r[iCuota]),
        cuotasPagadas:parseInt(r[iPagadas]) || 0,
        saldo:        limpiarMonto(r[iSaldo]),
      });
    }
    prestamosLoaded = true;
  } catch(e) {
    console.warn('Error cargando préstamos:', e);
    PRESTAMOS = [];
  }
}

function renderPrestamos(dni) {
  const loading = document.getElementById('prestamosLoading');
  const content = document.getElementById('prestamosContent');
  const empty   = document.getElementById('prestamosEmpty');

  content.innerHTML = '';
  empty.style.display = 'none';

  if (!prestamosLoaded) {
    loading.style.display = 'flex';
    // Esperar a que carguen y reintentar
    setTimeout(() => renderPrestamos(dni), 500);
    return;
  }

  loading.style.display = 'none';

  const misPrestamos = PRESTAMOS.filter(p => p.dni === dni);

  if (!misPrestamos.length) {
    empty.style.display = 'flex';
    return;
  }

  // Resumen total — préstamos completados tienen saldo=0
  const totalDeuda  = misPrestamos.reduce((s,p) => s + p.montoPagar, 0);
  const totalSaldo  = misPrestamos.reduce((s,p) => {
    const done = p.cuotasPagadas >= p.totalCuotas && p.totalCuotas > 0;
    return s + (done ? 0 : Math.max(0, p.saldo));
  }, 0);
  const totalPagado = totalDeuda - totalSaldo;
  const progTotal   = totalDeuda > 0 ? Math.min(100, (totalPagado / totalDeuda) * 100) : 0;

  let html = `
    <div class="prestamos-resumen" id="resumenGeneral">
      <div class="prestamos-resumen-header" onclick="document.getElementById('resumenGeneral').classList.toggle('open')">
        <div class="prestamos-resumen-left">
          <span class="prestamos-resumen-icon">💰</span>
          <span class="prestamos-resumen-title">Resumen General</span>
        </div>
        <div class="prestamos-resumen-right">
          <span class="prestamos-resumen-preview">S/ ${fmtMoney(totalSaldo)} pendiente</span>
          <span class="prestamos-resumen-chevron">▼</span>
        </div>
      </div>
      <div class="prestamos-resumen-body">
        <div class="prestamos-circle-wrap">
          ${circularProgress(progTotal, 120, progTotal >= 100 ? '#16a34a' : '#3b82f6')}
          <div class="prestamos-circle-label">
            <span class="prestamos-circle-pct">${Math.round(progTotal)}%</span>
            <span class="prestamos-circle-sub">pagado</span>
          </div>
        </div>
        <div class="prestamos-resumen-stats">
          <div class="prs-stat">
            <span class="prs-stat-label">Deuda Total</span>
            <span class="prs-stat-value prs-danger">S/ ${fmtMoney(totalDeuda)}</span>
          </div>
          <div class="prs-stat">
            <span class="prs-stat-label">Total Pagado</span>
            <span class="prs-stat-value prs-success">S/ ${fmtMoney(totalPagado)}</span>
          </div>
          <div class="prs-stat">
            <span class="prs-stat-label">Saldo Pendiente</span>
            <span class="prs-stat-value prs-warning">S/ ${fmtMoney(totalSaldo)}</span>
          </div>
          <div class="prs-stat">
            <span class="prs-stat-label">Préstamos Activos</span>
            <span class="prs-stat-value prs-info">${misPrestamos.length}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Cada préstamo individual
  misPrestamos.forEach((p, idx) => {
    const cuotasRestantes = p.totalCuotas - p.cuotasPagadas;
    const isComplete = p.cuotasPagadas >= p.totalCuotas && p.totalCuotas > 0;
    // Si está completado, forzar 100% aunque el saldo en la hoja no sea 0
    const progCuotas = isComplete ? 100 : (p.totalCuotas > 0 ? (p.cuotasPagadas / p.totalCuotas) * 100 : 0);
    const pagado     = isComplete ? p.montoPagar : Math.max(0, p.montoPagar - p.saldo);
    const saldoReal  = isComplete ? 0 : Math.max(0, p.saldo);
    const progMonto  = isComplete ? 100 : (p.montoPagar > 0 ? Math.min(100, (pagado / p.montoPagar) * 100) : 0);
    const color = isComplete ? '#16a34a' : (progCuotas >= 50 ? '#f59e0b' : '#ef4444');

    html += `
      <div class="prestamo-card ${isComplete ? 'prestamo-completado' : ''}" style="animation-delay: ${idx * 80}ms">
        <div class="prestamo-card-header">
          <div class="prestamo-card-left">
            <span class="prestamo-badge ${isComplete ? 'badge-completado' : 'badge-activo'}">
              ${isComplete ? '✅ Completado' : '🔄 En curso'}
            </span>
            <span class="prestamo-fecha">📅 ${p.fecha || '—'}</span>
          </div>
          <div class="prestamo-monto-principal">S/ ${fmtMoney(p.prestamo)}</div>
        </div>

        <div class="prestamo-card-body">
          <div class="prestamo-progress-section">
            <div class="prestamo-circle-container">
              ${circularProgress(progCuotas, 72, color)}
              <div class="prestamos-circle-label prestamo-circle-inner">
                <span class="prestamos-circle-pct" style="font-size:16px">${p.cuotasPagadas}/${p.totalCuotas}</span>
                <span class="prestamos-circle-sub">cuotas</span>
              </div>
            </div>
            <div class="prestamo-bar-section">
              <div class="prestamo-bar-label">
                <span>Progreso de pago</span>
                <span class="prestamo-bar-pct">${Math.round(progMonto)}%</span>
              </div>
              <div class="prestamo-bar-track">
                <div class="prestamo-bar-fill" style="width:${progMonto}%;background:${color}"></div>
              </div>
            </div>
          </div>

          <div class="prestamo-details-grid">
            <div class="prestamo-detail">
              <span class="pd-label">Capital</span>
              <span class="pd-value">S/ ${fmtMoney(p.prestamo)}</span>
            </div>
            <div class="prestamo-detail">
              <span class="pd-label">Interés</span>
              <span class="pd-value">${p.interes}%</span>
            </div>
            <div class="prestamo-detail">
              <span class="pd-label">Monto Total</span>
              <span class="pd-value pd-bold">S/ ${fmtMoney(p.montoPagar)}</span>
            </div>
            <div class="prestamo-detail">
              <span class="pd-label">Cuota Fija</span>
              <span class="pd-value">S/ ${fmtMoney(p.cuotaFija)}</span>
            </div>
            <div class="prestamo-detail">
              <span class="pd-label">Pagado</span>
              <span class="pd-value pd-green">S/ ${fmtMoney(pagado)}</span>
            </div>
            <div class="prestamo-detail">
              <span class="pd-label">Saldo</span>
              <span class="pd-value pd-red">S/ ${fmtMoney(saldoReal)}</span>
            </div>
          </div>

          <div class="prestamo-cuotas-summary">
            <div class="pcs-item pcs-pagadas">
              <span class="pcs-num">${p.cuotasPagadas}</span>
              <span class="pcs-txt">Pagadas</span>
            </div>
            <div class="pcs-divider"></div>
            <div class="pcs-item pcs-restantes">
              <span class="pcs-num">${cuotasRestantes}</span>
              <span class="pcs-txt">Restantes</span>
            </div>
            <div class="pcs-divider"></div>
            <div class="pcs-item pcs-total">
              <span class="pcs-num">${p.totalCuotas}</span>
              <span class="pcs-txt">Total</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  content.innerHTML = html;

  // Animar barras de progreso
  requestAnimationFrame(() => {
    content.querySelectorAll('.prestamo-bar-fill').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        bar.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
        bar.style.width = w;
      });
    });
    // Animar SVG circles
    content.querySelectorAll('.progress-circle-fg').forEach(circle => {
      const target = circle.getAttribute('data-target');
      const circumference = circle.getAttribute('data-circumference');
      circle.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        circle.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        circle.style.strokeDashoffset = target;
      });
    });
  });
}

function circularProgress(percent, size, color) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const half = size / 2;
  return `
    <svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="progress-circle-bg" cx="${half}" cy="${half}" r="${r}"
        stroke="#e2e8f0" stroke-width="${stroke}" fill="none" />
      <circle class="progress-circle-fg" cx="${half}" cy="${half}" r="${r}"
        stroke="${color}" stroke-width="${stroke}" fill="none"
        stroke-linecap="round"
        stroke-dasharray="${c}"
        stroke-dashoffset="${offset}"
        data-target="${offset}"
        data-circumference="${c}"
        transform="rotate(-90 ${half} ${half})" />
    </svg>
  `;
}

function fmtMoney(n) {
  if (!n && n !== 0) return '0.00';
  return Math.abs(n).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  buscarInput.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
  try { await cargarTodo(); } catch(e) { console.warn('Init load error', e); }
});

// ══════════════════════════════════════════════════════════════
//  GENERAR PDF
// ══════════════════════════════════════════════════════════════

// Carga una imagen como base64 usando un canvas oculto
function cargarImagenBase64(src) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch(e) {
        // Canvas tainted por CORS — continuar sin logo
        resolve(null);
      }
    };
    img.onerror = function() { resolve(null); };
    // Usar URL absoluta para evitar problemas de CORS en GitHub Pages
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      var base = window.location.href.replace(/\/[^\/]*$/, '/');
      src = base + src;
    }
    img.src = src;
  });
}

async function generarPDF() {
  if (!socioActual) return;

  // Verificar que jsPDF esté disponible
  if (typeof window.jspdf === 'undefined') {
    alert('La librería PDF no está disponible. Verifica tu conexión a internet y recarga la página.');
    return;
  }

  // Cargar logo antes de generar el PDF
  var logoData = await cargarImagenBase64('logo.png');

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();   // 210
    const pageH = doc.internal.pageSize.getHeight();  // 297
    const margin = 14;
    const VALOR_ACCION = 10;

    // ── Meses (para el PDF) ──
    const MESES_NOMBRE_PDF = {
      'ene':'Enero','feb':'Febrero','mar':'Marzo','abr':'Abril',
      'may':'Mayo','jun':'Junio','jul':'Julio','ago':'Agosto',
      'sept':'Septiembre','oct':'Octubre','nov':'Noviembre','dic':'Diciembre'
    };
    const MESES_IDX_PDF = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                           'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    // ── Fecha de descarga ──
    const ahora = new Date();
    const diaStr  = String(ahora.getDate()).padStart(2,'0');
    const mesStr  = MESES_IDX_PDF[ahora.getMonth() + 1];
    const anioStr = String(ahora.getFullYear());
    const horaStr = String(ahora.getHours()).padStart(2,'0') + ':' + String(ahora.getMinutes()).padStart(2,'0');
    const fechaDescarga = diaStr + ' de ' + mesStr + ' de ' + anioStr;

    // ── Primera aportación = fecha de ingreso ──
    const anios = Object.keys(HOJAS).sort();
    let fechaIngreso = '—';
    loopAnio:
    for (let ai = 0; ai < anios.length; ai++) {
      const anio = anios[ai];
      const ms = (APORTES[anio] || {})[socioActual.dni] || {};
      for (let mi = 0; mi < MESES.length; mi++) {
        const m = MESES[mi];
        if (ms[m] && ms[m] > 0) {
          fechaIngreso = MESES_NOMBRE_PDF[m] + ' ' + anio;
          break loopAnio;
        }
      }
    }

    // ══════════════════════════════════════════════
    //  ENCABEZADO con logo
    // ══════════════════════════════════════════════
    const headerH = 30;   // altura total de la barra principal
    const subBarH = 8;    // altura de la franja "CAJAMARCA"

    // Barra azul oscura
    doc.setFillColor(13, 71, 161);
    doc.rect(0, 0, pageW, headerH, 'F');

    // ── Logo (izquierda) ──
    const logoSize = 22;   // alto del logo en mm
    const logoPad  = 4;    // margen desde borde
    if (logoData) {
      const aspect  = logoData.w / logoData.h;
      const logoW   = logoSize * aspect;
      const logoX   = logoPad;
      const logoY   = (headerH - logoSize) / 2;
      doc.addImage(logoData.dataUrl, 'PNG', logoX, logoY, logoW, logoSize);
    }

    // ── Título centrado en el ancho TOTAL de la página ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('ASOCIACION DE CREDITO Y AHORRO CRISTO REY', pageW / 2, headerH * 0.38, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 210, 255);
    doc.text('PROMOCION 94', pageW / 2, headerH * 0.70, { align: 'center' });

    // Franja azul medio
    doc.setFillColor(25, 118, 210);
    doc.rect(0, headerH, pageW, subBarH, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CAJAMARCA', pageW / 2, headerH + subBarH * 0.65, { align: 'center' });

    // ══════════════════════════════════════════════
    //  BLOQUE DE DATOS DEL ACCIONISTA  (diseño profesional)
    // ══════════════════════════════════════════════
    let y = headerH + subBarH + 5;

    // Fondo blanco con borde azul
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(25, 118, 210);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageW - margin * 2, 34, 2, 2, 'FD');

    // Mini-header azul oscuro
    doc.setFillColor(13, 71, 161);
    doc.roundedRect(margin, y, pageW - margin * 2, 7, 2, 2, 'F');
    doc.rect(margin, y + 4, pageW - margin * 2, 3, 'F'); // cuadra la parte inferior

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 210, 255);
    doc.text('DATOS DEL ACCIONISTA', pageW / 2, y + 5, { align: 'center' });

    // ── 4 columnas ──
    const boxW = pageW - margin * 2;
    const colW = boxW / 4;
    const cols = [
      margin + colW * 0.5,
      margin + colW * 1.5,
      margin + colW * 2.5,
      margin + colW * 3.5,
    ];

    // Etiquetas (gris pequeño)
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 144, 156);
    doc.text('ACCIONISTA',          cols[0], y + 13, { align: 'center' });
    doc.text('DNI',                 cols[1], y + 13, { align: 'center' });
    doc.text('FECHA DE INGRESO',    cols[2], y + 13, { align: 'center' });
    doc.text('VALOR DE LA ACCION',  cols[3], y + 13, { align: 'center' });

    // Valores (negrita oscuro)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const nombreCorto = doc.splitTextToSize(socioActual.nombre, colW - 3)[0];
    doc.text(nombreCorto,            cols[0], y + 19, { align: 'center' });
    doc.text(socioActual.dni || '—', cols[1], y + 19, { align: 'center' });
    doc.text(fechaIngreso,           cols[2], y + 19, { align: 'center' });
    doc.setTextColor(25, 118, 210);
    doc.text('S/ ' + VALOR_ACCION.toFixed(2), cols[3], y + 19, { align: 'center' });

    // Línea divisora y fecha de informe
    doc.setDrawColor(220, 230, 240);
    doc.setLineWidth(0.2);
    doc.line(margin + 4, y + 22, pageW - margin - 4, y + 22);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 144, 156);
    doc.text('FECHA DE INFORME:', margin + 5, y + 28);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(fechaDescarga + '   ' + horaStr + ' hrs.', margin + 42, y + 28);

    // ══════════════════════════════════════════════
    //  CONSTRUIR FILAS DE LA TABLA
    // ══════════════════════════════════════════════
    y += 42;

    const rows = [];
    let granTotalAcc = 0;
    let granTotalVal = 0;
    let granTotalRet = 0;

    for (let ai = 0; ai < anios.length; ai++) {
      const anio       = anios[ai];
      const mesesSocio = (APORTES[anio] || {})[socioActual.dni] || {};
      const egrAnio    = egresosDelSocio(socioActual.dni).filter(function(e){ return e.anio === anio; });
      const tieneData  = MESES.some(function(m){ return (mesesSocio[m] || 0) > 0; }) || egrAnio.length > 0;
      if (!tieneData) continue;

      let subAcc = 0, subVal = 0, subRet = 0;

      for (let mi = 0; mi < MESES.length; mi++) {
        const m       = MESES[mi];
        const acc     = mesesSocio[m] || 0;
        const val     = acc * VALOR_ACCION;
        const egrMes  = egresosMesAnio(socioActual.dni, anio, m);
        const ret     = egrMes.reduce(function(s, e){ return s + e.monto; }, 0);

        if (acc > 0 || ret > 0) {
          rows.push({
            tipo: 'mes',
            data: [
              MESES_NOMBRE_PDF[m] + ' ' + anio,
              acc > 0 ? String(acc) : '—',
              val > 0 ? 'S/ ' + val.toFixed(2) : '—',
              ret > 0 ? 'S/ ' + ret.toFixed(2) : '—',
              ''
            ]
          });
          subAcc += acc;
          subVal += val;
          subRet += ret;
        }
      }

      if (subAcc > 0 || subRet > 0) {
        rows.push({
          tipo: 'anual',
          data: [
            'SUBTOTAL ' + anio,
            String(subAcc),
            'S/ ' + subVal.toFixed(2),
            subRet > 0 ? 'S/ ' + subRet.toFixed(2) : '—',
            ''
          ]
        });
        granTotalAcc += subAcc;
        granTotalVal += subVal;
        granTotalRet += subRet;
      }
    }

    rows.push({
      tipo: 'total',
      data: [
        'TOTAL GENERAL',
        String(granTotalAcc),
        'S/ ' + granTotalVal.toFixed(2),
        granTotalRet > 0 ? 'S/ ' + granTotalRet.toFixed(2) : '—',
        ''
      ]
    });

    // ══════════════════════════════════════════════
    //  TABLA
    // ══════════════════════════════════════════════
    const tipoRows = rows.map(function(r){ return r.tipo; });
    const bodyData = rows.map(function(r){ return r.data; });

    doc.autoTable({
      head: [['FECHA', 'N\u00B0 ACCIONES', 'VALOR TOTAL\nACCIONES S/.', 'RETIRO S/.', 'FIRMA']],
      body: bodyData,
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        lineColor: [180, 200, 220],
        lineWidth: 0.3,
        textColor: [15, 23, 42],
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [13, 71, 161],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
        cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
      },
      columnStyles: {
        0: { cellWidth: 44, halign: 'center' },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 38, halign: 'center' },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 'auto', halign: 'center' },
      },
      didParseCell: function(data) {
        if (data.section !== 'body') return;
        var tipo = tipoRows[data.row.index];

        if (tipo === 'anual') {
          data.cell.styles.fillColor = [227, 242, 253];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [13, 71, 161];
        } else if (tipo === 'total') {
          data.cell.styles.fillColor = [13, 71, 161];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontSize  = 9;
        } else {
          data.cell.styles.fillColor = (data.row.index % 2 === 0) ? [255, 255, 255] : [245, 249, 255];
        }

        // Retiro en rojo
        if (tipo === 'mes' && data.column.index === 3 && data.cell.raw !== '—') {
          data.cell.styles.textColor = [183, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      tableWidth: pageW - margin * 2,
    });

    // ══════════════════════════════════════════════
    //  RESUMEN / BILLETERA
    // ══════════════════════════════════════════════
    var finalY   = doc.lastAutoTable.finalY + 6;
    var billetera = granTotalVal - granTotalRet;

    // Verificar si cabe; si no, nueva página
    if (finalY + 30 > pageH - 20) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFillColor(227, 242, 253);
    doc.setDrawColor(25, 118, 210);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, finalY, pageW - margin * 2, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(13, 71, 161);
    doc.text('RESUMEN DE CUENTA', pageW / 2, finalY + 7, { align: 'center' });

    doc.setDrawColor(25, 118, 210);
    doc.setLineWidth(0.3);
    doc.line(margin + 4, finalY + 9, pageW - margin - 4, finalY + 9);

    // Dividir el ancho interior en 3 tercios iguales
    var innerW = pageW - margin * 2;
    var col1   = margin + innerW * (1/6);   // centro del tercio izquierdo
    var col2   = margin + innerW * (3/6);   // centro del tercio central
    var col3   = margin + innerW * (5/6);   // centro del tercio derecho

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(96, 125, 139);
    doc.text('TOTAL ACCIONES INGRESADAS', col1, finalY + 14, { align: 'center' });
    doc.text('TOTAL RETIROS',              col2, finalY + 14, { align: 'center' });
    doc.text('SALDO EN BILLETERA',         col3, finalY + 14, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 71, 161);
    doc.text(String(granTotalAcc), col1, finalY + 22, { align: 'center' });

    doc.setTextColor(183, 28, 28);
    doc.text(granTotalRet > 0 ? 'S/ ' + granTotalRet.toFixed(2) : '—', col2, finalY + 22, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(25, 118, 210);
    doc.text('S/ ' + billetera.toFixed(2), col3, finalY + 22, { align: 'center' });

    // ══════════════════════════════════════════════
    //  PIE DE PÁGINA
    // ══════════════════════════════════════════════
    var pieY = pageH - 14;
    doc.setFillColor(13, 71, 161);
    doc.rect(0, pieY - 2, pageW, 16, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 210, 255);
    doc.text('Asociacion de Credito y Ahorro Cristo Rey  —  Promocion 94  —  Cajamarca', margin, pieY + 4);
    doc.text('Informe generado el ' + fechaDescarga + ' a las ' + horaStr + ' hrs.  |  Documento de solo lectura.', margin, pieY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('DNI: ' + (socioActual.dni || ''), pageW - margin, pieY + 6, { align: 'right' });

    // ══════════════════════════════════════════════
    //  GUARDAR
    // ══════════════════════════════════════════════
    var hoy = anioStr + String(ahora.getMonth()+1).padStart(2,'0') + diaStr;
    var nombreArchivo = 'Voucher_' + socioActual.nombre.replace(/\s+/g,'_') + '_' + hoy + '.pdf';
    doc.save(nombreArchivo);

  } catch(err) {
    console.error('Error generando PDF:', err);
    alert('Error al generar el PDF. Revisa la consola para más detalles.');
  }
}