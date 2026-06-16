"""应用配置"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """基础配置"""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    DB_CONFIG = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 3306)),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": os.getenv("DB_NAME", "warehouse"),
        "charset": "utf8mb4",
    }

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-dev")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 604800))  # 7天

    JSON_AS_ASCII = False  # 支持中文输出


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
