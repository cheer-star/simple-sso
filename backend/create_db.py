# create_db.py
from db import db
from models import User, Client, AuthCode
from passlib.context import CryptContext

# 创建密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_tables_and_seed_data():
    print("Connecting to the database...")
    db.connect()
    
    # 把 AuthCode 加入到 drop_tables 中
    db.drop_tables([User, Client, AuthCode], safe=True) 
    
    print("Creating new tables...")
    # --- 修改这里 ---
    # 把 AuthCode 加入到 create_tables 中
    db.create_tables([User, Client, AuthCode])

    
    print("Seeding initial data...")
    
    # 创建用户
    User.create(
        username="john.doe",
        full_name="John Doe",
        email="john.doe@example.com",
        hashed_password=pwd_context.hash("password123")
    )
    print("User 'john.doe' created.")
    
    # 创建客户端应用
    Client.create(
        client_id="client_app_2",
        client_secret="client_app_2_secret",
        redirect_uri="http://material.nepdi.com.cn:3001/api/auth/callback"
    )
    print("Client 'client_app_2' created.")

    print("Closing database connection.")
    db.close()
    
    print("\nDatabase initialization complete! You can now run the FastAPI server.")

if __name__ == "__main__":
    create_tables_and_seed_data()