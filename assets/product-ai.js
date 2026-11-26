(() => {
  'use strict';

  const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const typeNames = { normal: '普通日程', up: '正计时', down: '倒数日', birthday: '生日' };
  const repeatNames = { once: '仅一次', daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年', weekends: '仅周末' };
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

  window.WanshiliAI = function ({ open, openDraft, matches, openMatch, habitSnapshot, readToday }) {
    const endpoint = configuredEndpoint(window.WANSHILI_AI_ENDPOINT);
    const dialog = document.getElementById('sub-dialog');
    let pending, recognition, activeHabit;

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
      activeHabit = undefined;
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
        const result = await call('/api/plan', {
          text, today, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        }, panel, submit, status);
        if (!result) return;
        if (today !== readToday() || input.value.trim() !== text) {
          status.textContent = '日期或文字已变化，请再次解析。';
          return;
        }
        if (result.action === 'clarify') {
          status.textContent = result.message;
          return;
        }
        if (result.action === 'create') confirmDraft(result, text, today);
        else selectExisting(result, text, today);
      });
    }

    function confirmDraft(result, text, today) {
      const type = typeNames[result.type] || typeNames.normal;
      const recurrence = result.type === 'up' ? '' : ' · ' + (repeatNames[result.repeat] || repeatNames.once);
      const panel = show('核对日程草稿',
        '<div class="preview-sample"><strong>' + escape(result.title) + '</strong><p>' +
        escape(type + ' · ' + labelDate(result.date) + recurrence) + '</p></div>' +
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

    function habit(month = 'current') {
      const snapshot = habitSnapshot(month);
      const title = (month === 'previous' ? '上月' : '本月') + '习惯回顾';
      const panel = show(title,
        '<div class="sub-actions"><button type="button" data-ai-month="current">本月</button>' +
        '<button type="button" data-ai-month="previous">上月</button></div>' +
        (snapshot.enabled ? '<div class="preview-sample"><strong>共 ' + snapshot.total + ' 天有日程</strong><p>' +
          escape(snapshot.start + ' 至 ' + snapshot.end) + '</p><p>' +
          Object.entries(snapshot.counts).map(([type, count]) => typeNames[type] + ' ' + count + ' 天').join(' · ') +
          '</p></div>' : '<p>先在「我的」开启 AI 习惯分析，再为希望纳入的日程打开参与开关。</p>') +
        '<p>点「生成 AI 总结」后，仅将统计区间和天数发送给 AI 助手。</p>' +
        '<p role="status" aria-live="polite" data-ai-status></p>' +
        '<div class="sub-actions"><button class="primary" type="button" data-ai-generate ' +
        (!snapshot.enabled || !snapshot.total ? 'disabled' : '') + '>生成 AI 总结</button></div>');
      for (const button of panel.querySelectorAll('[data-ai-month]')) button.onclick = () => habit(button.dataset.aiMonth);
      const button = panel.querySelector('[data-ai-generate]');
      const status = panel.querySelector('[data-ai-status]');
      activeHabit = { panel, month, revision: snapshot.revision };
      button.onclick = async () => {
        const { start, end, total, counts } = snapshot;
        if (snapshot.revision !== habitSnapshot(month).revision) return habit(month);
        const result = await call('/api/habit', { start, end, total, counts }, panel, button, status);
        if (!result) return;
        if (snapshot.revision !== habitSnapshot(month).revision) return habit(month);
        status.textContent = result.summary;
      };
    }

    function remind(month) {
      const panel = show('月末习惯回顾', '<p>可以查看' + (month === 'previous' ? '上月' : '本月') +
        '已授权日程的安排。</p><div class="sub-actions"><button type="button" data-action="close-sub">稍后查看</button>' +
        '<button class="primary" type="button" data-ai-view>查看回顾</button></div>');
      panel.querySelector('[data-ai-view]').onclick = () => habit(month);
    }

    function privacy() {
      show('隐私说明', '<p>日程和偏好保存在当前浏览器。AI 录入只发送你确认的文字、日期和时区，已有日程在本机查找。听写由浏览器的语音服务处理。</p>' +
        '<p>生成习惯总结时，只向 AI 助手 发送授权日程的分类天数与日期区间。退出后可随时在「我的」关闭分析。</p>');
    }

    function recheck() {
      if (activeHabit?.panel.isConnected && dialog.open &&
          habitSnapshot(activeHabit.month).revision !== activeHabit.revision) habit(activeHabit.month);
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

    return { enabled: Boolean(endpoint), voice, habit, remind, privacy, recheck, diary, diaryAvailable, attachDictation };
  };
})();
