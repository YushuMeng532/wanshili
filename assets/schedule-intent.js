/* Shared checks for Chinese schedule drafts returned by the AI assistant. */
(function (root) {
  'use strict';

  const frequencies = ['once', 'daily', 'weekly', 'monthly', 'yearly', 'workdays', 'weekends'];
  const weekDays = '一二三四五六日';
  const iso = date => date.toISOString().slice(0, 10);
  const offset = (day, count) => iso(new Date(Date.parse(day + 'T00:00:00Z') + count * 86400000));
  const valid = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    day >= '0001-01-01' && Number.isFinite(Date.parse(day + 'T00:00:00Z')) && offset(day, 0) === day;
  const usable = day => valid(day) && !day.endsWith('-02-29');
  const clarify = message => ({ action: 'clarify', message });
  const typeRules = [
    ['up', /正计时|正向计时|从.+(?:开始)?算.{0,4}(?:第几天|天数)/],
    ['down', /倒数日|倒计时|距离.{1,28}还有|距.{1,28}还剩/],
    ['birthday', /生日提醒|生日事项|设(?:置)?(?:为|成)?(?:一个)?生日/],
    ['normal', /普通日程/]
  ];

  function refinePlan(result, input) {
    if (!result || !['create', 'clarify'].includes(result.action)) return result;
    const { today } = input;
    const text = input.text;
    const plain = text.replace(/[「“『"][^」”』"]*[」”』"]/g, ' ');
    if (!valid(today) || /(?:取消|删除|改期|改到|查找|查询|看看|结束正计时)|(?:再(?:建|加|设|记)|另外(?:建|加|设|记)|同时(?:建|加|设|记))/.test(plain)) return result;
    if (/农历|阴历|隔(?:天|周|月|[0-9一二三四五六七八九十]+天)|每月.{0,3}第[一二三四五1-5]个?(?:周|星期)/.test(plain)) {
      return clarify('当前支持公历和固定循环。请换成具体公历日期或支持的循环方式。');
    }

    const explicit = typeRules.filter(([, re]) => re.test(plain)).map(([type]) => type);
    if (explicit.length > 1) return clarify('想创建哪种日程？请选普通日程、正计时、倒数日或生日。');
    const type = explicit[0] || (/生日|生辰/.test(plain) ? 'birthday' :
      /纪念日|相识|恋爱纪念|我们在一起/.test(plain) ? 'up' : result.type || 'normal');
    const weekly = /每\s*(?:个)?(?:周|星期|礼拜)([一二三四五六日天1-7](?:(?:、|和|及|与|,|，|\s)+(?:周|星期|礼拜)?[一二三四五六日天1-7])*)?/.exec(plain);
    const selectedWeekDays = weekly?.[1]?.replace(/星期/g,'')?.match(/[一二三四五六日天1-7]/g)?.map(d => Number(d) || weekDays.indexOf(d === '天' ? '日' : d) + 1);
    const rule = /工作日|上班日|法定工作日/.test(plain) ? 'workdays' :
      /周末|双休日/.test(plain) ? 'weekends' : /每天|每日/.test(plain) ? 'daily' :
      weekly ? 'weekly' : /每月|每个月/.test(plain) ? 'monthly' :
      /每年|每年的/.test(plain) ? 'yearly' : /仅一次|只(?:有|记|设)?一次|不循环|不重复/.test(plain) ? 'once' : null;
    const repeat = type === 'up' ? 'once' : type === 'birthday' ? 'yearly' : rule ||
      (frequencies.includes(result.repeat) ? result.repeat : 'once');
    const weekdays = repeat === 'weekly' ? [...new Set(selectedWeekDays || (Array.isArray(result.weekdays) ? result.weekdays.filter(d => Number.isInteger(d) && d >= 1 && d <= 7) : []))] : [];
    const monthDay = repeat === 'monthly' && /月末|月底|最后一天/.test(plain) ? 31 :
      repeat === 'monthly' ? Number(/每\s*(?:个)?月\s*(\d{1,2})[号日]/.exec(plain)?.[1]) || null : null;
    if (monthDay && monthDay > 31) return clarify('每月重复的日期应该是 1 到 31 日。');
    const hasDateWords = /\d{1,4}\s*(?:年|月|号|日)|\d{1,4}[-/.]\d|今天|明天|后天|昨天|前天|(?:本|这|下|上)(?:周|星期|礼拜|月|年)|今年|明年|去年|月初|月末|月底|国庆|元旦|圣诞|端午|中秋|春节|劳动节|儿童节|教师节|\d+天[后前]|(?:周|星期|礼拜)[一二三四五六日天]/.test(weekly ? plain.replace(weekly[0], ' ') : plain);
    const date = result.date;
    if (type === 'down' && /从(?:今天|明天|后天|昨天)开始.{0,15}(?:倒数|倒计时)$/.test(plain) &&
        !/\d+[年月日号]|(?:本|这|下|上)(?:周|星期|礼拜)[一二三四五六日天]/.test(plain)) {
      return clarify('倒数日的目标是哪一天？');
    }
    let start = date;
    let nextEligible = false;
    const weekdayWord = /(?:本|这|下|上)(?:周|星期|礼拜)([一二三四五六日天])/.exec(plain);
    const simpleRelative = /昨天|前天|今天|明天|大后天|后天/.exec(plain);
    if (weekdayWord && !/(?:上|下|本|这)(?:周|星期|礼拜).+(?:上|下|本|这)(?:周|星期|礼拜)|\d+[年月日号]/.test(plain)) {
      const weekday = weekDays.indexOf(weekdayWord[1] === '天' ? '日' : weekdayWord[1]);
      const todayIndex = (new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7;
      start = offset(today, weekday - todayIndex + ({ 下: 7, 上: -7 }[weekdayWord[0][0]] || 0));
    } else if (simpleRelative && !/(?:昨天|前天|今天|明天|大后天|后天).+(?:昨天|前天|今天|明天|大后天|后天)|\d+[年月日号]/.test(plain)) {
      start = offset(today, { 前天: -2, 昨天: -1, 今天: 0, 明天: 1, 后天: 2, 大后天: 3 }[simpleRelative[0]]);
    } else if (!hasDateWords && ['workdays','weekends','daily','weekly'].includes(repeat) &&
        (type === 'normal' || type === 'down')) {
      start = today;
      nextEligible = true;
    } else if (monthDay && !/从|开始|起|(?:本|这|下|上)月|\d{4}年/.test(plain)) {
      start = today;
      nextEligible = true;
    } else if (!hasDateWords) {
      return clarify(type === 'up' ? '这个正计时从哪一天开始？' : type === 'down' ? '倒数日的目标是哪一天？' :
        type === 'birthday' ? '生日是公历几月几日？' : repeat === 'monthly' ? '想在每月几号重复？' : '这个日程安排在哪一天？');
    }
    if (!nextEligible && !simpleRelative && !weekdayWord && /(?:下|上|这|本)(?:个)?月|(?:今|明|去)年|(?:下|上|这|本)周/.test(plain) &&
        !/\d{1,2}[日号]|\d{1,2}[/.\-]\d{1,2}|月初|月中|月底|月末|(?:周|星期|礼拜)[一二三四五六日天]/.test(plain)) {
      return clarify('请补充这个日程的具体日期。');
    }
    if (repeat === 'weekly' && !weekdays.length) return clarify('想在每周哪几天重复？');
    const named = /(?:叫(?:做)?|名为|名称是)\s*[「“『"]?([^，。！？、；」”』"]{1,60})/.exec(text)?.[1]?.trim();
    const anniversary = /(?:是|为)(?:我们|我|你们|他们)?(?:的)?([^，。！？；]{1,50}纪念日)(?=[，。！？；]|$)/.exec(text)?.[1]?.trim();
    if (typeof date === 'string' && date.endsWith('-02-29') && result.action === 'create' && !nextEligible) return clarify('万事历不在 2 月 29 日安排日程，请换一天。');
    if (!usable(start) || (result.action === 'clarify' && !named && !anniversary)) return result.action === 'clarify' ? result : clarify('请确认一个可用的公历日期。');
    const title = (typeof result.title === 'string' ? result.title.trim() : '') || named || anniversary;
    if (!title) return clarify('要给这个日程取什么名称？');
    const count = Number(/(?:共|持续|重复)\s*(\d{1,5})\s*次/.exec(plain)?.[1]);
    return {
      ...result, action: 'create', title: title.slice(0, 60), type, repeat, weekdays, date: start, monthDay, nextEligible,
      occurrences: type === 'up' || repeat === 'once' ? null : count > 0 && count <= 10000 ? count : result.occurrences ?? null
    };
  }

  root.WanshiliScheduleIntent = { refinePlan };
})(typeof window === 'object' ? window : globalThis);
