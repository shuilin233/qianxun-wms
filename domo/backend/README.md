# 千寻仓库管理系统 — 后端

## 技术栈

Python 3.9+ / Flask 3.0 / MySQL 8.0 / PyMySQL / JWT认证

## 快速启动

### 1. 创建数据库

```bash
mysql -u root -p < models/schemas.sql
mysql -u root -p < models/init_data.sql
```

### 2. 配置环境变量

编辑 `.env` 文件，修改数据库连接信息和JWT密钥：

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=warehouse
JWT_SECRET_KEY=your-random-secret
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 运行

```bash
python app.py
```

服务启动在 `http://localhost:5000`

## 测试账号

> 首次部署请运行 `python init_db.py` 初始化数据库和用户密码。

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | abc123 | 管理员 |
| zhangsan | 112233 | 操作员 |
| lisi | 123456 | 操作员 |

## API 概览

所有接口基础路径为 `/api`，除登录外均需在 Header 中携带 JWT Token：

```
Authorization: Bearer <token>
```

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| GET | `/api/products` | 商品列表 |
| GET | `/api/products/<id>` | 商品详情 |
| POST | `/api/products` | 新增商品 |
| PUT | `/api/products/<id>` | 修改商品 |
| DELETE | `/api/products/<id>` | 删除商品 |
| POST | `/api/inbound/order` | 创建入库单 |
| GET | `/api/inbound/order/<id>` | 入库单详情 |
| POST | `/api/inbound/confirm/<id>` | 确认入库 |
| GET | `/api/inbound/orders` | 入库单列表 |
| POST | `/api/outbound/order` | 创建出库单 |
| GET | `/api/outbound/order/<id>` | 出库单详情 |
| POST | `/api/outbound/confirm/<id>` | 确认出库 |
| GET | `/api/outbound/orders` | 出库单列表 |
| GET | `/api/stock` | 库存列表 |
| GET | `/api/stock/records` | 库存流水 |
| GET | `/api/report/daily_trend` | 近7天趋势 |

## 项目结构

```
backend/
├── app.py                 # 入口
├── config.py              # 配置
├── .env                   # 环境变量
├── .gitignore
├── requirements.txt
├── README.md
├── models/
│   ├── db.py              # 数据库连接
│   ├── schemas.sql        # 建表脚本
│   └── init_data.sql      # 测试数据
├── routes/
│   ├── auth.py            # 认证
│   ├── product.py         # 商品CRUD
│   ├── inbound.py         # 入库
│   ├── outbound.py        # 出库
│   ├── stock.py           # 库存
│   └── report.py          # 报表
├── services/
│   └── stock_service.py   # 库存变更核心逻辑
├── utils/
│   └── helpers.py         # 工具函数
└── logs/                  # 日志目录
```

## 关键设计

- **事务安全**：入库/出库确认使用 `SELECT ... FOR UPDATE` 行锁 + 事务，保证库存一致性
- **防死锁**：明细按 `product_id` 升序处理，统一锁行顺序
- **SQL注入防护**：所有查询使用参数化SQL
- **统一响应格式**：`{"code": 200, "message": "success", "data": {}}`
