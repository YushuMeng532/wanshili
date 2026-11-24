(()=>{'use strict';
const colors={up:['#747a58','#eef2e7'],down:['#54758a','#eaf3f9'],birthday:['#8f6a76','#f8edf1']};
const paths={book:'M3 4c4-2 7-1 9 1 2-2 5-3 9-1v15c-4-2-7-1-9 1-2-2-5-3-9-1Z M12 5v15',cal:'M4 5h16v16H4Z M4 9h16 M8 2v5 M16 2v5',repeat:'M20 7a8 8 0 0 0-14-2L3 8 M3 3v5h5 M4 17a8 8 0 0 0 14 2l3-3 M21 21v-5h-5',flag:'M5 21V3c5-3 9 3 14 0v10c-5 3-9-3-14 0',gift:'M3 8h18v4H3Z M5 12v9h14v-9 M12 8v13 M12 8C3 8 6 0 10 4Z M12 8c9 0 6-8 2-4Z',note:'M5 3h14v18H5Z M8 8h8 M8 12h8 M8 16h5',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z'};
function icon(n){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[n]+'"/></svg>'}
function row(label,value,ico='cal',arrow=true){return '<div class="row">'+icon(ico)+'<span class="label">'+label+'</span><span class="value">'+value+'</span>'+(arrow?'<span class="chev">›</span>':'')+'</div>'}
function ai(){return '<div class="ai">'+icon('spark')+'<div><b>参与 AI 习惯分析</b><div class="helper">仅保存开关，AI服务尚未接入</div></div><div class="toggle"></div></div>'}
function base(title,body,button='保存',type='up',navRight='取消'){return '<div class="status"><span>9:41</span><span>● ▰</span></div><div class="nav"><span class="back">‹</span><b>'+title+'</b><span class="plain">'+navRight+'</span></div>'+body+(button?'<div class="foot"><div class="btn">'+button+'</div></div>':'')+'<div class="homebar"></div>'}
function tabs(type){return '<div class="tabs">'+[['up','正计时'],['down','倒数日'],['birthday','生日']].map(([k,v])=>'<div class="tab '+(k===type?'on':'')+'">'+v+'</div>').join('')+'</div>'}
function form(type='up',opts={}){const birthday=type==='birthday',down=type==='down',name=opts.empty?'<span class="placeholder">请输入事项名称</span>':birthday?'小林生日':down?'考试':'相识纪念日';let b=tabs(type)+'<div class="content">'+row('名称','<div class="input '+(opts.empty?'error':'')+'">'+name+'</div>',birthday?'gift':'book',false)+(opts.empty?'<div class="errorline">请填写事项名称</div>':'');if(birthday)b+=row('日期类型','<span class="pill">公历</span>　农历未接入','cal',false);b+=row(birthday?'生日日期':down?'目标日期':'开始日期',birthday?'12月8日':down?'2026年12月15日':'2026年11月17日');if(type!=='up')b+=row('循环',birthday?'每年':'仅一次','repeat',!birthday)+row('持续次数',birthday?'不设结束':'1 次','flag',birthday);b+='<div class="hint">'+(birthday?'每年提醒这一天':down?'按选中日期显示倒数，仅归零日标记日历':'开始当天第1天，按选中日期累计自然日')+'</div>'+ai()+row('备注','<div class="input placeholder">选填</div>','note',false)+'</div>';return base(opts.edit?'编辑事项':'新建事项',b,opts.saving?'保存中…':opts.edit?'保存修改':'保存',type)}
function shell(id,name,html,type='up'){return '<div><article class="screen" id="'+id+'" data-name="'+name+'" style="--accent:'+colors[type][0]+';--tint:'+colors[type][1]+'">'+html+'</article><div class="caption">'+name+'</div></div>'}
function sheet(title,inside){return '<div class="overlay"><div class="sheet"><div class="handle"></div><div class="sheet-title">'+title+'</div>'+inside+'</div></div>'}
function radioRow(name,checked){return '<div class="row"><span>'+name+'</span><span class="radio '+(checked?'checked':'')+'"></span></div>'}
function detail(){return base('事项详情','<div class="hero detail-hero">'+icon('book')+'<h3>相识纪念日</h3><span class="pill">正计时</span><div class="helper">从 2026年11月17日开始</div></div><div class="content detail-content">'+row('开始日期','2026年11月17日','cal',false)+row('正计时','第1天','cal',false)+row('AI开关','关闭（服务未接入）','spark',false)+row('备注','选填','note',false)+'<h3>日程状态</h3><div class="helper">过去日程自动已发生，历史保留可查看</div></div><div class="foot"><div class="btn outline">编辑事项</div><div class="center-title danger-text" style="font-size:14px">删除事项</div></div>','','up','编辑')}
function home(){let cells=['一','二','三','四','五','六','日'].map(x=>'<div class="calcell weekday">'+x+'</div>').join('');for(let i=0;i<6;i++)cells+='<div class="calcell"></div>';for(let d=1;d<=30;d++)cells+='<div class="calcell '+(d===17?'selected':'')+'">'+d+'</div>';let items=[['相识纪念日','正计时 · 第1天','up','book'],['考试','倒数日 · 12月15日','down','cal'],['小林生日','生日 · 11月17日','birthday','gift']].map(([n,v,t,i])=>'<div class="item" style="--accent:'+colors[t][0]+';color:'+colors[t][0]+'"><span class="stripe"></span>'+icon(i)+'<b style="color:#263842">'+n+'</b><small>'+v+'</small><span style="margin-left:auto">›</span></div>').join('');return base('万事历','<div class="calendar"><div class="month"><span>‹</span><b>2026年11月</b><span>›</span><small>今天</small></div><div class="calgrid">'+cells+'</div></div><div class="items"><h3>11月17日 周二 <small class="helper">共3项</small></h3>'+items+'</div><div class="toast">✓ 已保存</div><div class="plus">＋</div><div class="bottomnav"><span>日历</span><span>统计</span><span>我的</span></div>','','up','')}

function normalSchedulePreview(){
 const selected='<div class="tabs"><div class="tab on" data-normal-button>普通日程</div><div class="tab">正计时</div><div class="tab">倒数日</div><div class="tab">生日</div></div>';
 const body=selected+'<div class="content">'+
  row('名称','<div class="input placeholder">请输入事项名称</div>','book',false)+
  row('日期','2026年11月17日')+row('循环','仅一次','repeat')+
  row('持续次数','1 次','flag',false)+
  '<div class="hint">只在计划发生的日期显示日程</div>'+ai()+
  row('备注','<div class="input placeholder">选填</div>','note',false)+'</div>';
 return base('新建事项',body,'保存')+'<p class="normal-preview-caption"><a href="app.html#new-normal" target="_blank" rel="noopener">打开试用版，创建普通日程 ↗</a></p>';
}

const stopFigma = {
  'review:stop-today':'208:65', 'review:stop-active':'208:216', 'review:stop-confirm':'208:263',
  'review:stop-ended':'208:332', 'review:stop-end-day':'208:383', 'review:stop-next-day':'208:536',
  'review:stop-history':'214:688'
};
const stopId = state => 'review:stop-' + state;
const stopButton = (label, state, className = '', anchor = '') =>
  `<button type="button" class="${className}" data-stop-next="${stopId(state)}"${anchor ? ` data-anchor="${anchor}"` : ''}${label==='‹'?' aria-label="返回当天"':typeof label==='number'?` aria-label="11月${label}日"`:''}>${label}</button>`;

function stopDetail(state) {
  const ended = state === 'ended';
  const back = stopButton('‹', ended ? 'end-day' : 'today', 'back');
  const hero = `<div class="stop-hero">${icon('book')}<h3>相识纪念日</h3>
    <span class="stop-pill">正计时 · ${ended ? '已结束' : '进行中'}</span>
    <div class="stop-total"${ended ? ' data-anchor="stop-total"' : ''}>${ended ? '共' : '第'} <strong>7</strong> 天</div></div>`;
  const details = `<div class="content stop-details">${row('开始日期','2026年11月17日','cal',false)}
    ${ended ? row('结束日期','2026年11月23日','cal',false) : ''}
    ${row('AI 习惯分析','关闭','spark',false)}${row('备注','选填','note',false)}</div>`;
  const footer = `<div class="foot stop-actions"><div class="btn stop-primary">编辑事项</div>
    ${ended ? '' : stopButton('结束正计时','confirm','stop-secondary','stop-action')}
    <span class="stop-delete">删除事项</span></div>`;
  const confirmation = state === 'confirm' ? `<div class="overlay stop-overlay">
    <button type="button" class="stop-dismiss" data-stop-next="${stopId('active')}" aria-label="关闭确认"></button>
    <div class="sheet stop-sheet" role="dialog" aria-label="结束正计时？"><div class="handle"></div><div class="sheet-title">结束正计时？</div>
    ${row('结束日期','2026年11月23日','cal',false)}${row('累计天数','7 天','flag',false)}
    <p class="helper">结束当天计入天数，历史记录会保留。</p>
    <div class="split">${stopButton('取消','active','btn stop-cancel')}${stopButton('确认结束','ended','btn stop-primary','stop-confirm')}</div>
    <div class="homebar"></div></div></div>` : '';
  return base('事项详情',hero+details+footer,'','up','').replace('<span class="back">‹</span>',back) + confirmation;
}

function stopCalendar(state) {
  const next = state === 'next-day';
  const active = state === 'today';
  const history = state === 'history';
  const dateScenes = {20:'history',23:'end-day',24:'next-day'};
  const selected = next ? 24 : history ? 20 : 23;
  const heading = `11月${selected}日 周${'日一二三四五六'[new Date(Date.UTC(2026,10,selected)).getUTCDay()]}`;
  let dates = '<span class="calcell"></span>'.repeat(6);
  for (let day=1; day<=30; day++) {
    const mark = day===17 || (day===23&&!active);
    const css = 'calcell' + (day===selected?' selected':'') + (mark?' stop-mark':'');
    if (!active && day!==selected && dateScenes[day]) {
      dates += stopButton(day,dateScenes[day],css,state==='end-day'&&day===24?'stop-next-date':'');
    } else dates += `<span class="${css}"${day===23&&!active?' data-anchor="stop-end-date"':''}>${day}</span>`;
  }
  const weekdays = [...'一二三四五六日'].map(day=>`<span class="calcell weekday">${day}</span>`).join('');
  const calendar = `<div class="calendar stop-calendar"><div class="month"><span>‹</span><b>2026年11月</b><span>›</span><small>今天</small></div><div class="calgrid">${weekdays}${dates}</div></div>`;
  const historyEvent = `<div class="item stop-item" data-anchor="stop-history-day"><span class="stripe"></span>${icon('book')}<b>相识纪念日</b><small>正计时 · 第 ${selected-16} 天</small></div>`;
  const event = history ? historyEvent : `<button type="button" class="item stop-item" data-anchor="${active?'stop-entry':'stop-result'}" data-stop-next="${stopId(active?'active':'ended')}">
    <span class="stripe"></span>${icon('book')}<b>相识纪念日</b><small>${active?'正计时 · 第 7 天':'已结束 · 共 7 天'}</small><span>›</span></button>`;
  const empty = `<div class="phone-empty stop-empty" data-anchor="stop-empty">${phoneIcon}<strong>这一天还没有事项</strong><p>从一件小事开始记录</p></div>`;
  const content = `<div class="items"><h3>${heading} <small class="helper">共${next?'0':'1'}项</small></h3>${next?empty:event}</div><div class="bottomnav"><span>日历</span><span>统计</span><span>我的</span></div>`;
  return base('万事历',calendar+content,'','up','').replace('<span class="back">‹</span>','');
}

const scenes=[
 ['3:8','02-01 新建 · 空表单（现有演示）',()=>form().replace('相识纪念日','<span class="placeholder">请输入事项名称</span>')],
 ['review:normal','02-01 新建 · 普通日程',normalSchedulePreview,'down'],
 ['3:9','02-02 新建 · 正计时',()=>form()],
 ['3:10','02-03 新建 · 倒数日',()=>form('down'),'down'],
 ['3:11','02-04 新建 · 生日与历法',()=>form('birthday'),'birthday'],
 ['3:12','02-05 循环设置',()=>form('down')+sheet('循环方式 <span class="plain">完成</span>',['仅一次','每天','每周','每月','每年','仅工作日','仅周末'].map(x=>radioRow(x,x==='每天')).join('')+'<p class="helper">调休日历暂未接入，不使用星期代算</p>')],
 ['3:13','02-06 正计时 · 纪念日说明',()=>form()+sheet('正计时 · 纪念日','<p class="helper">只选择开始日期，当天为第1天。<br>不设置循环、结束日期或持续次数。<br>日历只标开始日，下方按选中日累计。</p><div class="btn">完成</div>')],
 ['137:3067','02 补充 · 日期选择',()=>form()+sheet('开始日期','<div class="wheel">'+[['2025年','10月','16日'],['2026年','11月','17日'],['2027年','12月','18日']].map((a,i)=>'<div class="wheel-line '+(i===1?'selected':'')+'">'+a.map(x=>'<span>'+x+'</span>').join('')+'</div>').join('')+'</div><div class="btn">确认日期</div>')],
 ['137:3182','02 补充 · 每周星期',()=>form('down')+sheet('每周重复','<p class="helper">选择事项出现的星期</p><div class="days">'+['一','二','三','四','五','六','日'].map((x,i)=>'<span class="day '+([0,2,4].includes(i)?'selected':'')+'">'+x+'</span>').join('')+'</div><div class="btn">完成</div>')],
 ['137:3804','02 补充 · 每月规则',()=>form('down')+sheet('每月重复',row('日期','每月17日')+'<div class="btn">完成</div>')],
 ['137:3911','02 补充 · 每年规则',()=>form('down')+sheet('每年重复',row('月份','11月')+row('日期','17日')+'<div class="btn">完成</div>')],
 ['137:3293','02 补充 · 农历生日',()=>form('birthday').replace('<span class="pill">公历</span>　农历','公历　<span class="pill">农历</span>').replace('12月8日','冬月初八'),'birthday'],
 ['137:3529','02 补充 · 名称未填',()=>form('up',{empty:true})],
 ['3:15','03-01 事项详情',()=>detail()],
 ['3:16','03-02 编辑事项',()=>form('up',{edit:true})],
 ['3:17','03-03 修改循环范围',()=>form('up',{edit:true})+sheet('将修改应用于',radioRow('仅这一次',true)+radioRow('这次及之后',false)+radioRow('整个系列',false)+'<p class="helper">确认后覆盖对应未过去数据，过去日程保留。</p><div class="btn">确认保存</div>')],
 ['3:18','03-04 删除确认',()=>detail()+sheet('删除这条事项？','<p class="helper">相识纪念日 · 纪念日 · 按自然日累计</p>'+radioRow('仅这一次',true)+radioRow('这次及之后',false)+radioRow('整个系列',false)+'<p class="helper">取消对应未过去计划，过去日程保留可查看。</p><div class="split"><div class="btn outline">取消</div><div class="btn danger">确认删除</div></div>')],
 [stopId('today'),'03-05 正计时 · 今天入口',()=>stopCalendar('today')],
 [stopId('active'),'03-06 正计时 · 进行中详情',()=>stopDetail('active')],
 [stopId('confirm'),'03-07 正计时 · 结束确认',()=>stopDetail('confirm')],
 [stopId('ended'),'03-08 正计时 · 已结束详情',()=>stopDetail('ended')],
 [stopId('end-day'),'03-09 正计时 · 月历结束日',()=>stopCalendar('end-day')],
 [stopId('next-day'),'03-10 正计时 · 月历次日',()=>stopCalendar('next-day')],
 [stopId('history'),'03-11 正计时 · 回看中间日期',()=>stopCalendar('history')],
 ['137:3616','03 补充 · 未保存退出',()=>form('up',{edit:true})+'<div class="overlay"><div class="dialog"><h3>放弃本次修改？</h3><p>修改内容尚未保存。</p><div class="btn">继续编辑</div><div class="plain">放弃修改</div></div></div>'],
 ['137:4025','03 补充 · 保存中',()=>form('up',{edit:true,saving:true})],
 ['137:3376','03 补充 · 保存成功',()=>home()],
 ['138:6590','03 补充 · 返回当天',()=>home().replace(/<div class="toast">.*?<\/div>/,'')],
 ['144:7580','03 补充 · 删除后剩余两项',()=>home().replace(/<div class="toast">.*?<\/div>/,'').replace(/<div class="item"[^>]*>.*?相识纪念日.*?<\/div>/,'').replace('共3项','共2项')],
 ['review:count','02 补充 · 持续次数',()=>form('down')+sheet('持续次数','<div class="subfield"><b>3 次</b></div><p class="helper">按计划出现次数计算，月末回退算1次。<br>跳过2月29日不占次数；仅一次固定为1。</p><div class="btn">完成</div>')],
 ['review:conflict','03 补充 · 标签页冲突',()=>detail()+'<div class="overlay"><div class="dialog"><h3>此事项正在另一标签页编辑</h3><p>请关闭其中一个标签页后继续。</p><div class="btn">返回详情</div></div></div>'],
 ['review:fail','03 补充 · 保存失败',()=>form('up',{edit:true}).replace('<div class="foot"><div class="btn">保存修改</div></div>','<div class="foot"><div class="errorbox"><b>保存失败，请重试</b><div>填写内容已保留</div></div><div class="btn">重试保存</div></div>')]
];
const sceneMap=new Map(scenes.map(s=>[s[0],s]));
const selectedBefore=$('screen').value;
for(const [id,name]of scenes){const option=document.createElement('option');option.value=id;option.textContent=name;$('screen').append(option)}
$('screen').value=selectedBefore;

setPrototype=function(node){
 const preview=node==='review:normal';
 $('open-prototype').hidden=preview;
 $('mode-figma').disabled=preview;
 if(preview)return;
 const real=stopFigma[node]||({'review:fail':'3:4','review:count':'171:530','review:conflict':'171:744'})[node]||node;
 const url=new URL('https://www.figma.com/proto/'+CONFIG.figmaKey);
 url.search=new URLSearchParams({'node-id':real,'page-id':'2:2','starting-point-node-id':real,scaling:'scale-down','content-scaling':'fixed','show-proto-sidebar':node==='review:fail'?'1':'0'});
 $('open-prototype').href=url.href;$('fallback-prototype').href=url.href;
 $('prototype').dataset.source='https://embed.figma.com/proto/'+CONFIG.figmaKey+'?'+url.searchParams+'&embed-host=wanshili-workbench';
 if(!reviewMode)$('prototype').src=$('prototype').dataset.source;
 document.querySelector('.caption').textContent=node==='review:fail'?'Figma左栏选择“保存失败与重试”查看此状态。':'Figma原文件交互演示；如需登录，可独立打开。';
};
const oldReviewMode=setReviewMode;
setReviewMode=function(value){oldReviewMode(value);if(!value&&$('prototype').dataset.source)$('prototype').src=$('prototype').dataset.source;updateAuditPanel()};

const anchorLabels={
 'stop-entry':'正在进行的正计时','stop-action':'结束正计时按钮','stop-confirm':'确认结束','stop-total':'最终天数','stop-end-date':'结束日期标记','stop-next-date':'切换到次日','stop-result':'结束日事项','stop-empty':'结束次日空态','stop-history-day':'历史日期对应的累计天数',
 'normal-schedule':'普通日程',
 'event-type':'事项类型切换','event-name':'名称输入','event-date':'日期与历法','event-repeat':'循环方式','event-duration':'结束条件','event-ai':'AI分析范围','event-save':'保存状态','event-item':'事项列表行','event-edit':'编辑入口','event-delete':'删除确认','event-discard':'未保存退出','event-error':'名称校验','event-scope':'修改范围','event-retry':'失败重试'
};
for(const [value,label]of Object.entries(anchorLabels)){const opt=document.createElement('option');opt.value=value;opt.textContent=label;$('note-anchor').append(opt)}
BASE_NOTES[0].kind='改动';BASE_NOTES[0].screens=['3:4','3:5','3:6','137:3376','138:6590','144:7580'];BASE_NOTES[1].screens=['3:3','3:4','3:5','3:6'];BASE_NOTES[2].screens=['3:4','3:6'];
for(const n of reviewNotes){if(n.doc==='page-design'&&['3. 月历交互','5. 空态'].includes(n.chapter))n.chapter='1. 月历与当天事项'}

function mark(el,anchor){if(!el)return;el.dataset.anchor=anchor;el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',anchorLabels[anchor]||anchor)}
function annotateScene(phone,id){
 if(id.startsWith('review:stop-')){
  if(id===stopId('confirm'))phone.querySelector('.stop-secondary')?.removeAttribute('data-anchor');
  return;
 }
 if(id==='review:normal'){mark(phone.querySelector('[data-normal-button]'),'normal-schedule');return}
 const overlay=phone.querySelector('.overlay');
 if(overlay){
  const anchors={'3:12':'event-repeat','3:13':'event-duration','review:count':'event-repeat','review:conflict':'event-edit','137:3067':'event-date','137:3182':'event-repeat','137:3804':'event-repeat','137:3911':'event-repeat','3:17':'event-scope','3:18':'event-delete','137:3616':'event-discard'};
  mark(overlay.querySelector('.sheet,.dialog'),anchors[id]);return;
 }
 if(id==='3:15'){mark(phone.querySelector('.foot .btn'),'event-edit');mark(phone.querySelector('.nav .plain'),'event-edit');mark(phone.querySelector('.danger-text'),'event-delete');return}
 if(['137:3376','138:6590','144:7580'].includes(id)){mark(phone.querySelector('.item'),'event-item');mark(phone.querySelector('.plus'),'add');return}
 mark(phone.querySelector('.tabs'),'event-type');
 for(const el of phone.querySelectorAll('.row')){const label=el.querySelector('.label')?.textContent.trim();const anchor={'名称':'event-name','开始日期':'event-date','目标日期':'event-date','生日日期':'event-date','日期类型':'event-date','循环':'event-repeat','持续次数':'event-repeat','结束条件':'event-duration'}[label];if(anchor)mark(el,anchor)}
 mark(phone.querySelector('.ai'),'event-ai');
 if(id==='3:15'){mark(phone.querySelector('.foot .btn'),'event-edit');mark(phone.querySelector('.danger-text'),'event-delete')}
 else if(id==='review:fail')mark(phone.querySelector('.foot'),'event-retry');
 else mark(phone.querySelector('.foot .btn'),'event-save');
 mark(phone.querySelector('.nav .plain'),'event-discard');
 mark(phone.querySelector('.errorline'),'event-error');
 mark(phone.querySelector('.item'),'event-item');mark(phone.querySelector('.plus'),'add');
}
const previousPhone=renderPhone;
renderPhone=function(){
 const id=$('screen').value,scene=sceneMap.get(id),phone=$('review-phone');
 if(!scene){phone.classList.remove('flow-screen');previousPhone();updateAuditPanel();return}
 phone.classList.add('flow-screen');phone.dataset.scene=id;
 const type=scene[3]||'up';phone.style.setProperty('--accent',colors[type][0]);phone.style.setProperty('--tint',colors[type][1]);phone.innerHTML=scene[2]();annotateScene(phone,id);
 $('review-page-name').textContent=scene[1];$('note-count').textContent=reviewNotes.length;$('custom-count').textContent='共享及补充批注 '+(reviewNotes.length-3);$('review-counts').textContent='本页可定位 '+visibleNotes().length;
 fitPhone();renderStageNote();updateAuditPanel();requestAnimationFrame(drawReview);
};
const previousClick=$('review-phone').onclick;
$('review-phone').onclick=e=>{const next=e.target.closest('[data-stop-next]')?.dataset.stopNext;if(next){$('screen').value=next;$('screen').onchange({target:$('screen')});return}if(!sceneMap.has($('screen').value)){previousClick(e);return}const el=e.target.closest('[data-anchor]');if(!el)return;const n=visibleNotes().find(n=>n.anchor===el.dataset.anchor);if(n)selectNote(n.id);else toast('此位置可通过“＋批注”补充说明')};
$('review-phone').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-anchor][role=button]')){e.preventDefault();e.target.click()}});

function auditPage(){
 const id=$('screen').value;
 const anchors=[...new Set([...$('review-phone').querySelectorAll('[data-anchor]')].map(n=>n.dataset.anchor))];
 const chapterOK=n=>state.documents.has(n.doc)&&chapters(state.documents.get(n.doc)).some(c=>matchesChapter(n,c));
 const relevant=reviewNotes.filter(n=>(n.screens?n.screens.includes(id):n.screen?n.screen===id:!!anchorElement(n)));
 const matched=anchors.filter(a=>relevant.some(n=>n.anchor===a&&chapterOK(n)));
 return {page:$('screen').selectedOptions[0].textContent,total:anchors.length,matched:matched.length,missing:anchors.filter(a=>!matched.includes(a)),broken:relevant.filter(n=>!chapterOK(n)),absent:relevant.filter(n=>!anchorElement(n)),percent:anchors.length?Math.round(matched.length/anchors.length*100):null};
}
function auditText(){const a=auditPage();return '当前页面：'+a.page+'\n文档锚点覆盖：'+(a.percent===null?'不适用':a.percent+'%')+'（'+a.matched+'/'+a.total+'）\n缺少说明：'+(a.missing.join('、')||'无')+'\n章节失效：'+(a.broken.map(n=>n.title).join('、')||'无')+'\n本页未出现：'+(a.absent.map(n=>n.title).join('、')||'无')}
function updateAuditPanel(){
 $('live-audit')?.remove();if(state.active!=='checks')return;
 const a=auditPage(),panel=document.createElement('section');panel.id='live-audit';panel.setAttribute('aria-label','当前页面锚点校验');
 const headline=document.createElement('div');headline.className='coverage';const label=document.createElement('span');label.textContent='当前页面文档覆盖 '+a.matched+'/'+a.total;const percent=document.createElement('strong');percent.textContent=a.percent===null?'不适用':a.percent+'%';headline.append(label,percent);panel.append(headline);
 const intro=document.createElement('p');intro.textContent=a.page;panel.append(intro);
 const issues=[...a.missing.map(x=>['缺少说明',x]),...a.broken.map(x=>['章节失效',x.title+' → '+x.chapter]),...a.absent.map(x=>['本页未出现',x.title])];
 if(!issues.length){const p=document.createElement('p');p.className='audit-pass';p.textContent='当前页面的具名锚点均有可定位的文档说明。';panel.append(p)}
 for(const [kind,text]of issues){const item=document.createElement('div');item.className='audit-issue';const h=document.createElement('strong');h.textContent=kind;const p=document.createElement('p');p.textContent=text;item.append(h,p);panel.append(item)}
 const button=document.createElement('button');button.textContent='复制本页校验结果';button.onclick=()=>copy(auditText());panel.append(button);$('content').prepend(panel);
}
const previousRender=render;
render=function(){previousRender();updateAuditPanel()};
const previousRaw=rawForActive;
rawForActive=function(){return previousRaw()+(state.active==='checks'?'\n\n## 当前页面校验\n\n'+auditText():'')};
reviewCaption.textContent='V0.4 页面快照用于标注，使用预设数据；切换Figma演示体验原文件跳转。';
setPrototype($('screen').value);renderPhone();render();
})();
