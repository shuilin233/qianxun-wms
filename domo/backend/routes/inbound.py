"""入库模块 — 入库单创建、确认（支持 supplier 字段）"""

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.db import get_db_connection
from services.stock_service import execute_inbound
from utils.helpers import (
    success_response,
    error_response,
    validate_required,
    generate_order_no,
)

inbound_bp = Blueprint("inbound", __name__)


@inbound_bp.route("/order", methods=["POST"])
@jwt_required()
def create_inbound_order():
    """创建入库单（含明细）"""
    data = request.get_json(silent=True)
    if not data:
        return error_response("请提供JSON请求体")

    missing = validate_required(data, ["details"])
    if missing:
        return error_response(f"缺少必填字段: {', '.join(missing)}")

    details = data.get("details", [])
    if not isinstance(details, list) or len(details) == 0:
        return error_response("入库明细不能为空")

    # 校验数量范围（1-999999）
    MAX_QTY = 999999
    for item in details:
        qty = item.get("quantity")
        if not isinstance(qty, (int, float)) or int(qty) != qty:
            return error_response("入库数量必须为整数")
        if int(qty) <= 0:
            return error_response("入库数量必须为正整数")
        if int(qty) > MAX_QTY:
            return error_response(f"入库数量不能超过 {MAX_QTY}")

    current_user_id = int(get_jwt_identity())
    order_no = generate_order_no("IN")
    supplier = data.get("supplier", "").strip()

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "INSERT INTO inbound_order (order_no, supplier, operator_id, status) VALUES (%s, %s, %s, 'pending')",
                (order_no, supplier, current_user_id),
            )
            order_id = cursor.lastrowid

            for item in details:
                product_id = item.get("product_id")
                quantity = item.get("quantity")
                if not product_id or not quantity:
                    return error_response("每条明细必须包含 product_id 和 quantity")
                qty_int = int(quantity)
                cursor.execute("SELECT id FROM product WHERE id = %s", (product_id,))
                if not cursor.fetchone():
                    return error_response(f"商品 id={product_id} 不存在")
                cursor.execute(
                    "INSERT INTO inbound_detail (order_id, product_id, quantity) VALUES (%s, %s, %s)",
                    (order_id, product_id, qty_int),
                )
            conn.commit()

        current_app.logger.info(
            f"创建入库单: order_no={order_no}, supplier={supplier}, 明细数={len(details)}, 操作人={current_user_id}"
        )
        return success_response(
            {"id": order_id, "order_no": order_no}, message="入库单创建成功", code=201
        )
    except Exception as e:
        current_app.logger.error(f"创建入库单失败: {str(e)}", exc_info=True)
        return error_response(f"创建入库单失败: {str(e)}", code=500, http_status=500)


@inbound_bp.route("/order/<int:order_id>", methods=["GET"])
@jwt_required()
def get_inbound_order(order_id):
    """获取入库单详情（含明细）"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, order_no, supplier, operator_id, status, create_time, confirm_time "
            "FROM inbound_order WHERE id = %s",
            (order_id,),
        )
        order = cursor.fetchone()
        if order is None:
            return error_response("入库单不存在", code=404, http_status=404)

        cursor.execute(
            "SELECT d.id, d.product_id, p.code, p.name, p.unit, d.quantity "
            "FROM inbound_detail d JOIN product p ON d.product_id = p.id "
            "WHERE d.order_id = %s",
            (order_id,),
        )
        details = cursor.fetchall()

    result = {
        "id": order[0],
        "order_no": order[1],
        "supplier": order[2] or "",
        "operator_id": order[3],
        "status": order[4],
        "create_time": str(order[5]),
        "confirm_time": str(order[6]) if order[6] else None,
        "details": [
            {
                "id": d[0],
                "product_id": d[1],
                "product_code": d[2],
                "product_name": d[3],
                "unit": d[4],
                "quantity": d[5],
            }
            for d in details
        ],
    }
    return success_response(result)


@inbound_bp.route("/confirm/<int:order_id>", methods=["POST"])
@jwt_required()
def confirm_inbound(order_id):
    """确认入库（触发库存变更）"""
    current_user_id = int(get_jwt_identity())
    current_app.logger.info(f"确认入库: order_id={order_id}")
    with get_db_connection() as conn:
        try:
            order_no = execute_inbound(conn, order_id, current_user_id)
        except ValueError as e:
            current_app.logger.warning(f"确认入库失败: {str(e)}")
            return error_response(str(e))
        except Exception as e:
            current_app.logger.error(f"确认入库异常: {str(e)}", exc_info=True)
            return error_response("服务器错误", code=500, http_status=500)
    current_app.logger.info(f"确认入库成功: order_no={order_no}")
    return success_response({"order_no": order_no}, message="入库成功")


@inbound_bp.route("/orders", methods=["GET"])
@jwt_required()
def list_inbound_orders():
    """入库单列表"""
    status_filter = request.args.get("status", "").strip()
    page = request.args.get("page", 1, type=int)
    size = request.args.get("size", 20, type=int)
    if size > 100:
        size = 100
    offset = (page - 1) * size

    with get_db_connection() as conn:
        cursor = conn.cursor()
        where = ""
        params = []
        if status_filter:
            where = " WHERE status = %s"
            params.append(status_filter)

        cursor.execute(f"SELECT COUNT(*) FROM inbound_order{where}", params)
        total = cursor.fetchone()[0]

        cursor.execute(
            f"SELECT id, order_no, supplier, operator_id, status, create_time, confirm_time "
            f"FROM inbound_order{where} ORDER BY id DESC LIMIT %s OFFSET %s",
            params + [size, offset],
        )
        rows = cursor.fetchall()

    orders = [
        {
            "id": r[0],
            "order_no": r[1],
            "supplier": r[2] or "",
            "operator_id": r[3],
            "status": r[4],
            "create_time": str(r[5]),
            "confirm_time": str(r[6]) if r[6] else None,
        }
        for r in rows
    ]
    return success_response({"list": orders, "total": total, "page": page, "size": size})
