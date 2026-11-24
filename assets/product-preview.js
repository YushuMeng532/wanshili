(() => {
  'use strict';
  const button = (label, next, primary=false) =>
    '<button type="button" data-preview="'+next+'"'+(primary?' class="primary"':'')+'>'+label+'</button>';
  const actions = (...items) => '<div class="sub-actions">'+items.join('')+'</div>';
  const message = '<p class="preview-label">前端演示 · 使用预设样例</p>';
  const sample = html => '<div class="preview-sample">'+html+'</div>';
  const close = '<button type="button" data-action="close-sub">关闭</button>';
  const complete = text => [text, '<p>已完成示例流程。本机日程可以继续通过手动创建和编辑来管理。</p>'+actions(close)];

  const views = {
    voice: ['用语音创建或管理日程',
      '<p>演示中文录音、核对转写和日程确认。这里使用示例文字。</p>'+
      actions(button('改用文字','voice-text'),button('开始录音','voice-recording',true))],
    'voice-recording': ['录音演示',
      sample('<strong>00:06</strong><p>示例语句 · 明天交报告</p>')+
      actions(button('取消','voice'),button('完成录音','voice-transcript',true))],
    'voice-transcript': ['核对转写',
      '<label for="preview-transcript">识别到的文字</label><input id="preview-transcript" value="明天交报告" readonly>'+
      '<p>示例日期为 11 月 23 日。点击解析可查看日程草稿。</p>'+
      actions(button('重录','voice-recording'),button('解析日程','voice-draft',true))],
    'voice-text': ['文字录入示例',
      '<p>选择一条预设指令，体验如何确认新增或改期。</p>'+
      '<div class="preview-options">'+button('明天交报告','voice-draft')+button('把周五的复习挪到周六','voice-match')+'</div>'],
    'voice-draft': ['确认日程草稿',
      sample('<strong>交报告</strong><p>普通日程 · 2026 年 11 月 24 日（周二） · 仅一次</p>')+
      actions(button('查看转写','voice-transcript'),button('模拟保存','voice-created',true))],
    'voice-match': ['选择要改期的日程',
      '<p>有两条同名日程，请根据日期和循环方式选择。</p><div class="preview-options">'+
      button('复习 · 11 月 27 日 · 每周重复','voice-move-series')+button('复习 · 11 月 27 日 · 仅一次','voice-move-once')+'</div>'],
    'voice-move-series': ['确认改期',
      sample('<p>复习 · 每周重复</p><strong>11 月 27 日 → 11 月 28 日</strong><p>此次演示应用范围 · 仅这一次</p>')+
      actions(button('返回选择','voice-match'),button('模拟改期','voice-moved',true))],
    'voice-move-once': ['确认改期',
      sample('<p>复习 · 仅一次</p><strong>11 月 27 日 → 11 月 28 日</strong>')+
      actions(button('返回选择','voice-match'),button('模拟改期','voice-moved',true))],
    'voice-created': complete('日程保存示例'),
    'voice-moved': complete('日程改期示例'),
    'habit-reminder': ['本月习惯回顾',
      '<p>月末提醒示例 · 查看 4 月 1 日至 29 日的日程安排。</p>'+
      actions(close,button('查看回顾','habit',true))],
    habit: ['4 月习惯回顾',
      sample('<strong>19 天有日程</strong><p>4 月 1 日至 29 日 · 同一天合计只计 1 天</p><p>普通日程 12 天 · 正计时 8 天 · 倒数日 3 天 · 生日 1 天</p>')+
      actions(close,button('查看示例总结','habit-result',true))],
    'habit-result': ['AI 习惯总结示例',
      sample('<p>这个月有 19 天安排了日程，其中普通日程覆盖 12 天，正计时覆盖 8 天。部分日期同时安排了不同类型的事项。</p>')+
      actions(button('返回回顾','habit'),close)],
    login: ['登录演示',
      '<p>可使用示例账号体验登录、注册与找回密码。</p>'+sample('<strong>demo@example.com</strong><p>示例账号</p>')+
      actions(button('注册账号','register'),button('使用示例账号登录','sign-in',true))+
      '<div class="preview-options">'+button('找回密码','reset-email')+'</div>'],
    register: ['邮箱注册演示',
      sample('<strong>demo@example.com</strong><p>邮箱验证完成后，账号获得唯一 ID。</p>')+
      actions(button('返回登录','login'),button('模拟发送验证邮件','verify-email',true))],
    'verify-email': ['邮箱待验证',
      '<p>预览发送给 demo@example.com 的验证步骤。</p>'+
      actions(button('模拟重新发送','email-resent'),button('模拟打开验证链接','email-verified',true))],
    'email-resent': ['验证邮件重发示例',
      '<p>实际接入后，新链接将用于完成验证。</p>'+actions(button('返回邮箱验证','verify-email',true))],
    'email-verified': ['邮箱验证完成',
      '<p>云端新账号的日历会从空白开始。</p>'+actions(button('进入账号示例','sign-in',true))],
    'reset-email': ['找回密码演示',
      sample('<strong>demo@example.com</strong>')+actions(button('返回登录','login'),button('模拟发送重置邮件','reset-sent',true))],
    'reset-sent': ['密码重置邮件示例',
      '<p>如果这个邮箱已有账号，实际接入后将收到重置链接。</p>'+actions(button('返回登录','login',true))],
    account: ['演示账号',
      sample('<strong>demo@example.com</strong><p>账号日历 · 0 条云端日程</p>')+
      actions(button('模拟退出','sign-out'),button('查看同步示例','sync',true))],
    sync: ['云同步演示',
      sample('<strong>已同步 · 示例状态</strong><p>同一账号在其他设备上可以读取它的云端日程。</p>')+
      actions(button('模拟同步失败','sync-error'),button('模拟编辑冲突','sync-conflict'))],
    'sync-error': ['暂时无法同步',
      '<p>示例 · 云端不可用时保留当前草稿，可以稍后重试。</p>'+actions(button('模拟重试','sync',true))],
    'sync-conflict': ['日程已在另一台设备修改',
      '<p>示例 · 本次编辑草稿已保留，查看云端最新版本后可以再保存。</p>'+
      actions(button('查看最新日程示例','sync-latest',true))],
    'sync-latest': ['云端最新日程示例',
      sample('<strong>运动</strong><p>普通日程 · 每周一、三</p>')+actions(button('返回同步','sync'),close)],
    privacy: ['隐私说明',
      '<p>试用日程、分析开关和提醒偏好保存在当前浏览器。语音、总结、邮箱和云同步均使用预设内容演示。</p>'+actions(close)]
  };

  window.WanshiliPreview = function ({open, rerender}) {
    let signedIn = false;
    function show(key) {
      if (key==='sign-in' || key==='sign-out') {
        signedIn=key==='sign-in';
        rerender();
        key=signedIn?'account':'login';
      }
      if (key==='login' && signedIn) key='account';
      const view=views[key];
      if (view) open(view[0],message+view[1]);
    }
    return {show,get signedIn(){return signedIn;}};
  };
})();
