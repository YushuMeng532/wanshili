/* Local, in-memory prototype. Annotation mode retains chapter navigation. */
(()=>{'use strict';
const R=window.WanshiliRules,phone=$('review-phone'),stage=$('review-stage');const now=new Date(),realToday=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
const selectedISO=()=>year+'-'+String(month).padStart(2,'0')+'-'+String(selectedDay).padStart(2,'0');let pickedScope='one',sheetDraft=null;
let playing=true,returnScene='3:9',editing=false,dirty=false,selectedDay=17,month=11,year=2026,recordIndex=0,saveTimer;
const sample=()=>({type:'up',name:'相识纪念日',date:'2026-11-17',repeat:'纪念日',days:['一','三','五'],duration:null,ai:false,remark:''});
let draft=sample(),records=[],baseline='',layerBase='';
const formIds=['3:8','3:9','3:10','3:11','137:3293','137:3529','3:16','137:4025','review:fail'];
const homeIds=['3:3','3:4','3:5','3:6','137:3376','138:6590','144:7580'];
const dateText=value=>{const [y,m,d]=value.split('-').map(Number);return y+'年'+m+'月'+d+'日'};
const typeText=t=>({up:'正计时',down:'倒数日',birthday:'生日'}[t]);
function go(id){if(!phone.querySelector('.overlay'))layerBase=phone.innerHTML;clearTimeout(saveTimer);$('screen').value=id;setPrototype(id);renderPhone()}
function field(label){return [...phone.querySelectorAll('.row')].find(x=>x.querySelector('.label')?.textContent===label)?.querySelector('.value')}
function setText(el,text){if(el)el.textContent=text}
function button(el,label){if(!el)return;el.tabIndex=0;el.setAttribute('role','button');if(label)el.setAttribute('aria-label',label)}
function inputAt(el,key,placeholder){if(!el)return;el.innerHTML='';const input=document.createElement('input');input.className='demo-input';input.value=draft[key];input.placeholder=placeholder;input.maxLength=key==='name'?40:120;input.setAttribute('aria-label',key==='name'?'事项名称':'备注');input.oninput=()=>{draft[key]=input.value;dirty=true;input.closest('.input')?.classList.remove('error')};el.append(input)}
function begin(type='up',edit=false){editing=edit;draft=edit?{...(R.shown(records[recordIndex],selectedISO())||records[recordIndex]||sample()),days:[...(records[recordIndex]?.days||sample().days)]}:{...sample(),type,name:'',date:year+'-'+String(month).padStart(2,'0')+'-'+String(selectedDay).padStart(2,'0'),repeat:type==='down'?'仅一次':type==='birthday'?'每年':'纪念日'};dirty=false;baseline=JSON.stringify(draft);go(edit?'3:16':type==='up'?'3:8':type==='down'?'3:10':'3:11')}
function renderFields(id){
 const form=phone.querySelector('.tabs');if(!form)return;
 const locked=editing&&records[recordIndex]&&(records[recordIndex].date<realToday||(records[recordIndex].segments||[]).some(x=>x.value?.date<realToday));const labels=['正计时','倒数日','生日'];phone.querySelectorAll('.tab').forEach((el,i)=>{el.classList.toggle('on',labels[i]===typeText(draft.type));button(el,labels[i]);el.style.opacity=locked&&labels[i]!==typeText(draft.type)?'.35':'1';el.dataset.locked=locked?'1':''});
 if(draft.type==='up')phone.querySelectorAll('.row').forEach(x=>{if(['循环','结束条件','持续次数'].includes(x.querySelector('.label')?.textContent))x.remove()});
 if(draft.type!=='up'&&!field('循环')){const row=phone.querySelector('.content .row')?.cloneNode(true);if(row){row.querySelector('.label').textContent='循环';row.querySelector('.value').textContent=draft.repeat;row.dataset.anchor='event-repeat';phone.querySelector('.content .row')?.after(row)}}
 const dateLabel=phone.querySelector('[data-anchor=event-date] .label');if(dateLabel&&dateLabel.textContent!=='日期类型')dateLabel.textContent=draft.type==='down'?'目标日期':draft.type==='birthday'?'生日日期':'开始日期';
 const name=field('名称')?.querySelector('.input');inputAt(name,'name','请输入事项名称');
 inputAt(field('备注')?.querySelector('.input'),'remark','选填');
 setText(field('开始日期')||field('目标日期')||field('生日日期'),dateText(draft.date));
 setText(field('循环'),draft.repeat==='每周'?'每周'+draft.days.join('、'):draft.repeat);
 setText(field('持续次数'),draft.repeat==='仅一次'?'1 次':draft.duration||'不设结束');setText(field('结束条件'),draft.duration);
 phone.querySelector('.toggle')?.classList.toggle('on',draft.ai);
 button(phone.querySelector('.toggle'),'参与 AI 习惯分析');
 if(id==='137:3529'){name?.classList.add('error');phone.querySelector('.demo-input')?.setAttribute('aria-invalid','true')}
}
function asEvent(r){const frequency={'仅一次':'once','每天':'daily','每周':'weekly','每月':'monthly','每年':'yearly','仅周末':'weekends','纪念日':'none'}[r.repeat]||'once';return R.normalize({...r,id:r.id||('demo-'+Date.now()+'-'+Math.random().toString(36).slice(2)),title:r.name,calendarType:'solar',endCondition:r.repeat==='仅一次'?1:(parseInt(r.duration)||null),recurrence:{frequency,weekdays:(r.days||[]).map(x=>'一二三四五六日'.indexOf(x)+1),monthDay:r.monthDay||Number(r.date.slice(-2)),yearMonth:Number((r.annualDate||r.date).slice(5,7))-1,yearDay:Number((r.annualDate||r.date).slice(-2))}})}
function renderRecords(id){const list=records.map((r,i)=>({r:R.shown(r,selectedISO()),i})).filter(x=>x.r),area=phone.querySelector('.items'),old=phone.querySelector('.phone-inner');if(area){area.querySelectorAll('.item').forEach(x=>x.remove());setText(area.querySelector('h3'),month+'月'+selectedDay+'日 · 共'+list.length+'项')}if(old){phone.querySelectorAll('.phone-row').forEach(x=>x.remove());if(list.length)phone.querySelectorAll('.phone-empty,.phone-add').forEach(x=>x.remove());phone.querySelectorAll('.phone-day-heading').forEach(x=>{if(x.firstChild?.nodeType===3)x.firstChild.textContent=month+'月'+selectedDay+'日 ';setText(x.querySelector('small'),'共'+list.length+'项')})}const holder=area||phone.querySelector('.phone-sheet')||old;if(!holder)return;for(const {r,i} of list){const row=document.createElement('div');row.className=area?'item':'phone-row';row.dataset.record=i;button(row,'查看'+r.name);const b=document.createElement('b');b.textContent=r.name;const small=document.createElement('small');small.textContent=typeText(r.type)+' · '+R.label(r,selectedISO(),records[i]);row.append(b,small);if(area)holder.append(row);else holder.insertBefore(row,holder.querySelector('.phone-add,.phone-plus,.phone-footer')||null)}}
function picker(overlay){const title=overlay.querySelector('.sheet-title')?.textContent||'';let label='';let value='';let type='';if(['3:17','3:18'].includes($('screen').value)){if(selectedISO()<realToday&&pickedScope==='one')pickedScope='following';overlay.querySelectorAll('.row').forEach(x=>{const choice=x.textContent.trim(),v={'仅这一次':'one','这次及之后':'following','整个系列':'series'}[choice];x.querySelector('.radio')?.classList.toggle('checked',v===pickedScope);x.style.opacity=v==='one'&&selectedISO()<realToday?'.4':'1'})}
 if(title.includes('开始日期')){label='选择日期';value=draft.date;type='date'}
 else if(title.includes('每月重复')){label='每月日期';value=draft.monthDay||Number(draft.date.slice(-2));type='number'}
 else if(title.includes('每年重复')){label='每年日期';value=draft.annualDate||draft.date;type='date'}
 if(type){overlay.querySelector('.wheel')?.remove();const input=document.createElement('input');input.className='demo-picker';input.type=type;input.value=value;input.setAttribute('aria-label',label);if(type==='number'){input.min=1;input.max=31}overlay.querySelector('.sheet-title').after(input);input.oninput=()=>{if(type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(input.value)){if(title.includes('每年'))draft.annualDate=input.value;else draft.date=input.value} else if(type==='number'&&input.validity.valid)draft.monthDay=Number(input.value);dirty=true}}
 if(title.includes('每周'))overlay.querySelectorAll('.day').forEach(x=>x.classList.toggle('selected',draft.days.includes(x.textContent)));
 if(title.includes('循环方式'))overlay.querySelectorAll('.row').forEach(x=>x.querySelector('.radio')?.classList.toggle('checked',x.textContent.trim()===draft.repeat));
 if(title.includes('持续次数')){const b=overlay.querySelector('.subfield b');if(b){b.innerHTML='<input class="demo-input" type="number" min="1" max="3650" aria-label="持续次数" value="'+(parseInt(draft.duration)||30)+'">';b.querySelector('input').oninput=e=>{if(e.target.validity.valid){draft.duration=e.target.value+' 次';dirty=true}}}}
}
function enhance(){const id=$('screen').value;phone.dataset.mode=playing?'demo':'annotation';if(!playing||id==='review:normal')return;
 renderFields(id);if(homeIds.includes(id)){renderRecords(id);renderCalendar()}
 if(id==='3:15'){const r=(records[recordIndex]&&R.shown(records[recordIndex],selectedISO()))||draft;setText(phone.querySelector('.hero h3'),r.name||'阅读');setText(phone.querySelector('.hero .pill'),typeText(r.type));setText(phone.querySelector('.hero .helper'),'从 '+dateText(r.date)+'开始');setText(field('开始日期'),dateText(r.date));setText(field('循环'),r.repeat);setText(field('正计时'),R.label(asEvent(r),selectedISO()));setText(field('结束条件'),r.duration);setText(field('AI开关'),r.ai?'开启（服务未接入）':'关闭（服务未接入）');setText(field('备注'),r.remark||'未填写')}
 if(phone.querySelector('.overlay'))picker(phone.querySelector('.overlay'));
 const assets={book:'b084e',cal:'ff176',repeat:'144c4',flag:'52827',spark:'91884',note:'1c670'};
 phone.querySelectorAll('.content .row,.ai').forEach(row=>{const key=row.classList.contains('ai')?'spark':({'名称':'book','开始日期':'cal','目标日期':'cal','生日日期':'cal','日期类型':'cal','循环':'repeat','结束条件':'flag','备注':'note'}[row.querySelector('.label')?.textContent]);const svg=row.querySelector('svg');if(svg&&key&&!(key==='book'&&draft.type==='birthday')){const img=document.createElement('img');img.src='assets/figma/'+assets[key]+'.svg';img.alt='';img.className='figma-icon';svg.replaceWith(img)}});
 phone.querySelectorAll('.btn,.back,.plain,.day,.sheet .row,.plus,.month span,.month small,.phone-row,.danger-text,.subfield').forEach(x=>button(x));
 phone.querySelectorAll('.annotation-target').forEach(x=>x.classList.remove('annotation-target'));
 if(id==='137:4025')saveTimer=setTimeout(commit,450);
}
const oldRender=renderPhone;renderPhone=function(){oldRender();const overlay=phone.querySelector('.overlay');if(playing&&overlay&&layerBase)phone.innerHTML=layerBase+overlay.outerHTML;enhance();fitPhone()};
fitPhone=function(){if(!reviewMode)return;const box={width:stage.clientWidth,height:stage.clientHeight},notes=!playing&&box.width>620,reserve=notes?210:32;
 const auto=Math.min((box.width-reserve)/390,(box.height-36)/844,1),scale=reviewScale==='fit'?Math.max(.1,auto):Number(reviewScale);
 const width=390*scale,height=844*scale,left=notes?Math.max(200,(box.width-width+180)/2):Math.max(16,(box.width-width)/2);
 phone.style.left=left+'px';phone.style.top='18px';phone.style.transform='scale('+scale+')';
 let spacer=stage.querySelector('.demo-canvas-spacer');if(!spacer){spacer=document.createElement('div');spacer.className='demo-canvas-spacer';stage.append(spacer)}spacer.style.width=(left+width+16)+'px';spacer.style.height=(height+36)+'px';
 requestAnimationFrame(drawReview);
};
function commit(){if(editing&&records[recordIndex]){try{R.rewrite(records[recordIndex],asEvent(draft),pickedScope,selectedISO(),realToday)}catch(e){toast(e.message);go('3:16');return}}else{[year,month,selectedDay]=draft.date.split('-').map(Number);records.push(asEvent(draft))}editing=false;dirty=false;go('137:3376');saveTimer=setTimeout(()=>{if($('screen').value==='137:3376')go('138:6590')},1100)}
function save(){if(R.leapDay(draft.date)){toast('2月29日不生成事项，请选择其他日期');return}if(draft.lunar){toast('农历暂未接入，请使用公历');return}if(!draft.name.trim()){draft.name='';go('137:3529');phone.querySelector('input')?.focus();return}draft.name=draft.name.trim();if(editing){pickedScope=selectedISO()<realToday?'following':'one';go('3:17');return}go('137:4025')}
function cancel(){if(dirty||JSON.stringify(draft)!==baseline){returnScene=$('screen').value;go('137:3616')}else go(editing?'3:15':'3:4')}
function finishSheet(commit=true){if(!commit&&sheetDraft){draft=JSON.parse(JSON.stringify(sheetDraft));sheetDraft=null;dirty=JSON.stringify(draft)!==baseline;go(returnScene);return}const id=$('screen').value;if(id==='137:3182'&&!draft.days.length){toast('请至少选择一个星期');return}dirty=true;go(returnScene)}
const annotationClick=phone.onclick;
phone.onclick=e=>{if(!playing){annotationClick(e);return}const target=e.target;if(target.closest('input'))return;
 const id=$('screen').value,overlay=target.closest('.overlay'),text=target.textContent.trim();
 if(overlay){
  if(target===overlay){if(id==='review:conflict'){go('3:15');return}if(id==='3:18')go('3:15');else if(id==='3:17')go('3:16');else finishSheet(false);return}
  const day=target.closest('.day');if(day){draft.days=draft.days.includes(day.textContent)?draft.days.filter(x=>x!==day.textContent):[...draft.days,day.textContent];day.classList.toggle('selected');dirty=true;return}
  const row=target.closest('.row');if(row?.querySelector('.radio')){overlay.querySelectorAll('.radio').forEach(x=>x.classList.remove('checked'));row.querySelector('.radio').classList.add('checked');const choice=row.textContent.trim();if(id==='3:17'||id==='3:18'){const v={'仅这一次':'one','这次及之后':'following','整个系列':'series'}[choice];if(v==='one'&&selectedISO()<realToday){toast('过去日程保留，不能取消单次历史');return}pickedScope=v;return}if(id==='3:12'){if(choice==='仅工作日'){toast('调休日历暂未接入');return}draft.repeat=choice;dirty=true;const next={'每周':'137:3182','每月':'137:3804','每年':'137:3911'}[choice];if(next)go(next)}else if(id==='3:13'){draft.duration=choice==='不设结束'?choice:'30 天';dirty=true}return}
  if(target.closest('.btn,.plain')){if(id==='review:conflict'){go('3:15');return}if(text==='继续编辑'){go(returnScene);return}if(text==='放弃修改'){dirty=false;go(editing?'3:15':'3:4');return}if(id==='3:18'){if(text==='取消'){go('3:15');return}if(text==='确认删除'){try{R.rewrite(records[recordIndex],null,pickedScope,selectedISO(),realToday);go('144:7580')}catch(e){toast(e.message)}return}}if(id==='3:17'){if(text==='取消'){go('3:16');return}go('137:4025');return}finishSheet()}return;
 }
 if(homeIds.includes(id)){
  const day=target.closest('[data-day],.calcell:not(.weekday)');if(day&&Number(day.textContent)){selectedDay=Number(day.textContent);go(records.length?'3:5':'3:6');return}
  if(target.closest('.phone-add,.phone-plus,.plus')){begin();return}
  const row=target.closest('[data-record]');if(row){recordIndex=Number(row.dataset.record);draft={...(R.shown(records[recordIndex],selectedISO())||records[recordIndex])};go('3:15');return}
  if(target.closest('.sheet-close')){go(records.length?'3:3':'3:4');return}
  if(target.closest('.phone-month button,.month span,.phone-month small,.month small')){if(text==='今天'){const today=new Date();year=today.getFullYear();month=today.getMonth()+1;selectedDay=today.getDate()}else{month+=text==='‹'?-1:1;if(month===0){month=12;year--}if(month===13){month=1;year++}}go(records.length?'3:3':'3:4');renderCalendar();return}
  if(target.closest('.phone-footer,.bottomnav'))toast('本轮演示聚焦事项流程');return;
 }
 if(id==='3:15'){if(target.closest('.danger-text')){go('3:18');return}if(target.closest('.btn,.nav .plain')){begin((records[recordIndex]||draft).type,true);return}if(target.closest('.back'))go(records.length?'138:6590':'3:4');return}
 if(target.closest('.tab')){if(target.closest('.tab').dataset.locked==='1'){toast('开始日期第二天起，类型不可更改');return}const type={'正计时':'up','倒数日':'down','生日':'birthday'}[text];draft.type=type;draft.repeat=type==='down'?'仅一次':type==='birthday'?'每年':'纪念日';dirty=true;go(type==='up'?'3:9':type==='down'?'3:10':'3:11');return}
 if(target.closest('.back,.nav .plain')){cancel();return}
 if(target.closest('.foot .btn')){if(id==='review:fail')go('137:4025');else save();return}
 const row=target.closest('.row'),label=row?.querySelector('.label')?.textContent;
 if(label==='名称'){row.querySelector('input')?.focus();return}
 if(['开始日期','目标日期','生日日期','循环','持续次数'].includes(label)){if(label==='持续次数'&&draft.repeat==='仅一次'){toast('仅一次固定为1次');return}sheetDraft=JSON.parse(JSON.stringify(draft));returnScene=id;go(label==='循环'?'3:12':label==='持续次数'?'review:count':'137:3067');return}
 if(label==='日期类型'){draft.lunar=!draft.lunar;dirty=true;go(draft.lunar?'137:3293':'3:11');return}
 if(target.closest('.ai')){draft.ai=!draft.ai;dirty=true;phone.querySelector('.toggle')?.classList.toggle('on',draft.ai)}
};
function renderCalendar(){const dates=phone.querySelector('.phone-days,.calgrid');if(!dates)return;const weekdays=phone.querySelector('.calgrid')?[...dates.querySelectorAll('.weekday')].map(x=>x.outerHTML).join(''):'';const offset=(new Date(year,month-1,1).getDay()+6)%7,days=new Date(year,month,0).getDate();dates.innerHTML=weekdays+'<span class="blank"></span>'.repeat(offset);for(let d=1;d<=days;d++){const b=document.createElement('button');b.dataset.day=d;b.textContent=d;const day=year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0');if(records.some(r=>R.marked(r,day)))b.dataset.marked='true';b.className=phone.querySelector('.calgrid')?'calcell':'';if(d===selectedDay)b.classList.add(phone.querySelector('.calgrid')?'selected':'chosen');dates.append(b)}setText(phone.querySelector('.phone-month strong,.month b'),year+'年'+month+'月')}
phone.addEventListener('keydown',e=>{if(playing&&(e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button]')&&!e.target.matches('input')){e.preventDefault();e.stopImmediatePropagation();e.target.click()}},true);
const demoButton=document.createElement('button');demoButton.id='mode-demo';demoButton.textContent='网页演示';demoButton.setAttribute('aria-pressed','true');$('mode-figma').before(demoButton);
const modeBase=setReviewMode;setReviewMode=function(value){modeBase(value);document.body.classList.toggle('web-demo',value&&playing);demoButton.setAttribute('aria-pressed',String(value&&playing));$('mode-review').setAttribute('aria-pressed',String(value&&!playing));if(value)renderPhone()};
demoButton.onclick=()=>{if($('screen').value==='review:normal')return;playing=true;setReviewMode(true)};$('mode-review').onclick=()=>{playing=false;setReviewMode(true)};
const selectBase=selectNote;selectNote=function(...args){playing=false;document.body.classList.remove('web-demo');selectBase(...args);demoButton.disabled=$('screen').value==='review:normal';demoButton.setAttribute('aria-pressed','false');$('mode-review').setAttribute('aria-pressed','true')};
const screenBase=$('screen').onchange;$('screen').onchange=e=>{layerBase='';const id=e.target.value;
 demoButton.disabled=id==='review:normal';
 if(id==='review:normal'){
   playing=false;
   setReviewMode(true);
   screenBase(e);
   selectNote('normal-schedule-preview');
   return;
 }
 editing=['3:16','3:17','137:3616','review:fail'].includes(id);draft=sample();if(id==='3:8'||id==='137:3529')draft.name='';if(['3:10','3:12','137:3182','137:3804','137:3911','review:count'].includes(id)){draft.type='down';draft.repeat='仅一次'}if(id==='3:11'||id==='137:3293'){draft.type='birthday';draft.repeat='每年'}if(['3:3','3:5','3:15','3:16','3:18','144:7580'].includes(id)&&!records.length)records=[asEvent(sample()),asEvent({...sample(),name:'考试',type:'down',date:'2026-12-15',repeat:'仅一次'}),asEvent({...sample(),name:'小林生日',type:'birthday',repeat:'每年'})];baseline=JSON.stringify(draft);dirty=false;screenBase(e)};
reviewCaption.textContent='390 × 844 原尺寸等比缩放 · 网页演示可填写并完成新建、编辑、删除；标注模式查看文档连线。V0.5：过去日程自动已发生；演示数据仅在本次页面中保留。';
window.WanshiliPrototype={get records(){return records},get draft(){return draft},selectedISO};baseline=JSON.stringify(draft);
if($('screen').value==='review:normal'){$('screen').onchange({target:$('screen')});}else setReviewMode(true);
})();
