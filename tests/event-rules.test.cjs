const assert=require('node:assert/strict');require('../assets/event-rules.js');const R=globalThis.WanshiliRules;let n=0;function check(v,label){assert.ok(v,label);n++}
const make=(o={})=>({id:'e',title:'旧名称',type:'down',date:'2026-11-17',calendarType:'solar',recurrence:{frequency:'daily'},endCondition:null,...o});
const up=R.normalize(make({type:'up'}));check(up.recurrence.frequency==='none'&&!up.endCondition,'纪念日不循环');check(R.label(up,'2026-11-17')==='第1天','起始日为第1天');check(R.label(up,'2026-11-20')==='第4天','跟随选中日期');check(!R.shown(up,'2026-11-16'),'起点之前不显示');check(R.marked(up,'2026-11-17')&&!R.marked(up,'2026-11-18'),'纪念日只标开始日');check(R.shown(up,'2026-11-18'),'下方仍显示累计');
const down=make({date:'2026-11-21',recurrence:{frequency:'once'}});check(R.label(down,'2026-11-19')==='还有2天','选中日前倒数');check(R.label(down,'2026-11-21')==='就是今天','零日');check(R.label(down,'2026-11-22')==='已过1天','目标之后');check(!R.marked(down,'2026-11-19')&&R.shown(down,'2026-11-19'),'标记与列表分离');check(R.marked(down,'2026-11-21'),'归零日标记');
for(const d of [29,30,31]){const e=make({date:'2026-01-'+d,recurrence:{frequency:'monthly',monthDay:d}});check(R.occurrence(e,'2026-02-28'),'不足回退月末'+d);check(!R.occurrence(e,'2028-02-29'),'闰日回退跳过'+d);check(R.occurrence(e,'2028-03-'+d),'其他闰年月份正常'+d)}
check(!R.occurrence(up,'2028-02-29'),'正计时闰日不生成');check(R.label(up,'2028-03-01')==='第'+(R.diff('2028-03-01',up.date)+1)+'天','累计按真实公历');check(R.occurrence(up,'2028-02-28')&&R.occurrence(up,'2028-03-01'),'仅跳过2月29');
const limited=make({date:'2028-01-31',recurrence:{frequency:'monthly',monthDay:31},endCondition:3});for(const d of ['2028-01-31','2028-03-31','2028-04-30'])check(R.occurrence(limited,d),'按次数生成'+d);check(!R.occurrence(limited,'2028-05-31'),'第三次后结束');
for(const scope of ['one','following','series']){const e=make();R.rewrite(e,{...e,title:'新名称'},scope,'2026-11-21','2026-11-19');check(R.occurrence(e,'2026-11-18').title==='旧名称',scope+'保留历史');check(R.occurrence(e,'2026-11-21').title==='新名称',scope+'选中实例更新');check(R.occurrence(e,'2026-11-20').title===(scope==='series'?'新名称':'旧名称'),scope+'选中之前');check(R.occurrence(e,'2026-11-22').title===(scope==='one'?'旧名称':'新名称'),scope+'选中之后')}
for(const scope of ['one','following','series']){const e=make();R.rewrite(e,null,scope,'2026-11-21','2026-11-19');check(R.occurrence(e,'2026-11-18'),scope+'删除保留历史');check(!R.occurrence(e,'2026-11-21'),scope+'取消当日');check(!!R.occurrence(e,'2026-11-20')===(scope!=='series'),scope+'取消起点');check(!!R.occurrence(e,'2026-11-22')===(scope==='one'),scope+'取消未来')}
const moved=make({recurrence:{frequency:'once'},date:'2026-11-21'});R.rewrite(moved,{...moved,date:'2026-11-22'},'one','2026-11-21','2026-11-19');check(!R.occurrence(moved,'2026-11-21')&&R.occurrence(moved,'2026-11-22'),'单次改期迁移实例');
const past=make();assert.throws(()=>R.rewrite(past,null,'one','2026-11-18','2026-11-19'));n++;R.rewrite(past,null,'series','2026-11-18','2026-11-19');check(R.occurrence(past,'2026-11-18')&&!R.occurrence(past,'2026-11-19'),'过去选日整系列边界为今天');
const sum=R.summary([up,make({id:'other',type:'up'})],['2026-11-17','2026-11-18','2026-11-19','2026-11-20'],'2026-11-19');check(sum.total.length===2&&sum.byType.up.length===2,'按过去日期并集');check(!R.occurrence(make({calendarType:'lunar'}),'2026-11-19'),'农历未接入');check(!R.occurrence(make({recurrence:{frequency:'workdays'}}),'2026-11-19'),'调休不代算');
const before=make({date:'2026-11-21',recurrence:{frequency:'once'}});R.rewrite(before,{...before,title:'改标题'},'one','2026-11-19','2026-11-19');check(!R.occurrence(before,'2026-11-19'),'提前查看并单次改标题不伪造归零实例');const skip=make();R.rewrite(skip,null,'one','2026-11-21','2026-11-19');check(R.label(R.at(skip,'2026-11-20'),'2026-11-20',skip)==='就是今天','当日未取消则归零');check(R.label(R.config(skip),'2026-11-21',skip)==='还有1天','取消实例之后寻找下一计划');
const stopped=R.normalize(make({id:'stopped',type:'up'}));
R.rewrite(stopped,{...stopped,title:'现名称'},'series','2026-11-23','2026-11-23');
check(!R.canEndCountup(stopped,'2026-11-20','2026-11-23'),'只有选中今天可以结束');
check(R.canEndCountup(stopped,'2026-11-23','2026-11-23'),'进行中可以结束');
R.endCountup(stopped,'2026-11-23');
const reloaded=JSON.parse(JSON.stringify(stopped));
check(R.marked(reloaded,'2026-11-17')&&R.marked(reloaded,'2026-11-23'),'持久化后正计时首尾标记');
check(!R.marked(reloaded,'2026-11-20'),'中间日期不标记');
check(R.label(R.shown(reloaded,'2026-11-20'),'2026-11-20')==='第4天','中间日期保留当日天数');
check(R.label(R.shown(reloaded,'2026-11-23'),'2026-11-23')==='已结束 · 共 7 天','结束当天计入最终天数');
check(!R.shown(reloaded,'2026-11-24')&&!R.occurrence(reloaded,'2026-11-24'),'结束后不展示或生成实例');
assert.throws(()=>R.endCountup(reloaded,'2026-11-24'));
n++;
const sameDay=R.normalize(make({id:'same',type:'up',date:'2026-11-23'}));
R.endCountup(sameDay,'2026-11-23');
check(R.label(R.marked(sameDay,'2026-11-23'),'2026-11-23')==='已结束 · 共 1 天','同一天开始并结束为1天');
check(R.summary([sameDay],['2026-11-23'],'2026-11-23').total.length===0,'结束当天暂不计入统计');
check(R.summary([sameDay],['2026-11-23'],'2026-11-24').byType.up.length===1,'结束日进入次日后计入统计');

const normal=R.normalize(make({id:'normal',type:'normal',date:'2026-11-23',recurrence:{frequency:'weekly',weekdays:[1]},endCondition:2}));
check(R.shown(normal,'2026-11-23')&&R.marked(normal,'2026-11-30'),'普通日程在两次计划日出现');
check(!R.shown(normal,'2026-11-24')&&!R.marked(normal,'2026-12-07'),'非计划日和次数用完后均不显示');
check(R.summary([normal],['2026-11-23','2026-11-30'],'2026-11-30').byType.normal.join()==='2026-11-23','普通日程统计仅计算过去');
console.log(JSON.stringify({passed:true,checks:n}));
