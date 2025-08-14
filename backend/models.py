# models.py
import datetime
from peewee import Model, CharField, ForeignKeyField, DateTimeField, BooleanField,AutoField,TextField, IntegerField
from db import db

class BaseModel(Model):
    class Meta:
        database = db

class Department(BaseModel):
    id = AutoField()
    name = CharField(unique=True)
    description = TextField(null=True)
    
    parent = ForeignKeyField('self', backref='children', null=True, on_delete='SET NULL')


class User(BaseModel):
    id = AutoField()
    
    username = CharField(unique=True, index=True)
    full_name = CharField()
    email = CharField(unique=True)
    hashed_password = CharField()
    created_at = DateTimeField(default=datetime.datetime.now)
    
    department = ForeignKeyField(Department, backref='users', null=True, on_delete='SET NULL')


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
    id = AutoField()
    
    username = CharField(unique=True, index=True)
    full_name = CharField()
    email = CharField(unique=True)
    hashed_password = CharField()

