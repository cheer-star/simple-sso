# main.py
import os
from datetime import datetime, timedelta, timezone
import secrets

from fastapi import FastAPI, Request, Response, Depends, HTTPException, Form, Query, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext

# 从新文件中导入
from db import db
from models import Setting, User, Client, AuthCode, AdminUser, Department

from pydantic import BaseModel, EmailStr, Field, HttpUrl  # 导入 BaseModel, EmailStr

# --- 配置 ---
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "a_very_secret_key_for_sso")
ALGORITHM = "HS256"
SSO_SESSION_COOKIE = "sso_session_token"
ADMIN_SESSION_COOKIE = "admin_session_token"

# 密码上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- JWT 工具函数 (无变化) ---


def create_jwt_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_jwt_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# --- FastAPI 应用实例 ---
app = FastAPI()

# --- 中间件: 管理数据库连接 ---


@app.middleware("http")
async def db_connection_middleware(request: Request, call_next):
    db.connect(reuse_if_open=True)
    try:
        response = await call_next(request)
    finally:
        if not db.is_closed():
            db.close()
    return response

# 配置 CORS (无变化)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://login.nepdi.com.cn:3000",
                   "http://material.nepdi.com.cn:3001",
                   "http://localhost:3000"
                   ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 核心逻辑函数 (无变化) ---


def get_current_user_from_sso_cookie(request: Request):
    sso_token = request.cookies.get(SSO_SESSION_COOKIE)
    if not sso_token:
        return None
    payload = decode_jwt_token(sso_token)
    if payload and payload.get("sub"):
        return payload
    return None

# --- API 端点 (已更新) ---


@app.post("/api/login")
async def login(response: Response, username: str = Form(...), password: str = Form(...)):
    # 从数据库查找用户
    user = User.get_or_none(User.username == username)
    if not user or not pwd_context.verify(password, user.hashed_password):
        raise HTTPException(
            status_code=400, detail="Incorrect username or password")

    sso_session_token = create_jwt_token(
        data={"sub": user.username, "email": user.email},
        expires_delta=timedelta(days=1)
    )
    response.set_cookie(
        key=SSO_SESSION_COOKIE, value=sso_session_token, httponly=True,
        secure=False, samesite='lax'
    )
    return {"message": "Login successful"}


@app.get("/authorize")
def authorize(request: Request, client_id: str, redirect_uri: str, response_type: str):
    # 从数据库验证客户端
    client = Client.get_or_none(Client.client_id == client_id)
    if not client or client.redirect_uri != redirect_uri or response_type != "code":
        raise HTTPException(
            status_code=400, detail="Invalid client or request parameters")

    current_user_payload = get_current_user_from_sso_cookie(request)
    print(current_user_payload)
    if not current_user_payload:
        login_url = f"http://login.nepdi.com.cn:3000/login?{request.query_params}"
        print(login_url)
        return RedirectResponse(url=login_url)

    # 从数据库获取用户对象
    user = User.get_or_none(User.username == current_user_payload["sub"])
    if not user:  # 安全检查，以防 JWT 中的用户已不存在
        raise HTTPException(status_code=401, detail="User not found")

    # 创建并存储授权码到数据库
    auth_code_value = os.urandom(16).hex()
    AuthCode.create(
        code=auth_code_value,
        user=user,
        client=client,
        exp=datetime.utcnow() + timedelta(minutes=5)
    )

    final_redirect_uri = f"{redirect_uri}?code={auth_code_value}"
    print(final_redirect_uri)
    return RedirectResponse(url=final_redirect_uri)


