// ══════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURACIÓN — pega aquí las URLs de cada año
//      (Archivo → Compartir → Publicar en la web → hoja "2023" → CSV)
// ══════════════════════════════════════════════════════════════
const HOJAS = {
  '2023': 'TU_URL_HOJA_2023',
  '2024': 'TU_URL_HOJA_2024',
  '2025': 'TU_URL_HOJA_2025',
  '2026': 'TU_URL_HOJA_2026',
};
// ══════════════════════════════════════════════════════════════

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sept','oct','nov','dic'];
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── MODO DEMO ─────────────────────────────────────────────────
const DEMO_SOCIOS = [
  { n:1,  dni:'00000001', nombre:'Ambrosio Mendoza, José David' },
  { n:2,  dni:'00000002', nombre:'Amorós Gálvez, Julio César' },
  { n:3,  dni:'00000003', nombre:'Bardales Huamán, Edwin Ronald' },
  { n:4,  dni:'00000004', nombre:'Briones Huamán, Johan' },
  { n:5,  dni:'00000005', nombre:'Celis Silva, Rubén Eduardo' },
  { n:6,  dni:'00000006', nombre:'Cerquín Torres, David' },
  { n:7,  dni:'00000007', nombre:'Céspedes Ortíz, Cristhian Paúl' },
  { n:8,  dni:'00000008', nombre:'Cubas Tejada, Omar Paul' },
  { n:9,  dni:'00000009', nombre:'Fernandez Mendoza, Ricardo' },
  { n:10, dni:'00000010', nombre:'García Goicochea, Miguel Angel' },
  { n:11, dni:'00000011', nombre:'Goicochea Alcántara, Paul Herbert Christian' },
  { n:12, dni:'00000012', nombre:'León Pajares, Donald Josiah' },
  { n:13, dni:'00000013', nombre:'Medina Paredes, Roberto Carlos' },
  { n:14, dni:'00000014', nombre:'Meléndez Rabanal, Carlos Alfredo' },
  { n:15, dni:'00000015', nombre:'Muñoz Córdova, Fredy Renán' },
  { n:16, dni:'00000016', nombre:'Novoa Rodríguez, Julio Humberto' },
  { n:17, dni:'00000017', nombre:'Pisco Bolaños, Segundo Manuel' },
  { n:18, dni:'00000018', nombre:'Portal Huamán, Freddy Alejandro' },
  { n:19, dni:'00000019', nombre:'Requejo Paredes, Edwin Iván' },
  { n:20, dni:'00000020', nombre:'Rodrigo Castillo, Guido' },
  { n:21, dni:'00000021', nombre:'Salcedo Rebaza, Jony' },
  { n:22, dni:'00000022', nombre:'Solano del Aguila, Jorge' },
  { n:23, dni:'00000023', nombre:'Terrones Leyva, Juan Octavio' },
  { n:24, dni:'00000024', nombre:'Trigoso Pereira, Wilder Ernesto' },
  { n:25, dni:'00000025', nombre:'Valdera Urteaga, Gonzalo Fernando' },
  { n:26, dni:'00000026', nombre:'Vásquez Chuquilín, Hugo Ramón' },
  { n:27, dni:'00000027', nombre:'Zegarra Linares, Eduardo' },
];

// aportes demo por año
const DEMO_APORTES = {
  '2023': {
    3:  { mar:70, jun:30 },
    4:  { ene:70, feb:70, mar:70, abr:70, may:70, jun:70, jul:70, ago:70, sept:70, oct:70, nov:70, dic:70 },
    5:  { may:70 },
    6:  { ene:70 },
    7:  { ene:70 },
    8:  { ene:70 },
    11: { ene:70 },
    12: { ene:70 },
    14: { ene:70 },
    19: { ene:70 },
    20: { ene:70 },
    25: { ene:70 },
  },
  '2024': {
    3:  { ene:70, feb:70 },
    4:  { ene:70 },
    5:  { ene:70, feb:70, mar:70 },
    6:  { ene:70, feb:70 },
    7:  { ene:70, feb:70 },
    14: { ene:70, feb:70, mar:70, abr:70 },
    15: { ene:70, feb:70, mar:70, abr:70, may:70 },
    19: { ene:70, feb:70 },
    25: { ene:70, feb:70 },
  },
  '2025': {
    3:  { ene:70, feb:70, mar:70 },
    5:  { ene:70, feb:70 },
  },
  '2026': {
    3:  { ene:70 },
  },
};

