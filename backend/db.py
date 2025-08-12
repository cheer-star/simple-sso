# db.py
from peewee import SqliteDatabase
from contextvars import ContextVar

# 数据库文件名为 sso.db，它将被创建在 backend 目录下
db_path = "sso.db"
db = SqliteDatabase(db_path)