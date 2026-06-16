# 千寻仓库管理系统 — 数据字典

> 数据库: `warehouse` / 字符集: utf8mb4 / 引擎: InnoDB

---

## 1. user（用户表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 用户ID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | — | 登录名 |
| password_hash | VARCHAR(255) | NOT NULL | — | bcrypt 密码哈希 |
| role | VARCHAR(20) | NOT NULL | 'staff' | admin / staff |
| last_login | DATETIME | — | NULL | 最后登录时间 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**索引**: `idx_user_username` (UNIQUE, username)

---

## 2. product（商品表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 商品ID |
| code | VARCHAR(50) | NOT NULL, UNIQUE | — | 商品编码 |
| name | VARCHAR(100) | NOT NULL | — | 商品名称 |
| category | VARCHAR(50) | — | '' | 分类 |
| unit | VARCHAR(10) | — | '个' | 计量单位 |
| warn_stock | INT | — | 0 | 安全库存阈值 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**: `idx_product_code` (UNIQUE, code), `idx_product_name` (INDEX, name)

---

## 3. inbound_order（入库单头）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 订单ID |
| order_no | VARCHAR(30) | NOT NULL, UNIQUE | — | 单号 IN+yyyyMMdd+流水 |
| supplier | VARCHAR(100) | — | '' | 供应商 |
| operator_id | INT | NOT NULL, FK→user.id | — | 操作人 |
| status | VARCHAR(20) | NOT NULL | 'pending' | pending/confirmed/cancelled |
| create_time | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| confirm_time | DATETIME | — | NULL | 确认时间 |

**索引**: `idx_ib_order_no` (UNIQUE), `idx_ib_create_time`, `idx_ib_status`

---

## 4. inbound_detail（入库明细）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 明细ID |
| order_id | INT | NOT NULL, FK→inbound_order.id ON DELETE CASCADE | — | 订单ID |
| product_id | INT | NOT NULL, FK→product.id | — | 商品ID |
| quantity | INT | NOT NULL | — | 入库数量 (>0) |

**索引**: `idx_ibd_order_product` (UNIQUE, order_id+product_id), `idx_ibd_order_id`

---

## 5. outbound_order（出库单头）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 订单ID |
| order_no | VARCHAR(30) | NOT NULL, UNIQUE | — | 单号 OUT+yyyyMMdd+流水 |
| customer | VARCHAR(100) | — | '' | 客户 |
| operator_id | INT | NOT NULL, FK→user.id | — | 操作人 |
| status | VARCHAR(20) | NOT NULL | 'pending' | pending/confirmed/cancelled |
| create_time | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| confirm_time | DATETIME | — | NULL | 确认时间 |

**索引**: `idx_ob_order_no` (UNIQUE), `idx_ob_create_time`, `idx_ob_status`

---

## 6. outbound_detail（出库明细）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 明细ID |
| order_id | INT | NOT NULL, FK→outbound_order.id ON DELETE CASCADE | — | 订单ID |
| product_id | INT | NOT NULL, FK→product.id | — | 商品ID |
| quantity | INT | NOT NULL | — | 出库数量 (>0) |

**索引**: `idx_obd_order_product` (UNIQUE, order_id+product_id), `idx_obd_order_id`

---

## 7. stock（库存表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 库存记录ID |
| product_id | INT | NOT NULL, UNIQUE, FK→product.id | — | 商品ID（一对一） |
| quantity | INT | NOT NULL | 0 | 当前库存（非负） |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 最后变更时间 |

**索引**: `idx_stock_product` (UNIQUE, product_id)

---

## 8. stock_record（库存流水）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INT | PK, AUTO_INCREMENT | — | 流水ID |
| product_id | INT | NOT NULL, FK→product.id | — | 商品ID |
| change_type | VARCHAR(20) | NOT NULL | — | inbound / outbound / adjust |
| change_qty | INT | NOT NULL | — | 变更数量（正数） |
| before_qty | INT | NOT NULL | — | 变更前库存 |
| after_qty | INT | NOT NULL | — | 变更后库存 |
| biz_no | VARCHAR(30) | — | '' | 关联单号 |
| operator_id | INT | FK→user.id | NULL | 操作人 |
| create_time | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 发生时间 |
| remark | VARCHAR(255) | — | '' | 备注 |

**索引**: `idx_sr_product`, `idx_sr_create_time`, `idx_sr_biz_no`, `idx_sr_change_type`

> **重要**: 流水记录一旦插入，不允许修改或删除。应用层保证 `before_qty + change_qty = after_qty`（入库）/ `before_qty - change_qty = after_qty`（出库）。

---

## 状态码约定

### 订单状态 (status)

| 值 | 含义 | 缩写 |
|----|------|------|
| pending | 待确认 | P |
| confirmed | 已确认 | C |
| cancelled | 已取消 | X |

### 流水变更类型 (change_type)

| 值 | 含义 |
|----|------|
| inbound | 入库 |
| outbound | 出库 |
| adjust | 库存调整（盘点盈亏） |

### 用户角色 (role)

| 值 | 含义 | 权限 |
|----|------|------|
| admin | 管理员 | 全部操作 |
| staff | 操作员 | 出入库操作、查询 |
