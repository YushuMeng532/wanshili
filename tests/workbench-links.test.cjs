const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('index.html');
for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
const helpers = html.slice(html.indexOf('const escapeHTML='), html.indexOf('let toastTimer;'));
const { inline, chapters, matchesChapter } = vm.runInNewContext(helpers+';({inline,chapters,matchesChapter})', {
  CONFIG: { module:'docs/modules/01-calendar/' },
  location: { href:'https://example.com/wanshili/' },
  URL
});

test('shared links encode separators once', () => {
  const result = inline('[指定范围](https://example.com/?screen=example&note=selected#prd)');
  assert.match(result, /\?screen=example&amp;note=selected#prd/);
  assert.doesNotMatch(result, /amp;amp;/);
});

test('chapter labels can change while shared notes keep their destination', () => {
  const note = { chapter:'旧标题', chapterId:'example' };
  const section = chapters('## 新标题\n<!-- chapter-id: example -->\n\n说明')[0];
  assert.ok(matchesChapter(note, section));
  assert.ok(matchesChapter({chapter:'新标题'}, section));
  assert.doesNotMatch(section.text, /chapter-id/);
});

test('shared notes address existing chapters and V0.6 hotspots', () => {
  const { notes } = JSON.parse(read('wanshili-annotations.json'));
  const { catalog } = JSON.parse(read('assets/v06-scenes.json'));
  const documents = new Map();
  assert.equal(new Set(notes.map(note=>note.id)).size, notes.length);
  for (const note of notes) {
    if (!documents.has(note.doc)) {
      const sections = chapters(read('docs/modules/01-calendar/'+note.doc+'.md'));
      const ids = sections.map(section=>section.id).filter(Boolean);
      assert.equal(new Set(ids).size, ids.length);
      documents.set(note.doc, sections);
    }
    assert.ok(note.chapterId && documents.get(note.doc).some(section => matchesChapter(note, section)), note.id);
    if (note.screen?.startsWith('v06:')) {
      assert.ok(catalog[note.screen]?.hits.some(hit => hit[6][0] === note.anchor), note.id);
    }
  }
});
