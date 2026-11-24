# 万事历 MVP 开发说明
版本：V0.6.1 · 更新日期 2026-11-24

关联：[PRD](./prd.md)、[开发说明](./dev-spec.md)、[页面设计](./page-design.md)、[原型](./prototype.md)、[验证记录](./validation.md)。

## 1. 实现位置与边界
<!-- chapter-id: implementation -->

| 文件 | 职责 |
| --- | --- |
| `app.html`、`assets/product-app.js`、`assets/product-app.css` | 独立产品前端 |
| `assets/product-storage.js` | 浏览器数据迁移、事务与备份导出 |
| `assets/event-rules.js` | 选中日计算、计划实例、标记/列表分离、范围操作与统计的公共规则 |
| `index.html`、`assets/event-flow.js`、`assets/web-demo.js` | 工作台原型、交互、批注和文档定位 |
| `wanshili-annotations.json` | 页面锚点与文档章节绑定 |

保留现有视觉设计；浏览器本地保存可用，当前不接入农历、假调休和AI服务。

## 2. 数据与唯一性
<!-- chapter-id: data -->

Event保留id、title、type、date、calendarType、recurrence、aiIncluded、note与时间戳。正计时recurrence.frequency=none，不保留endCondition。其他类型endCondition表示计划出现次数，可为空代表不设结束；仅一次时固定为1。

历史由segments记录生效区间，区间为[from,to)；value保存当时配置。exceptions用日期为键记录单次override或cancelled。系列覆盖前保留今天之前的配置区间；取消后的Event仍保留，供统计和历史查看。

过去日程状态由planDate < today派生为occurred，不再读取或写入人工DailyRecord状态。Settings保存aiEnabled，存储根对象保存schemaVersion。V0.6.1 使用 schemaVersion 3。首次运行在一个 IndexedDB 事务内迁移旧 schemaVersion 2 的浏览器数据。原 localStorage 条目保持可导出。

## 3. 保存与状态流转
<!-- chapter-id: save -->

草稿与已保存Event分开。子层完成只更新草稿，取消保持原值；主表单保存后才提交Repository。状态为editing → validating → saving → saved或save_error。保存期间禁止重复提交和更改表单；写入失败保留原数据与草稿。

编辑同一Event使用浏览器Web Locks的独占锁，锁键为eventId。取不到锁时不打开编辑器，提示另一个标签页正在编辑，请关闭其中一个标签页后继续。关闭表单或标签页释放锁；写入前读取最新存储，避免不同事项互相覆盖。

## 4. 循环与统计
<!-- chapter-id: recurrence-statistics -->

marked用于日历格，shown用于下方列表，occurrence用于计划实例；不得用一个查询同时替代三者。

进行中的正计时从开始日起显示，月历标记开始日，显示天数等于公历日期差加 1。倒数日只标记归零计划实例，其他日期也可显示倒数，数字以选中日为基准。生日按公历年度实例显示。

每月目标日=min(配置日期,当月最后一天)。所有实例生成前排除02-29；回退至02-29也跳过。缺调休日历返回HOLIDAY_DATA_MISSING，不使用星期推算替代；农历配置不进入实例生成。

范围one只写选中日例外；following以max(selectedDate,today)为边界覆盖后续；series以today为边界覆盖全部未过去区间。三者都保留历史区间及历史例外。单次改期在新位置建立覆盖实例。倒数预览先定位对应归零日。单次倒数日直接修改或取消唯一目标，已过去的目标日保留。

统计读取所选范围内早于今天的有效计划，按事项、类型和全体日期分别去重。切换同一范围的分类、日程和明细时复用统计结果。历史类型从当时segment读取。所有过去日程自动视为已发生，不生成待确认列表，不接受手动状态写入。

对有限次数的未来分段，记录计算边界 limitFrom 和边界之前有效计划已用次数 limitUsed。计数按日、周、月或年计算区间序号，扣除跳过的闰日。回看历史仍按该分段当时的配置。

### 手动结束正计时

正计时在事项根对象保存可选的 `endDate`，使历史分段和单次覆盖使用同一结束日。没有结束日时持续累计，已有记录无需迁移。确认结束时按事项 ID 获取独占锁，重新读取最新事项，核对仍处于进行中，再写入设备本地的当天日期。取消不写入，已结束的事项不重复写入。若确认前已跨日，刷新结束日期与最终天数后再次确认。

列表显示区间包含起止日。月历标记起止日，同日去重，沿用 2 月 29 日不生成事项的规则。统计只取开始日至结束日范围内且早于今天的有效计划日期，最终天数仍按真实公历计算。原型使用固定日期演示这条流程。

### 普通日程

事项类型 `normal` 沿用现有日期、循环、持续次数和三种范围的数据结构。普通日程默认 `recurrence.frequency=once` 和 `endCondition=1`。沿用公历月末回退和 2 月 29 日跳过规则。日历标记和当天列表均以计划实例为准，无实例时均不展示。统计将普通日程纳入类型分组，只有早于今天的计划实例进入统计。读取已保存的三种类型时沿用现有规则。

## 5. AI与数据保护
<!-- chapter-id: local-data -->

AI 习惯分析、单项授权和月末提醒的偏好保存在当前浏览器。全局默认关闭，关闭后保留单项偏好。公开试用页通过 Cloudflare Worker 接入 DeepSeek。登录和云同步使用预设示例。

AI 请求通过 Worker 调用 DeepSeek，密钥存为服务端 Secret。日程解析发送确认的文字、日期和时区，已有事项在本机查找。习惯回顾只发送授权日程的日期范围与汇总天数。真实调用按服务端当日上限控制。手动和 AI 草稿都使用相同的本地保存路径，继续读写原网址对应的 IndexedDB。

浏览器数据库中的读改写在同一个 IndexedDB 读写事务内完成，覆盖保存、删除、结束正计时、设置和恢复示例。事项级 Web Lock 管理同一事项编辑。事务完成后通知其他标签页重读，回到页面时也刷新。恢复示例前在同一事务存一份快照，旧表单通过快照代数检查拒绝保存。初始化失败不写入，设置页可下载当前数据、恢复前快照和可读取的旧版数据。

## 6. 产品与原型的对应
<!-- chapter-id: prototype -->

产品前端执行真实输入、本地保存、范围计算、自动发生与统计。工作台页面快照与 Figma 使用预设数据。普通日程页面链接到试用版表单。共享链接等画框、文档和批注加载后定位。文档章节使用固定 chapter-id，旧批注可按原章节标题回退。正计时表单移除循环与持续次数，详情移除人工状态按钮，范围面板补齐三种选择，AI和未接入能力有明确说明。
