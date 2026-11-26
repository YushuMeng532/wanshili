(() => {
  'use strict';

  const maxLength = 12000;
  const aiLimit = 1000;
  const join = (before, after) => before.trim() ? before.trimEnd() + '\n\n' + after : after;

  window.WanshiliDiary = function ({ content, dialog, show, returnToDay, openDialog, read, save, refresh, schedules, fmt, icon, escape, validDay, ai, aiAvailable, notify }) {
    let entry = null;
    let leaving = false;
    const body = () => document.getElementById('diary-body');
    const dirty = () => entry && entry.text !== entry.original;
    const aiButtons = '<button type="button" data-diary="generate">' + icon('sparkle') + '一句话写日记</button>' +
      '<button type="button" data-diary="polish">' + icon('edit') + 'AI 润色</button>';

    function render() {
      if (body()?.form.dataset.diaryDay === entry.day) return;
      content.innerHTML = '<form class="diary-editor"><div class="diary-heading">' +
        '<button type="button" class="text-button" data-diary="back">' + icon('left') + ' 返回</button>' +
        '<h2 id="diary-heading" tabindex="-1">' + escape(fmt(entry.day)) + '</h2></div>' +
        '<label for="diary-body">正文</label><textarea id="diary-body" maxlength="' + maxLength +
        '" placeholder="记下这一天发生的事…" required></textarea>' +
        '<div class="diary-tools">' +
        '<button type="button" data-diary="schedules">' + icon('calendar') + '添加日程</button>' +
        (entry.aiReady ? aiButtons : '') +
        '</div><p class="diary-status" role="status"></p>' +
        '<div class="diary-footer">' + (entry.version ? '<button type="button" class="text-button diary-delete" data-diary="delete">删除日记</button>' : '<small>保存在当前浏览器</small>') +
        '<button type="submit" class="primary">保存日记</button></div></form>';
      body().value = entry.text;
      body().form.dataset.diaryDay = entry.day;
      sync();
    }

    function sync() {
      content.querySelector('[type="submit"]').disabled = entry.saving || !entry.text.trim();
      const polish = content.querySelector('[data-diary="polish"]');
      if (polish) polish.disabled = !entry.text.trim();
    }

    function open(day, push = true) {
      const stored = read(day);
      entry = { day, original: stored?.text ?? '', text: stored?.text ?? '', version: stored?.version ?? null, saving: false };
      if (push) history.pushState({ ...history.state, wanshiliDiary: day }, '');
      show();
      document.getElementById('diary-heading').focus();
      const controls = content.querySelector('.diary-tools');
      if (ai && aiAvailable) aiAvailable().then(ready => {
        if (!entry || !controls.isConnected || !ready) return;
        entry.aiReady = true;
        controls.insertAdjacentHTML('beforeend', aiButtons);
        sync();
      });
    }

    function exit() {
      const day = entry.day;
      dialog.close();
      entry = null;
      leaving = true;
      returnToDay(day);
      if (history.state?.wanshiliDiary) history.back();
      else leaving = false;
    }

    function back() {
      if (entry.saving) return;
      if (!dirty()) return exit();
      openDialog('放弃这次修改？', '<p>当前修改还没有保存。</p><div class="sub-actions">' +
        '<button type="button" data-action="close-sub">继续编辑</button>' +
        '<button type="button" class="danger" data-diary="discard">放弃修改</button></div>');
    }

    window.addEventListener('popstate', () => {
      if (leaving) { leaving = false; return; }
      if (entry) {
        if (!dirty() && !entry.saving) return exit();
        history.pushState({ ...history.state, wanshiliDiary: entry.day }, '');
        back();
      } else if (validDay(history.state?.wanshiliDiary)) {
        open(history.state.wanshiliDiary, false);
      }
    });

    window.addEventListener('beforeunload', event => {
      if (dirty()) event.preventDefault();
    });

    function update(text) {
      if (text.length > maxLength) {
        notify('正文最多可写 ' + maxLength + ' 个字，请缩短后再试。');
        return false;
      }
      entry.text = text;
      body().value = text;
      sync();
      return true;
    }

    function insertSchedules() {
      const items = schedules(entry.day);
      openDialog('添加当天日程', items.length ?
        '<div class="diary-schedules">' + items.map((item, i) =>
          '<label><input type="checkbox" value="' + i + '"><span>' + escape(item.title) + '</span></label>').join('') +
        '</div><div class="sub-actions"><button type="button" data-action="close-sub">取消</button>' +
        '<button type="button" class="primary" data-diary="insert">插入日程</button></div>' :
        '<p>当天没有可以引用的日程。</p><button type="button" data-action="close-sub">返回日记</button>');
      const add = dialog.querySelector('[data-diary="insert"]');
      add?.addEventListener('click', () => {
        const titles = [...dialog.querySelectorAll('input:checked')].map(input => items[Number(input.value)].title);
        if (!titles.length) return notify('请至少选择一项日程。');
        if (update(join(entry.text, '当天日程\n' + titles.map(title => '· ' + title).join('\n')))) {
          dialog.close();
          body().focus();
        }
      });
    }

    function openAI(mode, selection) {
      const polish = mode === 'polish';
      const from = selection?.start ?? 0;
      const to = selection?.end ?? entry.text.length;
      const input = polish ? entry.text.slice(from, to) : '';
      const title = polish ? 'AI 润色' : '一句话写日记';
      openDialog(title, '<form class="diary-ai"><label for="diary-ai-source">' + (polish ? '待润色内容' : '今天发生了什么？') +
        '</label><textarea id="diary-ai-source" maxlength="' + Math.max(aiLimit, input.length) + '" rows="4"' +
        (polish ? ' readonly' : '') + ' required>' + escape(input) + '</textarea>' +
        '<p>点击' + (polish ? '「生成润色稿」' : '「生成草稿」') + '后，这段文字会发送给 DeepSeek。</p>' +
        '<p class="diary-status" role="status"></p><div class="sub-actions"><button type="button" data-action="close-sub">取消</button>' +
        '<button type="submit" class="primary">' + (polish ? '生成润色稿' : '生成草稿') + '</button></div></form>');
      const form = dialog.querySelector('.diary-ai');
      const status = form.querySelector('.diary-status');
      const submit = form.querySelector('[type="submit"]');
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const text = form.querySelector('textarea').value.trim();
        if (!text || text.length > aiLimit) {
          status.textContent = '每次最多处理 ' + aiLimit + ' 个字。可以选中其中一段再润色。';
          return;
        }
        const result = await ai(mode, text, entry.day, form, submit, status);
        if (!result || !dialog.open || !form.isConnected) return;
        if (!result.text || typeof result.text !== 'string' || (result.date !== null && !validDay(result.date))) {
          status.textContent = 'AI 没有返回可用的草稿，可以重试。';
          return;
        }
        preview(result, polish, from, to);
      });
    }

    function preview(result, polish, from, to) {
      const suggested = polish ? entry.day : result.date || entry.day;
      openDialog(polish ? '确认润色稿' : '确认日记草稿',
        '<form class="diary-ai">' + (polish ? '' :
          '<label for="diary-draft-date">日记日期</label><input id="diary-draft-date" type="date" required min="0001-01-01" max="9999-12-31" value="' +
          escape(suggested) + '"><p id="diary-date-note"></p>') +
        '<label for="diary-ai-draft">' + (polish ? '润色稿' : '草稿正文') + '</label>' +
        '<textarea id="diary-ai-draft" rows="6" maxlength="' + maxLength + '" required>' + escape(result.text) + '</textarea>' +
        '<p class="diary-status" role="status"></p><div class="sub-actions"><button type="button" data-action="close-sub">取消</button>' +
        '<button type="submit" class="primary">' + (polish ? '使用润色稿' : '使用草稿') + '</button></div></form>');
      const form = dialog.querySelector('.diary-ai');
      const date = form.querySelector('input');
      function describeDate() {
        const day = date.value;
        const note = form.querySelector('#diary-date-note');
        if (!validDay(day)) { note.textContent = '请选择有效日期。'; return; }
        const existing = day === entry.day ? entry.text.trim() : read(day)?.text;
        note.textContent = (day !== entry.day ? '请确认是否将草稿写到 ' + fmt(day) + '。' : '') +
          (existing ? '草稿会追加到原文末尾。' : '');
      }
      date?.addEventListener('input', describeDate);
      if (date) describeDate();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const draft = form.querySelector('textarea').value.trim();
        if (!draft) return;
        if (polish) {
          if (!update(entry.text.slice(0, from) + draft + entry.text.slice(to))) return;
        } else {
          const day = date.value;
          if (!validDay(day)) return;
          if (day === entry.day) {
            if (!update(join(entry.text, draft))) return;
          } else {
            const status = form.querySelector('.diary-status');
            if (dirty()) {
              status.textContent = '当前日记有未保存的修改。可以把草稿日期改回当前日期，或先保存当前修改。';
              return;
            }
            await refresh();
            if (!form.isConnected || !dialog.open) return;
            const stored = read(day);
            const text = join(stored?.text ?? '', draft);
            if (text.length > maxLength) {
              status.textContent = '追加后正文过长，请缩短草稿。';
              return;
            }
            entry = { day, original: stored?.text ?? '', text, version: stored?.version ?? null, saving: false, aiReady: entry.aiReady };
            history.replaceState({ ...history.state, wanshiliDiary: day }, '');
            render();
          }
        }
        dialog.close();
        body().focus();
      });
    }

    content.addEventListener('input', event => {
      if (event.target.id !== 'diary-body') return;
      entry.text = event.target.value;
      sync();
    });
    async function persist(text) {
      if (entry.saving || (text !== null && !text.trim())) return;
      entry.saving = true;
      sync();
      body().readOnly = true;
      try {
        await save(entry.day, text, entry.version);
        exit();
        notify(text === null ? '日记已删除' : '日记已保存');
      } catch (error) {
        dialog.close();
        const status = content.querySelector('.diary-status');
        status.textContent = error.message || '日记暂时无法保存，请重试。';
        entry.saving = false;
        body().readOnly = false;
        sync();
      }
    }
    content.addEventListener('submit', event => {
      if (!event.target.matches('.diary-editor')) return;
      event.preventDefault();
      persist(entry.text);
    });
    document.addEventListener('click', event => {
      const action = event.target.closest('[data-diary]')?.dataset.diary;
      if (!entry || !action || entry.saving) return;
      if (action === 'back') back();
      if (action === 'discard') exit();
      if (action === 'delete') {
        openDialog('删除这篇日记？', '<p>将删除 ' + escape(fmt(entry.day)) + ' 的日记。</p><div class="sub-actions">' +
          '<button type="button" data-action="close-sub">取消</button>' +
          '<button type="button" class="danger" data-diary="confirm-delete">确认删除</button></div>');
      }
      if (action === 'confirm-delete') persist(null);
      if (action === 'schedules') insertSchedules();
      if (action === 'generate') openAI(action);
      if (action === 'polish') {
        const { selectionStart: start, selectionEnd: end } = body();
        openAI(action, start === end ? null : { start, end });
      }
    });

    return { open, render, back, get active() { return Boolean(entry); } };
  };
})();
