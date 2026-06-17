# 千寻仓库管理系统 (WMS)

一个轻量级、开箱即用的仓库管理系统，采用 Flask + 原生 JavaScript SPA 前后端分离架构。覆盖商品管理、出入库操作、库存追踪与数据报表等完整业务流程，具备 66 条测试用例与自动化兼容测试脚本。

---

## 功能概览

**商品管理** — 商品编码、名称、分类、单位、安全库存阈值的 CRUD，支持按编码或名称模糊搜索。

**入库管理** — 创建入库单（支持多商品明细）、确认入库，库存自动增加并生成不可变流水记录。

**出库管理** — 创建出库单、确认出库，出库时在事务内校验库存，不足则回滚并给出明确提示。

**库存查询** — 实时库存列表，支持按商品名称/编码搜索和低库存预警筛选。

**库存流水** — 按商品、变更类型（入库/出库/调整）、时间范围的不可变审计日志。

**数据报表** — 近 7 天出入库趋势可视化图表（ECharts），直观展示仓库周转情况。

**用户认证** — JWT 登录认证，区分管理员（admin）与操作员（staff）两种角色。

**自动化测试** — 覆盖认证、商品、入库、出库、库存、流水的全 API 兼容测试脚本。

---

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python 3.9+ / Flask 3.0 / PyMySQL |
| 数据库 | MySQL 8.0（8 张表，InnoDB 引擎，utf8mb4） |
| 认证 | JWT（flask-jwt-extended），bcrypt 密码哈希 |
| 前端 | 原生 JavaScript SPA / Tailwind CSS / Font Awesome 6 / ECharts 5 |
| 测试 | Python requests + Selenium |

---

## 项目结构

```
仓库管理系统/
├── README.md                          # 项目说明
├── .gitignore
├── domo/                              # 系统代码
│   ├── start.bat                      # Windows 一键启动
│   ├── start.sh                       # Linux/Mac 一键启动
│   ├── test_api.py                    # 自动化兼容测试脚本
│   ├── backend/                       # Flask 后端
│   │   ├── app.py                     # 应用入口，注册蓝图与静态文件服务
│   │   ├── config.py                  # 多环境配置（development / production）
│   │   ├── init_db.py                 # 数据库初始化（建表 + 导入测试数据）
│   │   ├── requirements.txt           # Python 依赖清单
│   │   ├── .env.example               # 环境变量模板
│   │   ├── models/                    # 数据层
│   │   │   ├── db.py                  # PyMySQL 连接管理与上下文
│   │   │   ├── schemas.sql            # 建表脚本（8 张表，含外键与索引）
│   │   │   ├── init_data.sql          # 测试数据（用户、商品、分类等）
│   │   │   ├── DATA_DICTIONARY.md     # 数据字典文档
│   │   │   └── ER_DIAGRAM.md          # 实体关系图（Mermaid）
│   │   ├── routes/                    # API 路由层（Flask Blueprint）
│   │   │   ├── auth.py                # 登录认证（JWT 签发与验证）
│   │   │   ├── product.py             # 商品 CRUD（编码/名称/分类/单位/安全库存）
│   │   │   ├── category.py            # 商品分类查询
│   │   │   ├── inbound.py             # 入库管理（创建订单、确认入库）
│   │   │   ├── outbound.py            # 出库管理（创建订单、确认出库）
│   │   │   ├── stock.py               # 库存查询（搜索、低库存筛选）
│   │   │   └── report.py              # 数据报表（近 7 天趋势）
│   │   ├── services/                  # 业务逻辑层
│   │   │   └── stock_service.py       # 库存变更核心逻辑（事务 + 行锁）
│   │   ├── utils/                     # 工具函数
│   │   │   └── helpers.py             # 统一响应格式与参数校验
│   │   ├── lib/                       # 自定义库
│   │   │   └── jwt_tool.py            # JWT 辅助工具（备用）
│   │   ├── scripts/                   # 运维脚本
│   │   │   ├── backup.sh              # 数据库备份
│   │   │   ├── restore.sh             # 数据库恢复
│   │   │   ├── cron_setup.sh          # 定时任务设置
│   │   │   └── migrate_template.sql   # 数据库迁移模板
│   │   └── logs/                      # 应用日志目录
│   └── frontend/                      # 原生 JavaScript SPA 前端
│       ├── index.html                 # 单页应用入口（侧边栏 + 顶栏布局）
│       ├── css/
│       │   ├── style.css              # 自定义样式
│       │   └── tailwind-fallback.css  # Tailwind 备用样式
│       └── js/
│           ├── api.js                 # API 请求封装（JWT 注入、401 跳转）
│           ├── utils.js               # 通用组件（Toast 提示、Modal 弹窗）
│           ├── main.js                # Hash 路由管理、登录态维护
│           └── pages/                 # 功能页面
│               ├── login.js           # 登录页
│               ├── dashboard.js       # 首页仪表板（统计卡片）
│               ├── product.js         # 商品管理（表格 + 搜索）
│               ├── inbound.js         # 入库管理（订单 + 明细）
│               ├── outbound.js        # 出库管理（订单 + 明细）
│               ├── stock.js           # 库存查询（列表 + 低库存标记）
│               ├── record.js          # 库存流水（筛选 + 分页）
│               └── report.js          # 数据报表（ECharts 趋势图）
└── 资料/                              # 项目文档与测试资料
    ├── 图/
    │   ├── 项目流程图.png
    │   ├── 项目开发流程图.png
    │   ├── 原型图.md
    │   └── 需求文档.md
    ├── 文档/
    │   ├── 项目计划书.docx
    │   ├── 前端计划书.docx
    │   ├── 后端计划书.docx
    │   ├── 数据库设计与管理计划书.docx
    │   ├── 需求文档.docx
    │   ├── 用户手册.docx
    │   ├── 测试计划书.docx
    │   └── 文件目录.md
    └── 测试/
        ├── 测试用例.xlsx               # 66 条详细测试用例
        ├── 测试执行记录.xlsx
        ├── Bug_统计与修复报告.docx
        └── 测试总结报告.docx
```