// ── ESTADO GLOBAL ──────────────────────────────────────────────
let SOCIOS   = []; // [{n, dni, nombre}]
let APORTES  = {}; // { '2023': { dni: { ene: 70, ... } }, ... }
let loaded   = false;
const modoDemo = Object.values(HOJAS).every(v => v.startsWith('TU_URL'));

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
  return 'S/ ' + n.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// ── CARGA REAL DESDE SHEETS ────────────────────────────────────
async function cargarHoja(anio, url) {
  const res  = await fetch(url);
  const text = await res.text();
  const rows = parseCSV(text);

  // fila 0 = encabezado: [N, Nombre, DNI, ene, feb, mar, ...]
  const headers = rows[0].map(h => h.trim().toLowerCase());
  // índice de cada mes en las columnas
  const idxMes = {};
  MESES.forEach(m => {
    const i = headers.indexOf(m.toLowerCase());
    if (i !== -1) idxMes[m] = i;
  });
  // también acepta "sept" escrito como "sep"
  if (!idxMes['sept'] && headers.indexOf('sep') !== -1)
    idxMes['sept'] = headers.indexOf('sep');

  const resultado = {}; // { dni: { ene: 70, ... } }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1] || !r[1].trim()) continue;

    const dniRaw = (r[2] || '').trim();
    if (!dniRaw) continue;

    // si socios aún no tiene este dni, agrégalo
    if (!SOCIOS.find(s => s.dni === dniRaw)) {
      SOCIOS.push({
        n:      parseInt(r[0]) || i,
        nombre: r[1].trim(),
        dni:    dniRaw,
      });
    }

    const mesesSocio = {};
    MESES.forEach(m => {
      if (idxMes[m] !== undefined) {
        const v = limpiarMonto(r[idxMes[m]]);
        if (v > 0) mesesSocio[m] = v;
      }
    });
    resultado[dniRaw] = mesesSocio;
  }
  return resultado;
}

async function cargarTodo() {
  if (loaded) return;

  if (modoDemo) {
    // carga demo
    SOCIOS  = DEMO_SOCIOS.map(s => ({...s}));
    APORTES = {};
    for (const [anio, porN] of Object.entries(DEMO_APORTES)) {
      APORTES[anio] = {};
      for (const [n, meses] of Object.entries(porN)) {
        const socio = SOCIOS.find(s => s.n === parseInt(n));
        if (socio) APORTES[anio][socio.dni] = meses;
      }
    }
    loaded = true;
    return;
  }

  // carga real en paralelo
  const promesas = Object.entries(HOJAS).map(async ([anio, url]) => {
    try {
      const data = await cargarHoja(anio, url);
      APORTES[anio] = data;
    } catch(e) {
      console.warn('Error cargando hoja', anio, e);
      APORTES[anio] = {};
    }
  });
  await Promise.all(promesas);
  loaded = true;
}

// ── AUTOCOMPLETADO ─────────────────────────────────────────────
const buscarInput = document.getElementById('buscarInput');
const sugBox      = document.getElementById('sugerencias');

buscarInput.addEventListener('input', async () => {
  const q = buscarInput.value.trim().toLowerCase();
  if (q.length < 2) { sugBox.style.display='none'; sugBox.innerHTML=''; return; }
  try { await cargarTodo(); } catch(e) {}
  const matches = filtrar(q).slice(0, 7);
  renderSugerencias(matches);
});

