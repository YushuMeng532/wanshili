/* V0.5 confirmed product rules, shared by the product and review prototype. */
(function(root){'use strict';
const DAY=86400000,clone=x=>JSON.parse(JSON.stringify(x));
const stamp=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)};
const iso=n=>new Date(n).toISOString().slice(0,10),diff=(a,b)=>Math.round((stamp(a)-stamp(b))/DAY);
const leapDay=s=>s.slice(5)==='02-29',weekday=s=>(new Date(stamp(s)).getUTCDay()+6)%7+1;
const config=e=>{const c=clone(e);for(const key of ['id','segments','exceptions','createdAt','updatedAt'])delete c[key];return c};
function segments(e){return e.segments||[{from:'0001-01-01',to:null,value:config(e)}]}
function at(e,day){const x=e.exceptions?.[day];if(x?.cancelled)return null;if(x?.override)return {...clone(x.override),id:e.id};const s=segments(e).find(s=>day>=s.from&&(!s.to||day<s.to));return s&&!s.cancelled?{...clone(s.value),id:e.id}:null}
function matches(e,day){if(!e||leapDay(day)||e.calendarType==='lunar')return false;if(e.type==='up')return day>=e.date;const n=new Date(stamp(day)),start=new Date(stamp(e.date)),r=e.recurrence||{frequency:'once'};if(day<e.date)return false;const last=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()+1,0)).getUTCDate();
return r.frequency==='once'?day===e.date:r.frequency==='daily'?true:r.frequency==='weekly'?(r.weekdays||[]).includes(weekday(day)):r.frequency==='monthly'?n.getUTCDate()===Math.min(r.monthDay||start.getUTCDate(),last):r.frequency==='yearly'?n.getUTCMonth()===(r.yearMonth??start.getUTCMonth())&&n.getUTCDate()===(r.yearDay||start.getUTCDate()):r.frequency==='weekends'?[6,7].includes(weekday(day)):false}
function plannedValue(e,day){if(!matches(e,day))return false;const limit=e.type==='up'?null:e.endCondition;if(!limit||e.recurrence?.frequency==='once')return true;let count=0;for(let n=stamp(e.date),end=stamp(day);n<=end;n+=DAY){if(matches(e,iso(n))&&++count>limit)return false}return true}
function occurrence(e,day){const value=at(e,day);if(e.exceptions?.[day]?.forceOccurrence)return !leapDay(day)&&value?.calendarType!=='lunar'?value:null;return plannedValue(value,day)?value:null}
function nextTarget(e,day,source){if(!source&&e.recurrence?.frequency==='once')return e.date;const src=source||e,start=stamp(day);for(let i=0;i<366*8;i++){const d=iso(start+i*DAY);if(occurrence(src,d))return d}for(let n=start;n>=stamp(e.date);n-=DAY){if(occurrence(src,iso(n)))return iso(n)}return null}
function shown(e,day){const value=at(e,day);if(!value||leapDay(day)||value.calendarType==='lunar')return null;if(value.type==='up')return day>=value.date?value:null;if(value.type==='down')return value;return occurrence(e,day)?value:null}
function marked(e,day){const value=occurrence(e,day);return value&&(value.type!=='up'||day===value.date)?value:null}
function label(e,selected,source){if(e.type==='up')return '第'+(diff(selected,e.date)+1)+'天';if(e.type==='down'){const target=nextTarget(e,selected,source);if(!target||leapDay(target))return leapDay(e.date)?'2月29日暂不生成事项':'没有后续计划';const n=diff(target,selected);return n===0?'就是今天':n>0?'还有'+n+'天':'已过'+(-n)+'天'}return '每年纪念这一天'}
function rewrite(e,value,scope,day,today){if(scope==='one'){if(day<today)throw Error('过去的日程已发生并保留，请选择今天或未来日期。');e.exceptions??={};if(value&&value.date!==at(e,day)?.date){if(value.date<today)throw Error('移动后的日期不能早于今天。');if(leapDay(value.date))throw Error('2月29日不生成事项。');e.exceptions[day]={cancelled:true};e.exceptions[value.date]={override:config(value),forceOccurrence:true}}else e.exceptions[day]=value?{override:config(value)}:{cancelled:true};return}
const boundary=scope==='series'?today:(day<today?today:day),previous=segments(e),past=previous.filter(s=>s.from<boundary).map(s=>({...clone(s),to:!s.to||s.to>boundary?boundary:s.to}));
e.segments=[...past,value?{from:boundary,to:null,value:config(value)}:{from:boundary,to:null,cancelled:true}];
for(const key of Object.keys(e.exceptions||{}))if(key>=boundary)delete e.exceptions[key];
if(value)Object.assign(e,config(value));e.updatedAt=new Date().toISOString();
}
function summary(events,days,today){const all=new Set(),byType={up:new Set(),down:new Set(),birthday:new Set()},byEvent=Object.fromEntries(events.map(e=>[e.id,new Set()]));for(const day of days){if(day>=today)continue;for(const event of events){const value=occurrence(event,day);if(value){all.add(day);byType[value.type].add(day);byEvent[event.id].add(day)}}}return {total:[...all].sort(),byType:Object.fromEntries(Object.entries(byType).map(([k,v])=>[k,[...v].sort()])),byEvent:Object.fromEntries(Object.entries(byEvent).map(([k,v])=>[k,[...v].sort()]))}}
function normalize(e){if(e.type==='up'){e.recurrence={frequency:'none',weekdays:[]};e.endCondition=null;e.calendarType='solar'}else if(e.recurrence?.frequency==='once')e.endCondition=1;return e}
root.WanshiliRules={stamp,iso,diff,leapDay,weekday,at,shown,marked,occurrence,label,rewrite,summary,normalize,config};
})(typeof window==='object'?window:globalThis);
