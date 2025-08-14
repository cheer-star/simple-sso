# create_db.py
from db import db
# 导入所有模型
from models import User, Client, AuthCode, AdminUser, Department,Setting 
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_tables_and_seed_data():
    print("Connecting to the database...")
    db.connect()
    
    print("Dropping old tables (if they exist)...")
    # 确保所有模型都包括在内
    db.drop_tables([User, AdminUser, Client, AuthCode, Department, Setting], safe=True)
    db.create_tables([User, AdminUser, Client, AuthCode, Department, Setting])

    
    print("Seeding initial data...")
    
    print("Seeding departments...")
    hq = Department.create(name="Corporate HQ", description="Headquarters")
    eng = Department.create(name="Engineering", description="Technology Division", parent=hq)
    sales = Department.create(name="Sales", description="Sales Division", parent=hq)
    frontend_team = Department.create(name="Frontend Team", description="Web & Mobile UI", parent=eng)
    backend_team = Department.create(name="Backend Team", description="API & Services", parent=eng)
    print("Hierarchical departments created.")
    
    print("Seeding default settings...")
    Setting.create(key="session_duration_admin_hours", value="8")
    Setting.create(key="password_min_length", value="8")
    Setting.create(key="password_require_uppercase", value="true")
    print("Default settings created.")

    
    # 1. 创建普通 SSO 用户
    User.create(
        username="john.doe",
        full_name="John Doe",
        email="john.doe@example.com",
        hashed_password=pwd_context.hash("password123"),
        department=frontend_team # 分配到销售部
    )
    print("SSO User 'john.doe' created.")
    
    # 2. 创建管理员用户
    AdminUser.create(
        username="admin",
        full_name="Administrator",
        email="admin@sso.local",
        hashed_password=pwd_context.hash("adminpass") # 使用一个不同的、更强的密码
    )
    print("Admin User 'admin' created.")
    
    # 3. 创建客户端应用
    Client.create(
        client_id="client_app_1",
        client_secret="client_app_1_secret",
        redirect_uri="http://localhost:3001/api/auth/callback"
    )
    print("Client 'client_app_1' created.")

    print("Closing database connection.")
    db.close()
    
    print("\nDatabase initialization complete! You can now run the FastAPI server.")

if __name__ == "__main__":
    create_tables_and_seed_data()