# 万事历 原型与流程
版本 V0.6.1 · 更新日期 2026-11-24

[产品前端](https://yushumeng532.github.io/wanshili/app.html) · [工作台](https://yushumeng532.github.io/wanshili/) · [Figma演示](https://www.figma.com/proto/8aE2Z9hUhKtxgXjnEuCY7I?node-id=3-4&page-id=2%3A2&starting-point-node-id=3%3A4&scaling=scale-down&content-scaling=fixed&show-proto-sidebar=1)

## 1. 本版流程

![事项流程与历史保留](../../flows/event-lifecycle.svg)

选日 → 新建 → 类型与日期 → 保存 → 当天列表 → 详情 → 编辑或删除。正计时新建时只设开始日期；倒数日可以设置循环和持续次数。过去日程自动已发生，不再人工确认。

结束正计时从今天的事项进入。打开详情 → 结束正计时 → 确认结束 → 查看起止日期和最终天数 → 返回月历。取消会返回进行中详情。两版演示使用 11 月 17 日开始、11 月 23 日结束的固定示例。回看 11 月 20 日显示第 4 天，切到 24 日则不再显示该事项。

[打开工作台交互原型](https://yushumeng532.github.io/wanshili/?screen=review%3Astop-today#prd) · [打开 Figma 演示](https://www.figma.com/proto/8aE2Z9hUhKtxgXjnEuCY7I?node-id=208-65&page-id=2%3A2&starting-point-node-id=208%3A65&scaling=scale-down)

## 2. 画框对应

| 模块 | 页面 | Figma节点 |
| --- | --- | --- |
| 01 | 月历有记录、空态；当天多项、空态 | 3:3～3:6 |
| 02 | 空表单、正计时、倒数日、生日 | 3:8～3:11 |
| 02 | 循环、纪念日说明 | 3:12、3:13 |
| 02补充 | 日期、每周、每月、每年 | 137:3067、137:3182、137:3804、137:3911 |
| 02补充 | 循环持续次数 | 171:530 |
| 03补充 | 同事项跨标签页冲突 | 171:744 |
| 03 | 详情、编辑、修改范围、删除范围 | 3:15～3:18 |
| 03-05～03-08 | 今天入口、进行中详情、确认、已结束详情 | 208:65、208:216、208:263、208:332 |
| 03-09～03-10 | 月历结束日、月历次日 | 208:383、208:536 |
| 03-11 | 回看中间日期，显示当时是第 4 天 | [214:688](https://www.figma.com/design/8aE2Z9hUhKtxgXjnEuCY7I?node-id=214-688) |
| 03范围选中态 | 编辑：这次及之后、整个系列 | 170:2485、170:2594 |
| 03范围选中态 | 删除：这次及之后、整个系列 | 170:5373、170:5477 |

原画框保留ID，在原02、03模块中更新；修改前备份保留在流程与评审Page。补充名称校验、保存中、成功、失败、未保存退出和持续次数说明。范围选择包含三种选中态与确认跳转。

## 3. 查看与评审

工作台网页演示使用预设数据。普通日程的标注画面提供「打开试用版，创建普通日程」，可进入实际表单试用。标注模式通过原型锚点和文档章节相互定位，分享链接在画框和文档就绪后选中对应批注。Figma保留可编辑图层、原型连线和已有动效；使用固定示例说明规则。

所有画框按390 × 844等比显示。正计时取消循环和次数；详情取消人工发生按钮；类型锁定、历史保留、月末回退、闰日跳过与AI未接入均有说明。运行时日期计算、保存、跨标签页保护与统计在独立产品前端中验证。

## 4. V0.6 交互原型

工作台的「原型入口」按流程收录 V0.6 画框。选择「网页演示」可以点击控件体验跳转，选择「标注」可在控件和 PRD 规则之间双向定位。V0.6 的录音、总结、登录和云同步使用预设示例。

| 流程 | 工作台入口 | Figma 原型 | 产品规则 |
| --- | --- | --- | --- |
| AI 语音 | [加号 → AI 语音](https://yushumeng532.github.io/wanshili/?screen=v06%3Avoice#prd) | [语音](https://www.figma.com/proto/8aE2Z9hUhKtxgXjnEuCY7I?node-id=230-850&page-id=230%3A847&starting-point-node-id=230%3A850) | [AI 语音创建和管理日程](./prd.md#7-ai-语音创建和管理日程p0) |
| 统计 | [选择范围和日程明细](https://yushumeng532.github.io/wanshili/?screen=v06%3Amonth_category#prd) | [统计](https://www.figma.com/proto/8aE2Z9hUhKtxgXjnEuCY7I?node-id=230-2255&page-id=230%3A847&starting-point-node-id=230%3A2255) | [统计](./prd.md#5-统计) |
| 历史原型 · 习惯回顾 | [月末提醒 → 查看回顾](https://yushumeng532.github.io/wanshili/?screen=v06%3AmonthStart#prd) | [习惯回顾](https://www.figma.com/proto/8aE2Z9hUhKtxgXjnEuCY7I?node-id=230-1997&page-id=230%3A847&starting-point-node-id=230%3A1997) | [当前月末补记规则](./prd.md#8-月末补记p0) |
| 账号及云同步 | [登录、注册与同步](https://yushumeng532.github.io/wanshili/?screen=v06%3Alogin#prd) | [账号](https://www.figma.com/proto/8aE2Z9hUhKtxgXjnEuCY7I?node-id=235-6831&page-id=230%3A847&starting-point-node-id=235%3A6831) | [注册与登录](./prd.md#9-注册登录与账号归属p1) · [MySQL 保存](./prd.md#10-mysql-保存与版本兼容p1) |
