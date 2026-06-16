"""认证模块 — 登录、JWT颁发与验证"""

from flask import Blueprint, request, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash

from models.db import get_db_connection
from utils.helpers import success_response, error_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """用户登录，返回JWT令牌"""
    data = request.get_json(silent=True)
    if not data:
        return error_response("请提供JSON请求体")

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return error_response("用户名和密码不能为空")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, password_hash, role FROM user WHERE username = %s",
            (username,),
        )
        user = cursor.fetchone()

        if user is None:
            return error_response("用户名或密码错误", code=401, http_status=401)

        user_id, db_username, password_hash, role = user

        if not check_password_hash(password_hash, password):
            return error_response("用户名或密码错误", code=401, http_status=401)

        # 生成JWT
        access_token = create_access_token(
            identity=str(user_id),
            additional_claims={"username": db_username, "role": role},
        )

        # 更新最后登录时间
        cursor.execute("UPDATE user SET last_login = NOW() WHERE id = %s", (user_id,))
        conn.commit()

        current_app.logger.info(f"用户登录成功: {db_username} (id={user_id})")

        return success_response(
            {
                "token": access_token,
                "user": {
                    "id": user_id,
                    "username": db_username,
                    "role": role,
                },
            },
            message="登录成功",
        )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """获取当前登录用户信息"""
    current_user_id = get_jwt_identity()
    current_app.logger.info(f"获取用户信息: id={current_user_id}")
    return success_response({"user_id": int(current_user_id)})
