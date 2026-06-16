-- ============================================
-- 千寻仓库管理系统 — 建表脚本（v2.0）
-- 字符集: utf8mb4 / 引擎: InnoDB
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 用户表 (user)
-- ============================================
DROP TABLE IF EXISTS user;
CREATE TABLE user (
    id            INT AUTO_INCREMENT PRIMARY KEY       COMMENT '用户ID',
    username      VARCHAR(50)  NOT NULL                COMMENT '登录名',
    password_hash VARCHAR(255) NOT NULL                COMMENT '密码哈希',
    role          VARCHAR(20)  NOT NULL DEFAULT 'staff' COMMENT '角色: admin / staff',
    last_login    DATETIME     DEFAULT NULL            COMMENT '最后登录时间',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE INDEX idx_user_username (username)
) ENGINE=InnoDB COMMENT='用户表';

-- ============================================
-- 2. 商品表 (product)
-- ============================================
-- ============================================
-- 分类表 (category)
-- ============================================
DROP TABLE IF EXISTS category;
CREATE TABLE category (
    id          INT AUTO_INCREMENT PRIMARY KEY        COMMENT '分类ID',
    name        VARCHAR(50)  NOT NULL                 COMMENT '分类名称',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE INDEX idx_category_name (name)
) ENGINE=InnoDB COMMENT='商品分类表';

INSERT INTO category (name) VALUES ('紧固件'),('原材料'),('电器'),('传动件'),('密封件'),('弹性件'),('饮料'),('方便食品'),('食品'),('办公用品');

DROP TABLE IF EXISTS product;
CREATE TABLE product (
    id          INT AUTO_INCREMENT PRIMARY KEY        COMMENT '商品ID',
    code        VARCHAR(50)  NOT NULL                 COMMENT '商品编码（手工录入）',
    name        VARCHAR(100) NOT NULL                 COMMENT '商品名称',
    category    VARCHAR(50)  DEFAULT ''               COMMENT '类别',
    unit        VARCHAR(10)  DEFAULT '个'             COMMENT '单位',
    warn_stock  INT          DEFAULT 0                COMMENT '安全库存阈值',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE INDEX idx_product_code (code),
    INDEX       idx_product_name (name)
) ENGINE=InnoDB COMMENT='商品表';

-- ============================================
-- 3. 入库单头表 (inbound_order)
-- ============================================
DROP TABLE IF EXISTS inbound_order;
CREATE TABLE inbound_order (
    id           INT AUTO_INCREMENT PRIMARY KEY        COMMENT '订单ID',
    order_no     VARCHAR(30)  NOT NULL                 COMMENT '单号格式: IN+yyyyMMdd+流水号',
    supplier     VARCHAR(100) DEFAULT ''               COMMENT '供应商名称',
    operator_id  INT          NOT NULL                 COMMENT '操作人ID',
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT '状态: pending / confirmed / cancelled',
    create_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    confirm_time DATETIME     DEFAULT NULL             COMMENT '确认时间',
    UNIQUE INDEX idx_ib_order_no (order_no),
    INDEX        idx_ib_create_time (create_time),
    INDEX        idx_ib_status (status),
    FOREIGN KEY (operator_id) REFERENCES user(id)
) ENGINE=InnoDB COMMENT='入库单';

