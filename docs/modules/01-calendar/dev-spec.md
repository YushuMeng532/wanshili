# 万事历 MVP 开发说明
版本：V0.5 · 确认日期：2026-11-19

关联：[PRD](./prd.md)、[开发说明](./dev-spec.md)、[页面设计](./page-design.md)、[原型](./prototype.md)、[验证记录](./validation.md)。

## 1. 实现位置与边界

| 文件 | 职责 |
| --- | --- |
| `app.html`、`assets/product-app.js`、`assets/product-app.css` | 独立产品前端与本地Repository |
| `assets/event-rules.js` | 选中日计算、计划实例、标记/列表分离、范围操作与统计的公共规则 |
| `index.html`、`assets/event-flow.js`、`assets/web-demo.js` | 工作台原型、交互、批注和文档定位 |
| `wanshili-annotations.json` | 页面锚点与文档章节绑定 |

保留现有视觉设计；浏览器本地保存可用，当前不接入农历、假调休和AI服务。

## 2. 数据与唯一性

Event保留id、title、type、date、calendarType、recurrence、aiIncluded、note与时间戳。正计时recurrence.frequency=none，不保留endCondition。其他类型endCondition表示计划出现次数，可为空代表不设结束；仅一次时固定为1。

历史由segments记录生效区间，区间为[from,to)；value保存当时配置。exceptions用日期为键记录单次override或cancelled。系列覆盖前保留今天之前的配置区间；取消后的Event仍保留，供统计和历史查看。

过去日程状态由planDate < today派生为occurred，不再读取或写入人工DailyRecord状态。Settings保存aiEnabled，存储根对象保存schemaVersion。V0.5使用schemaVersion=2；开发阶段版本不一致时清除本应用旧数据后初始化。

## 3. 保存与状态流转

草稿与已保存Event分开。子层完成只更新草稿，取消保持原值；主表单保存后才提交Repository。状态为editing → validating → saving → saved或save_error。保存期间禁止重复提交和更改表单；写入失败保留原数据与草稿。

编辑同一Event使用浏览器Web Locks的独占锁，锁键为eventId。取不到锁时不打开编辑器，提示另一个标签页正在编辑，请关闭其中一个标签页后继续。关闭表单或标签页释放锁；写入前读取最新存储，避免不同事项互相覆盖。

## 4. 循环与统计

marked用于日历格，shown用于下方列表，occurrence用于计划实例；不得用一个查询同时替代三者。

正计时：shown在选中日不早于开始日时返回；marked只在开始日返回；显示天数=公历日期差+1。倒数日：marked仅返回归零计划实例；shown允许其他日期展示倒数，数字以选中日为基准。生日按公历年度实例显示。

每月目标日=min(配置日期,当月最后一天)。所有实例生成前排除02-29；回退至02-29也跳过。缺调休日历返回HOLIDAY_DATA_MISSING，不使用星期推算替代；农历配置不进入实例生成。

范围one只写选中日例外；following以max(selectedDate,today)为边界覆盖后续；series以today为边界覆盖全部未过去区间。三者都保留历史区间及历史例外。单次改日期时取消原位置，并在新日期建立覆盖实例。

统计遍历当月day < today的occurrence，按事项、类型、全月分别取日期集合。历史类型从当时segment读取。所有过去日程自动视为已发生，不生成待确认列表，不接受手动状态写入。

## 5. AI与数据保护

只持久化全局和单项开关；全局默认关闭，关闭时保留单项偏好。不调用AI、不生成建议或提醒。

读取格式异常时显示保存不可用，写入失败不覆盖旧数据。版本变化直接重置仅适用于当前未上线开发阶段，不作为上线后迁移方案。

## 6. 产品与原型的对应

产品前端执行真实输入、本地保存、范围计算、自动发生与统计。工作台页面快照和Figma按同一V0.5规则展示，固定示例用于评审，不承担运行时日期或持久化计算。正计时表单移除循环与持续次数，详情移除人工状态按钮，范围面板补齐三种选择，AI和未接入能力有明确说明。
