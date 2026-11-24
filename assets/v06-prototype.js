(() => {
  'use strict';
  const screen = $('screen');
  const phone = $('review-phone');
  const entry = {
    'V0.6 · AI 语音录入':'230:850',
    'V0.6 · 月末习惯回顾':'230:1997',
    'V0.6 · 统计与日程明细':'230:2255',
    'V0.6 · 登录、注册与云端同步':'235:6831'
  };
  const direct = {'v06:voice':'230:850','v06:monthStart':'230:1997','v06:profile':'230:2180',
    'v06:month_category':'230:2255','v06:login':'235:6831'};
  const groupOf = (id, scene) => id==='v06:month_category' ? 'V0.6 · 统计与日程明细' : scene.group;
  const fallback = 'v06:profile';
  const visited = [];
  let timer;

  function element(tag, className, style, attributes = {}) {
    const node = document.createElement(tag);
    node.className = className;
    Object.assign(node.style, style);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  }
  const px = value => value + 'px';
  const position = (x, y) => ({position:'absolute',left:px(x),top:px(y)});

  function paint(layer) {
    const [type,x,y] = layer;
    const style = position(x,y);
    if (type==='t') {
      const [, , , width, text, size, font, color, alignment, height, opacity] = layer;
      const node = element('span','', {...style,width:px(width),fontSize:px(size),color,
        lineHeight:px(height),fontWeight:font==='Bold' ? 700 : font==='Medium' ? 500 : 400,
        textAlign:alignment.toLowerCase(),whiteSpace:'pre-wrap',opacity});
      node.textContent = text;
      return node;
    }
    if (type==='s') {
      const node = element('span','',{...style,opacity:layer[4]});
      node.innerHTML = layer[3];
      return node;
    }
    const [, , , width, height, radius, fill, stroke, opacity] = layer;
    return element('span','',{...style,width:px(width),height:px(height),borderRadius:px(radius),
      background:fill||'transparent',border:stroke?'1px solid '+stroke:'0',opacity});
  }

  function hotspot([x,y,width,height,title,destination,anchors]) {
    const node = element(destination?'button':'div','v06-hotspot', {
      ...position(x,y),width:px(width),height:px(height)
    });
    if (destination) {
      node.type = 'button';
      node.dataset.v06To = destination;
      node.setAttribute('aria-label',title);
    }
    if (anchors.length) node.dataset.anchor = anchors[0];
    return node;
  }

  function initialize({catalog,pool}) {
    const groups = new Map();
    for (const [id, scene] of Object.entries(catalog)) {
      const label = groupOf(id,scene);
      if (!groups.has(label)) {
        const group = document.createElement('optgroup');
        group.label = label;
        groups.set(label,group);
        screen.append(group);
      }
      groups.get(label).append(new Option(scene.name,id));
    }
    const font = document.createElement('style');
    font.textContent = '.v06-phone{font-family:"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.45} .v06-phone .v06-hotspot{display:block;min-height:0;min-width:0;background:transparent;padding:0;border:0;border-radius:9px;color:inherit}';
    document.head.append(font);

    const renderPrevious = renderPhone;
    const previousPrototype = setPrototype;
    const previousChange = screen.onchange;
    const oldDemo = $('mode-demo').onclick;
    const oldReview = $('mode-review').onclick;
    const previousOpenNote = openNote;
    const anchorSelect = $('note-anchor');
    const legacyAnchors = [...anchorSelect.options].map(option => [option.textContent,option.value]);
    const oldCaption = reviewCaption.textContent;
    const demoHint = 'V0.6 · 预设数据演示。可切换「标注」查看与 PRD 的连线。';
    const reviewHint = 'V0.6 · 点击原型上的批注点定位 PRD，也可以从 PRD 返回原型。';
    const playing = () => document.body.classList.contains('web-demo') && reviewMode;

    openNote = function(anchor) {
      const scene = catalog[screen.value];
      const options = scene ? scene.hits.flatMap(hit => hit[6].map(id => [hit[4],id])) : legacyAnchors;
      if (!options.length) {
        toast('这一画面没有可绑定的批注位置。');
        return;
      }
      anchorSelect.replaceChildren(...options.map(([label,id]) => new Option(label,id)));
      previousOpenNote(options.some(([,id])=>id===anchor) ? anchor : options[0][1]);
    };

    function go(id, remember=true) {
      const destination = id==='back' ? visited.pop() || fallback : id;
      if (!catalog[destination]) return;
      if (remember && id!=='back' && screen.value!==destination) visited.push(screen.value);
      screen.value = destination;
      setPrototype(destination);
      renderPhone();
      if (state.active==='checks') render();
    }

    setPrototype = function(id) {
      const scene = catalog[id];
      if (!scene) return previousPrototype(id);
      const start = entry[groupOf(id,scene)];
      const params = new URLSearchParams({'node-id':direct[id]||start,'page-id':'230:847',
        'starting-point-node-id':start,scaling:'scale-down','content-scaling':'fixed'});
      const host = 'https://www.figma.com/proto/' + CONFIG.figmaKey + '?';
      $('open-prototype').hidden = false;
      $('mode-figma').disabled = false;
      $('open-prototype').href = host + params;
      $('fallback-prototype').href = host + params;
      $('prototype').dataset.source = 'https://embed.figma.com/proto/'+CONFIG.figmaKey+'?'+params+'&embed-host=wanshili-workbench';
      if (!reviewMode) $('prototype').src = $('prototype').dataset.source;
      document.querySelector('.caption').textContent = 'Figma 原文件演示从所属流程的入口打开。';
    };

    renderPhone = function() {
      clearTimeout(timer);
      const scene = catalog[screen.value];
      phone.classList.toggle('v06-phone',Boolean(scene));
      if (!scene) {
        reviewCaption.textContent = oldCaption;
        return renderPrevious();
      }
      const fragment = document.createDocumentFragment();
      for (const index of scene.art) fragment.append(paint(pool[index]));
      for (const hit of scene.hits) fragment.append(hotspot(hit));
      phone.replaceChildren(fragment);
      $('review-page-name').textContent = scene.name;
      $('note-count').textContent = reviewNotes.length;
      $('review-counts').textContent = '本页可定位 ' + visibleNotes().length;
      $('custom-count').textContent = '共享及补充批注 ' + (reviewNotes.length-3);
      reviewCaption.textContent = playing() ? demoHint : reviewHint;
      fitPhone();
      renderStageNote();
      requestAnimationFrame(drawReview);
      if (scene.delay && playing()) timer = setTimeout(() => go(scene.delay[1]),scene.delay[0]);
    };

    screen.onchange = event => {
      if (catalog[event.target.value]) visited.length = 0;
      previousChange(event);
    };
    const switchMode = (handler, isDemo) => () => {
      handler();
      if (catalog[screen.value] && !isDemo) renderPhone();
    };
    $('mode-demo').onclick = switchMode(oldDemo,true);
    $('mode-review').onclick = switchMode(oldReview,false);
    $('mode-figma').addEventListener('click', () => clearTimeout(timer));

    phone.addEventListener('click', event => {
      if (!catalog[screen.value]) return;
      const hot = event.target.closest('.v06-hotspot');
      if (!hot) return;
      event.stopImmediatePropagation();
      const note = reviewNotes.find(item => item.anchor===hot.dataset.anchor && item.screen===screen.value);
      if (!playing() && note) selectNote(note.id);
      else if (hot.dataset.v06To) go(hot.dataset.v06To);
    },true);

    const params = new URLSearchParams(location.search);
    const selected = params.get('screen');
    if (catalog[selected]) {
      go(selected,false);
      const note = params.get('note');
      if (note && reviewNotes.some(item => item.id===note)) selectNote(note);
    }
  }

  fetch(new URL('assets/v06-scenes.json?v=1',location.href))
    .then(response => {
      if (!response.ok) throw new Error('V0.6 prototype fetch failed');
      return response.json();
    })
    .then(initialize)
    .catch(error => console.error(error));
})();
