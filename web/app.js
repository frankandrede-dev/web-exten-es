/* ColetaFlow - frontend demonstrativo. Nenhuma API, sessão ou dado clínico real.
 * Todos os dados ficam somente na memória; atualizar a página reinicia a simulação.
 */
'use strict';

const DEMO_DATE = '2026-10-20';
const COLLECTORS = [
  { id: 'col1', name: 'Coletor 01', initials: 'C1' },
  { id: 'col2', name: 'Coletor 02', initials: 'C2' },
  { id: 'col3', name: 'Coletor 03', initials: 'C3' },
  { id: 'col4', name: 'Coletor 04', initials: 'C4' },
];
const STATUSES = {
  AGENDADA: 'Agendada', CIENTE: 'Ciente', EM_DESLOCAMENTO: 'Em deslocamento',
  NO_LOCAL: 'No local', EM_COLETA: 'Em coleta', REALIZADA: 'Realizada',
  NAO_REALIZADA: 'Não realizada', CANCELADA: 'Cancelada',
};
const NEXT_STATUS = {
  AGENDADA: ['CIENTE', 'Confirmar ciência'],
  CIENTE: ['EM_DESLOCAMENTO', 'Iniciar deslocamento'],
  EM_DESLOCAMENTO: ['NO_LOCAL', 'Registrar chegada'],
  NO_LOCAL: ['EM_COLETA', 'Iniciar coleta'],
  EM_COLETA: ['REALIZADA', 'Finalizar coleta'],
};
const originalAddress = (street, number, neighborhood, city = 'Mineiros', uf = 'GO', reference = '') =>
  ({ street, number, neighborhood, city, uf, reference });

const APPOINTMENTS = [
  { id: 'COL-001', patient: 'Paciente A (fictício)', phone: '(00) 00000-0001', team: '01', date: DEMO_DATE, time: '07:30', collector: 'col1', createdBy: 'Atendente 01', status: 'REALIZADA', address: originalAddress('Rua Exemplo Norte', '10', 'Centro'), version: 1 },
  { id: 'COL-002', patient: 'Paciente B (fictício)', phone: '(00) 00000-0002', team: '01', date: DEMO_DATE, time: '08:30', collector: 'col1', createdBy: 'Atendente 02', status: 'EM_DESLOCAMENTO', address: originalAddress('Avenida Modelo', '150', 'Boa Vista', 'Mineiros', 'GO', 'Próximo à praça'), version: 1 },
  { id: 'COL-003', patient: 'Paciente C (fictício)', phone: '(00) 00000-0003', team: '02', date: DEMO_DATE, time: '08:30', collector: 'col2', createdBy: 'Atendente 06', status: 'AGENDADA', address: originalAddress('Rua Demonstração', '25', 'Setor Norte'), version: 1 },
  { id: 'COL-004', patient: 'Paciente D (fictício)', phone: '(00) 00000-0004', team: '02', date: DEMO_DATE, time: '09:00', collector: 'col3', createdBy: 'Atendente 07', status: 'CIENTE', address: originalAddress('Rua das Flores (exemplo)', '18', 'Centro'), version: 1 },
  { id: 'COL-005', patient: 'Paciente E (fictício)', phone: '(00) 00000-0005', team: '01', date: DEMO_DATE, time: '09:30', collector: 'col4', createdBy: 'Atendente 03', status: 'AGENDADA', address: originalAddress('Estrada Fictícia', 'S/N', 'Zona Rural', 'Mineiros', 'GO', 'Km fictício'), version: 1 },
  { id: 'COL-006', patient: 'Paciente F (fictício)', phone: '(00) 00000-0006', team: '01', date: DEMO_DATE, time: '10:00', collector: 'col1', createdBy: 'Atendente 04', status: 'AGENDADA', address: originalAddress('Rua de Teste', '210', 'Centro'), version: 1 },
];