@app.post("/token")
def exchange_code_for_token(response: Response, code: str = Form(...), client_id: str = Form(...), client_secret: str = Form(...), grant_type: str = Form(...)):
    # 从数据库验证客户端
    client = Client.get_or_none(Client.client_id == client_id)
    print(client.client_secret, client_secret)
    print(grant_type, "authorization_code", "authorization_code")
    if not client or client.client_secret != client_secret or grant_type != "authorization_code":
        raise HTTPException(
            status_code=401, detail="Invalid client credentials")

    # 从数据库验证授权码
    auth_code = AuthCode.get_or_none(AuthCode.code == code)
    print(auth_code.client.client_id != client_id,
          auth_code.client.client_id, client_id)
    print(auth_code.is_used)
    print(datetime.utcnow() > auth_code.exp)
    if not auth_code or auth_code.client.client_id != client_id or auth_code.is_used or datetime.utcnow() > auth_code.exp:
        raise HTTPException(
            status_code=400, detail="Invalid or expired authorization code")

    # 标记授权码为已使用
    auth_code.is_used = True
    auth_code.save()

    user = auth_code.user
    
    token_data = {
        # 用户基本信息
        "sub": user.username,
        "name": user.full_name,
        "email": user.email,
        
        # --- 补充的信息 ---
        # 部门信息 (如果用户有部门)
        "department": user.department.name if user.department else None,
        
        # 平台信息 (明确令牌的受众)
        "platform": client.client_id, # 使用 'platform' 作为键名，比 'aud' 更直观
        "aud": client.client_id,      # 同时保留标准的 'aud' 声明
        "iss": "my-sso-system"        # 令牌颁发者
    }
    
    access_token = create_jwt_token(
        data=token_data,
        expires_delta=timedelta(minutes=15)
    )

    response.set_cookie(
        key=SSO_SESSION_COOKIE, value=access_token, httponly=True,
        secure=False, samesite='lax'
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/me")
def get_user_profile(request: Request):
    user_payload = get_current_user_from_sso_cookie(request)
    if not user_payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # 为了安全，我们从数据库再次获取用户信息，而不是完全信任cookie
    user = User.get_or_none(User.username == user_payload['sub'])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"sub": user.username, "email": user.email, "full_name": user.full_name}


def get_current_admin_user(request: Request):
    """
    从名为 ADMIN_SESSION_COOKIE 的 Cookie 中获取 JWT，
    并验证用户是否有 'admin' 角色。
    """
    # --- 修改这里：读取新的 cookie 名称 ---
    admin_token = request.cookies.get(ADMIN_SESSION_COOKIE)
    if not admin_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # --- 修改这里：使用新的 token 变量 ---
    payload = decode_jwt_token(admin_token)
    if not payload or payload.get("role") != "admin" or not payload.get("sub"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    admin = AdminUser.get_or_none(AdminUser.username == payload["sub"])
    if not admin:
        raise HTTPException(status_code=401, detail="Admin user not found")

    return admin


@app.post("/api/admin/login")
async def admin_login(response: Response, username: str = Form(...), password: str = Form(...)):
    admin = AdminUser.get_or_none(AdminUser.username == username)
    if not admin or not pwd_context.verify(password, admin.hashed_password):
        raise HTTPException(
            status_code=400, detail="Incorrect admin username or password")

    sso_session_token = create_jwt_token(
        data={"sub": admin.username, "email": admin.email, "role": "admin"},
        expires_delta=timedelta(days=1)
    )

    # --- 修改这里：使用新的 cookie 名称来设置 cookie ---
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE,  # 使用新的常量
        value=sso_session_token,
        httponly=True,
        secure=False,
        samesite='lax'
    )
    return {"message": "Admin login successful"}


@app.get("/api/admin/me")
def get_admin_profile(current_admin: AdminUser = Depends(get_current_admin_user)):
    """获取当前登录的管理员信息。"""
    return {
        "sub": current_admin.username,
        "email": current_admin.email,
        "full_name": current_admin.full_name,
        "role": "admin"
    }


@app.get("/api/clients")
def get_all_clients_for_dashboard(current_admin: AdminUser = Depends(get_current_admin_user)):
    """获取所有客户端，现在受 get_current_admin_user 保护。"""
    clients = Client.select()
    client_list = [
        {"client_id": client.client_id, "redirect_uri": client.redirect_uri}
        for client in clients
    ]
    return client_list


@app.get("/api/admin/stats/users")
def get_user_stats(current_admin: AdminUser = Depends(get_current_admin_user)):
    """获取 SSO 用户的统计信息。"""

    # 1. 获取总用户数
    total_users = User.select().count()

    # 2. 获取过去7天的新增用户数
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    new_users_last_7_days = User.select().where(
        User.created_at >= seven_days_ago).count()

    return {
        "total_users": total_users,
        "new_users_last_7_days": new_users_last_7_days,
    }