function filtrar(q) {
  return SOCIOS.filter(s =>
    s.nombre.toLowerCase().includes(q) || s.dni.includes(q)
  );
}

function renderSugerencias(matches) {
  if (!matches.length) { sugBox.style.display='none'; return; }
  sugBox.style.display = 'block';
  sugBox.innerHTML = '';
  matches.forEach(s => {
    const d = document.createElement('div');
    d.className = 'sug-item';
    d.innerHTML = `
      <div class="sug-left">
        <span class="sug-n">${s.n}.</span>
        <span>${s.nombre}</span>
      </div>
      <span class="sug-dni">${s.dni}</span>`;
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
  const q   = buscarInput.value.trim().toLowerCase();
  const err  = document.getElementById('errorMsg');
  const load = document.getElementById('loadingMsg');
  err.classList.remove('show');

  if (!q) {
    err.textContent = 'Escribe tu apellido, nombre o DNI.';
    err.classList.add('show'); return;
  }

  load.classList.add('show');
  try { await cargarTodo(); }
  catch(e) {
    load.classList.remove('show');
    err.textContent = 'Error al cargar datos. Verifica tu conexión.';
    err.classList.add('show'); return;
  }
  load.classList.remove('show');

  const matches = filtrar(q);
  if (!matches.length) {
    err.textContent = 'No se encontró ningún socio con ese nombre o DNI.';
    err.classList.add('show'); return;
  }
  if (matches.length === 1) { seleccionar(matches[0].dni); return; }
  renderSugerencias(matches);
}

// ── DASHBOARD ──────────────────────────────────────────────────
function mostrarDashboard(socio) {
  sugBox.style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';

  document.getElementById('uNombre').textContent = socio.nombre;
  document.getElementById('uMeta').textContent   =
    'Socio N° ' + socio.n + '  ·  DNI ' + socio.dni;

  // calcular total general
  let totalGeneral = 0;
  const anios = Object.keys(HOJAS).sort();

  anios.forEach(anio => {
    const mesesSocio = (APORTES[anio] || {})[socio.dni] || {};
    Object.values(mesesSocio).forEach(v => totalGeneral += v);
  });

  document.getElementById('uTotal').textContent = fmtS(totalGeneral);

  // construir grilla
  const grid = document.getElementById('aportesGrid');
  grid.innerHTML = '';

  anios.forEach(anio => {
    const mesesSocio = (APORTES[anio] || {})[socio.dni] || {};
    const totalAnio  = Object.values(mesesSocio).reduce((a,b)=>a+b, 0);

    const blk = document.createElement('div');
    blk.className = 'year-block';

    const hdr = document.createElement('div');
    hdr.className = 'year-header';
    hdr.innerHTML = `
      <span class="year-label">${anio}</span>
      <div class="year-right">
        <span class="year-total">${totalAnio > 0 ? fmtS(totalAnio) : '—'}</span>
        <span class="year-chevron">▶</span>
      </div>`;

    const body = document.createElement('div');
    body.className = 'year-body';

    const tieneDatos = Object.keys(mesesSocio).length > 0;

    if (tieneDatos) {
      const rows = document.createElement('div');
      rows.className = 'month-rows';
      MESES.forEach((m, i) => {
        const val = mesesSocio[m] || 0;
        const row = document.createElement('div');
        row.className = 'month-row';
        row.style.animationDelay = (i * 30) + 'ms';
        row.innerHTML = `
          <span class="month-name">${MESES_FULL[i]}</span>
          <span class="month-aporte ${val > 0 ? 'pagado' : 'nopago'}">
            ${val > 0 ? fmtS(val) : 'sin aporte'}
          </span>`;
        rows.appendChild(row);
      });
      body.appendChild(rows);
    } else {
      const emp = document.createElement('div');
      emp.className = 'year-empty';
      emp.textContent = 'Sin aportes registrados este año.';
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
document.addEventListener('DOMContentLoaded', () => {
  buscarInput.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
  if (!modoDemo)
    document.getElementById('configNotice').style.display = 'none';
});