const state = {
  role: 'attendant', view: 'dashboard', previousView: 'appointments', selectedId: null,
  appointments: APPOINTMENTS.map(a => ({ ...a, address: { ...a.address }, events: [{ type: 'Agendamento registrado', actor: a.createdBy, when: '19/10/2026 · 14:00', description: 'Coleta cadastrada e atribuída.' }], addressHistory: [] })),
  nextId: 7, query: '', filterTeam: 'all', filterStatus: 'all', filterCollector: 'all',
  collectorTab: 'all'
};

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const breadcrumb = document.getElementById('breadcrumb');
const rolePicker = document.getElementById('role-picker');
const apptDialog = document.getElementById('appointment-dialog');
const addressDialog = document.getElementById('address-dialog');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function pad(n) { return String(n).padStart(2, '0'); }
function formattedDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '—';
  const [y,m,d] = value.split('-');
  return d + '/' + m + '/' + y;
}
function sortBySchedule(items) { return [...items].sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time)); }
function getCollector(id) { return COLLECTORS.find(c => c.id === id)?.name || 'Não identificado'; }
function getAppointment(id) { return state.appointments.find(a => a.id === id); }
function statusClass(s) { return 'tag-' + s.toLowerCase().replaceAll('_', '-'); }
function statusTag(s) { return '<span class="tag ' + statusClass(s) + '">' + escapeHtml(STATUSES[s] || s) + '</span>'; }
function addressText(a) { return [a.street + (a.number ? ', ' + a.number : ''), a.neighborhood, a.city + ' / ' + a.uf, a.reference].filter(Boolean).join(' · '); }
function eventNow() { return new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
function addEvent(a, type, description = '') { a.events.unshift({ type, description, actor: state.role === 'collector' ? 'Coletor 01 (demo)' : state.role === 'supervisor' ? 'Supervisor (demo)' : 'Atendente (demo)', when: eventNow() }); }
function allowedAppointment(a) { return state.role !== 'collector' || a.collector === 'col1'; }
function showToast(message) {
  const box = document.getElementById('toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { box.hidden = true; }, 4000);
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobile-backdrop').hidden = true;
  document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
}
function pageHeader(eyebrow, title, description, action = '') {
  return '<div class="page-header"><div><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1><p>' + description + '</p></div>' + action + '</div>';
}
function primaryNew() { return '<button class="btn btn-primary" data-action="new">＋ Novo agendamento</button>'; }
function metric(title, value, foot, icon) {
  return '<article class="metric"><span class="metric-icon">' + icon + '</span><div class="metric-label">' + title + '</div><div class="metric-value">' + value + '</div><div class="metric-foot">' + foot + '</div></article>';
}
function appointmentRows(items) {
  if (!items.length) return '<tr><td colspan="7"><div class="empty"><strong>Nenhum agendamento encontrado</strong>Altere os filtros ou crie um registro fictício.</div></td></tr>';
  return sortBySchedule(items).map(a => '<tr data-appointment-row data-search="' + escapeHtml((a.id+' '+a.patient+' '+getCollector(a.collector)).toLowerCase()) + '">' +
    '<td><strong>' + escapeHtml(a.time) + '</strong><span class="row-sub">' + formattedDate(a.date) + '</span></td>' +
    '<td><span class="row-title">' + escapeHtml(a.patient) + '</span><span class="row-sub">' + escapeHtml(a.id) + '</span></td>' +
    '<td>WhatsApp ' + escapeHtml(a.team) + '</td>' +
    '<td>' + escapeHtml(getCollector(a.collector)) + '</td>' +
    '<td>' + statusTag(a.status) + '</td>' +
    '<td>' + escapeHtml(a.address.neighborhood || a.address.city) + '</td>' +
    '<td><button class="link-action" data-action="details" data-id="' + escapeHtml(a.id) + '">Ver detalhes →</button></td></tr>').join('');
}
function table(items) {
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Horário</th><th>Paciente</th><th>Origem</th><th>Coletor</th><th>Status</th><th>Região</th><th></th></tr></thead><tbody id="appointment-rows">' + appointmentRows(items) + '</tbody></table></div>';
}
function renderDashboard() {
  const items = state.appointments;
  const pending = items.filter(a => !['REALIZADA','NAO_REALIZADA','CANCELADA'].includes(a.status)).length;
  const completed = items.filter(a => a.status === 'REALIZADA').length;
  const moving = items.filter(a => ['EM_DESLOCAMENTO','NO_LOCAL'].includes(a.status)).length;
  const team1 = items.filter(a => a.team === '01').length;
  return pageHeader('PAINEL DE ATENDIMENTO', 'Visão geral', 'Acompanhe agendamentos e a execução das coletas domiciliares.', primaryNew()) +
    '<div class="inline-notice"><strong>Somente demonstração.</strong> Os dados abaixo são fictícios e as alterações não são salvas nem enviadas ao Supabase.</div>' +
    '<section class="cards" aria-label="Indicadores">' +
    metric('Coletas programadas', items.length, 'Registros na simulação', '▦') +
    metric('Em aberto', pending, 'Ainda não finalizadas', '◷') +
    metric('Em deslocamento', moving, 'Profissionais a caminho', '↗') +
    metric('Realizadas', completed, 'Execução encerrada', '✓') + '</section>' +
    '<div class="content-grid"><section class="panel"><div class="panel-head"><h2>Próximas coletas</h2><button class="link-action" data-action="nav" data-view="appointments">Ver agenda →</button></div>' +
    '<div>' + sortBySchedule(items).slice(0,5).map(a => '<div class="list-item"><span class="time-block">' + escapeHtml(a.time) + '</span><div><strong>' + escapeHtml(a.patient) + '</strong><p>' + escapeHtml(getCollector(a.collector)) + ' · ' + escapeHtml(a.address.neighborhood || a.address.city) + ' · WhatsApp ' + escapeHtml(a.team) + '</p></div>' + statusTag(a.status) + '</div>').join('') +
    '</div></section><div><section class="panel"><div class="panel-head"><h2>Distribuição por coletor</h2><span>' + items.length + ' coletas</span></div>' +
    '<div class="collector-list">' + COLLECTORS.map(c => '<div class="collector-line"><span class="avatar-soft">' + escapeHtml(c.initials) + '</span><span><strong>' + escapeHtml(c.name) + '</strong><small>' + items.filter(a => a.collector === c.id && a.status === 'REALIZADA').length + ' realizada(s)</small></span><span class="count">' + items.filter(a => a.collector === c.id).length + '</span></div>').join('') + '</div></section>' +
    '<div class="info-badge"><strong>Fluxo oficial preservado</strong><div>As mensagens permanecem no WhatsApp Business. O Companion gerencia apenas os registros administrativos.</div></div></div></div>' +
    '<section class="panel"><div class="panel-head"><h2>Agendamentos por equipe</h2><span>Distribuição atual</span></div><div class="panel-body"><div class="stats-grid"><div class="stat-compact"><strong>' + team1 + '</strong><small>WhatsApp 01</small></div><div class="stat-compact"><strong>' + (items.length-team1) + '</strong><small>WhatsApp 02</small></div><div class="stat-compact"><strong>' + COLLECTORS.length + '</strong><small>Coletores de exemplo</small></div></div></div></section>';
}
function renderAppointments() {
  const items = state.appointments.filter(a => (state.filterTeam === 'all' || a.team === state.filterTeam) &&
    (state.filterStatus === 'all' || a.status === state.filterStatus) &&
    (state.filterCollector === 'all' || a.collector === state.filterCollector));
  return pageHeader('GESTÃO DE AGENDAMENTOS', 'Agenda de coletas', 'Consulte, registre e acompanhe as visitas domiciliares. Os horários não são bloqueados.', primaryNew()) +
    '<div class="panel"><div class="panel-head"><h2>Agendamentos registrados</h2><span>' + items.length + ' resultado(s)</span></div><div class="panel-body"><div class="toolbar">' +
    '<input class="search" data-filter="query" id="search-appointments" placeholder="Buscar paciente, protocolo ou coletor" aria-label="Buscar agendamentos" value="' + escapeHtml(state.query) + '">' +
    '<select data-filter="team" aria-label="Filtrar equipe"><option value="all">Ambos WhatsApps</option>' + ['01','02'].map(t => '<option value="' + t + '" ' + (state.filterTeam===t?'selected':'') + '>WhatsApp '+t+'</option>').join('') + '</select>' +
    '<select data-filter="status" aria-label="Filtrar status"><option value="all">Todos os status</option>' + Object.entries(STATUSES).map(([key,label]) => '<option value="'+key+'" '+(state.filterStatus===key?'selected':'')+'>'+label+'</option>').join('') + '</select>' +
    '<select data-filter="collector" aria-label="Filtrar coletor"><option value="all">Todos os coletores</option>' + COLLECTORS.map(c=>'<option value="'+c.id+'" '+(state.filterCollector===c.id?'selected':'')+'>'+escapeHtml(c.name)+'</option>').join('') + '</select></div>' +
    '</div>' + table(items) + '</div>';
}
function renderCollectorHome() {
  const all = sortBySchedule(state.appointments.filter(a => a.collector === 'col1'));
  const items = all.filter(a => state.collectorTab === 'all' || (state.collectorTab === 'pending' && !['REALIZADA','CANCELADA','NAO_REALIZADA'].includes(a.status)) ||
    (state.collectorTab === 'done' && a.status === 'REALIZADA'));
  const done = all.filter(a => a.status === 'REALIZADA').length;
  return pageHeader('PORTAL DO COLETOR', 'Minhas coletas', 'Agenda pessoal de campo · Coletor 01 (perfil de demonstração).') +
    '<div class="inline-notice">Somente coletas fictícias atribuídas ao <strong>Coletor 01</strong> aparecem aqui. O acesso real será controlado pelas políticas do Supabase.</div>' +
    '<div class="cards">' + metric('Atribuídas',all.length,'Coletas sob minha responsabilidade','▦') +
    metric('Realizadas',done,'Finalizadas na simulação','✓') +
    metric('Pendentes',all.length-done,'Inclui coletas em andamento','◷') +
    metric('Endereços corrigidos',all.reduce((n,a)=>n+a.addressHistory.length,0),'Alterações nesta sessão','⌖') + '</div>' +
    '<div class="toolbar"><div class="pill-tabs" role="group" aria-label="Filtrar coletas">' +
    [['all','Todas'],['pending','Pendentes'],['done','Realizadas']].map(([v,l])=>'<button type="button" data-action="collector-tab" data-tab="'+v+'" class="'+(state.collectorTab===v?'active':'')+'">'+l+'</button>').join('') +
    '</div></div><div class="collector-cards">' + (items.map(a => '<article class="collection-card"><div class="collection-card-head"><div><div class="kicker">' + formattedDate(a.date) + '</div><strong>' + escapeHtml(a.time) + ' · ' + escapeHtml(a.patient) + '</strong></div>' + statusTag(a.status) + '</div>' +
    '<div class="address">⌖ ' + escapeHtml(addressText(a.address)) + '</div><div class="collection-card-actions"><button class="btn btn-primary btn-small" data-action="details" data-id="'+escapeHtml(a.id)+'">Abrir coleta</button>' +
    (!['REALIZADA','CANCELADA','NAO_REALIZADA'].includes(a.status) ? '<button class="btn btn-secondary btn-small" data-action="address" data-id="'+escapeHtml(a.id)+'">Corrigir endereço</button>' : '') +
    '</div></article>').join('') || '<div class="empty">Nenhuma coleta neste filtro.</div>') + '</div>';
}
function renderCollectors() {
  return pageHeader('GESTÃO DE EQUIPE','Profissionais de coleta','Acompanhe a distribuição de coletas por responsável.') +
    '<div class="collector-cards">' + COLLECTORS.map(c => {
      const items=state.appointments.filter(a=>a.collector===c.id);
      return '<article class="collection-card"><div class="collector-line"><span class="avatar-soft">' + escapeHtml(c.initials) + '</span><span><strong>' + escapeHtml(c.name) + '</strong><small>Profissional cadastrado (fictício)</small></span><span class="tag tag-realizada">Ativo</span></div>' +
        '<div class="stats-grid" style="margin:19px 0"><div class="stat-compact"><strong>'+items.length+'</strong><small>Atribuídas</small></div><div class="stat-compact"><strong>'+items.filter(a=>a.status==='REALIZADA').length+'</strong><small>Realizadas</small></div><div class="stat-compact"><strong>'+items.filter(a=>a.status!=='REALIZADA').length+'</strong><small>Demais status</small></div></div>' +
        '<button class="btn btn-secondary btn-small" data-action="filter-collector" data-id="'+c.id+'">Ver atribuições →</button></article>';
    }).join('') + '</div>';
}
function renderReports() {
  const items=state.appointments;
  return pageHeader('RELATÓRIOS','Indicadores operacionais','Acompanhamento por equipe e profissional, com dados simulados.') +
    '<div class="inline-notice">Estes indicadores medem os registros do Companion, não mensagens enviadas ou recebidas no WhatsApp.</div>' +
    '<section class="cards">' + metric('Agendamentos',items.length,'Todos os registros fictícios','▦') +
    metric('Realizadas',items.filter(a=>a.status==='REALIZADA').length,'Concluídas pelos coletores','✓') +
    metric('Não realizadas',items.filter(a=>a.status==='NAO_REALIZADA').length,'Com motivo registrado','!') +
    metric('Correções de endereço',items.reduce((n,a)=>n+a.addressHistory.length,0),'Histórico da sessão','⌖') + '</section>' +
    '<section class="panel"><div class="panel-head"><h2>Produção por coletor</h2><span>Dados fictícios</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Profissional</th><th>Atribuídas</th><th>Em andamento</th><th>Realizadas</th><th>Não realizadas</th><th>Correções</th></tr></thead><tbody>' +
    COLLECTORS.map(c => {const xs=items.filter(a=>a.collector===c.id);return '<tr><td><strong>'+escapeHtml(c.name)+'</strong></td><td>'+xs.length+'</td><td>'+xs.filter(a=>!['REALIZADA','NAO_REALIZADA','CANCELADA'].includes(a.status)).length+'</td><td>'+xs.filter(a=>a.status==='REALIZADA').length+'</td><td>'+xs.filter(a=>a.status==='NAO_REALIZADA').length+'</td><td>'+xs.reduce((n,a)=>n+a.addressHistory.length,0)+'</td></tr>';}).join('') +
    '</tbody></table></div></section>';
}
function renderDetails() {
  const a = getAppointment(state.selectedId);
  if (!a || !allowedAppointment(a)) { state.view = state.role === 'collector' ? 'my-collections' : 'appointments'; return renderView(); }
  const terminal = ['REALIZADA','CANCELADA','NAO_REALIZADA'].includes(a.status);
  const next = NEXT_STATUS[a.status];
  return pageHeader('DETALHES DA COLETA',escapeHtml(a.id),'Acompanhe o endereço, o profissional e o histórico operacional.',
    '<button class="btn btn-secondary" data-action="back">← Voltar</button>') +
    '<div class="detail-grid"><div><section class="panel"><div class="panel-head"><h2>Dados do agendamento</h2>'+statusTag(a.status)+'</div><div class="details">' +
    '<div class="detail-row"><small>Paciente</small><strong>'+escapeHtml(a.patient)+'</strong></div>' +
    '<div class="detail-row"><small>Telefone</small><strong>'+escapeHtml(a.phone)+'</strong></div>' +
    '<div class="detail-row"><small>Data da coleta</small><strong>'+formattedDate(a.date)+'</strong></div>' +
    '<div class="detail-row"><small>Horário informado</small><strong>'+escapeHtml(a.time)+'</strong></div>' +
    '<div class="detail-row"><small>Agendado por</small><strong>'+escapeHtml(a.createdBy)+'</strong></div>' +
    '<div class="detail-row"><small>Responsável pela coleta</small><strong>'+escapeHtml(getCollector(a.collector))+'</strong></div>' +
    '<div class="detail-row"><small>WhatsApp de origem</small><strong>Equipe '+escapeHtml(a.team)+'</strong></div>' +
    '<div class="detail-row"><small>Versão do endereço</small><strong>'+a.version+'</strong></div>' +
    '<hr><div class="detail-row full"><small>Endereço domiciliar atual</small><strong>'+escapeHtml(addressText(a.address))+'</strong></div></div>' +
    '<div class="action-bar">' +
    (!terminal && state.role==='collector' ? '<button class="btn btn-secondary" data-action="address" data-id="'+escapeHtml(a.id)+'">⌖ Corrigir endereço</button>' : '') +
    (!terminal && state.role!=='collector' ? '<button class="btn btn-secondary" data-action="address" data-id="'+escapeHtml(a.id)+'">⌖ Corrigir endereço</button>' : '') +
    '<button class="btn btn-secondary" data-action="copy-confirmation" data-id="'+escapeHtml(a.id)+'">Copiar confirmação</button>' +
    '</div></section>' +
    '<section class="panel"><div class="panel-head"><h2>Histórico de alterações</h2><span>'+a.events.length+' evento(s)</span></div><div class="timeline">' +
    a.events.map(e=>'<div class="timeline-item"><strong>'+escapeHtml(e.type)+'</strong><small>'+escapeHtml(e.when)+' · '+escapeHtml(e.actor)+'</small>' +
      (e.description ? '<small>'+escapeHtml(e.description)+'</small>':'')+'</div>').join('')+'</div></section></div>' +
    '<div><section class="panel"><div class="panel-head"><h2>Execução da coleta</h2><span>Operação simulada</span></div><div class="status-flow">' +
    '<div class="status-row"><span><strong>Situação atual</strong><small>Coleta domiciliar</small></span>'+statusTag(a.status)+'</div>' +
    (state.role==='collector' ? (next ? '<button class="btn btn-primary" data-action="advance" data-id="'+escapeHtml(a.id)+'">'+escapeHtml(next[1])+'</button>' : '') +
    (!terminal ? '<button class="btn btn-danger" data-action="failure" data-id="'+escapeHtml(a.id)+'">Registrar não realização</button>' : '') :
    '<div class="note">O avanço do fluxo de execução é permitido apenas pelo portal do coletor nesta demonstração.</div>') +
    '</div></section>' +
    '<section class="panel"><div class="panel-head"><h2>Histórico de endereços</h2><span>'+a.addressHistory.length+' correção(ões)</span></div>' +
    (a.addressHistory.length ? '<div class="timeline">' + a.addressHistory.map(h=>'<div class="timeline-item"><strong>Versão '+h.from+' → '+h.to+'</strong><small>'+escapeHtml(h.when)+' · '+escapeHtml(h.actor)+'</small><small>Antes: '+escapeHtml(addressText(h.old))+'</small><small>Depois: '+escapeHtml(addressText(h.next))+'</small><small>Motivo: '+escapeHtml(h.reason)+'</small></div>').join('')+'</div>' :
     '<div class="panel-body"><p class="note">Nenhuma correção registrada. O endereço original permanece na versão 1.</p></div>') +
    '</section></div></div>';
}
const VIEWS = {
  dashboard: { label: 'Visão geral', icon: '▦', render: renderDashboard },
  appointments: { label: 'Agendamentos', icon: '▤', render: renderAppointments },
  collectors: { label: 'Coletores', icon: '♧', render: renderCollectors },
  reports: { label: 'Relatórios', icon: '▥', render: renderReports },
  'my-collections': { label: 'Minhas coletas', icon: '▤', render: renderCollectorHome },
};
function renderNav() {
  const pages = state.role === 'collector' ? ['my-collections'] : ['dashboard','appointments','collectors','reports'];
  nav.innerHTML = pages.map(v=>'<button type="button" data-action="nav" data-view="'+v+'" class="'+(state.view===v?'active':'')+'" '+(state.view===v?'aria-current="page"':'')+'><span class="nav-icon" aria-hidden="true">'+VIEWS[v].icon+'</span>'+VIEWS[v].label+'</button>').join('');
}
function renderView() { return state.view === 'detail' ? renderDetails() : (VIEWS[state.view]?.render() || renderDashboard()); }
function render() {
  if (state.role === 'collector' && !['my-collections','detail'].includes(state.view)) state.view='my-collections';
  if (state.role !== 'collector' && state.view === 'my-collections') state.view='dashboard';
  breadcrumb.textContent = state.view === 'detail' ? 'Detalhes da coleta' : (VIEWS[state.view]?.label || 'Visão geral');
  document.getElementById('role-label').textContent = rolePicker.selectedOptions[0].text;
  renderNav();
  main.innerHTML = renderView();
  filterVisibleRows();
}
function filterVisibleRows() {
  let shown=0;
  document.querySelectorAll('[data-appointment-row]').forEach(tr=>{
    const visible=tr.dataset.search.includes(state.query.trim().toLowerCase());
    tr.hidden=!visible;
    if(visible) shown++;
  });
  const rows=document.getElementById('appointment-rows');
  if(rows){
    let noResults=document.getElementById('no-search-results');
    if(!shown && rows.querySelectorAll('[data-appointment-row]').length) {
      if(!noResults){ noResults=document.createElement('tr');noResults.id='no-search-results';noResults.innerHTML='<td colspan="7"><div class="empty">Nenhum agendamento corresponde à busca.</div></td>';rows.append(noResults);}
      noResults.hidden=false;
    } else if(noResults) noResults.hidden=true;
  }
}
function openDetails(id) {
  const a=getAppointment(id);
  if(!a||!allowedAppointment(a)){showToast('Esta coleta não está disponível para este perfil.');return;}
  if(state.view!=='detail')state.previousView=state.view;
  state.selectedId=id;state.view='detail';render();window.scrollTo({top:0,behavior:'instant'});
}
function openAddress(id) {
  const a=getAppointment(id);
  if(!a||!allowedAppointment(a)){showToast('Acesso não autorizado nesta simulação.');return;}
  if(['REALIZADA','NAO_REALIZADA','CANCELADA'].includes(a.status)){showToast('Coletas encerradas não podem ser editadas.');return;}
  const form=document.getElementById('address-form');
  form.reset(); form.elements.appointmentId.value=a.id;
  form.dataset.addressVersion=String(a.version);
  ['street','number','neighborhood','city','uf','reference'].forEach(k=>form.elements[k].value=a.address[k] || '');
  document.getElementById('old-address').textContent='Endereço atual (versão '+a.version+'): '+addressText(a.address);
  addressDialog.showModal();
}
function advance(id) {
  const a=getAppointment(id);
  if(state.role!=='collector'||!a||a.collector!=='col1') return;
  const next=NEXT_STATUS[a.status];
  if(!next)return;
  a.status=next[0];
  addEvent(a,'Etapa atualizada','Novo status: '+STATUSES[a.status]);
  render();showToast('Status atualizado apenas nesta demonstração.');
}
function failure(id) {
  const a=getAppointment(id);
  if(state.role!=='collector'||!a||a.collector!=='col1'||!NEXT_STATUS[a.status])return;
  const reason=window.prompt('Informe o motivo operacional da não realização (obrigatório):');
  if(reason===null) return;
  if(!reason.trim()){showToast('É necessário informar o motivo.');return;}
  a.status='NAO_REALIZADA';
  addEvent(a,'Coleta não realizada','Motivo: '+reason.trim().slice(0,220));
  render();showToast('Ocorrência registrada na simulação.');
}
async function copyConfirmation(id) {
  const a=getAppointment(id);if(!a||!allowedAppointment(a))return;
  const value='Olá! Seu agendamento de coleta domiciliar foi registrado para '+formattedDate(a.date)+' às '+a.time+'. Protocolo: '+a.id+'. Para confirmar ou alterar, converse com nosso atendimento.';
  try{await navigator.clipboard.writeText(value);showToast('Mensagem copiada. O envio pelo WhatsApp é manual.');}
  catch{showToast('Não foi possível copiar. Verifique a permissão de área de transferência.');}
}
main.addEventListener('click', e=>{
  const button=e.target.closest('[data-action]');if(!button)return;
  const { action, id, view, tab }=button.dataset;
  if(action==='nav'){state.view=view;render();closeMenu();}
  if(action==='new'){document.getElementById('appointment-form').reset();apptDialog.showModal();}
  if(action==='details')openDetails(id);
  if(action==='back'){state.view=state.previousView;state.selectedId=null;render();}
  if(action==='address')openAddress(id);
  if(action==='advance')advance(id);
  if(action==='failure')failure(id);
  if(action==='copy-confirmation')copyConfirmation(id);
  if(action==='collector-tab'){state.collectorTab=tab;render();}
  if(action==='filter-collector'){state.filterCollector=id;state.view='appointments';render();}
});
main.addEventListener('input',e=>{
  if(e.target.dataset.filter==='query'){state.query=e.target.value;filterVisibleRows();}
});
main.addEventListener('change',e=>{
  const key=e.target.dataset.filter;
  if(key==='team')state.filterTeam=e.target.value;
  if(key==='status')state.filterStatus=e.target.value;
  if(key==='collector')state.filterCollector=e.target.value;
  if(key)render();
});
document.querySelectorAll('[data-action="close-appointment"]').forEach(b=>b.addEventListener('click',()=>apptDialog.close()));
document.querySelectorAll('[data-action="close-address"]').forEach(b=>b.addEventListener('click',()=>addressDialog.close()));
document.getElementById('appointment-form').addEventListener('submit',e=>{
  e.preventDefault();
  const f=e.currentTarget;
  if(!f.checkValidity()){f.reportValidity();return;}
  const data=Object.fromEntries(new FormData(f).entries());
  const patient=String(data.patient||'').trim(),street=String(data.street||'').trim(),city=String(data.city||'').trim(),uf=String(data.uf||'').trim().toUpperCase();
  if(!patient||!street||!city||!/^([A-Z]{2})$/.test(uf)){showToast('Confira os campos obrigatórios e a UF.');return;}
  if(!String(data.phone||'').trim()){showToast('Informe um telefone para contato.');return;}
  const id='COL-'+String(state.nextId++).padStart(3,'0');
  const a={id,patient:patient.slice(0,140),phone:String(data.phone).trim(),team:data.team,date:data.date,time:data.time,
    collector:data.collector,createdBy:'Atendente (demo)',status:'AGENDADA',
    address:originalAddress(street,String(data.number||'').trim(),String(data.neighborhood||'').trim(),city,uf,String(data.reference||'').trim()),
    version:1,events:[],addressHistory:[]};
  addEvent(a,'Agendamento registrado','Coleta atribuída a '+getCollector(a.collector));
  state.appointments.unshift(a);
  apptDialog.close();state.view='appointments';state.filterTeam='all';state.filterStatus='all';state.filterCollector='all';state.query='';
  render();showToast('Agendamento fictício '+id+' adicionado à simulação.');
});
document.getElementById('address-form').addEventListener('submit',e=>{
  e.preventDefault();
  const f=e.currentTarget;
  if(!f.checkValidity()){f.reportValidity();return;}
  const d=Object.fromEntries(new FormData(f).entries());
  const a=getAppointment(d.appointmentId);
  if(!a||!allowedAppointment(a)){showToast('Coleta não disponível.');return;}
  if(String(a.version)!==f.dataset.addressVersion){showToast('O endereço foi alterado. Reabra para revisar.');return;}
  if(['REALIZADA','NAO_REALIZADA','CANCELADA'].includes(a.status)){showToast('Coleta já encerrada.');return;}
  const next={};
  ['street','number','neighborhood','city','uf','reference'].forEach(k=>next[k]=String(d[k]||'').trim());
  next.uf=next.uf.toUpperCase();
  if(!next.street||!next.city||!/^([A-Z]{2})$/.test(next.uf)){showToast('Preencha logradouro, cidade e UF.');return;}
  const changed=Object.keys(next).filter(k=>next[k]!==a.address[k]);
  if(!changed.length){showToast('Nenhuma alteração identificada no endereço.');return;}
  if(!String(d.reason||'').trim()){showToast('Informe o motivo da correção.');return;}
  const old={...a.address};const from=a.version;
  a.address={...next};a.version++;
  const actor=state.role==='collector'?'Coletor 01 (demo)':'Atendimento (demo)';
  a.addressHistory.unshift({from,to:a.version,old,next:{...next},changed,reason:d.reason,actor,when:eventNow()});
  addEvent(a,'Endereço corrigido',changed.join(', ')+' · Motivo: '+d.reason);
  addressDialog.close();render();showToast('Endereço corrigido na simulação. Histórico preservado.');
});
rolePicker.addEventListener('change',e=>{
  state.role=e.target.value;state.view=state.role==='collector'?'my-collections':'dashboard';state.selectedId=null;
  render();closeMenu();showToast('Perfil alterado somente para testar a interface.');
});
document.getElementById('menu-toggle').addEventListener('click',()=>{
  const side=document.getElementById('sidebar');const open=!side.classList.contains('open');side.classList.toggle('open',open);
  document.getElementById('mobile-backdrop').hidden=!open;
  document.getElementById('menu-toggle').setAttribute('aria-expanded',String(open));
});
document.getElementById('mobile-backdrop').addEventListener('click',closeMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
render();
