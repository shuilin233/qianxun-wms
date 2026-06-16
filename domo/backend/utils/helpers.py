"""工具函数：单号生成、日期格式化、参数校验、统一响应"""

from datetime import datetime


def generate_order_no(prefix):
    """生成单号，格式：{prefix}YYYYMMDDNNNN"""
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S%f")[:10]
    return f"{prefix}{date_str}{time_str}"


def format_datetime(dt):
    """格式化时间为 YYYY-MM-DD HH:MM:SS"""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    return str(dt)


def success_response(data=None, message="success", code=200):
    """统一成功响应 — data 为 None 时用空对象，否则保留原值"""
    return {"code": code, "message": message, "data": {} if data is None else data}, code


def error_response(message="error", code=400, http_status=None):
    """统一错误响应"""
    if http_status is None:
        http_status = code
    return {"code": code, "message": message, "data": {}}, http_status


def validate_required(params, required_fields):
    """校验必填字段，返回缺失字段列表"""
    missing = [f for f in required_fields if f not in params or params[f] is None or params[f] == ""]
    return missing


def parse_int(value, default=None):
    """安全转换为整数"""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_page_params(request_args, default_size=20, max_size=100):
    """解析分页参数"""
    page = parse_int(request_args.get("page"), 1)
    if page < 1:
        page = 1
    size = parse_int(request_args.get("size"), default_size)
    if size < 1:
        size = default_size
    if size > max_size:
        size = max_size
    return page, size
