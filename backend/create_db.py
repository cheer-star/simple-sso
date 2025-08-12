# create_db.py
from db import db
from models import User, Client
from passlib.context import CryptContext

# 创建密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_tables_and_seed_data():
    print("Connecting to the database...")
    db.connect()
    
    print("Dropping old tables (if they exist)...")
    db.drop_tables([User, Client], safe=True)
    
    print("Creating new tables...")
    db.create_tables([User, Client])
    
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
        client_id="client_app_1",
        client_secret="client_app_1_secret",
        redirect_uri="http://localhost:3001/auth/callback"
    )
    print("Client 'client_app_1' created.")

    print("Closing database connection.")
    db.close()
    
    print("\nDatabase initialization complete! You can now run the FastAPI server.")

if __name__ == "__main__":
    create_tables_and_seed_data()