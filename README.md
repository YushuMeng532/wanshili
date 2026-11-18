# 万事历
每天轻松记录，月末自动算清各类事项实际发生了多少天。

面向同时记录日常活动与重要日期的用户，将正计时、倒数日、生日放进同一日历，串起“创建—每日确认—月度汇总—明细核对”。

[在线评审工作台](https://yushumeng532.github.io/wanshili/) · [Figma设计](https://www.figma.com/design/8aE2Z9hUhKtxgXjnEuCY7I?node-id=108-65)

## 产品分析与方案

| 文档 | 评审内容 |
| --- | --- |
| [竞品发现与取舍](docs/research.md) | 六个样本的成熟能力如何转成产品功能 |
| [PRD](docs/modules/01-calendar/prd.md) | 目标、流程、页面规则和月末天数口径 |
| [Dev Spec](docs/modules/01-calendar/dev-spec.md) | 原始数据、循环、保存与汇总 |
| [页面设计](docs/modules/01-calendar/page-design.md) | 页面状态和反馈 |
| [验证](docs/modules/01-calendar/validation.md) | 验收清单与实际记录 |

参照[示例模板](https://release-2-0-1-product-workspace-preview.colleenyuyu.workers.dev/prd#/agent-studio)按页面写规则、PRD对应Spec、独立记录验证结果的写法，沿用现有文件路径供工作台读取。

## 核心取舍

借鉴日历的重复规则、日志工具的快速记录、习惯工具的月度回顾。计划与实际发生分开；月末按日期去重统计，点击合计返回原记录修正。

## 当前进度

| 交付 | 状态 |
| --- | --- |
| 文档评审工作台 | 已上线，含章节复制及批注 |
| 月历与当天面板 | 四张界面，部分交互连线 |
| 事项流程 | 20屏已导入Figma，逐层检查及连线待完成 |
| 月度统计与实际记录闭环 | 需求已定义，待设计开发验证 |
| AI漏记询问 | 方案规划，尚未上线 |

## 迭代与预览

分支修改 → PR评审 → 合并 → GitHub Pages部署。交互改动同步PRD、页面规则与验收；数据改动同步Spec。

仓库根目录运行 `python -m http.server 8765`，打开 http://localhost:8765/ 。技术为HTML/CSS/JavaScript与Markdown。工作台批注保存独立于产品事项保存。

下一步优先补齐“每日确认—月度天数—明细修改”；特殊日期、循环历史处理和假调休来源待确认，记录成本与统计维度需用户体验验证。
