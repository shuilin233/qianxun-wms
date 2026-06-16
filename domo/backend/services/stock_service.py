"""库存变更核心逻辑 — 事务内增加/扣减并记录流水（含 operator_id）"""

from datetime import datetime


def execute_inbound(conn, order_id, operator_id=None):
    """确认入库：增加库存 + 记录流水，在外部事务中执行"""
    cursor = conn.cursor()

    # 1. 校验入库单状态
    cursor.execute(
        "SELECT id, order_no, status, operator_id FROM inbound_order WHERE id = %s FOR UPDATE",
        (order_id,),
    )
    order = cursor.fetchone()
    if order is None:
        raise ValueError("入库单不存在")
    if order[2] != "pending":
        raise ValueError(f"入库单状态为 {order[2]}，无法确认")
    op_id = operator_id or order[3]

    # 2. 获取明细
    cursor.execute(
        "SELECT product_id, quantity FROM inbound_detail WHERE order_id = %s",
        (order_id,),
    )
    details = cursor.fetchall()
    if not details:
        raise ValueError("入库单无明细")

    # 3. 按 product_id 升序锁行（防死锁）
    details = sorted(details, key=lambda x: x[0])

    for product_id, qty in details:
        cursor.execute(
            "SELECT quantity FROM stock WHERE product_id = %s FOR UPDATE",
            (product_id,),
        )
        stock_row = cursor.fetchone()
        old_qty = stock_row[0] if stock_row else 0
        new_qty = old_qty + qty

        if stock_row:
            cursor.execute(
                "UPDATE stock SET quantity = %s, updated_at = %s WHERE product_id = %s",
                (new_qty, datetime.now(), product_id),
            )
        else:
            cursor.execute(
                "INSERT INTO stock (product_id, quantity) VALUES (%s, %s)",
                (product_id, new_qty),
            )

        cursor.execute(
            "INSERT INTO stock_record (product_id, change_type, change_qty, before_qty, after_qty,"
            " biz_no, operator_id, create_time) "
            "VALUES (%s, 'inbound', %s, %s, %s, %s, %s, %s)",
            (product_id, qty, old_qty, new_qty, order[1], op_id, datetime.now()),
        )

    # 4. 更新订单状态
    cursor.execute(
        "UPDATE inbound_order SET status = 'confirmed', confirm_time = %s WHERE id = %s",
        (datetime.now(), order_id),
    )

    return order[1]


def execute_outbound(conn, order_id, operator_id=None):
    """确认出库：扣减库存 + 记录流水，在外部事务中执行（含库存不足校验）"""
    cursor = conn.cursor()

    # 1. 校验出库单状态
    cursor.execute(
        "SELECT id, order_no, status, operator_id FROM outbound_order WHERE id = %s FOR UPDATE",
        (order_id,),
    )
    order = cursor.fetchone()
    if order is None:
        raise ValueError("出库单不存在")
    if order[2] != "pending":
        raise ValueError(f"出库单状态为 {order[2]}，无法确认")
    op_id = operator_id or order[3]

    # 2. 获取明细
    cursor.execute(
        "SELECT product_id, quantity FROM outbound_detail WHERE order_id = %s",
        (order_id,),
    )
    details = cursor.fetchall()
    if not details:
        raise ValueError("出库单无明细")

    # 3. 按 product_id 升序锁行
    details = sorted(details, key=lambda x: x[0])

    for product_id, qty in details:
        cursor.execute(
            "SELECT quantity FROM stock WHERE product_id = %s FOR UPDATE",
            (product_id,),
        )
        stock_row = cursor.fetchone()
        old_qty = stock_row[0] if stock_row else 0

        if old_qty < qty:
            cursor.execute("SELECT name FROM product WHERE id = %s", (product_id,))
            prod = cursor.fetchone()
            prod_name = prod[0] if prod else f"id={product_id}"
            raise ValueError(f"商品「{prod_name}」库存不足（当前: {old_qty}，需要: {qty}）")

        new_qty = old_qty - qty

        cursor.execute(
            "UPDATE stock SET quantity = %s, updated_at = %s WHERE product_id = %s",
            (new_qty, datetime.now(), product_id),
        )

        cursor.execute(
            "INSERT INTO stock_record (product_id, change_type, change_qty, before_qty, after_qty,"
            " biz_no, operator_id, create_time) "
            "VALUES (%s, 'outbound', %s, %s, %s, %s, %s, %s)",
            (product_id, qty, old_qty, new_qty, order[1], op_id, datetime.now()),
        )

    # 4. 更新订单状态
    cursor.execute(
        "UPDATE outbound_order SET status = 'confirmed', confirm_time = %s WHERE id = %s",
        (datetime.now(), order_id),
    )

    return order[1]
