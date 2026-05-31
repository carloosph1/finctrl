// ── DATA ──
const CATS_DESPESA = ["Alimentação","Transporte","Saúde","Lazer","Estudos","Moradia","Insumos","Outros"];
const CATS_RECEITA = ["Salário","Freelance","Vendas","Bolsa","Outras",];
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const CAT_COLORS = {
  "Alimentação":"#FF6B6B","Transporte":"#FFA94D","Saúde":"#69DB7C",
  "Lazer":"#74C0FC","Estudos":"#DA77F2","Moradia":"#FFD43B","Outros":"#A9A9A9",
  "Salário":"#38D9A9","Freelance":"#63E6BE","Vendas":"#4DABF7","Bolsa":"#E599F7","Outras":"#C5F6FA","Insumos":"#FFEAA7"
};

let movimentos = JSON.parse(localStorage.getItem('finctrl_movs') || 'null') || [
  {id:1,tipo:"receita",nome:"Salário",categoria:"Salário",valor:4500,data:"2026-04-05",desc:""},
  {id:2,tipo:"receita",nome:"Freela design",categoria:"Freelance",valor:800,data:"2026-04-12",desc:"Logo para cliente"},
  {id:3,tipo:"despesa",nome:"Aluguel",categoria:"Moradia",valor:1200,data:"2026-04-01",desc:""},
  {id:4,tipo:"despesa",nome:"Mercado",categoria:"Alimentação",valor:350,data:"2026-04-08",desc:"Compras da semana"},
  {id:5,tipo:"despesa",nome:"Uber",categoria:"Transporte",valor:120,data:"2026-04-10",desc:""},
  {id:6,tipo:"despesa",nome:"Academia",categoria:"Saúde",valor:90,data:"2026-04-01",desc:"Mensalidade"},
  {id:7,tipo:"receita",nome:"Salário",categoria:"Salário",valor:4500,data:"2026-05-05",desc:""},
  {id:8,tipo:"despesa",nome:"Internet",categoria:"Moradia",valor:110,data:"2026-05-02",desc:""},
  {id:9,tipo:"despesa",nome:"Cinema",categoria:"Lazer",valor:60,data:"2026-05-14",desc:""},
  {id:10,tipo:"despesa",nome:"Livro",categoria:"Estudos",valor:75,data:"2026-05-20",desc:""},
  {id:11,tipo:"despesa",nome:"Insumos",categoria:"Insumos",valor:100,data:"2026-05-20",desc:""},
];
let nextId = Math.max(...movimentos.map(m=>m.id), 11) + 1;
let editId = null;
let currentTipo = 'despesa';
let chartPizza = null, chartBarras = null, chartLinha = null;
let currentSection = 'dashboard';

function save() {
  localStorage.setItem('finctrl_movs', JSON.stringify(movimentos));
}

