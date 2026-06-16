"""分类模块 — 分类列表 API"""

from flask import Blueprint, current_app
from flask_jwt_extended import jwt_required

from models.db import get_db_connection
from utils.helpers import success_response

category_bp = Blueprint("category", __name__)


@category_bp.route("/categories", methods=["GET"])
@jwt_required()
def list_categories():
    """获取所有分类列表"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM category ORDER BY id ASC")
        rows = cursor.fetchall()

        categories = [{"id": r[0], "name": r[1]} for r in rows]

    current_app.logger.info(f"查询分类列表，结果数={len(categories)}")
    return success_response(categories)
