# 万事历 MVP Dev Spec
V0.2 · 2026-11-18 · 待实现契约

## 1. 页面与职责

逻辑页面calendar、event/new、event/:id、statistics，作为设计映射。Repository统一读写；RecurrenceService生成计划；SummaryService计算合计。初版本地存储适配器，后续可替换云端。

## 2. 数据结构

| 对象 | 字段 |
| --- | --- |
| Event | id、title、type、date、calendarType、recurrence、endCondition、aiIncluded、createdAt、updatedAt |
| Recurrence | frequency、weekdays、monthDay、yearMonth、yearDay |
| DailyRecord | eventId、date、status(occurred/not_occurred)、note、createdAt、updatedAt |
| Settings | aiEnabled=false、schemaVersion |
| HolidayCalendar | year、date、isWorkday、source、version |

eventId+date唯一；无记录代表未记录。日期YYYY-MM-DD，时间戳独立；保留生日原历法日期，换算可重算。特殊日期策略待确认。

## 3. 保存与修改

内部契约：saveEvent、saveRecord、deleteOccurrence、getOccurrences、getMonthSummary。具体HTTP接口在接后端时定义。

校验必填后提交；保存中阻止重复提交，持久化成功再反馈。失败保留表单及旧数据；迁移失败不得清空数据。单次循环修改用例外覆盖；系列修改与历史处理按确认后的PRD执行。

## 4. 循环与统计

计划实例与实际记录分开生成及合并。缺年份假调休表返回明确错误；特殊月日及农历规则确认前不静默代算。

按事项：筛选当月occurred后对date取集合。按类型：关联Event类型后对date取集合。全月：所有occurred日期并集，各类型不能直接相加。未记录从截至今天的计划实例缺确认记录推导，保留事项级明细。

原始记录改动后重算受影响月份。跨度与倒数按日历日期差计算，与实际统计独立。

## 5. AI范围

先查全局，再筛aiIncluded。排除项名称、备注及历史未来记录均不传入。全局关闭保留单事项偏好。确认建议时复查已有记录，不能静默覆盖。

## 6. 验证

见[验证](./validation.md)。当前为技术契约，尚未作为产品功能验证通过。
