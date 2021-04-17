from flask import Flask
app = Flask(__name__)


# load the pickle files immediatly after the application is started.
from app.modules.visualization.data_processing import load_pickle_files
load_pickle_files()

from app.modules.api.routes import api_blueprint
from app.modules.visualization.routes import vis_blueprint
from app.modules.views.routes import views_blueprint
from app.modules.visualization.routes_app_view import app_view_blueprint
from app.modules.visualization.routes_lib_view import lib_view_blueprint
from app.modules.visualization.routes_vul_view import vul_view_blueprint


app.register_blueprint(api_blueprint)
app.register_blueprint(views_blueprint)
app.register_blueprint(vis_blueprint)
app.register_blueprint(app_view_blueprint)
app.register_blueprint(lib_view_blueprint)
app.register_blueprint(vul_view_blueprint)

'''
Needed for the creation of a new pickle file.
'''
from app.modules.pickler.pickler import pickler
app.register_blueprint(pickler)


from app.modules.panda import app_forest
from app.modules.visualization import data_processing
