/* Chinese lunar month sizes for lunar years 1900–2100, generated from Node 24 ICU
   Chinese calendar with the Asia/Shanghai timezone. Sample boundaries are checked
   against the Hong Kong Observatory Gregorian–Lunar conversion tables.
   https://www.hko.gov.hk/sc/gts/time/conversion.htm
   Bits 15–4 encode the 12 regular month lengths, bits 3–0 the leap month,
   and bit 16 the leap month length. */
(function (root) {
  'use strict';
  const firstYear = 1900, lastYear = 2100;
  const yearData = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x18da3, 0x095b0, 0x14977, // 1910
    0x04970, 0x0a4b0, 0x1b0b6, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920
    0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940
    0x06ca0, 0x0b550, 0x15355, 0x04db0, 0x025b0, 0x18573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x1ad47, 0x0ab60, 0x09570, // 1980
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096e5, 0x092e0, // 1990
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000
    0x0a950, 0x0b4a0, 0x0bca4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x05270, 0x0a930, // 2010
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4f0, 0x05260, 0x0ea65, 0x0d520, // 2020
    0x0daa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050
    0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060
    0x092d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, // 2090
    0x0d520, // 2100
  ];
  const dayMs = 86400000;
  const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  const dayNames = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ];
  const calendar = new Map();
  let cursor = Date.UTC(1900, 0, 31);
  for (const [index, word] of yearData.entries()) {
    const leap = word & 15;
    const start = cursor;
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const days = word & (0x10000 >> month) ? 30 : 29;
      months.push({ month, isLeap: false, days, start: cursor, monthName: monthNames[month - 1] });
      cursor += days * dayMs;
      if (month === leap) {
        const days = word & 0x10000 ? 30 : 29;
        months.push({ month, isLeap: true, days, start: cursor, monthName: '闰' + monthNames[month - 1] });
        cursor += days * dayMs;
      }
    }
    calendar.set(firstYear + index, { start, end: cursor, leap, months });
  }

  function monthsInYear(year) {
    return (calendar.get(year)?.months || []).map(({ month, isLeap, days, monthName }) =>
      ({ month, isLeap, days, monthName }));
  }

  function leapMonth(year) {
    return calendar.get(year)?.leap || 0;
  }

  function lunarToSolar(year, month, day, isLeap = false) {
    const entry = calendar.get(year)?.months.find(item => item.month === month && item.isLeap === isLeap);
    if (!entry || !Number.isInteger(day) || day < 1 || day > entry.days) return null;
    return new Date(entry.start + (day - 1) * dayMs).toISOString().slice(0, 10);
  }

  function solarToLunar(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const timestamp = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
    let year = Number(value.slice(0, 4));
    if (year > lastYear || timestamp < calendar.get(year)?.start) year -= 1;
    const entry = calendar.get(year);
    if (!entry || timestamp < entry.start || timestamp >= entry.end) return null;
    const { month, isLeap, start, monthName } = entry.months.findLast(item => item.start <= timestamp);
    const day = (timestamp - start) / dayMs + 1;
    return { year, month, day, isLeap, monthName, dayName: dayNames[day - 1] };
  }

  function formatDate(month, day, isLeap = false) {
    return (isLeap ? '闰' : '') + monthNames[month - 1] + dayNames[day - 1];
  }

  root.WanshiliLunar = {
    firstYear, lastYear, solarToLunar, lunarToSolar, monthsInYear, leapMonth, hasLeapMonth: leapMonth, formatDate
  };
})(typeof window === 'object' ? window : globalThis);
