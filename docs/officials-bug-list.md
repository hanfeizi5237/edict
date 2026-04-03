# 朝廷官员功能问题清单

## 问题概述
sync_officials_stats.py 在修改为支持诸侯功能后，丢失了原有的功绩计算、费用统计、任务统计等核心功能。

## 问题清单

### P0 - 数据缺失（严重）

| # | 问题 | 影响 | 修复方案 |
|---|------|------|----------|
| 1 | merit_score 字段缺失 | 功绩排行显示 undefined | 恢复功绩计算公式 |
| 2 | merit_rank 字段缺失 | 排名显示 undefined | 按功绩排序后赋值 |
| 3 | tasks_done 字段缺失 | 完成旨意显示 0 | 从 tasks_source.json 统计 |
| 4 | tasks_active 字段缺失 | 执行中任务无法显示 | 从 tasks_source.json 统计 |
| 5 | flow_participations 缺失 | 参与流转无法显示 | 从 flow_log 统计 |
| 6 | participated_edicts 缺失 | 参与旨意列表为空 | 从 flow_log 提取 |
| 7 | cost_cny/cost_usd 缺失 | 费用显示 0 | 根据 token 和模型定价计算 |
| 8 | model_short 缺失 | 模型名称显示完整 ID | 提取模型简称 |
| 9 | heartbeat 缺失 | 活跃状态显示异常 | 从 live_status.json 获取 |
| 10 | totals 统计缺失 | KPI 行数据为空 | 累加所有官员数据 |

### P1 - 功能不完整

| # | 问题 | 影响 |
|---|------|------|
| 11 | 朝廷官员和诸侯混合排序 | 排行榜混乱 |
| 12 | 缺少 courtCount/guestCount 字段 | 前端统计不准确 |

## 修复方案

1. 恢复原始版本的 scan_agent() 函数（包含 message 计数）
2. 添加 calc_cost() 函数（MODEL_PRICING 定价表）
3. 添加 get_task_stats() 函数（任务统计）
4. 添加 get_hb() 函数（心跳状态）
5. 恢复 main() 函数中的完整数据组装逻辑
6. 分离朝廷官员和诸侯的功绩计算

## 责任分工

- **吏部**：修复 sync_officials_stats.py
- **工部**：验证前端显示
- **刑部**：代码审查
- **门下省**：审议修复方案
- **中书省**：起草修复方案
- **尚书省**：派发任务
