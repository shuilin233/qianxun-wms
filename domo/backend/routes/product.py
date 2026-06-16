"""商品模块 — 商品CRUD API"""

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required

from models.db import get_db_connection
from utils.helpers import (
    success_response,
    error_response,
    validate_required,
)

product_bp = Blueprint("product", __name__)


@product_bp.route("/products", methods=["GET"])
@jwt_required()
def list_products():
    """获取商品列表，支持模糊搜索"""
    keyword = request.args.get("keyword", "").strip()
    category = request.args.get("category", "").strip()

    with get_db_connection() as conn:
        cursor = conn.cursor()

        sql = "SELECT id, code, name, category, unit, warn_stock, created_at, updated_at FROM product WHERE 1=1"
        params = []

        if keyword:
            sql += " AND (name LIKE %s OR code LIKE %s)"
            params.extend([f"%{keyword}%", f"%{keyword}%"])
        if category:
            sql += " AND category = %s"
            params.append(category)

        sql += " ORDER BY id DESC"

        cursor.execute(sql, params)
        rows = cursor.fetchall()

        products = [
            {
                "id": r[0],
                "code": r[1],
                "name": r[2],
                "category": r[3],
                "unit": r[4],
                "warn_stock": r[5],
                "create_time": str(r[6]),
                "update_time": str(r[7]),
            }
            for r in rows
        ]

    current_app.logger.info(f"查询商品列表，keyword={keyword}, category={category}, 结果数={len(products)}")
    return success_response(products)


@product_bp.route("/products/<int:product_id>", methods=["GET"])
@jwt_required()
def get_product(product_id):
    """获取单个商品"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, code, name, category, unit, warn_stock, created_at, updated_at FROM product WHERE id = %s",
            (product_id,),
        )
        r = cursor.fetchone()

        if r is None:
            return error_response("商品不存在", code=404, http_status=404)

        product = {
            "id": r[0],
            "code": r[1],
            "name": r[2],
            "category": r[3],
            "unit": r[4],
            "warn_stock": r[5],
            "create_time": str(r[6]),
            "update_time": str(r[7]),
        }

    return success_response(product)


@product_bp.route("/products", methods=["POST"])
@jwt_required()
def create_product():
    """新增商品"""
    data = request.get_json(silent=True)
    if not data:
        return error_response("请提供JSON请求体")

    missing = validate_required(data, ["code", "name", "category"])
    if missing:
        return error_response(f"缺少必填字段: {', '.join(missing)}")

    code = data["code"].strip()
    name = data["name"].strip()
    category = data.get("category", "").strip()
    if not category:
        return error_response("分类不能为空")
    unit = data.get("unit", "个").strip()
    # 清洗 warn_stock：必须为非负整数（拒绝小数/字符串/负数）
    raw_warn = data.get("warn_stock", 0)
    try:
        # 先转 float 检查是否为合法数字，再检查小数部分
        if isinstance(raw_warn, str) and ('.' in raw_warn or raw_warn.lower().startswith('0x')):
            raise ValueError
        warn_stock = int(raw_warn)
        if warn_stock < 0:
            return error_response("安全库存必须为非负整数")
    except (ValueError, TypeError):
        return error_response("安全库存必须为整数")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 检查编码唯一
        cursor.execute("SELECT id FROM product WHERE code = %s", (code,))
        if cursor.fetchone():
            return error_response(f"商品编码 '{code}' 已存在")

        cursor.execute(
            "INSERT INTO product (code, name, category, unit, warn_stock) VALUES (%s, %s, %s, %s, %s)",
            (code, name, category, unit, warn_stock),
        )
        product_id = cursor.lastrowid

        # 初始化库存记录（数量为0，使该商品在库存列表中可查）
        cursor.execute(
            "INSERT IGNORE INTO stock (product_id, quantity) VALUES (%s, 0)",
            (product_id,),
        )

    current_app.logger.info(f"新增商品: id={product_id}, code={code}, name={name}")
    return success_response({"id": product_id}, message="商品创建成功", code=201)


@product_bp.route("/products/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):
    """修改商品"""
    data = request.get_json(silent=True)
    if not data:
        return error_response("请提供JSON请求体")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM product WHERE id = %s", (product_id,))
        if not cursor.fetchone():
            return error_response("商品不存在", code=404, http_status=404)

        fields = []
        params = []

        if "name" in data:
            fields.append("name = %s")
            params.append(data["name"].strip())
        if "category" in data:
            cat_val = data["category"].strip()
            if cat_val == "":
                return error_response("分类不能为空")
            fields.append("category = %s")
            params.append(cat_val)
        if "unit" in data:
            fields.append("unit = %s")
            params.append(data["unit"].strip())
        if "warn_stock" in data:
            raw_warn = data["warn_stock"]
            try:
                if isinstance(raw_warn, str) and ('.' in raw_warn or raw_warn.lower().startswith('0x')):
                    raise ValueError
                warn_val = int(raw_warn)
                if warn_val < 0:
                    return error_response("安全库存必须为非负整数")
            except (ValueError, TypeError):
                return error_response("安全库存必须为整数")
            fields.append("warn_stock = %s")
            params.append(warn_val)

        if not fields:
            return error_response("没有需要更新的字段")

        params.append(product_id)
        sql = f"UPDATE product SET {', '.join(fields)} WHERE id = %s"
        cursor.execute(sql, params)

    current_app.logger.info(f"修改商品: id={product_id}, 更新字段={fields}")
    return success_response(message="商品更新成功")


@product_bp.route("/products/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):
    """删除商品（级联删除库存及订单明细，业务日志记录）"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id, code, name FROM product WHERE id = %s", (product_id,))
        prod = cursor.fetchone()
        if not prod:
            return error_response("商品不存在", code=404, http_status=404)

        prod_id, code, name = prod

        # 检查是否有待处理的入库/出库单引用了此商品
        cursor.execute(
            "SELECT COUNT(*) FROM inbound_detail d JOIN inbound_order o ON d.order_id = o.id "
            "WHERE d.product_id = %s AND o.status = 'pending'",
            (product_id,),
        )
        if cursor.fetchone()[0] > 0:
            return error_response("该商品存在待确认的入库单，请先处理后再删除")

        cursor.execute(
            "SELECT COUNT(*) FROM outbound_detail d JOIN outbound_order o ON d.order_id = o.id "
            "WHERE d.product_id = %s AND o.status = 'pending'",
            (product_id,),
        )
        if cursor.fetchone()[0] > 0:
            return error_response("该商品存在待确认的出库单，请先处理后再删除")

        try:
            # 反向删除关联数据（按外键依赖顺序）
            cursor.execute("DELETE FROM stock_record WHERE product_id = %s", (product_id,))
            cursor.execute("DELETE FROM outbound_detail WHERE product_id = %s", (product_id,))
            cursor.execute("DELETE FROM inbound_detail WHERE product_id = %s", (product_id,))
            cursor.execute("DELETE FROM stock WHERE product_id = %s", (product_id,))
            cursor.execute("DELETE FROM product WHERE id = %s", (product_id,))
        except Exception as e:
            current_app.logger.error(f"删除商品失败: {str(e)}", exc_info=True)
            return error_response(f"删除失败，可能存在关联数据: {str(e)}", code=500, http_status=500)

    current_app.logger.info(f"删除商品: id={prod_id}, code={code}, name={name}")
    return success_response(message="商品删除成功")
