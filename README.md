# 万事历
每天轻松记录，月末查看各类事项实际发生了多少天。

正计时、倒数日和生日共用一张日历，支持同日多项。产品主线为“创建事项—每日确认—月度汇总—明细核对”。

[在线产品工作台](https://yushumeng532.github.io/wanshili/) · [Figma交互演示](https://www.figma.com/proto/8aE2Z9hUhKtxgXjnEuCY7I?node-id=3-4&page-id=2%3A2&starting-point-node-id=3%3A4&scaling=scale-down&content-scaling=fixed&show-proto-sidebar=1) · [设计文件](https://www.figma.com/design/8aE2Z9hUhKtxgXjnEuCY7I?node-id=2-2)

## 产品文档

| 文档 | 内容 |
| --- | --- |
| [PRD](docs/modules/01-calendar/prd.md) | 按页面说明用户动作、产品行为与规则 |
| [Dev Spec](docs/modules/01-calendar/dev-spec.md) | 数据、保存、循环及统计契约 |
| [页面设计](docs/modules/01-calendar/page-design.md) | 页面布局、状态与动效 |
| [验证记录](docs/modules/01-calendar/validation.md) | 按日期记录实测过程和结果 |
| [校验说明](docs/modules/01-calendar/checks.md) | 原型锚点与文档的对应关系 |
| [原型与流程](docs/modules/01-calendar/prototype.md) | 页面索引、流程图与演示入口 |
| [竞品研究](docs/research.md) | 六个样本的能力如何转成产品取舍 |

## V0.4 更新

新增新建表单、日期与循环子层、详情、编辑、未保存确认、删除和保存反馈。界面已归入原 Figma 的 02、03 模块，核心跳转已实际点击验证；工作台可选对应页面，批注连接至相关章节。

| 交付 | 当前状态 |
| --- | --- |
| 双栏工作台 | 已上线；支持章节复制、批注和锚点校验 |
| 创建到删除 | 网页支持填写、新建、详情、编辑与删除；演示数据在本次页面中保留 |
| 每日确认与月末统计 | 需求与数据口径已定义，待设计开发 |
| 经期记录、AI漏记询问与分析范围 | 保留后续模块，待细化 |

## 协作与启动

分支修改 → PR查看差异 → 合并 → GitHub Pages部署。页面改动同步PRD、设计和验证；数据规则改动同步Spec。当前有效文档沿用固定路径，历史由Git保存。

本地运行 `python -m http.server 8765`，打开 http://localhost:8765/ 。工作台由HTML、CSS、JavaScript和Markdown组成，批注存储与产品事项数据相互独立。

下一步补齐真实输入与本地保存，再验证“每日确认—月末天数—明细修改”。特殊日期、循环历史及假调休数据来源仍待确认。
