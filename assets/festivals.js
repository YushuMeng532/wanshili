/* Calendar labels, independent of the annual workday/holiday schedule. */
(function (root) {
  'use strict';

  const chinaDates = {
    '01-01': '元旦',
    '03-12': '植树节',
    '05-01': '劳动节',
    '05-04': '青年节',
    '06-01': '儿童节',
    '09-10': '教师节',
    '10-01': '国庆节'
  };
  const lunarDates = {
    '1-1': '春节',
    '1-15': '元宵节',
    '5-5': '端午节',
    '7-7': '七夕',
    '8-15': '中秋节',
    '9-9': '重阳节',
    '12-8': '腊八节'
  };
  const internationalDates = {
    '02-14': ['情人节'],
    '03-08': ['国际妇女节', '妇女节'],
    '04-01': ['愚人节'],
    '04-22': ['世界地球日', '地球日'],
    '04-23': ['世界读书日', '读书日'],
    '06-05': ['世界环境日', '环境日'],
    '10-31': ['万圣夜'],
    '11-01': ['万圣节'],
    '11-20': ['世界儿童日', '儿童日'],
    '12-24': ['平安夜'],
    '12-25': ['圣诞节']
  };

  // April day of Qingming for 1900–2100, generated using lunar-javascript 1.7.8 (MIT).
  // https://github.com/6tail/lunar-javascript
  // Spot-checked against the Hong Kong Observatory's Gregorian–Lunar tables.
  const qingmingAprilDays = [
    '5566556655665556555655565',
    '5565556555655565556555555',
    '5555555555555555555555555',
    '5455545554555455545554555',
    '4555455544554455445544554',
    '4554455445544554445444544',
    '4544454445444544454445444',
    '4444444444444444444444444',
    '5',
  ].join('');

  // Gregorian computus, used for the Western observance of Easter.
  function easter(year) {
    const golden = year % 19;
    const century = Math.floor(year / 100);
    const yearOfCentury = year % 100;
    const leapCenturies = Math.floor(century / 4);
    const correction = Math.floor((century + 8) / 25);
    const epact = (19 * golden + century - leapCenturies - Math.floor((century - correction + 1) / 3) + 15) % 30;
    const offset = (32 + 2 * (century % 4) + 2 * Math.floor(yearOfCentury / 4) - epact - yearOfCentury % 4) % 7;
    const correctionDay = Math.floor((golden + 11 * epact + 22 * offset) / 451);
    const value = epact + offset - 7 * correctionDay + 114;
    return [Math.floor(value / 31), value % 31 + 1];
  }

  function forDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const time = new Date(date + 'T00:00:00Z');
    if (!Number.isFinite(time.getTime()) || time.toISOString().slice(0, 10) !== date) return [];
    const year = time.getUTCFullYear(), month = time.getUTCMonth() + 1, day = time.getUTCDate();
    if (!year) return [];
    const china = [];
    const international = [];
    const fixedChina = chinaDates[date.slice(5)];
    if (fixedChina) china.push(fixedChina);
    if (month === 4 && day === Number(qingmingAprilDays[year - 1900])) china.push('清明节');

    const lunarCalendar = root.WanshiliLunar;
    const lunar = lunarCalendar?.solarToLunar(date);
    if (lunar) {
      const lunarName = lunarDates[lunar.month + '-' + lunar.day];
      if (!lunar.isLeap && lunarName) china.push(lunarName);
      if (lunar.month === 12 && lunar.day >= 29) {
        const lastMonth = lunarCalendar.monthsInYear(lunar.year).at(-1);
        if (lunar.isLeap === lastMonth.isLeap && lunar.day === lastMonth.days) china.push('除夕');
      }
    }

    const fixedInternational = internationalDates[date.slice(5)];
    if (fixedInternational) international.push(fixedInternational);
    if (year >= 1583 && (month === 3 || month === 4)) {
      const [easterMonth, easterDay] = easter(year);
      if (month === easterMonth && day === easterDay) international.push(['复活节']);
    }
    const weekday = time.getUTCDay(), week = Math.ceil(day / 7);
    if (month === 5 && weekday === 0 && week === 2) international.push(['母亲节']);
    if (month === 6 && weekday === 0 && week === 3) international.push(['父亲节']);
    if (month === 11 && weekday === 4 && week === 4) international.push(['感恩节（美国）', '感恩节']);

    return [
      ...china.map(name => ({ name, shortName: name, category: 'china' })),
      ...international.map(([name, shortName = name]) => ({ name, shortName, category: 'international' }))
    ];
  }

  root.WanshiliFestivals = { forDate };
})(typeof window === 'object' ? window : globalThis);
