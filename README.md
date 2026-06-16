# 千寻仓库管理系统

Flask + MySQL + 原生 JavaScript 前后端分离的仓库管理系统，具备完整的**测试文档与自动化测试**。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.9+ / Flask 3.0 / PyMySQL |
| 数据库 | MySQL 8.0，8 张表，InnoDB 引擎 |
| 认证 | JWT（flask-jwt-extended），bcrypt 密码哈希 |
| 前端 | 原生 JavaScript SPA，Tailwind CSS |
| 测试 | Python + requests，API 接口自动化测试 |

## 快速启动

```bash
# 1. 进入后端目录
cd domo/backend

# 2. 配置数据库连接
copy .env.example .env
# 编辑 .env，修改 DB_PASSWORD 为你自己的 MySQL 密码

# 3. 安装依赖
pip install -r requirements.txt

# 4. 初始化数据库（建表 + 测试数据）
python init_db.py

# 5. 启动服务
python app.py

# 6. 浏览器访问
# http://localhost:5000
```

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | abc123 | 管理员 |
| zhangsan | 112233 | 操作员 |
| lisi | 123456 | 操作员 |

## 运行自动化测试

```bash
cd domo
pip install requests
python test_api.py
```

测试覆盖认证、商品 CRUD、入库/出库、库存查询、库存流水等全部 API 模块。

## 测试资料

| 文件 | 说明 |
|------|------|
| `资料/测试/测试用例.xlsx` | 66 条详细测试用例 |
| `资料/测试/测试执行记录.xlsx` | 测试执行过程记录 |
| `资料/测试/测试总结报告.docx` | 测试总结报告 |
| `资料/测试/Bug_统计与修复报告.docx` | Bug 统计与修复记录 |
| `domo/test_api.py` | 自动化兼容测试脚本 |

## 项目结构

```
domo/
├── backend/                # Flask 后端
│   ├── app.py              # 应用入口
│   ├── config.py           # 配置管理
│   ├── init_db.py          # 数据库初始化
│   ├── models/             # 数据模型层（8 张表）
│   ├── routes/             # API 路由层（7 个模块）
│   ├── services/           # 业务逻辑层
│   └── utils/              # 工具函数
├── frontend/               # 原生 JS 前端 SPA
│   ├── index.html
│   ├── css/
│   └── js/pages/           # 8 个功能页面
└── test_api.py             # 自动化测试脚本
```

## 核心设计

- **事务安全**：入库/出库确认使用 `SELECT ... FOR UPDATE` 行锁，保证库存一致性
- **防死锁**：明细按 `product_id` 升序处理，统一锁行顺序
- **SQL 注入防护**：全部参数化查询
- **统一响应格式**：`{"code": 200, "message": "success", "data": {}}`

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/products` | 商品列表/搜索 |
| POST | `/api/products` | 新增商品 |
| PUT | `/api/products/<id>` | 修改商品 |
| DELETE | `/api/products/<id>` | 删除商品 |
| POST | `/api/inbound/order` | 创建入库单 |
| POST | `/api/inbound/confirm/<id>` | 确认入库 |
| POST | `/api/outbound/order` | 创建出库单 |
| POST | `/api/outbound/confirm/<id>` | 确认出库 |
| GET | `/api/stock` | 库存查询 |
| GET | `/api/stock/records` | 库存流水 |
| GET | `/api/report/daily_trend` | 近 7 天趋势 |

## 作者

shuilin233
