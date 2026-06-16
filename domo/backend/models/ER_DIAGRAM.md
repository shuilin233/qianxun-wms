# 千寻仓库管理系统 — 实体关系图（ER Diagram）

```mermaid
erDiagram
    user ||--o{ inbound_order : "operates"
    user ||--o{ outbound_order : "operates"
    user ||--o{ stock_record : "records"

    product ||--o{ inbound_detail : "in"
    product ||--o{ outbound_detail : "out"
    product ||--o{ stock_record : "tracked"
    product ||--|| stock : "has"

    inbound_order ||--|{ inbound_detail : "contains"
    outbound_order ||--|{ outbound_detail : "contains"

    user {
        int id PK "用户ID"
        varchar username UK "登录名"
        varchar password_hash "密码哈希"
        varchar role "admin / staff"
        datetime last_login "最后登录"
        datetime created_at "创建时间"
    }

    product {
        int id PK "商品ID"
        varchar code UK "商品编码"
        varchar name "商品名称"
        varchar category "分类"
        varchar unit "单位"
        int warn_stock "安全库存阈值"
        datetime created_at "创建时间"
        datetime updated_at "更新时间"
    }

    inbound_order {
        int id PK "订单ID"
        varchar order_no UK "IN+日期+流水"
        varchar supplier "供应商"
        int operator_id FK "操作人"
        varchar status "pending/confirmed/cancelled"
        datetime create_time "创建时间"
        datetime confirm_time "确认时间"
    }

    inbound_detail {
        int id PK "明细ID"
        int order_id FK "入库单ID"
        int product_id FK "商品ID"
        int quantity "入库数量"
    }

    outbound_order {
        int id PK "订单ID"
        varchar order_no UK "OUT+日期+流水"
        varchar customer "客户"
        int operator_id FK "操作人"
        varchar status "pending/confirmed/cancelled"
        datetime create_time "创建时间"
        datetime confirm_time "确认时间"
    }

    outbound_detail {
        int id PK "明细ID"
        int order_id FK "出库单ID"
        int product_id FK "商品ID"
        int quantity "出库数量"
    }

    stock {
        int id PK "库存ID"
        int product_id UK_FK "商品ID（一对一）"
        int quantity "当前库存"
        datetime updated_at "最后变更时间"
    }

    stock_record {
        int id PK "流水ID"
        int product_id FK "商品ID"
        varchar change_type "inbound/outbound/adjust"
        int change_qty "变更数量"
        int before_qty "变更前库存"
        int after_qty "变更后库存"
        varchar biz_no "关联单号"
        int operator_id FK "操作人"
        datetime create_time "发生时间"
        varchar remark "备注"
    }
```

## 关系说明

| 关系 | 类型 | 说明 |
|------|------|------|
| user → inbound_order | 1:N | 一个用户可操作多个入库单 |
| user → outbound_order | 1:N | 一个用户可操作多个出库单 |
| product → inbound_detail | 1:N | 一个商品可出现在多个入库明细中 |
| product → outbound_detail | 1:N | 一个商品可出现在多个出库明细中 |
| product → stock | 1:1 | 每个商品有且仅有一条库存记录 |
| product → stock_record | 1:N | 一个商品有多次库存流水 |
| inbound_order → inbound_detail | 1:N | 一个入库单包含多个明细行 |
| outbound_order → outbound_detail | 1:N | 一个出库单包含多个明细行 |