class UserCreate(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    password: str
    department_id: int | None = None


class PasswordReset(BaseModel):
    new_password: str


class UserUpdate(BaseModel):
    full_name: str
    email: EmailStr
    department_id: int | None = None
    password: str | None = None  # 密码可选，不提供则不更新


@app.get("/api/admin/users")
def get_all_sso_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """获取 SSO 用户列表，支持分页。"""
    query = User.select().order_by(User.id)
    total_users = query.count()
    users = query.paginate(page, page_size)

    user_list = [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "created_at": user.created_at.isoformat(),
            "department": {
                "id": user.department.id,
                "name": user.department.name,
            } if user.department else None
        }
        for user in users
    ]

    return {
        "items": user_list,
        "total": total_users,
        "page": page,
        "page_size": page_size
    }


@app.put("/api/admin/users/{user_id}")
def update_sso_user(
    user_id: int,
    user_data: UserUpdate,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """更新一个 SSO 用户的信息。"""
    user = User.get_or_none(User.id == user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # 检查邮箱是否与其它用户冲突
    existing_user_by_email = User.get_or_none(User.email == user_data.email)
    if existing_user_by_email and existing_user_by_email.id != user_id:
        raise HTTPException(
            status_code=409, detail="Email already in use by another user.")

    user.full_name = user_data.full_name
    user.email = user_data.email
    user.department_id = user_data.department_id

    # 如果提供了新密码，则更新密码
    if user_data.password:
        user.hashed_password = pwd_context.hash(user_data.password)

    user.save()

    return {"message": "User updated successfully."}


@app.post("/api/admin/users")
def create_sso_user(
    user_data: UserCreate,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """创建一个新的 SSO 用户。"""
    # 检查用户名或邮箱是否已存在
    if User.get_or_none((User.username == user_data.username) | (User.email == user_data.email)):
        raise HTTPException(
            status_code=409, detail="Username or email already exists.")

    new_user = User.create(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=pwd_context.hash(user_data.password),
        department_id=user_data.department_id
    )
    return {"message": "User created successfully", "user_id": new_user.id}


@app.delete("/api/admin/users/{user_id}")
def delete_sso_user(
    user_id: int,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """删除一个 SSO 用户。"""
    user = User.get_or_none(User.id == user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.delete_instance()
    return {"message": "User deleted successfully"}


@app.post("/api/admin/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    password_data: PasswordReset,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """重置指定用户的密码。"""
    user = User.get_or_none(User.id == user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = pwd_context.hash(password_data.new_password)
    user.save()
    return {"message": "Password reset successfully"}


class ClientCreate(BaseModel):
    client_id: str
    redirect_uri: HttpUrl  # 使用 HttpUrl 类型进行验证


class ClientUpdate(BaseModel):
    redirect_uri: HttpUrl

# 我们将增强现有的 GET 端点


@app.get("/api/admin/clients")
def get_all_clients(current_admin: AdminUser = Depends(get_current_admin_user)):
    """获取所有已注册的客户端应用。"""
    clients = Client.select()
    client_list = [
        # 注意：我们不在列表视图中返回 client_secret
        {"client_id": client.client_id, "redirect_uri": client.redirect_uri}
        for client in clients
    ]
    return client_list


@app.post("/api/admin/clients")
def create_client(
    client_data: ClientCreate,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """创建一个新的客户端平台。"""
    if Client.get_or_none(Client.client_id == client_data.client_id):
        raise HTTPException(
            status_code=409, detail="Client ID already exists.")

    # 生成一个安全的 client_secret
    client_secret = secrets.token_hex(32)

    new_client = Client.create(
        client_id=client_data.client_id,
        client_secret=client_secret,
        redirect_uri=str(client_data.redirect_uri)  # 转换为字符串存储
    )

    # 在响应中返回新创建的客户端，包括密钥，以便管理员可以复制它
    return {
        "client_id": new_client.client_id,
        "client_secret": new_client.client_secret,  # 仅在创建时返回
        "redirect_uri": new_client.redirect_uri
    }


@app.put("/api/admin/clients/{client_id}")
def update_client(
    client_id: str,
    client_data: ClientUpdate,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """更新客户端平台信息。"""
    client = Client.get_or_none(Client.client_id == client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    client.redirect_uri = str(client_data.redirect_uri)
    client.save()

    return {"client_id": client.client_id, "redirect_uri": client.redirect_uri}


@app.delete("/api/admin/clients/{client_id}")
def delete_client(
    client_id: str,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """删除一个客户端平台。"""
    client = Client.get_or_none(Client.client_id == client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    client.delete_instance()
    return {"message": "Client deleted successfully"}


class DepartmentCreate(BaseModel):
    name: str
    description: str | None = None
    parent_id: int | None = None


class DepartmentUpdate(BaseModel):
    name: str
    description: str | None = None
    parent_id: int | None = None


def is_descendant(dept_id: int, potential_parent_id: int) -> bool:
    """检查 potential_parent_id 是否是 dept_id 的子孙。"""
    if dept_id == potential_parent_id:
        return True
    parent = Department.get_or_none(Department.id == potential_parent_id)
    while parent:
        if parent.id == dept_id:
            return True
        parent = parent.parent
    return False


@app.get("/api/admin/departments")
def get_all_departments(current_admin: AdminUser = Depends(get_current_admin_user)):
    """获取所有部门的扁平列表。"""
    departments = Department.select()
    return [{
        "id": dept.id,
        "name": dept.name,
        "description": dept.description,
        "parent_id": dept.parent.id if dept.parent else None
    } for dept in departments]


@app.post("/api/admin/departments")
def create_department(dept_data: DepartmentCreate, current_admin: AdminUser = Depends(get_current_admin_user)):
    """创建一个新部门。"""
    if Department.get_or_none(Department.name == dept_data.name):
        raise HTTPException(
            status_code=409, detail="Department name already exists.")

    new_dept = Department.create(
        name=dept_data.name,
        description=dept_data.description,
        parent_id=dept_data.parent_id
    )
    return {
        "id": new_dept.id,
        "name": new_dept.name,
        "description": new_dept.description,
        "parent_id": new_dept.parent_id
    }


@app.put("/api/admin/departments/{dept_id}")
def update_department(dept_id: int, dept_data: DepartmentUpdate, current_admin: AdminUser = Depends(get_current_admin_user)):
    """更新一个部门。"""
    dept = Department.get_or_none(Department.id == dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    existing_dept = Department.get_or_none(Department.name == dept_data.name)
    if existing_dept and existing_dept.id != dept_id:
        raise HTTPException(
            status_code=409, detail="Department name already in use.")

    if dept_data.parent_id and is_descendant(dept_id=dept_id, potential_parent_id=dept_data.parent_id):
        raise HTTPException(
            status_code=400, detail="A department cannot be a child of itself or its descendants.")

    dept.name = dept_data.name
    dept.description = dept_data.description
    dept.parent_id = dept_data.parent_id
    dept.save()
    return {
        "id": dept.id,
        "name": dept.name,
        "description": dept.description,
        "parent_id": dept.parent_id
    }


@app.delete("/api/admin/departments/{dept_id}")
def delete_department(dept_id: int, current_admin: AdminUser = Depends(get_current_admin_user)):
    """删除一个部门。"""
    dept = Department.get_or_none(Department.id == dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    dept.delete_instance()
    return {"message": "Department deleted successfully."}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class SecuritySettings(BaseModel):
    session_duration_admin_hours: int = Field(
        ..., ge=1, description="Admin session duration in hours")
    password_min_length: int = Field(..., ge=8,
                                     description="Minimum password length")
    password_require_uppercase: bool


@app.post("/api/admin/me/change-password")
def change_admin_password(
    password_data: ChangePasswordRequest,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # 验证当前密码
    if not pwd_context.verify(password_data.current_password, current_admin.hashed_password):  # type: ignore
        raise HTTPException(
            status_code=400, detail="Incorrect current password.")

    # 可以在这里加入新密码的复杂度验证

    current_admin.hashed_password = pwd_context.hash( # type: ignore
        password_data.new_password)  # type: ignore
    current_admin.save()

    return {"message": "Password updated successfully."}

# 2. 安全策略 - 获取和更新


@app.get("/api/admin/settings/security", response_model=SecuritySettings)
def get_security_settings(current_admin: AdminUser = Depends(get_current_admin_user)):
    """获取安全策略设置。"""
    settings = {s.key: s.value for s in Setting.select()}
    # 从数据库字符串转换为正确的类型，并提供默认值
    return SecuritySettings(
        session_duration_admin_hours=int(
            settings.get("session_duration_admin_hours", 8)),
        password_min_length=int(settings.get("password_min_length", 8)),
        password_require_uppercase=settings.get(
            "password_require_uppercase", "true").lower() == "true"
    )


@app.put("/api/admin/settings/security")
def update_security_settings(
    settings_data: SecuritySettings,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """更新安全策略设置。"""
    # 使用 peewee 的 insert(...).on_conflict_replace() 进行批量更新/插入
    data_to_save = [
        {"key": "session_duration_admin_hours", "value": str(
            settings_data.session_duration_admin_hours)},
        {"key": "password_min_length", "value": str(
            settings_data.password_min_length)},
        {"key": "password_require_uppercase", "value": str(
            settings_data.password_require_uppercase).lower()}
    ]
    Setting.insert_many(data_to_save).on_conflict_replace().execute()

    return {"message": "Security settings updated successfully."}


@app.post("/api/admin/clients/{client_id}/reveal-secret")
def reveal_client_secret(
    client_id: str,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """安全地获取一个客户端的密钥。"""
    client = Client.get_or_none(Client.client_id == client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    # 仅在需要时返回密钥，不在常规列表中显示
    return {"client_id": client.client_id, "client_secret": client.client_secret}


@app.post("/api/admin/clients/{client_id}/reset-secret")
def reset_client_secret(
    client_id: str,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """为客户端重新生成一个新的密钥。"""
    client = Client.get_or_none(Client.client_id == client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    new_secret = secrets.token_hex(32)
    client.client_secret = new_secret
    client.save()

    # 返回新生成的密钥，以便管理员可以立即复制
    return {"client_id": client.client_id, "client_secret": new_secret}


@app.post("/api/admin/departments/import")
async def import_departments(
    file: UploadFile = File(...),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """从 Excel 文件导入部门结构，此操作会覆盖所有现有部门。"""
    if not file.filename.endswith(('.xlsx', '.xls')): # type: ignore
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file (.xlsx, .xls).")

    try:
        import pandas as pd
        await file.seek(0)
        # 读取时将所有数据视为字符串，避免自动类型推断问题
        df = pd.read_excel(file.file, engine='openpyxl', dtype=str)
        # 将 NaN 值替换为空字符串
        df.fillna('', inplace=True)
        
        required_columns = {'id', 'name', 'parent_id'}
        if not required_columns.issubset(df.columns):
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns. File must contain: {', '.join(required_columns)}"
            )

        with db.atomic() as transaction:
            try:
                User.update(department=None).execute()
                Department.delete().execute()
                
                departments_data = df.to_dict('records')
                external_id_to_new_db_id_map = {}

                # --- 第一阶段：创建部门，建立映射 ---
                for row in departments_data:
                    external_id = str(row.get('id', '')).strip()
                    name = str(row.get('name', '')).strip()

                    if not name or not external_id:
                        continue
                    
                    # 规范化 ID：移除可能由浮点数转换带来的 ".0"
                    normalized_id = external_id.removesuffix('.0')

                    new_dept = Department.create(
                        name=name,
                        description=str(row.get('description', ''))
                    )
                    external_id_to_new_db_id_map[normalized_id] = new_dept.id

                # --- 第二阶段：更新父子关系 ---
                for row in departments_data:
                    external_id = str(row.get('id', '')).strip()
                    external_parent_id = str(row.get('parent_id', '')).strip()

                    if not external_id or not external_parent_id:
                        continue

                    # 对 ID 和 parent_id 使用相同的规范化方法
                    normalized_id = external_id.removesuffix('.0')
                    normalized_parent_id = external_parent_id.removesuffix('.0')

                    new_db_id = external_id_to_new_db_id_map.get(normalized_id)
                    new_db_parent_id = external_id_to_new_db_id_map.get(normalized_parent_id)

                    if new_db_id and new_db_parent_id:
                        dept_to_update = Department.get(Department.id == new_db_id)
                        dept_to_update.parent = new_db_parent_id
                        dept_to_update.save()

            except Exception as e:
                transaction.rollback()
                raise HTTPException(status_code=500, detail=f"An error occurred during import: {e}")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {e}")

    # 过滤掉没有名称的行来计算真实的导入数量
    valid_rows = df[df['name'].str.strip() != '']
    return {"message": f"Successfully imported {len(valid_rows)} departments."}


@app.post("/api/admin/users/import")
async def import_users(
    file: UploadFile = File(...),
    overwrite: bool = Query(False, description="If true, update existing users. Otherwise, skip them."),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """从 Excel 文件导入用户。"""
    if not file.filename.endswith(('.xlsx', '.xls')): # type: ignore
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file.")

    try:
        import pandas as pd
        await file.seek(0)
        df = pd.read_excel(file.file, engine='openpyxl', dtype=str).fillna('')
        
        required_columns = {'username', 'email', 'full_name', 'password'}
        if not required_columns.issubset(df.columns):
            raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(required_columns - set(df.columns))}")
        
        users_data = df.to_dict('records')
        new_users_count = 0
        updated_users_count = 0
        skipped_users_count = 0
        errors = []

        # 提前获取所有部门名称到ID的映射，减少数据库查询
        departments_map = {dept.name: dept.id for dept in Department.select()}
        # 提前获取所有现有用户的username和email，用于快速查找
        existing_users_map = {
            u.username: u for u in User.select()
        }
        existing_emails_set = {u.email for u in existing_users_map.values()}

        with db.atomic() as transaction:
            try:
                for index, row in enumerate(users_data):
                    row_num = index + 2 # Excel 行号
                    username = str(row.get('username', '')).strip()
                    email = str(row.get('email', '')).strip().lower()
                    
                    if not username or not email:
                        errors.append(f"Row {row_num}: Missing username or email.")
                        continue

                    department_name = str(row.get('department_name', '')).strip()
                    department_id = departments_map.get(department_name) if department_name else None

                    if department_name and not department_id:
                        errors.append(f"Row {row_num}: Department '{department_name}' not found.")
                        continue

                    existing_user = existing_users_map.get(username)

                    if existing_user: # 用户名已存在
                        if overwrite:
                            existing_user.full_name = str(row.get('full_name', existing_user.full_name)).strip()
                            existing_user.department_id = department_id
                            # 注意：我们不通过导入更新密码
                            existing_user.save()
                            updated_users_count += 1
                        else:
                            skipped_users_count += 1
                        continue # 处理下一行
                    
                    if email in existing_emails_set: # 邮箱已存在
                         if overwrite:
                             errors.append(f"Row {row_num}: Email '{email}' exists for another user. Cannot update by email.")
                         skipped_users_count += 1
                         continue

                    # 创建新用户
                    password = str(row.get('password', '')).strip()
                    if not password:
                        errors.append(f"Row {row_num}: Password is required for new user '{username}'.")
                        continue
                    
                    User.create(
                        username=username,
                        email=email,
                        full_name=str(row.get('full_name', '')).strip(),
                        hashed_password=pwd_context.hash(password),
                        department_id=department_id
                    )
                    new_users_count += 1
                    # 更新快速查找集合以处理文件内重复项
                    existing_emails_set.add(email)


            except Exception as e:
                transaction.rollback()
                raise HTTPException(status_code=500, detail=f"An error occurred during transaction: {e}")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {e}")

    return {
        "message": "User import process completed.",
        "new_users": new_users_count,
        "updated_users": updated_users_count,
        "skipped_users": skipped_users_count,
        "errors": errors
    }
