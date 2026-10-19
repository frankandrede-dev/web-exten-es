/* ColetaFlow authenticated pilot. No patient data in storage or console.
 * Requires Supabase accounts explicitly provisioned and authorized by administrator.
 * NEVER put a secret/service_role key in the browser.
 */
'use strict';
const BASE='https://wezwsnwndazsxtrklgxg.supabase.co';
const PUBLISHABLE_KEY="sb_publishable_GG1rZ614vsy_yLhL0xOAxQ_A2_AFmSj";
const STATUSES={
  AGENDADA:'Agendada',CIENTE:'Ciente',EM_DESLOCAMENTO:'Em deslocamento',
  NO_LOCAL:'No local',EM_COLETA:'Em coleta',REALIZADA:'Realizada',
  NAO_REALIZADA:'Não realizada',CANCELADA:'Cancelada'
};
const STEPS={
  AGENDADA:['CIENTE','Confirmar ciência'],
  CIENTE:['EM_DESLOCAMENTO','Iniciar deslocamento'],
  EM_DESLOCAMENTO:['NO_LOCAL','Registrar chegada'],
  NO_LOCAL:['EM_COLETA','Iniciar coleta'],
  EM_COLETA:['REALIZADA','Finalizar coleta'],
};
const state={session:null,profile:null,teams:[],collectors:[],patients:[],appointments:[],busy:false,invitation:false};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal=v=>String(v??'').trim();
function notify(message,error=false){
  $('notice').textContent=message;
  $('notice').className=error?'error':'success';
}
function messageForError(e){
  if(e?.status===401) return 'Sessão expirada. Faça login novamente.';
  if(e?.code==='42501'||e?.status===403) return 'Acesso não autorizado para esta operação.';
  if(e?.code==='40001') return 'O registro foi alterado por outro usuário. Atualize e tente novamente.';
  if(e?.code==='23505') return 'Este pedido já foi registrado. Atualize a lista.';
  if(e?.status===400) return 'Os dados não foram aceitos. Confira os campos e tente novamente.';
  return 'Não foi possível concluir. Verifique a conexão e tente novamente.';
}
function setBusy(value){state.busy=value;document.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=value)}
async function parseResponse(res){
  let body=null;
  try{body=await res.json()}catch{}
  if(!res.ok){const err=new Error('Request failed');err.status=res.status;err.code=body?.code;throw err}
  return body;
}
async function authRequest(path,payload,token=null){
  const headers={'apikey':PUBLISHABLE_KEY,'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  return parseResponse(await fetch(BASE+path,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store'}));
}
function adoptSession(data){
  if(!data?.access_token||!data?.refresh_token||!data?.user?.id) throw new Error('Invalid session');
  state.session={access:data.access_token,refresh:data.refresh_token,userId:data.user.id,
                 expires:Date.now()+(Number(data.expires_in||3600)-60)*1000};
}
async function accessToken(){
  if(!state.session)throw Object.assign(new Error('No session'),{status:401});
  if(state.session.expires>Date.now())return state.session.access;
  const refreshed=await authRequest('/auth/v1/token?grant_type=refresh_token',
                                    {refresh_token:state.session.refresh});
  adoptSession(refreshed);
  return state.session.access;
}
async function dbRequest(path,body=undefined){
  let token=await accessToken();
  const headers={'apikey':PUBLISHABLE_KEY,'Authorization':'Bearer '+token};
  if(body!==undefined){headers['Content-Type']='application/json';headers['Prefer']='return=representation'}
  let response=await fetch(BASE+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',
                headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  if(response.status===401){
    state.session.expires=0;
    token=await accessToken();
    headers.Authorization='Bearer '+token;
    response=await fetch(BASE+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',
                headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  }
  return parseResponse(response);
}
async function rpc(name,payload){return dbRequest('rpc/'+name,payload)}
async function readProfile(){
  const rows=await dbRequest('profiles?select=user_id,full_name,role,active&user_id=eq.'+encodeURIComponent(state.session.userId)+'&limit=1');
  const p=rows?.[0];
  if(!p||!p.active||!['ADMIN','SUPERVISOR','ATTENDANT','COLLECTOR'].includes(p.role)){
    throw Object.assign(new Error('No authorized profile'),{status:403});
  }
  return p;
}
async function loadData(){
  if(!state.session||!state.profile)return;
  const [teams,collectors,patients,appointments]=await Promise.all([
    dbRequest('teams?select=id,code,name&order=code'),
    dbRequest('collectors?select=id,user_id,display_name,active&active=eq.true&order=display_name'),
    dbRequest('patients?select=id,full_name,phone'),
    dbRequest('appointments?select=id,team_id,patient_id,collector_id,created_by,scheduled_at,status,address_street,address_number,address_neighborhood,address_city,address_uf,address_reference,address_postal_code,address_complement,address_no_number,address_rural,address_rural_road,address_rural_km,address_version&order=scheduled_at.asc&limit=200')
  ]);
  state.teams=teams;state.collectors=collectors;state.patients=patients;state.appointments=appointments;
  render();
}
function hasBookingPermission(){return ['ATTENDANT','SUPERVISOR','ADMIN'].includes(state.profile?.role)}
function namePatient(id){return state.patients.find(p=>p.id===id)}
function collectorById(id){return state.collectors.find(p=>p.id===id)}
function address(a){
  return [a.address_street,a.address_number,a.address_neighborhood,a.address_city,
    a.address_uf,a.address_reference].filter(Boolean).join(' · ');
}
function dateLabel(iso){
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',
           timeZone:'America/Sao_Paulo'}).format(new Date(iso));
}
function buildCard(a){
  const patient=namePatient(a.patient_id),collector=collectorById(a.collector_id);
  const assigned=collector?.user_id===state.profile.user_id;
  const active=!['REALIZADA','CANCELADA','NAO_REALIZADA'].includes(a.status);
  const step=STEPS[a.status];
  const canChange=assigned&&state.profile.role==='COLLECTOR';
  const canCorrect=active&&(canChange||hasBookingPermission());
  const canCancel=active&&hasBookingPermission();
  const btn=(action,text,destructive=false)=>'<button type="button" class="inline-button'+(destructive?' destructive':'')+'" data-action="'+action+'" data-id="'+esc(a.id)+'">'+esc(text)+'</button>';
  return '<article class="list-item"><div class="item-head"><div><h3>'+esc(patient?.full_name||'Paciente')+'</h3><span class="item-sub">'+esc(dateLabel(a.scheduled_at))+'</span></div><span class="chip '+esc(a.status)+'">'+esc(STATUSES[a.status]||a.status)+'</span></div>'+
  '<div class="item-grid"><div class="item-data"><small>Endereço</small>'+esc(address(a))+'</div>'+
  '<div class="item-data"><small>Responsável</small>'+esc(collector?.display_name||'Coletor')+
  '<div><small>Contato</small>'+esc(patient?.phone||'—')+'</div></div></div>'+
  '<div class="item-actions">'+btn('history','Ver histórico')+(canCorrect?btn('address','Corrigir endereço'):'')+
  (canChange&&step?btn('advance',step[1]):'')+
  (canChange&&active?btn('failure','Não realizada',true):'')+
  (canCancel?btn('cancel','Cancelar',true):'')+'</div></article>';
}
function render(){
  const profile=state.profile;
  $('login-screen').hidden=!!profile||state.invitation;
  $('invite-screen').hidden=!state.invitation;
  $('workspace').hidden=!profile;
  $('logout').hidden=!profile;
  if(!profile)return;
  $('current-user').textContent=profile.full_name+' · '+({'COLLECTOR':'Coletor','ATTENDANT':'Atendente','SUPERVISOR':'Supervisor','ADMIN':'Admin'}[profile.role]);
  $('booking-panel').hidden=!hasBookingPermission();
  $('page-heading').textContent=profile.role==='COLLECTOR'?'Minhas coletas':'Agendamentos';
  $('page-description').textContent=profile.role==='COLLECTOR'
      ?'Somente agendamentos atribuídos ao seu usuário.'
      :'Agendamentos autorizados das suas equipes.';
  const all=state.appointments;
  $('metrics').innerHTML=[
    ['Agendamentos',all.length],
    ['Em aberto',all.filter(a=>!['REALIZADA','NAO_REALIZADA','CANCELADA'].includes(a.status)).length],
    ['Realizadas',all.filter(a=>a.status==='REALIZADA').length]
  ].map(([l,v])=>'<div class="metric"><strong>'+v+'</strong><small>'+esc(l)+'</small></div>').join('');
  $('appointment-count').textContent=all.length+' registro(s) carregado(s)';
  $('appointments').innerHTML=all.length?all.map(buildCard).join(''):
    '<div class="empty">Nenhuma coleta cadastrada para este usuário.</div>';
  if(hasBookingPermission()){
    $('team-select').innerHTML='<option value="">Escolha a equipe</option>'+
       state.teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
    $('collector-select').innerHTML='<option value="">Escolha o profissional</option>'+
       state.collectors.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.display_name)+'</option>').join('');
  }
}
async function signIn(event){
  event.preventDefault();
  if(state.busy)return;
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  setBusy(true);notify('Validando credenciais...');
  try{
    const email=normal(form.elements.email.value),password=form.elements.password.value;
    const session=await authRequest('/auth/v1/token?grant_type=password',{email,password});
    adoptSession(session);
    state.profile=await readProfile();
    form.reset();
    await loadData();
    notify('Acesso autenticado. Os dados exibidos seguem as permissões do Supabase.');
  }catch(e){
    state.session=null;state.profile=null;render();
    notify(e.status===403?'Seu usuário ainda não foi autorizado pelo administrador.':
      e.status===400?'Credenciais inválidas ou conta não confirmada.':messageForError(e),true);
  }finally{setBusy(false)}
}
function prepareNewAppointment(form){
  const d=Object.fromEntries(new FormData(form).entries());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!/^\d{2}:\d{2}$/.test(d.time))throw new Error('Invalid date');
  const scheduled=new Date(d.date+'T'+d.time+':00-03:00');
  if(!Number.isFinite(scheduled.getTime()))throw new Error('Invalid date');
  const noNumber=/^(s\/?n|sem n[uú]mero)$/i.test(normal(d.number));
  return {
    p_request_id:crypto.randomUUID(),p_team_id:d.teamId,
    p_patient_name:normal(d.patientName),p_patient_phone:normal(d.patientPhone),
    p_collector_id:d.collectorId,p_scheduled_at:scheduled.toISOString(),
    p_address_street:normal(d.street),p_address_number:normal(d.number),
    p_address_neighborhood:normal(d.neighborhood),p_address_city:normal(d.city),
    p_address_uf:normal(d.uf).toUpperCase(),p_address_reference:normal(d.reference),
    p_address_no_number:noNumber,p_address_rural:false
  };
}
async function saveBooking(event){
  event.preventDefault();
  if(state.busy||!hasBookingPermission())return;
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  setBusy(true);
  try{
    const payload=prepareNewAppointment(form);
    await rpc('create_home_appointment',payload);
    form.reset();
    await loadData();
    notify('Agendamento salvo no Supabase.');
  }catch(e){notify(messageForError(e),true)}
  finally{setBusy(false)}
}
function openAddress(id){
  const appt=state.appointments.find(a=>a.id===id);
  if(!appt||['REALIZADA','CANCELADA','NAO_REALIZADA'].includes(appt.status))return;
  const collector=collectorById(appt.collector_id);
  if(!hasBookingPermission()&&!(state.profile.role==='COLLECTOR'&&collector?.user_id===state.profile.user_id))return;
  const form=$('address-form');form.reset();
  const fields={
    appointmentId:appt.id,expectedVersion:appt.address_version,
    street:appt.address_street||'',number:appt.address_number||'',
    neighborhood:appt.address_neighborhood||'',city:appt.address_city||'',
    uf:appt.address_uf||'',reference:appt.address_reference||''
  };
  for(const [key,val] of Object.entries(fields)) form.elements[key].value=val;
  $('address-dialog').showModal();
}
async function saveAddress(event){
  event.preventDefault();
  if(state.busy)return;
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const d=Object.fromEntries(new FormData(form).entries());
  const a=state.appointments.find(x=>x.id===d.appointmentId);
  if(!a)return;
  if(d.reason==='Outro motivo'&&normal(d.note).length<3){notify('Descreva o motivo da correção.',true);return}
  setBusy(true);
  try{
    await rpc('correct_home_collection_address',{
      p_appointment_id:a.id,p_expected_address_version:Number(d.expectedVersion),
      p_reason:d.reason,p_note:normal(d.note)||null,
      p_street:normal(d.street),p_number:normal(d.number),p_neighborhood:normal(d.neighborhood),
      p_city:normal(d.city),p_uf:normal(d.uf).toUpperCase(),
      p_reference:normal(d.reference),
      p_postal_code:a.address_postal_code,p_complement:a.address_complement,
      p_no_number:/^(s\/?n|sem n[uú]mero)$/i.test(normal(d.number)),
      p_rural:a.address_rural,p_rural_road:a.address_rural_road,p_rural_km:a.address_rural_km
    });
    $('address-dialog').close();await loadData();notify('Endereço corrigido. A versão anterior foi preservada no histórico.');
  }catch(e){notify(messageForError(e),true)}
  finally{setBusy(false)}
}
async function perform(id,action){
  if(state.busy)return;
  const a=state.appointments.find(x=>x.id===id);
  if(!a)return;
  const collector=collectorById(a.collector_id);
  const myCollection=state.profile.role==='COLLECTOR'&&collector?.user_id===state.profile.user_id;
  const active=!['CANCELADA','REALIZADA','NAO_REALIZADA'].includes(a.status);
  if(action==='history'){await showHistory(id);return;}
  if(action==='address'){openAddress(id);return;}
  if(!active)return;
  let rpcName,payload;
  if(action==='advance'&&myCollection&&STEPS[a.status]){
    const [next,title]=STEPS[a.status];
    if(!window.confirm(title+'?'))return;
    rpcName='advance_collection_status';
    payload={p_appointment_id:id,p_next_status:next};
  }else if(action==='failure'&&myCollection){
    const reason=window.prompt('Motivo da não realização (obrigatório):');
    if(reason===null)return;
    if(normal(reason).length<3){notify('Informe pelo menos 3 caracteres.',true);return;}
    rpcName='advance_collection_status';
    payload={p_appointment_id:id,p_next_status:'NAO_REALIZADA',p_failure_reason:normal(reason)};
  }else if(action==='cancel'&&hasBookingPermission()){
    const reason=window.prompt('Motivo do cancelamento (obrigatório):');
    if(reason===null)return;
    if(normal(reason).length<3){notify('Informe pelo menos 3 caracteres.',true);return;}
    rpcName='cancel_home_appointment';
    payload={p_appointment_id:id,p_reason:normal(reason)};
  }else return;
  setBusy(true);
  try{
    await rpc(rpcName,payload);await loadData();notify('Operação registrada no Supabase.');
  }catch(e){notify(messageForError(e),true)}
  finally{setBusy(false)}
}
async function showHistory(id){
  const a=state.appointments.find(x=>x.id===id);
  if(!a)return;
  const records=$('history-records');
  records.textContent='Carregando histórico...';
  $('history-dialog').showModal();
  try{
    const [versions,events]=await Promise.all([
      dbRequest('appointment_address_history?select=version_from,version_to,reason,changed_at,old_address,new_address&appointment_id=eq.'+encodeURIComponent(id)+'&order=changed_at.desc&limit=100'),
      dbRequest('appointment_events?select=event_type,reason,occurred_at&appointment_id=eq.'+encodeURIComponent(id)+'&order=occurred_at.desc&limit=100')
    ]);
    const fmt=iso=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(iso));
    const asAddress=src=>[src?.street,src?.number,src?.neighborhood,src?.city,src?.uf,src?.reference].filter(Boolean).join(' · ');
    const versionsHtml=versions.map(h=>
      '<article class="history-entry"><strong>Endereço versão '+esc(h.version_from)+' → '+esc(h.version_to)+'</strong>'+
      '<small>'+esc(fmt(h.changed_at))+' · '+esc(h.reason)+'</small>'+
      '<div><b>Antes:</b> '+esc(asAddress(h.old_address))+'</div>'+
      '<div><b>Depois:</b> '+esc(asAddress(h.new_address))+'</div></article>'
    ).join('');
    const eventsHtml=events.map(e=>
      '<article class="history-entry"><strong>'+esc(e.event_type)+'</strong>'+
      '<small>'+esc(fmt(e.occurred_at))+'</small>'+
      (e.reason?'<div>Motivo: '+esc(e.reason)+'</div>':'')+'</article>'
    ).join('');
    records.innerHTML='<h3>Correções de endereço</h3>'+(versionsHtml||'<p>Nenhuma correção registrada.</p>')+
      '<h3>Eventos operacionais</h3>'+(eventsHtml||'<p>Nenhum evento registrado.</p>');
  }catch(e){records.textContent=messageForError(e)}
}
$('close-history').addEventListener('click',()=>$('history-dialog').close());
async function acceptInvitationFromUrl(){
  // Supabase invitation links use fragment credentials. Remove them from the URL
  // before any API call or rendering. Never log, persist, or expose these tokens.
  const raw=window.location.hash;
  if(!raw)return;
  const fragment=new URLSearchParams(raw.slice(1));
  const kind=fragment.get('type');
  if(kind!=='invite')return;
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  const access=fragment.get('access_token'),refresh=fragment.get('refresh_token');
  if(!access||!refresh){notify('Convite inválido ou expirado. Solicite outro convite.',true);return;}
  try{
    const response=await fetch(BASE+'/auth/v1/user',{
      headers:{'apikey':PUBLISHABLE_KEY,'Authorization':'Bearer '+access},cache:'no-store'
    });
    const user=await parseResponse(response);
    adoptSession({access_token:access,refresh_token:refresh,
      expires_in:Number(fragment.get('expires_in')||3600),user});
    state.invitation=true;
    render();notify('Convite validado. Defina sua senha de acesso.');
  }catch(e){
    state.session=null;state.invitation=false;render();
    notify('Não foi possível validar o convite. Solicite outro convite.',true);
  }
}
$('invite-password-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(state.busy||!state.invitation||!state.session)return;
  const form=event.currentTarget;
  const password=form.elements.password.value;
  if(password.length<12||password!==form.elements.confirmation.value){
    notify('Use ao menos 12 caracteres e confirme a mesma senha.',true);return;
  }
  setBusy(true);
  try{
    const token=await accessToken();
    await parseResponse(await fetch(BASE+'/auth/v1/user',{
      method:'PUT',
      headers:{'apikey':PUBLISHABLE_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({password}),cache:'no-store'
    }));
    form.reset();
    state.invitation=false;state.session=null;state.profile=null;
    render();
    notify('Senha definida. Aguarde a ativação do seu perfil pelo administrador antes de fazer login.');
  }catch(e){notify(messageForError(e),true)}
  finally{setBusy(false)}
});
$('login-form').addEventListener('submit',signIn);
$('booking-form').addEventListener('submit',saveBooking);
$('address-form').addEventListener('submit',saveAddress);
$('cancel-address').addEventListener('click',()=>$('address-dialog').close());
$('appointments').addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(b)perform(b.dataset.id,b.dataset.action);
});
$('refresh').addEventListener('click',async()=>{
  try{await loadData();notify('Agenda atualizada.')}catch(e){notify(messageForError(e),true)}
});
$('logout').addEventListener('click',async()=>{
  const token=state.session?.access;
  state.session=null;state.profile=null;
  state.teams=[];state.collectors=[];state.patients=[];state.appointments=[];
  render();notify('Sessão encerrada neste navegador.');
  if(token)try{await authRequest('/auth/v1/logout',{},token)}catch{}
});
render();
acceptInvitationFromUrl();
