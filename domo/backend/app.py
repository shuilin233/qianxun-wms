"""Flask app - API + static files"""

import os, logging
from datetime import timedelta

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import config_map
from models.db import init_db


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
    print("Frontend dir:", frontend_dir)

    app = Flask(__name__, static_folder=frontend_dir, static_url_path="")
    app.config.from_object(config_map.get(config_name, config_map["development"]))
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=app.config["JWT_ACCESS_TOKEN_EXPIRES"])

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)
    init_db(app)
    setup_logging(app)

    # API blueprints
    from routes.auth import auth_bp
    from routes.product import product_bp
    from routes.category import category_bp
    from routes.inbound import inbound_bp
    from routes.outbound import outbound_bp
    from routes.stock import stock_bp
    from routes.report import report_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(product_bp, url_prefix="/api")
    app.register_blueprint(category_bp, url_prefix="/api")
    app.register_blueprint(inbound_bp, url_prefix="/api/inbound")
    app.register_blueprint(outbound_bp, url_prefix="/api/outbound")
    app.register_blueprint(stock_bp, url_prefix="/api/stock")
    app.register_blueprint(report_bp, url_prefix="/api/report")

    # Health
    @app.route("/api/")
    def api_root():
        return jsonify({"code": 200, "message": "API running"})

    @app.route("/api/health")
    def health_check():
        return jsonify({"code": 200, "message": "ok"})

    # SPA
    @app.route("/")
    def index():
        return send_from_directory(frontend_dir, "index.html")

    @app.route("/<path:path>")
    def catch_all(path):
        # API paths should not reach here, but be defensive
        if path.startswith("api/"):
            return jsonify({"code": 404, "message": "not found", "data": {}}), 404
        full = os.path.join(frontend_dir, path)
        if os.path.isfile(full):
            return send_from_directory(frontend_dir, path)
        return send_from_directory(frontend_dir, "index.html")

    register_error_handlers(app)
    return app


def setup_logging(app):
    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)
    fmt = logging.Formatter("[%(asctime)s] %(levelname)s %(message)s", datefmt="%H:%M:%S")
    for h in [logging.StreamHandler(), logging.FileHandler(os.path.join(log_dir, "app.log"), encoding="utf-8")]:
        h.setFormatter(fmt)
        app.logger.addHandler(h)
    app.logger.setLevel(logging.DEBUG if app.debug else logging.INFO)


def register_error_handlers(app):
    @app.errorhandler(400)
    def _(e): return jsonify({"code": 400, "message": "bad request", "data": {}}), 400
    @app.errorhandler(401)
    def _(e): return jsonify({"code": 401, "message": "unauthorized", "data": {}}), 401
    @app.errorhandler(404)
    def _(e): return jsonify({"code": 404, "message": "not found", "data": {}}), 404
    @app.errorhandler(500)
    def _(e): return jsonify({"code": 500, "message": "server error", "data": {}}), 500


if __name__ == "__main__":
    app = create_app()
    print("=" * 50)
    print("  WMS -> http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
