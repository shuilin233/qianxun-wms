"""报表模块 — 近7天出入库总量统计"""

from flask import Blueprint
from flask_jwt_extended import jwt_required

from models.db import get_db_connection
from utils.helpers import success_response

report_bp = Blueprint("report", __name__)


@report_bp.route("/daily_trend", methods=["GET"])
@jwt_required()
def daily_trend():
    """近7天每日出入库总量"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        sql = """
            SELECT
                DATE(create_time) AS day,
                change_type,
                SUM(change_qty) AS total_qty
            FROM stock_record
            WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(create_time), change_type
            ORDER BY day ASC, change_type
        """
        cursor.execute(sql)
        rows = cursor.fetchall()

        # 组织为按天的字典
        daily_map = {}
        for day, change_type, total_qty in rows:
            day_str = str(day)
            if day_str not in daily_map:
                daily_map[day_str] = {"date": day_str, "inbound": 0, "outbound": 0}
            if change_type == "inbound":
                daily_map[day_str]["inbound"] = int(total_qty)
            elif change_type == "outbound":
                daily_map[day_str]["outbound"] = int(total_qty)

        trend = list(daily_map.values())

    return success_response(trend)
