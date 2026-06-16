"""
千寻仓库管理系统 - 自动化兼容测试
运行方式: python test_api.py
前提: 后端已启动 (python app.py)
"""
import requests

BASE = "http://localhost:5000/api"
pass_count = 0
fail_count = 0

# 先检查后端是否启动
try:
    r = requests.get(f"{BASE}/health", timeout=3)
except requests.exceptions.ConnectionError:
    print("=" * 50)
    print("  错误: 后端服务未启动！")
    print("  请先运行: python backend\\app.py")
    print("  然后再执行: python test_api.py")
    print("=" * 50)
    exit(1)


def check(name, condition, detail=""):
    global pass_count, fail_count
    if condition:
        pass_count += 1
        print(f"  [PASS] {name}")
    else:
        fail_count += 1
        print(f"  [FAIL] {name}  {detail}")


def login(username, password):
    return requests.post(f"{BASE}/auth/login", json={
        "username": username, "password": password
    })


print("=" * 50)
print("认证模块测试")
print("=" * 50)

# TC-A-01: admin正确登录
r = login("admin", "abc123")
check("admin正确密码登录", r.json()["code"] == 200, r.text)

# TC-A-02: zhangsan正确登录
r = login("zhangsan", "112233")
check("zhangsan正确密码登录", r.json()["code"] == 200, r.text)

# TC-A-03: 密码错误
r = login("admin", "wrong")
check("admin错误密码", r.json()["code"] == 401, r.text)

# TC-A-05: 空用户名
r = login("", "abc123")
check("空用户名", r.json()["code"] != 200, r.text)

# TC-A-07: 空密码
r = login("admin", "")
check("空密码", r.json()["code"] != 200, r.text)

# TC-A-09: 空用户名+空密码
r = login("", "")
check("空用户名+空密码", r.json()["code"] != 200, r.text)

# 获取token供后续测试
r = login("admin", "abc123")
token = r.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

# token可用性
r = requests.get(f"{BASE}/auth/me", headers=headers)
check("token可正常使用", r.json()["code"] == 200)

# 无token访问
r = requests.get(f"{BASE}/products")
check("无token被拒绝", r.status_code == 401)


print()
print("=" * 50)
print("商品模块测试")
print("=" * 50)

# TC-P-02: 新增商品
r = requests.post(f"{BASE}/products", headers=headers, json={
    "code": "TEST001", "name": "测试商品", "category": "办公用品",
    "unit": "个", "warn_stock": 10
})
check("新增商品", r.json()["code"] in (200, 201), r.text)
pid = r.json().get("data", {}).get("id")

# TC-P-04: 空编码
r = requests.post(f"{BASE}/products", headers=headers, json={
    "code": "", "name": "测试", "category": "办公用品"
})
check("空编码被拒绝", r.json()["code"] != 200, r.text)

# TC-P-05: 空名称
r = requests.post(f"{BASE}/products", headers=headers, json={
    "code": "TEST002", "name": "", "category": "办公用品"
})
check("空名称被拒绝", r.json()["code"] != 200, r.text)

# TC-P-06: 空分类
r = requests.post(f"{BASE}/products", headers=headers, json={
    "code": "TEST003", "name": "测试", "category": ""
})
check("空分类被拒绝", r.json()["code"] != 200, r.text)

# TC-P-07: 安全库存非法值
r = requests.post(f"{BASE}/products", headers=headers, json={
    "code": "TEST004", "name": "测试", "category": "办公用品", "warn_stock": -1
})
check("负安全库存被拒绝", r.json()["code"] != 200, r.text)

r = requests.post(f"{BASE}/products", headers=headers, json={
    "code": "TEST005", "name": "测试", "category": "办公用品", "warn_stock": 1.5
})
check("小数安全库存被拒绝", r.json()["code"] != 200, r.text)

# TC-P-08/09: 搜索
r = requests.get(f"{BASE}/products", headers=headers, params={"keyword": "农夫山泉"})
check("按名称搜索", len(r.json()["data"]) > 0, r.text)

r = requests.get(f"{BASE}/products", headers=headers, params={"keyword": "P001"})
check("按编码搜索", len(r.json()["data"]) > 0, r.text)

# TC-P-11: 搜索不存在
r = requests.get(f"{BASE}/products", headers=headers, params={"keyword": "不存在商品XYZ"})
check("搜索不存在商品返回空", len(r.json()["data"]) == 0, r.text)

# TC-P-15: 修改商品
if pid:
    r = requests.put(f"{BASE}/products/{pid}", headers=headers, json={"name": "修改后"})
    check("修改商品名", r.json()["code"] == 200, r.text)

