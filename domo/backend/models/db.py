"""数据库连接管理 — 上下文管理器"""

from contextlib import contextmanager
import pymysql
from flask import current_app, g


def get_db_config():
    """从当前应用配置中获取数据库连接参数"""
    return current_app.config["DB_CONFIG"]


@contextmanager
def get_db_connection():
    """数据库连接上下文管理器，自动提交/回滚/关闭"""
    config = get_db_config()
    conn = pymysql.connect(**config)
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    else:
        conn.commit()
    finally:
        conn.close()


def get_db():
    """获取当前请求的数据库连接（复用，请求结束后关闭）"""
    if "db" not in g:
        g.db = pymysql.connect(**get_db_config())
    return g.db


def close_db(e=None):
    """关闭当前请求的数据库连接"""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(app):
    """注册数据库关闭回调"""
    app.teardown_appcontext(close_db)
