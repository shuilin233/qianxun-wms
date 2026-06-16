"""库存模块 — 实时库存查询、流水查询"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from models.db import get_db_connection
from utils.helpers import success_response, parse_page_params, parse_int

stock_bp = Blueprint("stock", __name__)


@stock_bp.route("", methods=["GET"])
@jwt_required()
def list_stock():
    """当前库存列表，支持商品名/编码搜索、库存预警筛选"""
    keyword = request.args.get("keyword", "").strip()
    low_stock_only = request.args.get("low_stock", "").strip()

    with get_db_connection() as conn:
        cursor = conn.cursor()

        sql = """
            SELECT s.id, s.product_id, p.code, p.name, p.category, p.unit,
                   p.warn_stock, s.quantity, s.updated_at
            FROM stock s
            JOIN product p ON s.product_id = p.id
            WHERE 1=1
        """
        params = []

        if keyword:
            sql += " AND (p.name LIKE %s OR p.code LIKE %s)"
            params.extend([f"%{keyword}%", f"%{keyword}%"])

        if low_stock_only in ("1", "true", "yes"):
            sql += " AND s.quantity <= p.warn_stock AND p.warn_stock > 0"

        sql += " ORDER BY s.updated_at DESC"

        cursor.execute(sql, params)
        rows = cursor.fetchall()

        stock_list = [
            {
                "id": r[0],
                "product_id": r[1],
                "product_code": r[2],
                "product_name": r[3],
                "category": r[4],
                "unit": r[5],
                "warn_stock": r[6],
                "quantity": r[7],
                "update_time": str(r[8]),
                "is_low_stock": r[7] <= r[6] and r[6] > 0,
            }
            for r in rows
        ]

    return success_response(stock_list)


@stock_bp.route("/records", methods=["GET"])
@jwt_required()
def list_stock_records():
    """库存流水查询，支持商品筛选、分页"""
    product_id = parse_int(request.args.get("product_id"))
    change_type = request.args.get("change_type", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    page, size = parse_page_params(request.args)
    offset = (page - 1) * size

    with get_db_connection() as conn:
        cursor = conn.cursor()

        sql = """
            SELECT sr.id, sr.product_id, p.code, p.name, sr.change_type,
                   sr.change_qty, sr.before_qty, sr.after_qty, sr.biz_no, sr.create_time
            FROM stock_record sr
            JOIN product p ON sr.product_id = p.id
            WHERE 1=1
        """
        count_sql = "SELECT COUNT(*) FROM stock_record WHERE 1=1"
        params = []
        count_params = []

        if product_id:
            sql += " AND sr.product_id = %s"
            count_sql += " AND product_id = %s"
            params.append(product_id)
            count_params.append(product_id)
        if change_type:
            sql += " AND sr.change_type = %s"
            count_sql += " AND change_type = %s"
            params.append(change_type)
            count_params.append(change_type)
        if start_date:
            sql += " AND sr.create_time >= %s"
            count_sql += " AND create_time >= %s"
            params.append(start_date)
            count_params.append(start_date)
        if end_date:
            sql += " AND sr.create_time <= %s"
            count_sql += " AND create_time <= %s"
            params.append(end_date + " 23:59:59")
            count_params.append(end_date + " 23:59:59")

        cursor.execute(count_sql, count_params)
        total = cursor.fetchone()[0]

        sql += " ORDER BY sr.id DESC LIMIT %s OFFSET %s"
        params.extend([size, offset])

        cursor.execute(sql, params)
        rows = cursor.fetchall()

    records = [
        {
            "id": r[0],
            "product_id": r[1],
            "product_code": r[2],
            "product_name": r[3],
            "change_type": r[4],
            "change_qty": r[5],
            "before_qty": r[6],
            "after_qty": r[7],
            "biz_no": r[8],
            "create_time": str(r[9]),
        }
        for r in rows
    ]

    return success_response({
        "list": records,
        "total": total,
        "page": page,
        "size": size,
    })