-- ============================================
-- 4. 入库明细表 (inbound_detail)
-- ============================================
DROP TABLE IF EXISTS inbound_detail;
CREATE TABLE inbound_detail (
    id         INT AUTO_INCREMENT PRIMARY KEY         COMMENT '明细ID',
    order_id   INT NOT NULL                           COMMENT '订单ID',
    product_id INT NOT NULL                           COMMENT '商品ID',
    quantity   INT NOT NULL                           COMMENT '入库数量 (>0)',
    UNIQUE INDEX idx_ibd_order_product (order_id, product_id),
    INDEX      idx_ibd_order_id (order_id),
    FOREIGN KEY (order_id)   REFERENCES inbound_order(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
) ENGINE=InnoDB COMMENT='入库明细';

-- ============================================
-- 5. 出库单头表 (outbound_order)
-- ============================================
DROP TABLE IF EXISTS outbound_order;
CREATE TABLE outbound_order (
    id           INT AUTO_INCREMENT PRIMARY KEY        COMMENT '订单ID',
    order_no     VARCHAR(30)  NOT NULL                 COMMENT '单号格式: OUT+yyyyMMdd+流水号',
    customer     VARCHAR(100) DEFAULT ''               COMMENT '客户名称',
    operator_id  INT          NOT NULL                 COMMENT '操作人ID',
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT '状态: pending / confirmed / cancelled',
    create_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    confirm_time DATETIME     DEFAULT NULL             COMMENT '确认时间',
    UNIQUE INDEX idx_ob_order_no (order_no),
    INDEX        idx_ob_create_time (create_time),
    INDEX        idx_ob_status (status),
    FOREIGN KEY (operator_id) REFERENCES user(id)
) ENGINE=InnoDB COMMENT='出库单';

-- ============================================
-- 6. 出库明细表 (outbound_detail)
-- ============================================
DROP TABLE IF EXISTS outbound_detail;
CREATE TABLE outbound_detail (
    id         INT AUTO_INCREMENT PRIMARY KEY         COMMENT '明细ID',
    order_id   INT NOT NULL                           COMMENT '订单ID',
    product_id INT NOT NULL                           COMMENT '商品ID',
    quantity   INT NOT NULL                           COMMENT '出库数量 (>0)',
    UNIQUE INDEX idx_obd_order_product (order_id, product_id),
    INDEX      idx_obd_order_id (order_id),
    FOREIGN KEY (order_id)   REFERENCES outbound_order(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
) ENGINE=InnoDB COMMENT='出库明细';

-- ============================================
-- 7. 库存表 (stock)
-- ============================================
DROP TABLE IF EXISTS stock;
CREATE TABLE stock (
    id         INT AUTO_INCREMENT PRIMARY KEY         COMMENT '库存记录ID',
    product_id INT NOT NULL                           COMMENT '商品ID（一对一）',
    quantity   INT NOT NULL DEFAULT 0                 COMMENT '当前库存数量（非负）',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后变更时间',
    UNIQUE INDEX idx_stock_product (product_id),
    FOREIGN KEY (product_id) REFERENCES product(id)
) ENGINE=InnoDB COMMENT='库存表';

-- ============================================
-- 8. 库存流水表 (stock_record)
-- ============================================
DROP TABLE IF EXISTS stock_record;
CREATE TABLE stock_record (
    id          INT AUTO_INCREMENT PRIMARY KEY         COMMENT '流水ID',
    product_id  INT          NOT NULL                  COMMENT '商品ID',
    change_type VARCHAR(20)  NOT NULL                  COMMENT '变更类型: inbound / outbound / adjust',
    change_qty  INT          NOT NULL                  COMMENT '变更数量（正数）',
    before_qty  INT          NOT NULL                  COMMENT '变更前库存',
    after_qty   INT          NOT NULL                  COMMENT '变更后库存',
    biz_no      VARCHAR(30)  DEFAULT ''                COMMENT '关联单号',
    operator_id INT          DEFAULT NULL              COMMENT '操作人ID',
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
    remark      VARCHAR(255) DEFAULT ''                COMMENT '备注',
    INDEX idx_sr_product    (product_id),
    INDEX idx_sr_create_time (create_time),
    INDEX idx_sr_biz_no     (biz_no),
    INDEX idx_sr_change_type (change_type),
    FOREIGN KEY (product_id) REFERENCES product(id),
    FOREIGN KEY (operator_id) REFERENCES user(id)
) ENGINE=InnoDB COMMENT='库存流水（不可修改/删除）';

SET FOREIGN_KEY_CHECKS = 1;
