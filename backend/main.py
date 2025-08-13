# main.py
import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request, Response, Depends, HTTPException, Form
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext

# 从新文件中导入
from db import db
from models import User, Client, AuthCode, AdminUser

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
    access_token = create_jwt_token(
        data={"sub": user.username, "name": user.full_name, "email": user.email},
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
def get_all_clients(current_admin: AdminUser = Depends(get_current_admin_user)):
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
    new_users_last_7_days = User.select().where(User.created_at >= seven_days_ago).count()
    
    return {
        "total_users": total_users,
        "new_users_last_7_days": new_users_last_7_days,
    }
