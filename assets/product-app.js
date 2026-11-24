(()=>{'use strict';
const R=window.WanshiliRules;
const $=id=>document.getElementById(id),KEY='wanshili-product-demo-v1',DAY=86400000;
const paths={calendar:'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM3 9h18M8 2v5M16 2v5',plus:'M12 5v14M5 12h14',chart:'M5 20V11M12 20V4M19 20V8',user:'M20 21v-3a8 8 0 0 0-16 0v3M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',leaf:'M20 3C10 2 3 7 5 16c8 6 16-1 15-13ZM5 20 16 8',layers:'m12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',book:'M3 4c4-2 7-1 9 1 2-2 5-3 9-1v15c-4-2-7-1-9 1-2-2-5-3-9-1ZM12 5v15',gift:'M3 8h18v4H3ZM5 12v9h14v-9M12 8v13M12 8C3 8 6 0 10 4ZM12 8c9 0 6-8 2-4Z',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',edit:'m4 16 12-12 4 4L8 20H4v-4ZM13 7l4 4',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'};
const icon=(name)=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.calendar)+'"/></svg>';
paths.sparkle='m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z';
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const date=s=>{const [y,m,d]=s.split('-').map(Number);const result=new Date(0);result.setFullYear(y,m-1,d);result.setHours(12,0,0,0);return result};
let today=iso(new Date());const weekday=s=>(date(s).getDay()+6)%7+1,types={up:'正计时',down:'倒数日',birthday:'生日',normal:'普通日程'},typeIcon={up:'book',down:'calendar',birthday:'gift',normal:'calendar'};
const fmt=s=>{const d=date(s);return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'};
const typeHints={up:'开始当天第1天，按选中日期累计自然日',down:'仅到期日标记在月历，天数跟随选中日期',birthday:'每年纪念这一天',normal:'只在计划发生的日期显示，可设为循环日程'};
const uid=()=>globalThis.crypto?.randomUUID?.()||'e-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let page='calendar',selected=today,view=date(today),draft=null,original='',editingId=null,activeEvent=null,saving=false,lastFocus=null,storageIssue='';
let statsPeriod='month',statsMode='category',customRange=null,statsDetail=null;
let app={schemaVersion:2,events:[],records:{},settings:{aiEnabled:false},sampleData:true};
function seed(){const birthday=today,exam=new Date(date(today).getTime()+28*DAY),start=new Date(date(today).getTime()-10*DAY);return {schemaVersion:2,events:[{id:'sample-reading',title:'相识纪念日',type:'up',date:iso(start),calendarType:'solar',recurrence:{frequency:'none',weekdays:[]},endCondition:null,aiIncluded:false,note:'从这一天开始，记住一起走过的日子。',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:'sample-exam',title:'考试',type:'down',date:iso(exam),calendarType:'solar',recurrence:{frequency:'once',weekdays:[]},endCondition:null,aiIncluded:false,note:'记住这一个重要日期。',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:'sample-birthday',title:'小林生日',type:'birthday',date:birthday,calendarType:'solar',recurrence:{frequency:'yearly',weekdays:[]},endCondition:null,aiIncluded:false,note:'给重要的人留一句祝福。',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}],records:{},settings:{aiEnabled:false},sampleData:true}}
try{const raw=localStorage.getItem(KEY);if(raw){const data=JSON.parse(raw);if(data.schemaVersion!==2){app=seed();localStorage.setItem(KEY,JSON.stringify(app))}else{if(!Array.isArray(data.events)||!data.events.every(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&types[e.type]&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&e.recurrence)||!data.settings)throw Error('数据格式无法读取');app=data}}else{app=seed();localStorage.setItem(KEY,JSON.stringify(app))}}catch(e){storageIssue='本地数据暂时无法读取或保存，原数据已保留。';app={...app,sampleData:false}}
function transaction(change){const latest=localStorage.getItem(KEY);const base=latest?JSON.parse(latest):app;const next=JSON.parse(JSON.stringify(base));change(next);if(storageIssue)throw Error(storageIssue);localStorage.setItem(KEY,JSON.stringify(next));app=next}
function notify(message){$('app-toast').textContent=message;$('app-toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('app-toast').hidden=true,5000)}
function rangeMonth(v){const y=v.getFullYear(),m=v.getMonth();return Array.from({length:new Date(y,m+1,0).getDate()},(_,i)=>iso(new Date(y,m,i+1,12)))}
function occurrence(e,day){return R.occurrence(e,day)}
const occurrences=day=>app.events.map(e=>R.shown(e,day)).filter(Boolean);
const recordKey=(id,day)=>id+'|'+day;
function summary(v){return R.summary(app.events,rangeMonth(v),today)}
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon))}
function nav(){document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false')});$('page-title').textContent={calendar:'日历',stats:'统计',settings:'我的'}[page];$('page-kicker').textContent={calendar:'YOUR EVERYDAY',stats:'ACTIVITY',settings:'YOUR SPACE'}[page];$('page-description').textContent={calendar:'日常的小事，值得被记住。',stats:'查看指定日期范围内的日程天数。',settings:'管理你的记录与分析偏好。'}[page];$('storage-status').textContent=storageIssue?'本地保存不可用':'本地自动保存';$('header-add').hidden=page!=='calendar'}
function monthControls(){return '<div class="month-actions"><button class="today-button" data-action="today">今天</button><button class="icon-button" data-action="previous" aria-label="上个月">'+icon('left')+'</button><button class="icon-button" data-action="next" aria-label="下个月">'+icon('right')+'</button></div>'}
function empty(){return '<div class="empty-state"><div class="empty-art"><svg viewBox="0 0 140 100"><path d="M35 25q0-8 8-8h55q8 0 8 8v48q0 8-8 8H43q-8 0-8-8ZM35 34h71M48 10v15M93 10v15M82 79c19-16 27 12 50-2"/><path d="M12 60h12" stroke="#c8a0ad"/><circle cx="132" cy="77" r="2.5" fill="#b3bc95" stroke="none"/></svg></div><h3>这一天还没有事项</h3><p>从一件小事开始记录</p></div>'}
function calendar(){const y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1,12),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset,12),slots=Math.ceil((offset+new Date(y,m+1,0).getDate())/7)*7;let cells='';for(let i=0;i<slots;i++){const d=new Date(start.getTime()+i*DAY),key=iso(d),items=app.events.map(e=>R.marked(e,key)).filter(Boolean);cells+='<button class="day-cell '+(d.getMonth()!==m?'other-month ':'')+(key===today?'is-today ':'')+(key===selected?'is-selected':'')+'" data-date="'+key+'" aria-label="'+fmt(key)+'，'+items.length+'项" aria-pressed="'+(key===selected)+'"><span class="day-number">'+d.getDate()+'</span><span class="day-events">'+items.slice(0,2).map(e=>'<span class="day-tag '+e.type+'">'+esc(e.title)+'</span>').join('')+(items.length>2?'<span class="day-tag">+'+(items.length-2)+'</span>':'')+'</span></button>'}
 const list=occurrences(selected),d=date(selected);$('page-content').innerHTML='<div class="calendar-layout"><div><section class="calendar-panel" aria-label="月历"><div class="calendar-toolbar"><div class="month-heading"><h2>'+y+'年'+(m+1)+'月</h2><p>MONTHLY CALENDAR</p></div>'+monthControls()+'</div><div class="weekday-grid">'+['一','二','三','四','五','六','日'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="month-grid">'+cells+'</div><div class="calendar-legend"><span><i class="legend-line"></i>正计时</span><span><i class="legend-line down"></i>倒数日</span><span><i class="legend-line birthday"></i>生日</span><span><i class="legend-line normal"></i>普通日程</span></div></section><p class="demo-note">'+(app.sampleData?'当前含示例事项，可自由新增或修改。':'')+'日历标记计划日和正计时起止日。下方天数跟随选中日期。</p></div><section class="day-panel" aria-label="当天事项"><header class="day-panel-header"><div><h2>'+(d.getMonth()+1)+'月'+d.getDate()+'日</h2><small>周'+['一','二','三','四','五','六','日'][weekday(selected)-1]+(selected===today?' · 今天':'')+'</small></div><span class="day-count">共'+list.length+'项</span></header><div class="event-list">'+(list.length?list.map(e=>{const status=selected<today&&R.occurrence(app.events.find(x=>x.id===e.id),selected)?'occurred':'';return '<button class="event-row" data-event="'+esc(e.id)+'"><span class="event-icon '+e.type+'">'+icon(typeIcon[e.type])+'</span><span class="event-row-main"><strong>'+esc(e.title)+'</strong><small>'+[types[e.type],R.label(e,selected,app.events.find(x=>x.id===e.id))].filter(Boolean).join(' · ')+'</small></span><span class="record-dot '+(status||'')+'" aria-label="'+({occurred:'已发生',not_occurred:'未发生'}[status]||'未到发生日')+'">'+(status==='occurred'?'✓':'')+'</span></button>'}).join(''):empty())+'</div><button class="primary day-add" data-action="create">'+icon('plus')+'添加事项</button></section></div>'}
function recurrenceLabel(e){const r=e.recurrence;if(e.type==='up')return '纪念日 · 按自然日累计';return {once:'仅一次',daily:'每天',weekly:'每周'+(r.weekdays||[]).map(n=>'一二三四五六日'[n-1]).join('、'),monthly:(r.monthDay||date(e.date).getDate())===31?'每月最后一天':'每月'+(r.monthDay||date(e.date).getDate())+'日',yearly:'每年'+((r.yearMonth??date(e.date).getMonth())+1)+'月'+(r.yearDay||date(e.date).getDate())+'日',workdays:'仅工作日',weekends:'仅周末'}[r.frequency]||'仅一次'}
const statTypes=['normal','down','up','birthday'];
const rangeLabels={week:'本周',month:'本月',custom:'指定日期范围'};
const modeLabels={category:'按类别',event:'按日程'};
const rangeText=({start,end})=>start===end?fmt(start):fmt(start)+' – '+fmt(end);
function statsButton(label,attribute,value,selected){
  return '<button type="button" '+attribute+'="'+value+'" aria-pressed="'+selected+'">'+label+'</button>';
}
function statsRow(label,detail,type,count,route){
  return '<button type="button" class="stats-result" '+route+'><span class="event-icon '+type+'">'+icon(typeIcon[type])+'</span><span class="stats-name"><strong>'+esc(label)+'</strong>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</span><b>'+count+' 天</b>'+icon('right')+'</button>';
}
function statEventRows(s,category){
  const rows=app.events.flatMap(event=>{
    const detail=s.details[event.id];
    const entry=category?detail?.types[category]?.last:detail?.last;
    if(!entry)return [];
    return [{id:event.id,event:entry.value,count:category?detail.types[category].days.size:s.byEvent[event.id].length}];
  });
  rows.sort((a,b)=>b.count-a.count||a.event.title.localeCompare(b.event.title,'zh-CN')||a.id.localeCompare(b.id));
  const seen=new Map();
  const labels=rows.map(({event})=>[types[event.type],fmt(event.date),recurrenceLabel(event)].join(' · '));
  const identities=rows.map(({event},index)=>event.title+'\u0000'+labels[index]);
  const occurrences=new Map();
  for(const key of identities)occurrences.set(key,(occurrences.get(key)||0)+1);
  return rows.map(({id,event,count},index)=>{
    const label=labels[index];
    const identity=identities[index];
    const ordinal=(seen.get(identity)||0)+1;
    seen.set(identity,ordinal);
    const description=label+(occurrences.get(identity)>1?' · 同名 '+ordinal:'');
    return statsRow(event.title,description,event.type,count,'data-stats-event="'+esc(id)+'"');
  }).join('');
}
function stats(){
  const chosen=R.statsRange(statsPeriod,today,customRange);
  const counted={start:chosen.start,end:chosen.end<today?chosen.end:R.addDays(today,-1)};
  const hasPast=counted.start<=counted.end;
  const days=hasPast?R.datesInRange(counted.start,counted.end):[];
  const s=R.summary(app.events,days,today);
  const category=statsDetail?.category;
  const id=statsDetail?.id;
  const entry=category?s.details[id]?.types[category]:s.details[id];
  let html='<div class="stats-layout">';
  if(statsDetail){
    const countedDays=id?(category?[...(entry?.days||[])].sort():s.byEvent[id]||[]):category?s.byType[category]:s.total;
    const title=entry?.last?.value.title||(category?types[category]:'计入的日期');
    const empty='<p class="stats-empty">该范围内没有已发生的日程。</p>';
    html+='<section class="stats-panel"><button type="button" class="text-button stats-back" data-action="stats-back">'+icon('left')+' 返回</button><h2 id="stats-detail-title" tabindex="-1">'+esc(title)+'</h2><p>'+rangeText(chosen)+' · '+countedDays.length+' 天</p>';
    if(category&&!id)html+=statEventRows(s,category)||empty;
    else html+=countedDays.length?'<h3>计入的日期</h3><div class="date-list">'+countedDays.map(day=>'<button type="button" data-summary-date="'+day+'">'+fmt(day)+'</button>').join('')+'</div>':empty;
    $('page-content').innerHTML=html+'</section></div>';
    return;
  }
  const categoryRows=statTypes.map(type=>statsRow(types[type],'',type,s.byType[type].length,'data-stats-category="'+type+'"')).join('');
  const rows=statsMode==='category'?categoryRows:statEventRows(s,null);
  html+='<section class="stats-range" aria-label="统计范围"><div class="stats-filters" role="group" aria-label="日期范围">'+Object.entries(rangeLabels).map(([value,label])=>statsButton(label,'data-stats-period',value,statsPeriod===value)).join('')+'</div><p class="stats-selected">'+rangeText(chosen)+'</p><p class="stats-counted">'+(hasPast?'计入范围 · '+rangeText(counted):'今天及未来还未计入')+'</p></section>';
  html+='<button class="stats-overview" data-action="stats-total"><span><strong>有日程的天数</strong><b>'+s.total.length+' <small>天</small></b></span><span class="stats-counted">同一天有多项日程只计 1 天</span></button>';
  html+='<section class="stats-panel"><div class="stats-filters" role="group" aria-label="统计方式">'+Object.entries(modeLabels).map(([value,label])=>statsButton(label,'data-stats-mode',value,statsMode===value)).join('')+'</div>'+(s.total.length?'':'<p class="stats-empty">'+(hasPast?'这段时间还没有已发生的日程。':'本范围暂计 0 天。')+'</p>')+rows+'</section>';
  html+=profileRow('sparkle','月度习惯回顾','查看自然月回顾示例','data-preview="habit"');
  $('page-content').innerHTML=html+'</div>';
}
function statsPicker(){
  const {start,end}=customRange||R.statsRange(statsPeriod,today,customRange);
  sub('指定日期范围','<form id="stats-range-form" novalidate><div class="stats-date-fields"><div><label for="stats-start">开始日期</label><input type="date" id="stats-start" min="0001-01-01" max="9999-12-31" value="'+start+'" aria-describedby="stats-range-error" required></div><div><label for="stats-end">结束日期</label><input type="date" id="stats-end" min="0001-01-01" max="9999-12-31" value="'+end+'" aria-describedby="stats-range-error" required></div></div><p>开始日和结束日都会计入范围。</p><p id="stats-range-error" class="save-error" role="alert" hidden></p><div class="sub-actions"><button type="button" data-action="close-sub">取消</button><button type="submit" class="primary">应用</button></div></form>');
}
function applyStatsRange(){
  const start=$('stats-start'),end=$('stats-end');
  const invalid=!R.validDay(start.value)?start:!R.validDay(end.value)||end.value<start.value?end:null;
  for(const field of [start,end])field.setAttribute('aria-invalid',String(field===invalid));
  if(invalid){
    const error=$('stats-range-error');
    error.textContent=invalid===end&&R.validDay(end.value)?'结束日期不能早于开始日期。':'请选择有效的'+(invalid===start?'开始':'结束')+'日期。';
    error.hidden=false;
    invalid.focus();
    return;
  }
  customRange={start:start.value,end:end.value};
  statsPeriod='custom';
  statsDetail=null;
  closeModal($('sub-dialog'));
  render();
  document.querySelector('[data-stats-period="custom"]').focus();
}
function profileRow(symbol,label,description,route){
  return '<button class="profile-row" type="button" '+route+'><span class="profile-icon">'+icon(symbol)+'</span><span><strong>'+label+'</strong><small>'+description+'</small></span>'+icon('right')+'</button>';
}
function profileSwitch(id,title,hint,enabled,disabled=false){
  return '<label class="profile-toggle"><span><strong>'+title+'</strong><small>'+hint+'</small></span><span class="switch"><input type="checkbox" id="'+id+'" aria-label="'+title+'" '+(enabled?'checked ':'')+(disabled?'disabled':'')+'><span></span></span></label>';
}
function settings(){
  const ai=app.settings.aiEnabled;
  $('page-content').innerHTML='<div class="profile-layout">'+
    profileRow('user',preview.signedIn?'演示账号':'登录或注册',preview.signedIn?'demo@example.com · 示例账号':'查看邮箱账号和同步流程示例','data-preview="login"')+
    profileRow('chart','统计','查看指定日期范围内的日程天数','data-page="stats"')+
    '<section class="settings-panel"><h2>AI 与提醒</h2>'+
    profileSwitch('global-ai','AI 习惯分析','保存全局分析偏好，日程可以独立选择',ai)+
    profileSwitch('month-reminder','月末回顾提醒',ai?'保存每月最后一天的提醒偏好':'开启 AI 习惯分析后可用',ai&&(app.settings.monthReminder??true),!ai)+
    '<div class="profile-preview">'+profileRow('sparkle','查看月末提醒示例','查看提醒和习惯总结的演示','data-preview="habit-reminder"')+'</div></section>'+
    '<section class="settings-panel"><h2>数据与帮助</h2>'+profileRow('user','云同步','查看同步成功、失败和编辑冲突示例','data-preview="sync"')+profileRow('leaf','隐私说明','查看浏览器本机数据说明','data-preview="privacy"')+
    '<p>本机日程保存在当前浏览器。恢复示例前会再次确认。</p>'+(storageIssue?'<p class="save-error">'+esc(storageIssue)+'</p>':'')+
    '<button class="settings-action" data-action="reset">恢复示例数据</button></section></div>';
}
function openCreation(){
  if($('day-dialog').open)$('day-dialog').close();
  sub('选择创建方式','<div class="creation-options">'+profileRow('plus','手动创建','填写表单并保存到本机','data-action="manual-create"')+
    profileRow('sparkle','AI 语音','查看中文语音录入示例','data-preview="voice"')+'</div>');
}
function handleStatsButton(node){
  const {statsPeriod:period,statsMode:mode,statsCategory:category,statsEvent:event,action}=node.dataset;
  if(period==='custom'){statsPicker();return true;}
  if(period){statsPeriod=period;statsDetail=null;}
  else if(mode){statsMode=mode;statsDetail=null;}
  else if(category)statsDetail={category};
  else if(event)statsDetail={id:event,category:statsDetail?.category};
  else if(action==='stats-total')statsDetail={};
  else if(action==='stats-back')statsDetail=statsDetail.id&&statsDetail.category?{category:statsDetail.category}:null;
  else return false;
  render();
  const selected=period?'[data-stats-period][aria-pressed=true]':mode?'[data-stats-mode][aria-pressed=true]':statsDetail?'#stats-detail-title':'[data-stats-mode][aria-pressed=true]';
  document.querySelector(selected)?.focus();
  return true;
}
function render(){nav();({calendar,stats,settings}[page])();icons()}
function openModal(dialog){if(!dialog.open){lastFocus=document.activeElement;dialog.showModal()}}
function closeModal(dialog){dialog.close();if(dialog.id==='event-dialog')releaseEditLock();lastFocus?.focus?.()}
function openEditor(id=null){if(id&&heldLock!==id){acquireEditLock(id,()=>openEditor(id));return;}$('day-dialog').close();editingId=id;const event=id?R.shown(app.events.find(e=>e.id===id),selected):null;draft=event?JSON.parse(JSON.stringify(event)):{id:uid(),title:'',type:'up',date:selected,calendarType:'solar',recurrence:{frequency:'none',weekdays:[]},endCondition:null,aiIncluded:false,note:''};original=JSON.stringify(draft);drawEditor();openModal($('event-dialog'))}
function drawEditor(error='',fieldError=false){const previousScroll=$('event-form')?.querySelector('.type-tabs').scrollLeft||0;const birthday=draft.type==='birthday',locked=!!editingId&&typeLocked(app.events.find(e=>e.id===editingId));$('event-dialog').innerHTML='<form id="event-form" data-theme="'+draft.type+'" novalidate><header class="dialog-header"><button type="button" class="icon-button text-button" data-action="cancel-editor" aria-label="返回">'+icon('left')+'</button><h2 id="event-dialog-title">'+(editingId?'编辑事项':'新建事项')+'</h2><button type="button" class="text-button" data-action="cancel-editor">取消</button></header><div class="form-body"><div class="type-tabs" role="group" aria-label="事项类型">'+Object.entries(types).map(([t,label])=>'<button type="button" class="'+(t===draft.type?'active ':'')+t+'" data-type="'+t+'" '+(locked&&t!==draft.type?'disabled title="开始日期已过，从第二天起不可更改类型"':'')+' aria-pressed="'+(t===draft.type)+'">'+label+'</button>').join('')+'</div>'+(locked?'<p class="demo-note">开始日期已过，从第二天起不可更改类型。</p>':'')+'<div class="form-field"><label for="event-name">名称</label><input id="event-name" name="title" placeholder="请输入事项名称" value="'+esc(draft.title)+'" aria-invalid="'+fieldError+'" '+(fieldError?'aria-describedby="name-error"':'')+'>'+(fieldError?'<span class="field-error" id="name-error">请填写事项名称</span>':'')+'</div>'+(birthday?'<div class="form-field"><label for="calendar-type">日期类型</label><select id="calendar-type" name="calendarType"><option value="solar" '+(draft.calendarType==='solar'?'selected':'')+'>公历</option><option value="lunar" '+(draft.calendarType==='lunar'?'selected':'')+'>农历（换算待接入）</option></select></div>':'')+'<div class="form-field"><span class="form-label">'+(birthday?'生日日期':draft.type==='down'?'目标日期':draft.type==='normal'?'日期':'开始日期')+'</span><button type="button" class="field-button" data-action="date-picker">'+esc(fmt(draft.date))+icon('right')+'</button></div>'+(draft.type!=='up'?'<div class="form-field"><span class="form-label">循环</span><button type="button" class="field-button" data-action="repeat-picker" '+(birthday?'disabled':'')+'>'+esc(recurrenceLabel(draft))+(!birthday?icon('right'):'')+'</button></div>':'')+(draft.type!=='up'?'<div class="form-field"><span class="form-label">持续次数</span><button type="button" class="field-button" data-action="duration-picker" '+(draft.recurrence.frequency==='once'?'disabled':'')+'>'+(draft.recurrence.frequency==='once'?'1 次':draft.endCondition?draft.endCondition+' 次':'不设结束')+'</button></div>':'')+'<div class="field-hint">'+typeHints[draft.type]+'</div><div class="ai-field"><div><strong>参与 AI 习惯分析</strong><small>仅保存开关，AI服务尚未接入</small></div><label class="switch"><input type="checkbox" name="aiIncluded" aria-label="此事项参与AI分析" '+(draft.aiIncluded?'checked':'')+'><span></span></label></div><div class="form-field"><label for="event-note">备注</label><textarea id="event-note" name="note" placeholder="选填">'+esc(draft.note)+'</textarea></div>'+(error?'<div class="save-error" role="alert">'+esc(error)+'</div>':'')+'</div><footer class="dialog-footer"><button class="event-save" type="submit" '+(saving?'disabled':'')+'>'+(saving?'保存中…':error&&!fieldError?'重试保存':editingId?'保存修改':'保存')+'</button></footer></form>';$('event-form').querySelector('.type-tabs').scrollLeft=previousScroll;if(saving)$('event-form').querySelectorAll('input,textarea,select,button').forEach(x=>x.disabled=true)}
function sub(title,body){$('sub-dialog').innerHTML='<header class="dialog-header"><h2 id="sub-title">'+title+'</h2><button class="icon-button text-button" data-action="close-sub" aria-label="关闭">'+icon('close')+'</button></header><div class="sub-body">'+body+'</div>';if(!$('sub-dialog').open)$('sub-dialog').showModal()}
const option=(label,value,selectedValue)=>'<button class="option-row '+(value===selectedValue?'selected':'')+'" data-frequency="'+value+'">'+label+'<span class="radio"></span></button>';
function repeatPicker(){sub('循环方式',[['once','仅一次'],['daily','每天'],['weekly','每周'],['monthly','每月'],['yearly','每年'],['workdays','仅工作日'],['weekends','仅周末']].map(([v,t])=>option(t,v,draft.recurrence.frequency)).join('')+'<p class="scope-note">仅工作日需要中国法定节假日与调休数据，当前未接入年份数据。</p>')}
function frequency(value){if(value==='workdays'){sub('工作日数据未接入','<p>缺少中国法定节假日与调休表，暂不能创建工作日循环。已保留原选择和表单内容。</p><button class="primary" data-action="repeat-picker">返回选择循环</button>');return}if(value==='weekly'){const chosen=[...(draft.recurrence.weekdays?.length?draft.recurrence.weekdays:[weekday(draft.date)])];sub('每周重复','<p>选择事项出现的星期，可多选。</p><div class="days-picker">'+[1,2,3,4,5,6,7].map(n=>'<button data-weekday="'+n+'" class="'+(chosen.includes(n)?'selected':'')+'" aria-pressed="'+chosen.includes(n)+'">'+'一二三四五六日'[n-1]+'</button>').join('')+'</div><div class="sub-actions"><button class="primary" data-action="save-weekly">完成</button></div>');return}if(value==='monthly'){sub('每月重复','<label for="month-day">每月日期</label><input id="month-day" type="number" min="1" max="31" value="'+(draft.recurrence.monthDay||date(draft.date).getDate())+'"><p class="scope-note">每月29、30、31日遇到日期不足时按月末生成；若落在2月29日，跳过该次。</p><button class="primary" data-action="save-monthly">完成</button>');return}if(value==='yearly'){sub('每年重复','<label for="annual-date">重复日期</label><input id="annual-date" type="date" value="'+draft.date+'"><p class="scope-note">2月29日不生成事项，其他公历日期正常生成。</p><button class="primary" data-action="save-yearly">完成</button>');return}setRecurrence({frequency:value,weekdays:[]});$('sub-dialog').close();drawEditor()}
function setRecurrence(recurrence){
  if(recurrence.frequency==='once')draft.endCondition=1;
  else if(draft.recurrence.frequency==='once')draft.endCondition=null;
  draft.recurrence=recurrence;
}
function cancelEditor(){if(saving)return;if(JSON.stringify(draft)!==original){sub('放弃本次修改？','<p>填写内容尚未保存，放弃后无法恢复本次修改。</p><div class="sub-actions"><button class="primary" data-action="close-sub">继续编辑</button><button data-action="discard-editor">放弃修改</button></div>')}else closeModal($('event-dialog'))}
function typeLocked(event){return event&&(event.date<today||(event.segments||[]).some(s=>s.value?.date<today))}
let heldLock=null,releaseLockCallback=null;
function releaseEditLock(){releaseLockCallback?.();releaseLockCallback=null;heldLock=null}
function acquireEditLock(id,ready,report=notify){
  if(!navigator.locks){
    report('当前浏览器不支持多标签页编辑保护，请使用系统浏览器的最新版本。');
    return;
  }
  navigator.locks.request('wanshili-event-'+id,{ifAvailable:true},async lock=>{
    if(!lock){
      report('另一个标签页正在编辑同一事项，请关闭其中一个标签页后继续。');
      return;
    }
    heldLock=id;
    let release;
    const done=new Promise(resolve=>{release=resolve});
    releaseLockCallback=release;
    try{ready();await done}
    finally{if(releaseLockCallback===release)releaseEditLock()}
  }).catch(()=>report('无法取得编辑权限，请重试。'));
}
let chosenScope='one';
function scopePicker(kind){const past=selected<today;chosenScope=past?'following':'one';sub(kind==='delete'?'删除哪些日程？':'将修改应用于',['one','following','series'].map((v,i)=>'<button class="option-row '+(v===chosenScope?'selected':'')+'" data-select-scope="'+v+'" '+(past&&v==='one'?'disabled':'')+'>'+['仅这一次','这次及之后','整个系列'][i]+'<span class="radio"></span></button>').join('')+'<p class="scope-note">过去的日程已发生并保留。仅这一次影响选中日；这次及之后影响选中日起的未过去计划；整个系列覆盖全部未过去计划。</p><div class="sub-actions"><button data-action="close-sub">取消</button><button class="'+(kind==='delete'?'danger':'primary')+'" data-apply-scope="'+kind+'">'+(kind==='delete'?'确认删除':'确认保存')+'</button></div>')}
async function save(scope=null){if(saving)return;draft.title=draft.title.trim();if(!draft.title){drawEditor('',true);$('event-name').focus();return}if(R.leapDay(draft.date)){drawEditor('2月29日暂不生成事项，请选择其他日期。');return}if(draft.calendarType==='lunar'){drawEditor('农历暂未接入，填写内容已保留。');return}if(draft.type==='up'&&draft.endDate&&draft.date>draft.endDate){drawEditor('开始日期不能晚于已记录的结束日期。');return}const old=app.events.find(e=>e.id===editingId);if(typeLocked(old)&&draft.type!==old.type){drawEditor('开始日期已过，从第二天起不可更改类型。');return}if(editingId&&!scope){scopePicker('edit');return}saving=true;if($('sub-dialog').open)$('sub-dialog').close();drawEditor();await new Promise(r=>setTimeout(r,300));try{transaction(data=>{const copy=R.normalize(JSON.parse(JSON.stringify(draft)));delete copy.segments;delete copy.exceptions;if(editingId){const event=data.events.find(e=>e.id===editingId);R.rewrite(event,copy,scope,selected,today)}else{copy.createdAt=new Date().toISOString();copy.updatedAt=copy.createdAt;data.events.push(copy)}});selected=editingId?selected:draft.date;view=date(selected);page='calendar';saving=false;closeModal($('event-dialog'));render();notify('已保存')}catch(e){saving=false;drawEditor('保存失败，填写内容已保留。'+(e.message||'请重试。'))}}
function detail(id){
  $('day-dialog').close();
  activeEvent=id;
  const raw=app.events.find(event=>event.id===id);
  const event=R.shown(raw,selected);
  if(!event)return;

  const dateLabel={up:'开始日期',down:'目标日期',birthday:'生日日期',normal:'日期'}[event.type];
  const lines=[[dateLabel,fmt(event.date)]];
  if(event.type==='up'){
    if(event.endDate){
      const final=R.at(raw,event.endDate)||event;
      lines.push(['结束日期',fmt(event.endDate)],['正计时',R.label(final,event.endDate)]);
      if(selected!==event.endDate)lines.push(['选中日',R.label(event,selected)]);
    }else lines.push(['正计时',R.label(event,selected)]);
  }else{
    lines.push(['循环',recurrenceLabel(event)]);
    if(event.type==='down')lines.push(['倒数',R.label(event,selected,raw)]);
  }
  lines.push(['AI 分析',event.aiIncluded?'单项开关已开启':'单项开关已关闭'],['备注',event.note||'未填写']);
  const planned=R.occurrence(raw,selected);
  const status=!planned?'当天没有归零计划':selected<today?'已发生 · 历史日程已保留':'进入次日后自动计入统计';
  const stopAction=R.canEndCountup(raw,selected,today)
    ?'<button class="stop-countup" data-action="stop-countup">结束正计时</button>'
    :'';
  $('event-dialog').innerHTML=
    '<header class="dialog-header"><button class="icon-button text-button" data-action="close-detail" aria-label="返回">'+icon('left')+'</button><h2 id="event-dialog-title">事项详情</h2><button class="text-button" data-action="edit-detail">编辑</button></header>'+
    '<div class="detail-hero"><span class="event-icon '+event.type+'">'+icon(typeIcon[event.type])+'</span><h3>'+esc(event.title)+'</h3><span class="type-badge '+event.type+'">'+types[event.type]+'</span></div>'+
    '<div class="detail-body">'+lines.map(([label,value])=>'<div class="detail-line"><span>'+label+'</span><span>'+esc(value)+'</span></div>').join('')+
    '<div class="record-section"><h4>'+fmt(selected)+'</h4><p>'+status+'</p></div>'+stopAction+'</div>'+
    '<footer class="dialog-footer"><button class="danger" data-action="delete-detail">'+icon('trash')+'删除事项</button><button class="primary" data-action="edit-detail">'+icon('edit')+'编辑事项</button></footer>';
  openModal($('event-dialog'));
}
function confirmStop(day=iso(new Date()),dayChanged=false){
  const event=app.events.find(event=>event.id===activeEvent);
  const value=R.shown(event,day);
  if(!R.canEndCountup(event,day,iso(new Date()))){
    sub('无法结束正计时','<p>今天没有进行中的正计时，或该事项已结束。</p>');
    return;
  }
  sub('结束正计时？',
    (dayChanged?'<p role="status">日期已变更，请核对后重新确认。</p>':'')+
    '<div class="detail-line"><span>结束日期</span><strong>'+fmt(day)+'</strong></div>'+
    '<div class="detail-line"><span>最终天数</span><strong>'+R.countupDays(value,day)+' 天</strong></div>'+
    '<p class="scope-note">结束当天计入天数，历史记录会保留。</p>'+
    '<div id="stop-error" class="save-error" role="alert" hidden></div>'+
    '<div class="sub-actions"><button data-action="close-sub">取消</button><button class="primary" data-action="apply-stop" data-end-date="'+day+'">确认结束</button></div>');
}
function stopCountup(button){
  const id=activeEvent;
  const pending=()=>$('sub-dialog').open&&button.isConnected&&id===activeEvent;
  const report=message=>{
    if(!pending())return;
    const error=$('stop-error');
    error.textContent=message;
    error.hidden=false;
    button.disabled=false;
  };
  button.disabled=true;
  acquireEditLock(id,()=>{
    try{
      if(!pending())return;
      today=iso(new Date());
      if(button.dataset.endDate!==today){
        confirmStop(today,true);
        return;
      }
      transaction(data=>R.endCountup(data.events.find(event=>event.id===id),today));
      $('sub-dialog').close();
      selected=today;
      view=date(today);
      render();
      detail(id);
    }catch(error){
      report(error.message||'保存失败，请重试。');
    }finally{
      releaseEditLock();
    }
  },report);
}
function confirmDelete(){if(heldLock!==activeEvent){acquireEditLock(activeEvent,confirmDelete);return}scopePicker('delete')}
function deleteSelected(scope){try{transaction(data=>{const event=data.events.find(e=>e.id===activeEvent);R.rewrite(event,null,scope,selected,today)});$('sub-dialog').close();closeModal($('event-dialog'));render();notify('已取消对应计划，过去日程已保留')}catch(e){notify(e.message||'删除失败，原日程已保留')}}
document.addEventListener('click',e=>{const node=e.target.closest('button,[data-page]');if(!node)return;if(saving&&node.closest('#event-dialog'))return;if(node.dataset.preview){preview.show(node.dataset.preview);return}if(page==='stats'&&handleStatsButton(node))return;if(node.dataset.page){page=node.dataset.page;statsDetail=null;render();return}if(node.dataset.date){selected=node.dataset.date;view=date(selected);render();if(innerWidth<=700){$('day-dialog').innerHTML=$('page-content').querySelector('.day-panel').outerHTML;const close=document.createElement('button');close.className='text-button';close.dataset.action='close-day';close.textContent='关闭';$('day-dialog').querySelector('.day-panel-header').append(close);$('day-dialog').showModal()}return}if(node.dataset.event){detail(node.dataset.event);return}if(node.dataset.summaryDate){selected=node.dataset.summaryDate;view=date(selected);page='calendar';$('sub-dialog').close();render();return}if(node.dataset.selectScope){chosenScope=node.dataset.selectScope;$('sub-dialog').querySelectorAll('[data-select-scope]').forEach(b=>b.classList.toggle('selected',b===node));return}if(node.dataset.applyScope){if(node.dataset.applyScope==='delete')deleteSelected(chosenScope);else save(chosenScope);return}if(node.dataset.type){
  if(draft.type===node.dataset.type)return;
  draft.type=node.dataset.type;
  draft.calendarType='solar';
  delete draft.endDate;
  draft.endCondition=null;
  setRecurrence({frequency:{birthday:'yearly',down:'once',normal:'once',up:'none'}[draft.type],weekdays:[]});
  drawEditor();
  return;
}if(node.dataset.frequency){frequency(node.dataset.frequency);return}if(node.dataset.weekday){node.classList.toggle('selected');node.setAttribute('aria-pressed',node.classList.contains('selected'));return}
 const action=node.dataset.action;if(!action)return;const v=view;
 if(action==='close-day')$('day-dialog').close();else if(action==='create')openCreation();else if(action==='manual-create'){$('sub-dialog').close();openEditor()}else if(action==='previous'||action==='next'){v.setMonth(v.getMonth()+(action==='next'?1:-1),1);render()}else if(action==='today'){view=date(today);selected=today;render()}else if(action==='cancel-editor')cancelEditor();else if(action==='close-detail')closeModal($('event-dialog'));else if(action==='close-sub'){$('sub-dialog').close();if(!$('event-form'))releaseEditLock()}else if(action==='discard-editor'){$('sub-dialog').close();closeModal($('event-dialog'))}else if(action==='date-picker')sub('选择日期','<label for="picked-date">'+(draft.type==='down'?'目标日期':draft.type==='birthday'?'生日日期':'开始日期')+'</label><input id="picked-date" type="date" value="'+draft.date+'"><div class="sub-actions"><button class="primary" data-action="save-date">确认日期</button></div>');else if(action==='save-date'){if(!$('picked-date').value||!$('picked-date').validity.valid){notify('请选择有效日期');return}draft.date=$('picked-date').value;$('sub-dialog').close();drawEditor()}else if(action==='repeat-picker')repeatPicker();else if(action==='save-weekly'){const days=[...$('sub-dialog').querySelectorAll('[data-weekday].selected')].map(x=>Number(x.dataset.weekday));if(!days.length){notify('请至少选择一个星期');return}setRecurrence({frequency:'weekly',weekdays:days});$('sub-dialog').close();drawEditor()}else if(action==='save-monthly'){const input=$('month-day');if(!input.value||!input.validity.valid){notify('请输入1至31之间的日期');return}setRecurrence({frequency:'monthly',monthDay:Number(input.value),weekdays:[]});$('sub-dialog').close();drawEditor()}else if(action==='save-yearly'){const input=$('annual-date');if(!input.value||!input.validity.valid){notify('请选择有效日期');return}setRecurrence({frequency:'yearly',yearMonth:date(input.value).getMonth(),yearDay:date(input.value).getDate(),weekdays:[]});$('sub-dialog').close();drawEditor()}else if(action==='duration-picker')sub('持续次数','<label for="duration">计划出现次数</label><input id="duration" type="number" min="1" placeholder="不填写为不设结束" value="'+(draft.endCondition||'')+'"><p>按有效计划出现次数计算；填写3次则生成3次。月末回退算1次，跳过2月29日不占次数。</p><div class="sub-actions"><button data-action="no-duration">不设结束</button><button class="primary" data-action="save-duration">完成</button></div>');else if(action==='save-duration'){const input=$('duration');if(input.value&&!input.validity.valid){notify('请输入大于0的整数次数');return}draft.endCondition=input.value?Number(input.value):null;$('sub-dialog').close();drawEditor()}else if(action==='no-duration'){draft.endCondition=null;$('sub-dialog').close();drawEditor()}else if(action==='edit-detail')openEditor(activeEvent);else if(action==='stop-countup')confirmStop();else if(action==='apply-stop')stopCountup(node);else if(action==='delete-detail')confirmDelete();else if(action==='confirm-delete')deleteSelected('one');else if(action==='save-occurrence')save('one');else if(action==='reset')sub('恢复示例数据？','<p>将替换这个演示中已保存的事项与历史计划。</p><div class="sub-actions"><button data-action="close-sub">取消</button><button class="danger" data-action="confirm-reset">恢复示例</button></div>');else if(action==='confirm-reset'){try{localStorage.setItem(KEY,JSON.stringify(seed()));app=seed();storageIssue='';$('sub-dialog').close();render();notify('已恢复示例数据')}catch{notify('本地存储不可用，未替换数据')}}
});
document.addEventListener('input',e=>{if(saving||!draft||!e.target.closest('#event-form'))return;const el=e.target;if(el.name==='title'){draft.title=el.value;el.setAttribute('aria-invalid','false');$('name-error')?.remove()}if(el.name==='note')draft.note=el.value;if(el.name==='aiIncluded')draft.aiIncluded=el.checked;if(el.name==='calendarType')draft.calendarType=el.value});
$('sub-dialog').addEventListener('submit',event=>{
  if(event.target.id!=='stats-range-form')return;
  event.preventDefault();
  applyStatsRange();
});
document.addEventListener('change',event=>{
  const input=event.target;
  if(input.id!=='global-ai'&&input.id!=='month-reminder')return;
  try{
    transaction(data=>{
      if(input.id==='global-ai'){
        data.settings.aiEnabled=input.checked;
        if(input.checked)data.settings.monthReminder??=true;
      }else data.settings.monthReminder=input.checked;
    });
    render();
    $(input.id)?.focus();
    notify('已保存本机偏好');
  }catch{
    input.checked=!input.checked;
    notify('保存设置失败');
  }
});
$('event-dialog').addEventListener('submit',e=>{e.preventDefault();save()});$('event-dialog').addEventListener('cancel',e=>{e.preventDefault();if($('event-form'))cancelEditor();else closeModal($('event-dialog'))});$('event-dialog').addEventListener('click',e=>{if(e.target===$('event-dialog')){if($('event-form'))cancelEditor();else closeModal($('event-dialog'))}});$('sub-dialog').addEventListener('click',e=>{if(e.target===$('sub-dialog'))$('sub-dialog').close()});$('header-add').onclick=openCreation;$('mobile-add').onclick=openCreation;
$('event-dialog').addEventListener('close',releaseEditLock);setInterval(()=>{const next=iso(new Date());if(next!==today){today=next;if(!$('event-dialog').open)render()}},30000);window.addEventListener('pagehide',releaseEditLock);window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{app=JSON.parse(e.newValue);render()}catch{}}});
const preview=window.WanshiliPreview({open:sub,rerender:render});
window.WanshiliApp={rules:R,occurrence,summary,get data(){return JSON.parse(JSON.stringify(app))},get selected(){return selected},get today(){return today},render};
render();
})();