# TC-P-20: 修改为非法安全库存
if pid:
    r = requests.put(f"{BASE}/products/{pid}", headers=headers, json={"warn_stock": -5})
    check("修改为负库存被拒绝", r.json()["code"] != 200, r.text)

# TC-P-22: 删除商品
if pid:
    r = requests.delete(f"{BASE}/products/{pid}", headers=headers)
    check("删除商品", r.json()["code"] == 200, r.text)


print()
print("=" * 50)
print("入库模块测试")
print("=" * 50)

# TC-I-01: 创建入库单
r = requests.post(f"{BASE}/inbound/order", headers=headers, json={
    "details": [{"product_id": 1, "quantity": 10}]
})
check("创建入库单", r.json()["code"] in (200, 201), r.text)
in_order_id = r.json().get("data", {}).get("id")

# TC-I-05: 非法数量
r = requests.post(f"{BASE}/inbound/order", headers=headers, json={
    "details": [{"product_id": 1, "quantity": -1}]
})
check("负数量被拒绝", r.json()["code"] != 200, r.text)

r = requests.post(f"{BASE}/inbound/order", headers=headers, json={
    "details": [{"product_id": 1, "quantity": 1.5}]
})
check("小数数量被拒绝", r.json()["code"] != 200, r.text)

# TC-I-04: 边界值
r = requests.post(f"{BASE}/inbound/order", headers=headers, json={
    "details": [{"product_id": 1, "quantity": 1000000}]
})
check("超过999999被拒绝", r.json()["code"] != 200, r.text)

# TC-I-08: 确认入库
if in_order_id:
    r = requests.post(f"{BASE}/inbound/confirm/{in_order_id}", headers=headers)
    check("确认入库", r.json()["code"] == 200, r.text)


print()
print("=" * 50)
print("出库模块测试")
print("=" * 50)

# TC-O-01: 创建出库单（只出1个，确保库存够）
r = requests.post(f"{BASE}/outbound/order", headers=headers, json={
    "details": [{"product_id": 10, "quantity": 1}]
})
check("创建出库单", r.json()["code"] in (200, 201), r.text)
out_order_id = r.json().get("data", {}).get("id")

# TC-O-05: 库存不足
r = requests.post(f"{BASE}/outbound/order", headers=headers, json={
    "details": [{"product_id": 7, "quantity": 99999}]
})
in_order2 = r.json().get("data", {}).get("id")
if in_order2:
    r = requests.post(f"{BASE}/outbound/confirm/{in_order2}", headers=headers)
    check("库存不足确认失败", r.json()["code"] != 200, r.text)

# TC-O-06: 非法数量
r = requests.post(f"{BASE}/outbound/order", headers=headers, json={
    "details": [{"product_id": 1, "quantity": 0}]
})
check("数量0被拒绝", r.json()["code"] != 200, r.text)

# TC-O-09: 确认出库
if out_order_id:
    r = requests.post(f"{BASE}/outbound/confirm/{out_order_id}", headers=headers)
    check("确认出库", r.json()["code"] == 200, r.text)


print()
print("=" * 50)
print("库存查询测试")
print("=" * 50)

# TC-S-01/02: 搜索
r = requests.get(f"{BASE}/stock", headers=headers, params={"keyword": "螺丝钉"})
check("按名称搜库存", len(r.json()["data"]) > 0, r.text)

# TC-S-04: 低库存筛选
r = requests.get(f"{BASE}/stock", headers=headers, params={"low_stock": "1"})
check("低库存筛选", r.json()["code"] == 200, r.text)

# 库存列表正常
r = requests.get(f"{BASE}/stock", headers=headers)
check("库存列表", r.json()["code"] == 200 and len(r.json()["data"]) > 0, r.text)


print()
print("=" * 50)
print("库存流水测试")
print("=" * 50)

# TC-R-01/02: 流水查询
r = requests.get(f"{BASE}/stock/records", headers=headers, params={"change_type": "inbound"})
check("入库流水筛选", r.json()["code"] == 200, r.text)

r = requests.get(f"{BASE}/stock/records", headers=headers, params={"change_type": "outbound"})
check("出库流水筛选", r.json()["code"] == 200, r.text)

# TC-R-03: 组合筛选
r = requests.get(f"{BASE}/stock/records", headers=headers, params={
    "product_id": 1, "change_type": "inbound"
})
check("组合筛选", r.json()["code"] == 200, r.text)


print()
print("=" * 50)
print(f"结果: 通过 {pass_count} / 失败 {fail_count} / 总计 {pass_count + fail_count}")
if fail_count == 0:
    print("全部通过！")
else:
    print(f"有 {fail_count} 条未通过，请检查上方 [FAIL] 项")
print("=" * 50)
