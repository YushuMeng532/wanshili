(() => {
  'use strict';

  const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const typeNames = { normal: '普通日程', up: '正计时', down: '倒数日', birthday: '生日' };
  const repeatNames = { once: '仅一次', daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年', workdays: '仅工作日（含调休）', weekends: '仅周末' };
  const labels = { find: '查看', move: '改期', cancel: '删除', end: '结束正计时' };
  const labelDate = day => new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'UTC', dateStyle: 'full'
  }).format(new Date(day + 'T00:00:00Z'));
  const errorMessage = {
    forbidden: '当前页面没有获得 AI 服务的访问权限。',
    unavailable: 'AI 服务暂不可用，请稍后重试。',
    not_found: '当前 AI 接口地址不可用。',
    method_not_allowed: '当前 AI 接口不支持此请求。',
    upstream_timeout: '模型响应超时，可以稍后重试。',
    rate_limited: '试用请求较多，请过一分钟再试。',
    daily_limit: '今天的 AI 试用额度已用完，明天可再试。',
    invalid: '请检查输入内容后重试。',
    invalid_result: 'AI 没有返回可用的结果，可以更换说法后重试。'
  };
  function configuredEndpoint(value) {
    try {
      const url = new URL(value);
      const local = ['localhost', '127.0.0.1'].includes(url.hostname) && url.origin === location.origin;
      if ((url.protocol === 'https:' || local) && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash) {
        return url.origin;
      }
    } catch {}
    return null;
  }

  window.WanshiliAI = function ({ open, openDraft, prepareDraft, matches, openMatch, monthlyReview, openReviewCalendar, readToday }) {
    const endpoint = configuredEndpoint(window.WANSHILI_AI_ENDPOINT);
    const dialog = document.getElementById('sub-dialog');
    let pending, recognition, activeReview;

    function cancelWork() {
      pending?.abort();
      pending = undefined;
      recognition?.cancel();
    }
    dialog.addEventListener('close', () => {
      if (!dialog.open) cancelWork();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) recognition?.cancel('听写已停止。可以再试，或直接输入。');
    });

    function show(title, html) {
      cancelWork();
      activeReview = undefined;
      open(title, html);
      return dialog.querySelector('.sub-body');
    }

    async function probe() {
      try {
        const response = await fetch(endpoint + '/health', {
          cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(2500)
        });
        if (response.status === 200 || response.status === 503) return await response.json();
      } catch {}
      return null;
    }

    async function call(path, input, panel, submit, status) {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      submit.disabled = true;
      status.textContent = 'AI 正在处理…';
      const timer = setTimeout(() => controller.abort(), 22000);
      const current = () => panel.isConnected && dialog.open && pending === controller;
      try {
        const response = await fetch(endpoint + path, {
          method: 'POST', credentials: 'omit', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal
        });
        const data = response.ok ? await response.json() : await response.json().catch(() => null);
        if (!current()) return;
        if (!response.ok) {
          const code = data?.error || ({ 403: 'forbidden', 404: 'not_found', 405: 'method_not_allowed' })[response.status];
          status.textContent = errorMessage[code] || errorMessage.unavailable;
          return;
        }
        status.textContent = '';
        return data;
      } catch (error) {
        if (!current()) return;
        const timedOut = error.name === 'AbortError';
        status.textContent = timedOut ? '本次请求超时，可以重试。' : errorMessage.unavailable;
        if (!timedOut && error.name !== 'TypeError') return;
        if (!timedOut) status.textContent = '当前网络未能连上 AI 服务，可稍后重试。';
        const info = await probe();
        if (!current()) return;
        if (info?.ready === false) status.textContent = 'AI 服务配置未就绪，请稍后再试。';
        else if (info?.ready === true || info?.reachable === true) status.textContent = timedOut
          ? 'AI 服务可以连接，但本次请求超时，可稍后重试。'
          : 'AI 服务可以连接，但本次请求失败，可稍后重试。';
      } finally {
        clearTimeout(timer);
        if (pending === controller) {
          pending = undefined;
          if (panel.isConnected) submit.disabled = false;
        }
      }
    }

    async function checkConnection(button, status) {
      if (pending) return;
      const controller = new AbortController();
      pending = controller;
      button.disabled = true;
      const timer = setTimeout(() => controller.abort(), 8000);
      status.textContent = '正在检查解析接口…';
      try {
        const response = await fetch(endpoint + '/api/plan', {
          method: 'POST', credentials: 'omit', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: '{}', signal: controller.signal
        });
        const data = await response.json().catch(() => null);
        if (pending !== controller) return;
        status.textContent = response.status === 400 && data?.error === 'invalid'
          ? '浏览器已连通解析接口。请再试一次解析。'
          : '解析接口返回 HTTP ' + response.status + (data?.error ? '（' + data.error + '）' : '') + '。';
      } catch (error) {
        if (pending !== controller) return;
        const info = await probe();
        if (pending !== controller) return;
        status.textContent = info?.reachable === true || info?.ready === true
          ? '健康检查已通过，但浏览器未收到解析接口的 POST 响应。'
          : '浏览器未收到 AI 服务的响应。';
      } finally {
        clearTimeout(timer);
        if (pending === controller) pending = undefined;
        button.disabled = false;
      }
    }

    function attachDictation(panel, limit, resultMessage) {
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      const input = panel.querySelector('textarea');
      const submit = panel.querySelector('[type="submit"]');
      const status = panel.querySelector('[role="status"]');
      const speak = panel.querySelector('[data-speak]');
      const connectionCheck = panel.querySelector('[data-ai-check]');
      if (!speak || !Speech) return;
      speak.onclick = () => {
        if (recognition || pending) return;
        const wave = panel.querySelector('[data-ai-listening]');
        const noSpeech = '没听到语音。可以重新听写，或直接输入。';
        let session;
        try { session = new Speech(); }
        catch {
          status.textContent = '听写暂不可用，可以使用键盘听写或直接输入。';
          return;
        }
        session.lang = 'zh-CN';
        session.continuous = false;
        session.interimResults = false;

        let timer, transcript = '', stopping = false;
        const active = () => recognition === work;
        const work = {
          cancel(message) {
            finish(message);
            try { session.abort(); } catch {}
          }
        };
        recognition = work;

        function finish(message) {
          if (!active()) return;
          clearTimeout(timer);
          recognition = undefined;
          wave.hidden = true;
          speak.disabled = submit.disabled = false;
          if (connectionCheck) connectionCheck.disabled = false;
          input.readOnly = false;
          if (message) {
            status.textContent = message;
          } else if (transcript) {
            input.value = transcript.slice(0, limit);
            status.textContent = resultMessage;
          } else {
            status.textContent = noSpeech;
          }
        }

        function arm(callback, delay) {
          clearTimeout(timer);
          timer = setTimeout(callback, delay);
        }

        function stop() {
          if (!active() || stopping) return;
          stopping = true;
          wave.hidden = true;
          status.textContent = '正在转成文字…';
          arm(() => work.cancel(transcript ? undefined : noSpeech), 5000);
          try { session.stop(); }
          catch { work.cancel(); }
        }

        speak.disabled = submit.disabled = true;
        if (connectionCheck) connectionCheck.disabled = true;
        input.readOnly = true;
        status.textContent = '正在开启麦克风…';
        arm(() => work.cancel('麦克风启动超时，可以检查权限后重试。'), 15000);
        session.onstart = () => {
          if (!active()) return;
          wave.hidden = false;
          status.textContent = '可以说话了，停顿后会自动结束。';
          arm(stop, 6000);
        };
        session.onspeechstart = () => {
          if (active() && !stopping) arm(stop, 30000);
        };
        session.onspeechend = stop;
        session.onresult = event => {
          if (!active()) return;
          transcript = Array.from(event.results, item => item[0].transcript).join('').trim();
        };
        session.onerror = event => {
          if (event.error === 'no-speech') finish();
          else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            finish('麦克风权限未开启，可以授权后重试，或直接输入。');
          } else {
            finish('听写暂不可用，可以使用键盘听写或直接输入。');
          }
        };
        session.onend = () => finish();
        try { session.start(); }
        catch { work.cancel('听写暂不可用，可以直接输入。'); }
      };
    }

    function voice(text = '') {
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      const panel = show('AI 录入日程',
        '<form class="ai-live-form" id="voice-ai-form"><label for="ai-calendar-text">你想安排什么？</label>' +
        '<textarea id="ai-calendar-text" rows="4" maxlength="280" placeholder="例如：明天交报告" required></textarea>' +
        '<p>' + (Speech ? '可以点「开始听写」用语音，也可以直接输入。点「解析日程」会将确认后的文字、当前日期和时区发送给 AI 助手。' : '本机浏览器不支持网页语音识别，请用键盘自带的麦克风听写：点输入框 → 键盘上的 🎤 键 → 说出内容。点「解析日程」会将确认后的文字、当前日期和时区发送给 AI 助手。') + '</p>' +
        '<div class="ai-listening" data-ai-listening hidden aria-hidden="true"><span class="ai-wave">' +
        '<i></i><i></i><i></i><i></i><i></i></span></div>' +
        '<p role="status" aria-live="polite" data-ai-status></p><div class="sub-actions">' +
        (Speech ? '<button type="button" data-speak>开始听写</button>' : '') +
        '<button type="button" data-ai-check>检查连接</button>' +
        '<button class="primary" type="submit">解析日程</button></div></form>');
      const input = panel.querySelector('textarea');
      const submit = panel.querySelector('[type="submit"]');
      const status = panel.querySelector('[data-ai-status]');
      const connectionCheck = panel.querySelector('[data-ai-check]');
      connectionCheck.onclick = () => {
        if (!recognition) checkConnection(connectionCheck, status);
      };
      input.value = text;
      attachDictation(panel, 280, '请核对听写文字，再解析日程。');

      panel.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text || pending || recognition) return;
        const today = readToday();
        const args = { text, today, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
        const raw = await call('/api/plan', args, panel, submit, status);
        if (!raw) return;
        const result = raw.intentVersion === 2 ? raw : window.WanshiliScheduleIntent.refinePlan(raw, args);
        if (today !== readToday() || input.value.trim() !== text) {
          status.textContent = '日期或文字已变化，请再次解析。';
          return;
        }
        if (result.action === 'clarify') {
          status.textContent = result.message;
          return;
        }
        if (result.action === 'create') {
          const draft = prepareDraft(result);
          if (draft) confirmDraft(draft, text, today);
          else status.textContent = '请核对日程类型、日期和循环条件后重试。';
        } else selectExisting(result, text, today);
      });
    }

    function confirmDraft(result, text, today) {
      const type = typeNames[result.type] || typeNames.normal;
      let repeat = repeatNames[result.repeat] || repeatNames.once;
      if (result.repeat === 'weekly' && result.weekdays?.length) repeat += ' · ' + result.weekdays.map(day => '周' + '一二三四五六日'[day - 1]).join('、');
      if (result.repeat === 'monthly' && result.monthDay) repeat = result.monthDay === 31 ? '每月最后一天' : '每月' + result.monthDay + '日';
      if (result.occurrences && result.repeat !== 'once') repeat += ' · 共' + result.occurrences + '次';
      const recurrence = result.type === 'up' ? '' : ' · ' + repeat;
      const dateText = (result.type === 'up' ? '起始日 ' : result.type === 'down' ? '目标日 ' : result.nextEligible ? '首次 ' : '') + labelDate(result.date);
      const panel = show('核对日程草稿',
        '<div class="preview-sample"><strong>' + escape(result.title) + '</strong><p>' +
        escape(type + ' · ' + dateText + recurrence) + '</p></div>' +
        (result.hasTime ? '<p>万事历目前按日期保存。确认后只带入日期。</p>' : '') +
        '<div class="sub-actions"><button type="button" data-ai-back>返回文字</button>' +
        '<button class="primary" type="button" data-ai-confirm>带入表单</button></div>');
      panel.querySelector('[data-ai-back]').onclick = () => voice(text);
      panel.querySelector('[data-ai-confirm]').onclick = () => {
        if (today !== readToday()) return voice(text);
        openDraft(result);
      };
    }

    function selectExisting(result, text, today) {
      const action = labels[result.action];
      if (!action) return voice(text);
      const candidates = matches(result);
      const panel = show('核对要' + action + '的事项',
        (result.targetDate ? '<p>改期后的日期 ' + escape(labelDate(result.targetDate)) + '。</p>' : '') +
        (result.hasTime ? '<p>万事历目前按日期保存。继续操作只使用日期。</p>' : '') +
        (candidates.length ? '<div class="preview-options">' + candidates.map((item, index) =>
          '<button type="button" data-ai-match="' + index + '">' + escape(item.title + ' · ' +
            labelDate(item.day) + ' · ' + typeNames[item.type] + ' · ' + item.recurrence) + '</button>').join('') + '</div>' :
          '<p>本机日程里没有找到符合条件的事项。可以核对名称或原日期。</p>') +
        '<div class="sub-actions"><button type="button" data-ai-back>返回文字</button></div>');
      panel.querySelector('[data-ai-back]').onclick = () => voice(text);
      for (const button of panel.querySelectorAll('[data-ai-match]')) {
        button.onclick = async () => {
          if (today !== readToday()) return voice(text);
          const buttons = panel.querySelectorAll('[data-ai-match]');
          for (const candidate of buttons) candidate.disabled = true;
          try { await openMatch(result, candidates[Number(button.dataset.aiMatch)]); }
          finally { for (const candidate of buttons) candidate.disabled = false; }
        };
      }
    }

    function review(month = 'current', reminded = false) {
      const snapshot = monthlyReview(month);
      const {start,end,aiAllowed,titles} = snapshot;
      const monthLabel = start.slice(0,4) + ' 年 ' + Number(start.slice(5,7)) + ' 月';
      const panel = show('月末补记',
        '<div class="sub-actions" role="group" aria-label="补记月份">' +
        '<button type="button" data-ai-month="current" aria-pressed="' + (month === 'current') + '">本月</button>' +
        '<button type="button" data-ai-month="previous" aria-pressed="' + (month === 'previous') + '">上月</button></div>' +
        '<div class="preview-sample"><strong>' + escape(monthLabel) + '</strong>' +
        '<p>有做过但还没记的事吗？打开月历，选择日期后补记。</p></div>' +
        '<p role="status" aria-live="polite" data-ai-status></p>' +
        (aiAllowed && titles.length
          ? '<p>获取 AI 线索会发送 ' + titles.length + ' 个已授权的普通日程名称。</p>' +
            '<div class="sub-actions"><button type="button" data-ai-cues>获取 AI 补记线索</button></div>'
          : aiAllowed ? '<p>本月没有可用于 AI 线索的已授权事项。你仍可直接查看月历。</p>' : '') +
        '<div class="sub-actions"><button type="button" data-action="close-sub">' +
        (reminded ? '稍后查看' : '关闭') + '</button>' +
        '<button class="primary" type="button" data-review-calendar>查看月历</button></div>');
      for (const button of panel.querySelectorAll('[data-ai-month]')) {
        button.onclick = () => review(button.dataset.aiMonth);
      }
      panel.querySelector('[data-review-calendar]').onclick = () => openReviewCalendar(start);
      activeReview = { panel, month, revision: snapshot.revision };
      const button = panel.querySelector('[data-ai-cues]');
      if (!button) return;
      const status = panel.querySelector('[data-ai-status]');
      button.onclick = async () => {
        if (snapshot.revision !== monthlyReview(month).revision) return review(month);
        const result = await call('/api/reminder', { titles }, panel, button, status);
        if (!result) return;
        if (snapshot.revision !== monthlyReview(month).revision) return review(month);
        const names = Array.isArray(result.indices)
          ? [...new Set(result.indices)].filter(index => Number.isInteger(index) && index >= 0 && index < titles.length).slice(0,2)
            .map(index => '「' + titles[index] + '」')
          : [];
        const period = labelDate(start) + '至' + labelDate(end);
        status.textContent = names.length
          ? '可以回想一下' + period + '，有没有做过' + names.join('、') + '但还没记的日子。'
          : '可以打开月历，回想这段时间有没有想补记的日程。';
      };
    }

    function privacy() {
      show('隐私说明', '<p>日程和偏好保存在当前浏览器。AI 录入只发送你确认的文字、日期和时区，已有日程在本机查找。听写由浏览器的语音服务处理。</p>' +
        '<p>月末提醒在本机显示。只有点击「获取 AI 补记线索」才会发送已授权的普通日程名称。可以随时在「我的」关闭 AI 补记提示。</p>');
    }

    function recheck() {
      if (activeReview?.panel.isConnected && dialog.open &&
          monthlyReview(activeReview.month).revision !== activeReview.revision) review(activeReview.month);
    }

    function diary(mode, text, day, panel, submit, status) {
      return call('/api/diary', { mode, text, day, today: readToday() }, panel, submit, status);
    }

    async function diaryAvailable() {
      try {
        const response = await fetch(endpoint + '/api/diary', {
          cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(3500)
        });
        return response.ok && (await response.json()).available === true;
      } catch {
        return false;
      }
    }

    return { enabled: Boolean(endpoint), voice, review, privacy, recheck, diary, diaryAvailable, attachDictation };
  };
})();
