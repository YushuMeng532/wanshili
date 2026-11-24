/* Product rules shared by the trial and review prototype. */
(function(root){'use strict';
const DAY=86400000,clone=x=>JSON.parse(JSON.stringify(x));
const stamp=s=>Date.parse(s+'T00:00:00Z');
const iso=n=>new Date(n).toISOString().slice(0,10),diff=(a,b)=>Math.round((stamp(a)-stamp(b))/DAY);
const leapDay=s=>s.slice(5)==='02-29',weekday=s=>(new Date(stamp(s)).getUTCDay()+6)%7+1;
const config=e=>{const c=clone(e);for(const key of ['id','segments','exceptions','createdAt','updatedAt'])delete c[key];return c};
function segments(e){return e.segments||[{from:'0001-01-01',to:null,value:e}]}
function segmentValue(e,day){
  const segment=e.segments?.find(s=>day>=s.from&&(!s.to||day<s.to));
  return e.segments ? (segment?.cancelled ? null : segment?.value) : e;
}
function resolve(e,day){
  if(!e)return null;
  const exception=e.exceptions?.[day];
  if(exception?.cancelled)return null;
  const value=exception?.override??segmentValue(e,day);
  return value?.type==='up'&&e.endDate ? {...value,endDate:e.endDate} : value;
}
function at(e,day){
  const value=resolve(e,day);
  return value ? {...config(value),id:e.id} : null;
}
function matches(e,day){
  if(!e||leapDay(day)||e.calendarType==='lunar'||day<e.date)return false;
  if(e.type==='up')return !e.endDate||day<=e.endDate;
  const rule=e.recurrence||{frequency:'once'};
  switch(rule.frequency){
    case 'once': return day===e.date;
    case 'daily': return true;
    case 'weekly': return (rule.weekdays||[]).includes(weekday(day));
    case 'weekends': return weekday(day)>=6;
    case 'monthly': {
      const year=Number(day.slice(0,4)),month=Number(day.slice(5,7));
      return Number(day.slice(8,10))===Math.min(rule.monthDay||Number(e.date.slice(8,10)),monthLength(year,month));
    }
    case 'yearly':
      return Number(day.slice(5,7))-1===(rule.yearMonth??(Number(e.date.slice(5,7))-1))&&
        Number(day.slice(8,10))===(rule.yearDay||Number(e.date.slice(8,10)));
    default: return false;
  }
}
const later=(a,b)=>a>b?a:b;
const earlier=(a,b)=>a<b?a:b;
const monthIndex=day=>Number(day.slice(0,4))*12+Number(day.slice(5,7))-1;
const monthLength=(year,month)=>{
  const last=new Date(0);
  last.setUTCFullYear(year,month,0);
  return last.getUTCDate();
};
const dated=(year,month,day)=>String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
let leapDates;
function leapCount(start,end,weekdays){
  if(!leapDates){
    leapDates=Array.from({length:8},()=>[]);
    for(let year=4;year<=9999;year+=4){
      if(year%100===0&&year%400!==0)continue;
      const day=dated(year,2,29);
      leapDates[0].push(day);
      leapDates[weekday(day)].push(day);
    }
  }
  function bound(days,target,inclusive){
    let low=0,high=days.length;
    while(low<high){
      const mid=(low+high)>>1;
      if(days[mid]<target||(inclusive&&days[mid]===target))low=mid+1;
      else high=mid;
    }
    return low;
  }
  return weekdays.reduce((total,day)=>total+bound(leapDates[day],end,true)-bound(leapDates[day],start,false),0);
}
function scheduledCount(e,start,end){
  start=later(start,e.date);
  if(start>end||e.calendarType==='lunar')return 0;
  const rule=e.recurrence||{frequency:'once'};
  const span=diff(end,start)+1;
  if(e.type==='up'){
    end=earlier(end,e.endDate||end);
    return start>end?0:diff(end,start)+1-leapCount(start,end,[0]);
  }
  if(rule.frequency==='once')return matches(e,e.date)&&e.date>=start&&e.date<=end?1:0;
  if(rule.frequency==='daily')return span-leapCount(start,end,[0]);
  if(rule.frequency==='weekly'||rule.frequency==='weekends'){
    const days=rule.frequency==='weekends'?[6,7]:[...new Set(rule.weekdays||[])];
    const first=weekday(start);
    return days.reduce((total,day)=>total+Math.floor((span+6-((day-first+7)%7))/7),0)-leapCount(start,end,days);
  }
  if(rule.frequency==='monthly'){
    const target=rule.monthDay||Number(e.date.slice(8,10));
    const inMonth=day=>{
      const year=Number(day.slice(0,4)),month=Number(day.slice(5,7));
      return dated(year,month,Math.min(target,monthLength(year,month)));
    };
    const first=inMonth(start),last=inMonth(end);
    const eligibleStart=later(start,first),eligibleEnd=earlier(end,last);
    if(eligibleStart>eligibleEnd)return 0;
    return Math.max(0,monthIndex(end)-monthIndex(start)+1-Number(first<start)-Number(last>end)-
      (target>=29?leapCount(eligibleStart,eligibleEnd,[0]):0));
  }
  if(rule.frequency==='yearly'){
    const month=(rule.yearMonth??(Number(e.date.slice(5,7))-1))+1;
    const day=rule.yearDay||Number(e.date.slice(8,10));
    if(day>monthLength(2001,month))return 0;
    const first=Number(start.slice(0,4)),last=Number(end.slice(0,4));
    return Math.max(0,last-first+1-Number(dated(first,month,day)<start)-Number(dated(last,month,day)>end));
  }
  return 0;
}
function budget(value){
  return value.type==='up'||value.recurrence?.frequency==='once'||!value.endCondition?
    Infinity:Math.max(0,value.endCondition-(value.limitUsed||0));
}
function plannedValue(value,day){
  if(!matches(value,day))return false;
  const remaining=budget(value);
  if(remaining===Infinity)return true;
  const start=value.limitFrom||value.date;
  return day>=start&&scheduledCount(value,start,day)<=remaining;
}
function occurrenceValue(e,day,ignoreException=false){
  const value=ignoreException?segmentValue(e,day):resolve(e,day);
  if(!value)return null;
  const resolved=ignoreException&&value.type==='up'&&e.endDate?{...value,endDate:e.endDate}:value;
  if(!ignoreException&&value.type!=='up'&&e.exceptions?.[day]?.forceOccurrence){
    return !leapDay(day)&&value.calendarType!=='lunar'?value:null;
  }
  return plannedValue(resolved,day)?resolved:null;
}
function occurrence(e,day){
  const value=e&&occurrenceValue(e,day);
  return value?{...config(value),id:e.id}:null;
}
function nextTarget(e,day,source){
  const src=source||e;
  const history=segments(src).filter(segment=>!segment.cancelled);
  if(history.every(segment=>segment.value.recurrence?.frequency==='once')){
    const dates=[...new Set([...history.map(segment=>segment.value.date),...Object.keys(src.exceptions||{})])]
      .sort().filter(date=>occurrenceValue(src,date));
    return dates.find(date=>date>=day)||dates.at(-1)||null;
  }
  const first=history.reduce((earliest,segment)=>earlier(earliest,segment.value.date),e.date);
  const from=stamp(day),start=stamp(later(day,first)),minimum=stamp(earlier(day,first));
  const last=stamp('9999-12-31');
  for(let n=start;n<=last&&n<start+DAY*366*8;n+=DAY){
    const date=iso(n);
    if(occurrenceValue(src,date))return date;
  }
  for(let n=from-DAY;n>=minimum;n-=DAY){
    const date=iso(n);
    if(occurrenceValue(src,date))return date;
  }
  return null;
}
function shown(e,day){const value=at(e,day);if(!value||leapDay(day)||value.calendarType==='lunar')return null;if(value.type==='down')return value;return occurrence(e,day)?value:null}
function marked(e,day){const value=occurrence(e,day);return value&&(value.type!=='up'||day===value.date||day===value.endDate)?value:null}
const countupDays=(event,day)=>diff(day,event.date)+1;
function canEndCountup(event,day,today){
  const value=shown(event,day);
  return day===today&&value?.type==='up'&&!value.endDate;
}
function endCountup(event,today){
  if(!canEndCountup(event,today,today))throw Error('该正计时已结束，或今天没有进行中的计划。');
  event.endDate=today;
  event.updatedAt=new Date().toISOString();
}
function label(e,selected,source){if(e.type==='up')return selected===e.endDate?'已结束 · 共 '+countupDays(e,selected)+' 天':'第'+countupDays(e,selected)+'天';if(e.type==='down'){const target=nextTarget(e,selected,source);if(!target||leapDay(target))return leapDay(e.date)?'2月29日暂不生成事项':'没有后续计划';const n=diff(target,selected);return n===0?'就是今天':n>0?'还有'+n+'天':'已过'+(-n)+'天'}return e.type==='birthday'?'每年纪念这一天':''}
const standaloneCountdown=value=>value?.type==='down'&&value.recurrence?.frequency==='once';
function actionDate(event,day){
  const value=resolve(event,day);
  return value?.type==='down'?nextTarget(value,day,event):day;
}
function countBefore(event,boundary){
  if(boundary<='0001-01-01')return 0;
  const end=addDays(boundary,-1);
  let used=0;
  for(const segment of segments(event)){
    if(segment.cancelled||segment.from>end)continue;
    const value=segment.value;
    const start=later(segment.from,value.limitFrom||value.date);
    const stop=segment.to?earlier(end,addDays(segment.to,-1)):end;
    const limit=budget(value);
    const earlierCount=limit===Infinity||start===(value.limitFrom||value.date)?
      0:scheduledCount(value,value.limitFrom||value.date,addDays(start,-1));
    used+=Math.min(scheduledCount(value,start,stop),Math.max(0,limit-earlierCount));
  }
  for(const day of Object.keys(event.exceptions||{})){
    if(day<boundary)used+=Number(Boolean(occurrenceValue(event,day)))-Number(Boolean(occurrenceValue(event,day,true)));
  }
  return used;
}
function boundaryFor(scope,day,today){
  return scope==='series'?today:later(day,today);
}
function remainingCount(event,value,scope,day,today){
  if(scope==='one'||budget({...value,limitUsed:0})===Infinity)return null;
  return Math.max(0,value.endCondition-countBefore(event,boundaryFor(scope,day,today)));
}
function rewrite(e,value,scope,day,today){
  if(!e)throw Error('事项已变更，请重新打开后操作。');
  const source=resolve(e,day);
  if(standaloneCountdown(source)){
    const target=actionDate(e,day);
    if(!target||target<today)throw Error('目标日已过去，历史日程保留。');
    if(value&&value.date!==source.date&&value.date<today)throw Error('移动后的日期不能早于今天。');
    scope='series';
  }else if(scope==='one'&&source?.type==='down'){
    day=actionDate(e,day);
  }
  if(scope==='one'){
    if(!day||day<today)throw Error('过去的日程已发生并保留，请选择今天或未来日期。');
    e.exceptions??={};
    if(!value)e.exceptions[day]={cancelled:true};
    else if(value.date!==at(e,day)?.date){
      if(value.date<today)throw Error('移动后的日期不能早于今天。');
      if(leapDay(value.date))throw Error('2月29日不生成事项。');
      e.exceptions[day]={cancelled:true};
      e.exceptions[value.date]={override:config(value),forceOccurrence:true};
    }else{
      e.exceptions[day]={override:config(value),forceOccurrence:Boolean(occurrenceValue(e,day))};
    }
    e.updatedAt=new Date().toISOString();
    return;
  }
  const boundary=boundaryFor(scope,day,today);
  const future=value?config(value):null;
  if(future){
    delete future.limitFrom;
    delete future.limitUsed;
    if(budget(future)!==Infinity){
      future.limitFrom=boundary;
      future.limitUsed=countBefore(e,boundary);
    }
  }
  const past=segments(e).filter(s=>s.from<boundary).map(s=>({
    ...clone(s),value:s.value?config(s.value):undefined,to:s.to?earlier(s.to,boundary):boundary
  }));
  e.segments=[...past,future?{from:boundary,to:null,value:future}:{from:boundary,to:null,cancelled:true}];
  for(const key of Object.keys(e.exceptions||{}))if(key>=boundary)delete e.exceptions[key];
  if(future){
    delete e.limitFrom;
    delete e.limitUsed;
    Object.assign(e,future);
  }
  e.updatedAt=new Date().toISOString();
}
const addDays=(day,amount)=>iso(stamp(day)+amount*DAY);
const validDay=day=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&day>='0001-01-01'&&Number.isFinite(stamp(day))&&iso(stamp(day))===day;
function statsRange(period,today,custom){
  if(period==='custom')return custom;
  if(period==='week'){
    const start=addDays(today,1-weekday(today));
    return {start,end:addDays(start,6)};
  }
  const start=today.slice(0,7)+'-01';
  const next=new Date(stamp(start));
  next.setUTCMonth(next.getUTCMonth()+1);
  return {start,end:iso(next.getTime()-DAY)};
}
function* datesInRange(start,end){
  for(let next=stamp(start),last=stamp(end);next<=last;next+=DAY)yield iso(next);
}
function summary(events,days,today,include=null){
  const total=new Set();
  const byType={up:new Set(),down:new Set(),birthday:new Set(),normal:new Set()};
  const byEvent=Object.fromEntries(events.map(e=>[e.id,new Set()]));
  const details=Object.create(null);
  for(const day of days){
    if(day>=today)continue;
    for(const event of events){
      const value=occurrenceValue(event,day);
      if(!value||(include&&!include(value,event)))continue;
      total.add(day);
      byType[value.type].add(day);
      byEvent[event.id].add(day);
      const detail=details[event.id]??={last:null,types:Object.create(null)};
      const type=detail.types[value.type]??={last:null,days:new Set()};
      type.days.add(day);
      if(!detail.last||detail.last.day<=day)detail.last={day,value};
      if(!type.last||type.last.day<=day)type.last={day,value};
    }
  }
  const ordered=sets=>Object.fromEntries(Object.entries(sets).map(([key,value])=>[key,[...value].sort()]));
  for(const [id,detail] of Object.entries(details)){
    for(const entry of [detail,...Object.values(detail.types)])entry.last.value={...config(entry.last.value),id};
  }
  return {total:[...total].sort(),byType:ordered(byType),byEvent:ordered(byEvent),details};
}
function normalize(e){if(e.type==='up'){e.recurrence={frequency:'none',weekdays:[]};e.endCondition=null;e.calendarType='solar'}else if(e.recurrence?.frequency==='once')e.endCondition=1;return e}
root.WanshiliRules={stamp,iso,diff,leapDay,weekday,at,shown,marked,occurrence,label,rewrite,summary,normalize,config,countupDays,canEndCountup,endCountup,addDays,validDay,statsRange,datesInRange,actionDate,remainingCount,standaloneCountdown};
})(typeof window==='object'?window:globalThis);
