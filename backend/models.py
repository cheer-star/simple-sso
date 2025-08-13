# models.py
import datetime
from peewee import Model, CharField, ForeignKeyField, DateTimeField, BooleanField
from db import db

class BaseModel(Model):
    class Meta:
        database = db

class User(BaseModel):
    username = CharField(unique=True, index=True)
    full_name = CharField()
    email = CharField(unique=True)
    hashed_password = CharField()
    created_at = DateTimeField(default=datetime.datetime.now)


class Client(BaseModel):
    client_id = CharField(primary_key=True, max_length=100)
    client_secret = CharField()
    redirect_uri = CharField()

class AuthCode(BaseModel):
    code = CharField(primary_key=True, max_length=100)
    user = ForeignKeyField(User, backref='auth_codes')
    client = ForeignKeyField(Client, backref='auth_codes')
    exp = DateTimeField()
    is_used = BooleanField(default=False)
    
class AdminUser(BaseModel):
    username = CharField(unique=True, index=True)
    full_name = CharField()
    email = CharField(unique=True)
    hashed_password = CharField()
