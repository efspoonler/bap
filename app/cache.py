from app import app
from flask_caching import Cache

#cache = Cache(app)
cache = Cache(app, config={'CACHE_TYPE': 'simple'})