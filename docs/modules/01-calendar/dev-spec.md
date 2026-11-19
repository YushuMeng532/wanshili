# 万事历 MVP 开发说明
版本：V0.4 · 更新：2026-11-19

关联：[PRD](./prd.md)、[页面设计](./page-design.md)、[验证记录](./validation.md)。

## 1. 实现位置与边界

| 内容 | 当前文件 |
| --- | --- |
| 双栏、Markdown、章节复制与批注线 | `index.html` |
| 事项页面与批注锚点 | `assets/event-flow.js` |
| 网页演示状态、输入和保存/编辑/删除 | `assets/web-demo.js` |
| 画板布局、同源字体与缩放 | `assets/web-demo.css`、`assets/figma/` |
| 新增页面样式 | `assets/event-flow.css` |
| 共享批注与页面锚点 | `wanshili-annotations.json` |
| 产品规则与验证 | 本目录Markdown |

当前代码承担原型评审。下列对象与方法为产品开发契约；事项持久化、循环计算和统计服务尚未接入。

## 2. 数据与唯一性

| 对象 | 字段与约束 |
| --- | --- |
| Event | id、title、type、date、calendarType、recurrence、endCondition、aiIncluded、createdAt、updatedAt |
| Recurrence | frequency、weekdays、monthDay、yearMonth、yearDay |
| DailyRecord | eventId、date、status、note、createdAt、updatedAt；eventId+date唯一 |
| OccurrenceException | eventId、date、override或cancelled；单次循环修改的覆盖记录 |
| Settings | aiEnabled=false、schemaVersion |
| HolidayCalendar | year、date、isWorkday、source、version |

日期使用YYYY-MM-DD，时间戳独立。DailyRecord的status为occurred或not_occurred；缺记录代表未记录。保留生日原历法日期，换算结果可重算。

## 3. 保存与状态流转

`editing → validating → saving → saved`；校验失败回表单，保存失败进入save_error并保留草稿。`saving`时拒绝重复提交；持久化成功后才更新列表。取消修改丢弃草稿，取消删除不写数据。

内部方法：`saveEvent`、`saveRecord`、`getOccurrences`、`deleteOccurrence`、`getMonthSummary`。统一经Repository读写，先用本地适配器；错误返回code、message和fieldErrors。后端接入时再定义HTTP协议。

## 4. 循环与统计

RecurrenceService生成计划实例，单次修改用例外覆盖；系列修改和删除的历史处理在业务规则确认后落地。缺少假调休年份数据返回`HOLIDAY_DATA_MISSING`，特殊日期不静默代算。

SummaryService从当月occurred原记录计算date集合：按事项取集合，按类型取并集，全月再取并集。未记录日期来自截至今天的计划实例缺确认记录。保存、修改、补录或删除后重算受影响月份，不独立维护合计副本。

## 5. AI与数据保护

先检查全局开关，再筛aiIncluded；排除项的名称、备注及历史和未来记录均不进入分析。全局关闭保留单项偏好，写入建议前复查冲突并要求确认。数据迁移或读取失败保留旧数据，不能清空后假装成功。

## 6. 原型差异

Figma底部面板使用匹配图层的Smart Animate。网页演示与标注模式分开：演示模式接受名称、日期、备注与星期选择，支持会话内新增、修改、删除和失败重试；标注模式保留章节定位。表单按390 × 844画板布局后整体等比缩放，使用同源Noto Sans SC字体子集。

网页保存的是当前页面中的演示状态；刷新后重置。农历换算、法定假调休、循环实例生成、作用范围的数据处理和月度统计仍待产品实现。
