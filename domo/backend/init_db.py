"""一键数据库初始化 — 建表 + 插入测试数据 + 演示出入库流水"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pymysql
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "warehouse"),
    "charset": "utf8mb4",
}


def run():
    print("=" * 50)
    print("  千寻仓库管理系统 — 数据库初始化")
    print("=" * 50)

    # 1. 确保数据库存在
    conn = pymysql.connect(
        host=DB_CONFIG["host"],
        port=DB_CONFIG["port"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        charset=DB_CONFIG["charset"],
    )
    try:
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_CONFIG['database']}` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_general_ci")
        conn.commit()
        print(f"  [OK] 数据库 {DB_CONFIG['database']} 就绪")
    finally:
        conn.close()

    # 2. 执行 schemas.sql 建表
    schema_path = os.path.join(os.path.dirname(__file__), "models", "schemas.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    conn = pymysql.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor()
        for statement in schema_sql.split(";"):
            stmt = statement.strip()
            if stmt and not stmt.startswith("--"):
                try:
                    cursor.execute(stmt)
                except Exception as e:
                    print(f"  [SKIP] {str(e)[:80]}")
        conn.commit()
        print("  [OK] 建表完成")
    finally:
        conn.close()

    # 3. 插入测试数据
    db_name = DB_CONFIG["database"]
    conn = pymysql.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor()

        # --- 用户 ---
        pw_hash_a = generate_password_hash("abc123")
        pw_hash_b = generate_password_hash("112233")
        pw_hash_c = generate_password_hash("123456")
        # 使用 REPLACE 确保每次运行都更新密码
        cursor.execute(
            "REPLACE INTO user (id, username, password_hash, role) VALUES (1, %s, %s, %s)",
            ("admin", pw_hash_a, "admin"),
        )
        cursor.execute(
            "REPLACE INTO user (id, username, password_hash, role) VALUES (2, %s, %s, %s)",
            ("zhangsan", pw_hash_b, "staff"),
        )
        cursor.execute(
            "REPLACE INTO user (id, username, password_hash, role) VALUES (3, %s, %s, %s)",
            ("lisi", pw_hash_c, "staff"),
        )
        conn.commit()
        print("  OK users")

        # --- 分类 ---
        categories = ["紧固件", "原材料", "电器", "传动件", "密封件", "弹性件", "饮料", "方便食品", "食品", "办公用品"]
        inserted_c = 0
        for c in categories:
            try:
                cursor.execute("INSERT IGNORE INTO category (name) VALUES (%s)", (c,))
                if cursor.rowcount:
                    inserted_c += 1
            except Exception:
                pass
        conn.commit()
        print(f"  [OK] 插入 {inserted_c} 个分类")

        # --- 商品 ---
        products = [
            ("P001", "农夫山泉 550ml",      "饮料",     "瓶", 20),
            ("P002", "康师傅红烧牛肉面",     "方便食品",  "桶", 10),
            ("P003", "螺丝钉 M6×30",        "紧固件",   "个", 100),
            ("P004", "钢板 2mm×1m×2m",     "原材料",   "块", 20),
            ("P005", "电机 X200 步进",      "电器",     "台", 5),
            ("P006", "轴承 6205-2RS",       "传动件",   "套", 30),
            ("P007", "密封圈 D50 硅胶",     "密封件",   "个", 200),
            ("P008", "齿轮 M2.5 20齿",      "传动件",   "个", 50),
            ("P009", "弹簧 10×50 压缩",     "弹性件",   "根", 100),
            ("P010", "螺栓 M8×30 8.8级",    "紧固件",   "套", 300),
            ("P011", "垫片 M6 不锈钢",       "紧固件",   "个", 500),
            ("P012", "联轴器 C25 弹性",      "传动件",   "套", 15),
            ("P013", "奥利奥饼干 97g",       "食品",     "盒", 50),
            ("P014", "打印纸 A4 70g",        "办公用品",  "包", 30),
            ("P015", "纯净水 18.9L 桶装",    "饮料",     "桶", 8),
        ]
        inserted_p = 0
        for p in products:
            try:
                cursor.execute(
                    "INSERT IGNORE INTO product (code, name, category, unit, warn_stock) VALUES (%s, %s, %s, %s, %s)", p
                )
                if cursor.rowcount:
                    inserted_p += 1
            except Exception:
                pass
        conn.commit()
        print(f"  [OK] 插入 {inserted_p} 个测试商品")

        # --- 库存 ---
        stocks = [
            (1, 120), (2, 35),  (3, 500), (4, 80),
            (5, 25),  (6, 120), (7, 600), (8, 200),
            (9, 300), (10, 1000), (11, 0), (12, 60),
            (13, 150), (14, 45), (15, 15),
        ]
        inserted_s = 0
        for s in stocks:
            try:
                cursor.execute(
                    "INSERT IGNORE INTO stock (product_id, quantity) VALUES (%s, %s)", s
                )
                if cursor.rowcount:
                    inserted_s += 1
            except Exception:
                pass
        conn.commit()
        print(f"  [OK] 初始化 {inserted_s} 条库存记录")

        # --- 演示入库单 ---
        cursor.execute("SELECT COUNT(*) FROM inbound_order")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO inbound_order (id,order_no,supplier,operator_id,status,create_time,confirm_time)
                VALUES
                (1,'IN20260601001','华东五金批发市场',  1,'confirmed','2026-06-01 09:15:00','2026-06-01 09:16:00'),
                (2,'IN20260602001','鑫达传动有限公司',  1,'confirmed','2026-06-02 14:30:00','2026-06-02 14:31:00'),
                (3,'IN20260603001','联众商贸配送中心',  2,'confirmed','2026-06-03 10:00:00','2026-06-03 10:01:00'),
                (4,'IN20260604001','华东五金批发市场',  1,'pending',  '2026-06-04 08:45:00',NULL)
            """)
            cursor.execute("""
                INSERT INTO inbound_detail (order_id,product_id,quantity) VALUES
                (1,3,200),(1,10,500),(1,11,300),
                (2,6,50),(2,8,80),(2,12,30),
                (3,1,200),(3,13,100),
                (4,7,150),(4,14,60)
            """)
            cursor.execute("""
                INSERT INTO stock_record (product_id,change_type,change_qty,before_qty,after_qty,biz_no,operator_id,create_time,remark) VALUES
                (3,'inbound',200,300,500,'IN20260601001',1,'2026-06-01 09:16:00','华东五金—螺丝钉补货'),
                (10,'inbound',500,500,1000,'IN20260601001',1,'2026-06-01 09:16:00','华东五金—螺栓补货'),
                (11,'inbound',300,0,300,'IN20260601001',1,'2026-06-01 09:16:00','华东五金—垫片补货'),
                (6,'inbound',50,70,120,'IN20260602001',1,'2026-06-02 14:31:00',''),
                (8,'inbound',80,120,200,'IN20260602001',1,'2026-06-02 14:31:00',''),
                (12,'inbound',30,30,60,'IN20260602001',1,'2026-06-02 14:31:00',''),
                (1,'inbound',200,120,320,'IN20260603001',2,'2026-06-03 10:01:00',''),
                (13,'inbound',100,50,150,'IN20260603001',2,'2026-06-03 10:01:00','')
            """)
            conn.commit()
            print("  [OK] 插入演示入库单 + 流水")

        # --- 演示出库单 ---
        cursor.execute("SELECT COUNT(*) FROM outbound_order")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO outbound_order (id,order_no,customer,operator_id,status,create_time,confirm_time)
                VALUES
                (1,'OUT20260601001','张三便利店（解放路店）',1,'confirmed','2026-06-01 10:00:00','2026-06-01 10:02:00'),
                (2,'OUT20260602001','李记五金工具商行',    2,'confirmed','2026-06-02 16:00:00','2026-06-02 16:01:00'),
                (3,'OUT20260603001','远航机械加工厂',      1,'confirmed','2026-06-03 11:30:00','2026-06-03 11:31:00'),
                (4,'OUT20260604001','王师傅维修铺',        3,'pending',  '2026-06-04 09:00:00',NULL)
            """)
            cursor.execute("""
                INSERT INTO outbound_detail (order_id,product_id,quantity) VALUES
                (1,1,30),(1,2,10),(1,13,20),
                (2,3,150),(2,10,200),(2,6,30),
                (3,4,15),(3,5,3),(3,12,10),
                (4,8,50),(4,14,20)
            """)
            cursor.execute("""
                INSERT INTO stock_record (product_id,change_type,change_qty,before_qty,after_qty,biz_no,operator_id,create_time,remark) VALUES
                (1,'outbound',30,320,290,'OUT20260601001',1,'2026-06-01 10:02:00','张三便利店—配送'),
                (2,'outbound',10,45,35,'OUT20260601001',1,'2026-06-01 10:02:00',''),
                (13,'outbound',20,150,130,'OUT20260601001',1,'2026-06-01 10:02:00',''),
                (3,'outbound',150,500,350,'OUT20260602001',2,'2026-06-02 16:01:00','李记五金—螺丝急单'),
                (10,'outbound',200,1000,800,'OUT20260602001',2,'2026-06-02 16:01:00',''),
                (6,'outbound',30,120,90,'OUT20260602001',2,'2026-06-02 16:01:00',''),
                (4,'outbound',15,80,65,'OUT20260603001',1,'2026-06-03 11:31:00','远航机械—钢板加工'),
                (5,'outbound',3,25,22,'OUT20260603001',1,'2026-06-03 11:31:00',''),
                (12,'outbound',10,60,50,'OUT20260603001',1,'2026-06-03 11:31:00','')
            """)
            conn.commit()
            print("  [OK] 插入演示出库单 + 流水")

    finally:
        conn.close()

    print()
    print("=" * 50)
    print("  [完成] 数据库初始化完成！")
    print("  测试账号: admin / zhangsan / lisi")
    print("  登录密码: abc123 / 112233 / 123456")
    print("=" * 50)


if __name__ == "__main__":
    run()