// ── FORMATTING ──
function fmtMoney(v) {
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
function fmtDate(d) {
  return new Date(d+'T12:00').toLocaleDateString('pt-BR');
}
function mesLabel(m) {
  return MONTHS[parseInt(m.slice(5))-1] + ' ' + m.slice(0,4);
}

// ── STATS ──
function updateStats() {
  const rec = movimentos.filter(m=>m.tipo==='receita').reduce((s,m)=>s+m.valor,0);
  const desp = movimentos.filter(m=>m.tipo==='despesa').reduce((s,m)=>s+m.valor,0);
  const saldo = rec - desp;
  const elS = document.getElementById('stat-saldo');
  elS.textContent = fmtMoney(saldo);
  elS.className = 'stat-value ' + (saldo >= 0 ? 'positive' : 'negative');
  document.getElementById('stat-receitas').textContent = fmtMoney(rec);
  document.getElementById('stat-despesas').textContent = fmtMoney(desp);
}

// ── TABLE ──
function buildTable(movs, container, compact) {
  if (!movs.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma movimentação encontrada.</div>';
    return;
  }
  let rows = movs.map(m => {
    const col = CAT_COLORS[m.categoria] || '#999';
    const desc = (!compact && m.desc) ? `<div class="td-sub">${m.desc}</div>` : '';
    return `
    <tr>
      <td><span class="badge badge-${m.tipo}">${m.tipo}</span></td>
      <td class="td-name">${m.nome}${desc}</td>
      <td><span class="cat-pill" style="background:${col}22;color:${col}">${m.categoria}</span></td>
      <td class="${m.tipo==='receita'?'val-rec':'val-desp'}">${m.tipo==='receita'?'+':'-'} ${fmtMoney(m.valor)}</td>
      <td class="td-date">${fmtDate(m.data)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-edit" onclick="openEdit(${m.id})">editar</button>
          <button class="btn btn-sm btn-del" onclick="deleteMov(${m.id})">excluir</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Tipo</th><th>Nome</th><th>Categoria</th><th>Valor</th><th>Data</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderDashboard() {
  const sorted = [...movimentos].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,6);
  buildTable(sorted, document.getElementById('table-dashboard'), true);
}

function renderMovs() {
  const search = document.getElementById('filter-search').value.toLowerCase();
  const tipo = document.getElementById('filter-tipo').value;
  const cat = document.getElementById('filter-cat').value;
  const mes = document.getElementById('filter-mes').value;

  const hasFilter = search||tipo||cat||mes;
  document.getElementById('btn-clear').style.display = hasFilter ? 'inline-flex' : 'none';

  const filtered = movimentos.filter(m => {
    if (tipo && m.tipo !== tipo) return false;
    if (cat && m.categoria !== cat) return false;
    if (mes && m.data.slice(0,7) !== mes) return false;
    if (search && !m.nome.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a,b)=>b.data.localeCompare(a.data));

  document.getElementById('filter-count').textContent = `${filtered.length} resultado${filtered.length!==1?'s':''}`;
  buildTable(filtered, document.getElementById('table-movs'), false);
}

function populateFilters() {
  const meses = [...new Set(movimentos.map(m=>m.data.slice(0,7)))].sort().reverse();
  const selMes = document.getElementById('filter-mes');
  const curMes = selMes.value;
  selMes.innerHTML = '<option value="">Mês: Todos</option>' + meses.map(m=>`<option value="${m}">${mesLabel(m)}</option>`).join('');
  if (curMes) selMes.value = curMes;

  const allCats = [...CATS_DESPESA,...CATS_RECEITA];
  const selCat = document.getElementById('filter-cat');
  const curCat = selCat.value;
  selCat.innerHTML = '<option value="">Categoria: Todas</option>' + allCats.map(c=>`<option value="${c}">${c}</option>`).join('');
  if (curCat) selCat.value = curCat;
}

function clearFilters() {
  document.getElementById('filter-search').value='';
  document.getElementById('filter-tipo').value='';
  document.getElementById('filter-cat').value='';
  document.getElementById('filter-mes').value='';
  renderMovs();
}

// ── MODAL ──
function openModal(tipo) {
  editId = null;
  document.getElementById('modal-title').textContent = tipo==='receita' ? 'Nova Receita' : 'Nova Despesa';
  document.getElementById('tipo-toggle').style.display = 'grid';
  document.getElementById('f-nome').value = '';
  document.getElementById('f-valor').value = '';
  document.getElementById('f-data').value = new Date().toISOString().slice(0,10);
  document.getElementById('f-desc').value = '';
  setTipo(tipo);
  document.getElementById('modal-bg').classList.add('open');
  setTimeout(()=>document.getElementById('f-nome').focus(), 100);
}

function openEdit(id) {
  const m = movimentos.find(x=>x.id===id);
  if (!m) return;
  editId = id;
  document.getElementById('modal-title').textContent = 'Editar Movimentação';
  document.getElementById('tipo-toggle').style.display = 'none';
  setTipo(m.tipo, true);
  document.getElementById('f-nome').value = m.nome;
  document.getElementById('f-valor').value = m.valor;
  document.getElementById('f-data').value = m.data;
  document.getElementById('f-desc').value = m.desc;
  setTimeout(()=>{ document.getElementById('f-cat').value = m.categoria; }, 0);
  document.getElementById('modal-bg').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
}

function setTipo(tipo, silent) {
  currentTipo = tipo;
  const cats = tipo==='despesa' ? CATS_DESPESA : CATS_RECEITA;
  document.getElementById('f-cat').innerHTML = cats.map(c=>`<option>${c}</option>`).join('');
  if (!silent) {
    const bd = document.getElementById('btn-tipo-despesa');
    const br = document.getElementById('btn-tipo-receita');
    bd.className = 'tipo-btn' + (tipo==='despesa'?' active-desp':'');
    br.className = 'tipo-btn' + (tipo==='receita'?' active-rec':'');
  }
}

function saveMovimento() {
  const nome = document.getElementById('f-nome').value.trim();
  const valor = parseFloat(document.getElementById('f-valor').value);
  const data = document.getElementById('f-data').value;
  const categoria = document.getElementById('f-cat').value;
  const desc = document.getElementById('f-desc').value.trim();
  if (!nome || !valor || !data) { showToast('Preencha os campos obrigatórios.'); return; }

  if (editId) {
    const idx = movimentos.findIndex(m=>m.id===editId);
    movimentos[idx] = { id:editId, tipo:movimentos[idx].tipo, nome, valor, data, categoria, desc };
    showToast('Movimentação atualizada!');
  } else {
    movimentos.push({ id:nextId++, tipo:currentTipo, nome, valor, data, categoria, desc });
    showToast(currentTipo==='receita' ? 'Receita adicionada!' : 'Despesa adicionada!');
  }
  save();
  closeModal();
  refreshAll();
}

function deleteMov(id) {
  if (!confirm('Excluir esta movimentação?')) return;
  movimentos = movimentos.filter(m=>m.id!==id);
  save();
  refreshAll();
  showToast('Movimentação excluída.');
}

// ── CHARTS ──
const chartDefaults = {
  color: '#9a9890',
  plugins: { legend: { labels: { color:'#9a9890', font:{ family:'DM Mono', size:11 } } } }
};

function last6Months() {
  const now = new Date();
  return Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
}

function renderCharts() {
  const despesas = movimentos.filter(m=>m.tipo==='despesa');
  const receitas = movimentos.filter(m=>m.tipo==='receita');
  const l6 = last6Months();

  // Pizza
  const catData = CATS_DESPESA.reduce((a,c)=>{
    const t = despesas.filter(m=>m.categoria===c).reduce((s,m)=>s+m.valor,0);
    if (t > 0) { a.labels.push(c); a.data.push(t); a.colors.push(CAT_COLORS[c]); }
    return a;
  }, {labels:[],data:[],colors:[]});

  if (chartPizza) chartPizza.destroy();
  chartPizza = new Chart(document.getElementById('chart-pizza'), {
    type: 'doughnut',
    data: {
      labels: catData.labels,
      datasets: [{ data: catData.data, backgroundColor: catData.colors, borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      ...chartDefaults, cutout:'65%',
      plugins: { ...chartDefaults.plugins, tooltip:{ callbacks:{ label: ctx=>`${ctx.label}: ${fmtMoney(ctx.raw)}` } } }
    }
  });

  // Barras
  const barRec = l6.map(m=>receitas.filter(x=>x.data.startsWith(m)).reduce((s,x)=>s+x.valor,0));
  const barDesp = l6.map(m=>despesas.filter(x=>x.data.startsWith(m)).reduce((s,x)=>s+x.valor,0));
  if (chartBarras) chartBarras.destroy();
  chartBarras = new Chart(document.getElementById('chart-barras'), {
    type: 'bar',
    data: {
      labels: l6.map(m=>MONTHS[parseInt(m.slice(5))-1]),
      datasets: [
        { label:'Receitas', data:barRec, backgroundColor:'#38d9a955', borderColor:'#38d9a9', borderWidth:1, borderRadius:4 },
        { label:'Despesas', data:barDesp, backgroundColor:'#ff6b6b55', borderColor:'#ff6b6b', borderWidth:1, borderRadius:4 }
      ]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks:{ color:'#9a9890', font:{family:'DM Mono',size:11} }, grid:{ color:'#1e2230' } },
        y: { ticks:{ color:'#9a9890', font:{family:'DM Mono',size:10}, callback: v=>fmtMoney(v) }, grid:{ color:'#1e2230' } }
      }
    }
  });

  // Linha
  const lineSaldo = l6.map(m=>{
    const slice = movimentos.filter(x=>x.data.slice(0,7)<=m);
    const r = slice.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.valor,0);
    const d = slice.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.valor,0);
    return r-d;
  });
  if (chartLinha) chartLinha.destroy();
  chartLinha = new Chart(document.getElementById('chart-linha'), {
    type: 'line',
    data: {
      labels: l6.map(m=>MONTHS[parseInt(m.slice(5))-1]),
      datasets: [{
        label:'Saldo Acumulado', data:lineSaldo,
        borderColor:'#c9f542', backgroundColor:'#c9f54215',
        fill:true, tension:.4, pointBackgroundColor:'#c9f542', pointRadius:5
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks:{ color:'#9a9890', font:{family:'DM Mono',size:11} }, grid:{ color:'#1e2230' } },
        y: { ticks:{ color:'#9a9890', font:{family:'DM Mono',size:10}, callback: v=>fmtMoney(v) }, grid:{ color:'#1e2230' } }
      }
    }
  });
}

// ── NAVIGATION ──
function showSection(id) {
  currentSection = id;
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>{
    if (b.getAttribute('onclick').includes(`'${id}'`)) b.classList.add('active');
  });
  if (id === 'graficos') renderCharts();
  if (id === 'movimentacoes') { populateFilters(); renderMovs(); }
}

// ── TOAST ──
let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast').classList.add('show');
  toastTimer = setTimeout(()=>document.getElementById('toast').classList.remove('show'), 3000);
}

// ── REFRESH ALL ──
function refreshAll() {
  updateStats();
  renderDashboard();
  if (currentSection === 'movimentacoes') { populateFilters(); renderMovs(); }
  if (currentSection === 'graficos') renderCharts();
}

// ── KEYBOARD ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter' && document.getElementById('modal-bg').classList.contains('open')) {
    saveMovimento();
  }
});

// ── INIT ──
updateStats();
renderDashboard();