---

## 快速开始

### 前置条件

- Python 3.9+
- MySQL 8.0+（服务已启动）
- MySQL 中已创建 `warehouse` 数据库：

```sql
CREATE DATABASE warehouse DEFAULT CHARSET utf8mb4;
```

### 一键启动

```bash
# Windows
start.bat

# Linux / Mac
chmod +x start.sh && ./start.sh
```

### 手动启动

```bash
# 1. 进入后端目录
cd domo/backend

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，将 DB_PASSWORD 改为你的 MySQL 密码

# 3. 安装 Python 依赖
pip install -r requirements.txt

# 4. 初始化数据库（建表 + 导入测试数据）
python init_db.py

# 5. 启动后端服务
python app.py
```

浏览器访问 **http://localhost:5000** 即可使用。

### 测试账号

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | abc123 | 管理员 | 全部操作 |
| zhangsan | 112233 | 操作员 | 出入库操作、查询 |
| lisi | 123456 | 操作员 | 出入库操作、查询 |

---

## 运行自动化测试

```bash
# 确保后端已启动（python app.py），然后执行
cd domo
pip install requests
python test_api.py
```

测试覆盖 6 大模块、30+ 条自动化检查项，包括正常流程（正确登录、创建订单、确认出入库）和异常输入（空字段、负数/小数数量、库存不足、超边界值、无 Token 访问）。

---

## API 概览

所有接口基础路径为 `/api`。除 `/api/auth/login` 外，均需在 Header 中携带 JWT Token：

```
Authorization: Bearer <token>
```

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录（返回 JWT Token） |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 商品列表（支持 `keyword` 搜索） |
| GET | `/api/products/<id>` | 商品详情 |
| POST | `/api/products` | 新增商品 |
| PUT | `/api/products/<id>` | 修改商品 |
| DELETE | `/api/products/<id>` | 删除商品 |
| GET | `/api/categories` | 分类列表 |

### 入库

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/inbound/order` | 创建入库单 |
| GET | `/api/inbound/order/<id>` | 入库单详情 |
| POST | `/api/inbound/confirm/<id>` | 确认入库（库存增加 + 流水记录） |
| GET | `/api/inbound/orders` | 入库单列表 |

### 出库

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/outbound/order` | 创建出库单 |
| GET | `/api/outbound/order/<id>` | 出库单详情 |
| POST | `/api/outbound/confirm/<id>` | 确认出库（库存扣减 + 流水记录） |
| GET | `/api/outbound/orders` | 出库单列表 |

### 库存与报表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stock` | 库存列表（支持 `keyword` / `low_stock` 筛选） |
| GET | `/api/stock/records` | 库存流水（支持 `product_id` / `change_type` / 日期筛选） |
| GET | `/api/report/daily_trend` | 近 7 天出入库趋势 |

所有接口统一返回格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

---

## 数据库设计

系统包含 8 张表，使用 InnoDB 引擎、utf8mb4 字符集，完整外键约束。

**user**（用户表）— 登录名、bcrypt 密码哈希、角色（admin/staff）、最后登录时间。

**product**（商品表）— 商品编码、名称、分类、单位、安全库存阈值。

**category**（分类表）— 商品分类名称（紧固件、原材料、电器、传动件、密封件、弹性件、饮料、方便食品、食品、办公用品）。

**inbound_order** + **inbound_detail**（入库单）— 单号格式 `IN+yyyyMMdd+流水号`，支持多商品明细，状态流转 pending → confirmed / cancelled。

**outbound_order** + **outbound_detail**（出库单）— 单号格式 `OUT+yyyyMMdd+流水号`，状态流转同入库。

**stock**（库存表）— 与商品一对一，实时反映当前库存数量，非负约束。

**stock_record**（库存流水）— 每次入库/出库/调整生成一条记录，包含变更前后数量和关联单号，**不可修改或删除**。

详细数据字典见 `domo/backend/models/DATA_DICTIONARY.md`，实体关系图见 `domo/backend/models/ER_DIAGRAM.md`。

### 实体关系

```
user ──1:N── inbound_order ──1:N── inbound_detail ──N:1── product
user ──1:N── outbound_order ──1:N── outbound_detail ──N:1── product
product ──1:1── stock
product ──1:N── stock_record
user ──1:N── stock_record
```

---

## 关键设计

**事务安全**：入库/出库确认使用 `SELECT ... FOR UPDATE` 行级锁配合显式事务，保证高并发下库存数据一致性。出库时在事务内校验库存，不足则整体回滚。

**防死锁**：明细行按 `product_id` 升序排序后逐行加锁，统一所有事务的锁获取顺序，消除死锁风险。

**SQL 注入防护**：全部数据库操作使用 PyMySQL 参数化查询，不拼接 SQL 字符串。

**不可变流水**：`stock_record` 表仅允许 INSERT，不提供 UPDATE 或 DELETE 接口，确保审计追溯完整可靠。

**SPA 路由**：前端基于 hash 路由，未登录自动跳转登录页，Token 过期（401）自动清除登录态并重定向。

**统一响应**：所有 API 遵循 `{code, message, data}` 格式，前端统一拦截业务错误码。

---
