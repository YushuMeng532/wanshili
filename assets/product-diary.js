(() => {
  'use strict';

  const maxLength = 12000;
  const aiLimit = 1000;
  const join = (before, after) => before.trim() ? before.trimEnd() + '\n\n' + after : after;

  const normalized = value => value.normalize('NFKC').toLowerCase().replace(/[\p{P}\s]/gu, '');

  window.WanshiliDiary = function ({ content, dialog, show, returnToDay, openDialog, read, save, schedules, fmt, icon, escape, validDay, ai, aiAvailable, attachDictation, notify }) {
    let entry = null;
    let leaving = false;
    const body = () => document.getElementById('diary-body');
    const dirty = () => entry && (entry.text !== entry.original ||
      JSON.stringify(entry.references) !== JSON.stringify(entry.originalReferences));
    const polishButton = '<button type="button" data-diary="polish">' + icon('edit') + 'AI 润色</button>';

    function render() {
      if (body()?.form.dataset.diaryDay === entry.day) return;
      content.innerHTML = '<form class="diary-editor"><div class="diary-topbar">' +
        '<button type="button" class="text-button" data-diary="back">' + icon('left') + '返回日历</button>' +
        '<button type="submit" class="primary">保存日记</button></div>' +
        '<section class="diary-sheet" aria-labelledby="diary-heading"><header class="diary-heading">' +
        '<h2 id="diary-heading" tabindex="-1">' + escape(fmt(entry.day)) + '</h2></header>' +
        '<textarea id="diary-body" aria-label="日记正文" maxlength="' + maxLength +
        '" placeholder="记下这一天发生的事…" required></textarea><div class="diary-references"></div></section>' +
        '<div class="diary-tools" role="group" aria-label="写作工具">' +
        '<button type="button" data-diary="generate">' + icon('sparkle') + '语音记日记</button>' +
        '<button type="button" data-diary="schedules">' + icon('calendar') + '添加日程</button>' +
        (entry.aiReady ? polishButton : '') +
        '</div><p class="diary-status" role="status"></p>' +
        '<div class="diary-footer"><small>保存在当前浏览器</small>' +
        (entry.version ? '<button type="button" class="text-button diary-delete" data-diary="delete">删除日记</button>' : '') +
        '</div></form>';
      body().value = entry.text;
      body().form.dataset.diaryDay = entry.day;
      renderReferences();
      sync();
    }

    function sync() {
      content.querySelector('[type="submit"]').disabled = entry.saving || !entry.text.trim();
      const polish = content.querySelector('[data-diary="polish"]');
      if (polish) polish.disabled = !entry.text.trim();
    }

    function open(day, push = true) {
      const stored = read(day);
      const references = stored?.references ?? [];
      entry = { day, original: stored?.text ?? '', text: stored?.text ?? '', version: stored?.version ?? null,
        references: [...references], originalReferences: references, saving: false };
      if (push) history.pushState({ ...history.state, wanshiliDiary: day }, '');
      show();
      document.getElementById('diary-heading').focus();
      const controls = content.querySelector('.diary-tools');
      if (ai && aiAvailable) aiAvailable().then(ready => {
        if (!entry || !controls.isConnected || !ready) return;
        entry.aiReady = true;
        controls.insertAdjacentHTML('beforeend', polishButton);
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

    function renderReferences() {
      const area = content.querySelector('.diary-references');
      area.hidden = !entry.references.length;
      area.innerHTML = entry.references.length ? '<h3>引用日程</h3><ul>' +
        entry.references.map((item, index) => '<li>' + icon('calendar') + '<span>' + escape(item.title) +
          '</span><button type="button" class="text-button" data-diary="remove-reference" data-index="' + index +
          '" aria-label="' + escape('移除引用：' + item.title) + '">' + icon('close') + '</button></li>').join('') + '</ul>' : '';
    }

    function choices(items, isChecked) {
      return '<div class="diary-schedules">' + items.map((item, index) =>
        '<label><input type="checkbox" value="' + index + '"' + (isChecked(item) ? ' checked' : '') + '><span>' +
        escape(item.title) + (item.category ? '<small>' + escape(item.category) + '</small>' : '') +
        '</span></label>').join('') + '</div>';
    }

    function selected(container, items) {
      return Array.from(container.querySelectorAll('input:checked'), input => items[Number(input.value)]);
    }

    function insertSchedules() {
      const items = schedules(entry.day);
      const known = new Set(items.map(item => item.id));
      const unavailable = entry.references.filter(item => !known.has(item.id));
      openDialog('添加当天日程', items.length ? choices(items, item => entry.references.some(ref => ref.id === item.id)) +
        '<div class="sub-actions"><button type="button" data-action="close-sub">取消</button>' +
        '<button type="button" class="primary" data-diary="insert">确认引用</button></div>' :
        '<p>当天没有可以引用的日程。</p><button type="button" data-action="close-sub">返回日记</button>');
      dialog.querySelector('[data-diary="insert"]')?.addEventListener('click', () => {
        setReferences([...unavailable, ...selected(dialog, items)]);
        dialog.close();
        body().focus();
      });
    }

    function setReferences(items) {
      entry.references = Array.from(new Map(items.map(({ id, title }) => [id, { id, title }])).values());
      renderReferences();
    }

    function openAI(mode, selection) {
      const polish = mode === 'polish';
      const from = selection?.start ?? 0;
      const to = selection?.end ?? entry.text.length;
      const input = polish ? entry.text.slice(from, to) : '';
      const speak = !polish && (window.SpeechRecognition || window.webkitSpeechRecognition);
      const organize = entry.aiReady;
      const title = polish ? 'AI 润色' : '语音记日记';
      openDialog(title, '<form class="diary-ai"><label for="diary-ai-source">' + (polish ? '待润色内容' : '这一天发生了什么？') +
        '</label><textarea id="diary-ai-source" maxlength="' + Math.max(aiLimit, input.length) + '" rows="4"' +
        (polish ? ' readonly' : '') + ' required>' + escape(input) + '</textarea>' +
        (speak ? '<div class="ai-listening" data-ai-listening hidden aria-hidden="true"><span class="ai-wave"><i></i><i></i><i></i><i></i><i></i></span></div>' : '') +
        '<p>' + (organize ? '点「整理日记」会把核对后的文字发送给AI助手。' : 'AI 整理暂不可用。可以用键盘麦克风听写，或直接输入文字。') +
        '</p><p class="diary-status" role="status"></p><div class="sub-actions">' +
        (speak ? '<button type="button" data-speak>开始听写</button>' : '<button type="button" data-action="close-sub">取消</button>') +
        '<button type="submit" class="primary">' + (organize ? '整理日记' : '使用文字') + '</button></div></form>');
      const form = dialog.querySelector('.diary-ai');
      const status = form.querySelector('.diary-status');
      const submit = form.querySelector('[type="submit"]');
      attachDictation(form, aiLimit, '请核对听写文字。');
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submit.disabled) return;
        const text = form.querySelector('textarea').value.trim();
        if (!text || text.length > aiLimit) {
          status.textContent = '每次最多处理 ' + aiLimit + ' 个字。可以选中其中一段再润色。';
          return;
        }
        const result = organize ? await ai(mode, text, entry.day, form, submit, status) : { text };
        if (!result || !dialog.open || !form.isConnected) return;
        if (typeof result.text !== 'string' || !result.text.trim()) {
          status.textContent = '没有返回可用的草稿，可以重试。';
          return;
        }
        preview(result.text, text, polish, from, to);
      });
    }

    function preview(draftText, source, polish, from, to) {
      const original = normalized(source);
      const matches = polish ? [] : schedules(entry.day).filter(item => {
        const name = normalized(item.title);
        return name.length >= 2 && original.includes(name);
      });
      const unique = item => matches.filter(candidate => normalized(candidate.title) === normalized(item.title)).length === 1;
      const ambiguous = matches.some(item => !unique(item));
      openDialog(polish ? '确认润色稿' : '确认日记草稿',
        '<form class="diary-ai"><label for="diary-ai-draft">正文 · ' + escape(fmt(entry.day)) + '</label>' +
        '<textarea id="diary-ai-draft" rows="6" maxlength="' + maxLength + '" required>' + escape(draftText) + '</textarea>' +
        (matches.length ? '<p>' + (ambiguous ? '有同名日程，请勾选要引用的那条。' : '已勾选提到的当天日程，可以取消。') + '</p>' +
          choices(matches, unique) : '') +
        '<div class="sub-actions"><button type="button" data-action="close-sub">取消</button>' +
        '<button type="submit" class="primary">采用</button></div></form>');
      const form = dialog.querySelector('.diary-ai');
      form.addEventListener('submit', event => {
        event.preventDefault();
        const draft = form.querySelector('textarea').value.trim();
        if (!draft) return;
        const next = polish ? entry.text.slice(0, from) + draft + entry.text.slice(to) : join(entry.text, draft);
        if (!update(next)) return;
        if (!polish) setReferences([...entry.references, ...selected(form, matches)]);
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
        await save(entry.day, text, entry.version, entry.references);
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
      if (action === 'remove-reference') {
        const index = Number(event.target.closest('[data-index]').dataset.index);
        setReferences(entry.references.filter((_, i) => i !== index));
        content.querySelector('[data-diary="schedules"]').focus();
      }
      if (action === 'generate') openAI(action);
      if (action === 'polish') {
        const { selectionStart: start, selectionEnd: end } = body();
        openAI(action, start === end ? null : { start, end });
      }
    });

    return { open, render, back, get active() { return Boolean(entry); } };
  };
})();
