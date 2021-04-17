from app import app #import of app variable
from flask import render_template, request, redirect, jsonify, make_response, Blueprint
from flask_cors import CORS
import requests


CORS(app) #default values.

views_blueprint = Blueprint('views_blueprint', __name__)

@views_blueprint.route('/')
def index():
    return render_template("public/index.html")

@views_blueprint.route('/about')
def about():
    return "about", 200

@views_blueprint.route('/abb')
def abb():
    return render_template("public/apps.html")

@views_blueprint.route('/apps')
def allApps():
        res = render_template("public/apps.html")
        return make_response(res, 200)


#useful for setting up the correct workspace.
@views_blueprint.route('/workspace', methods=["GET", "POST"])
def workspace():
        if request.method == "POST":
            req = request.form
            print(req)

            #validate input
            missing = list()
            for k, v in req.items():
                if v == "":
                    missing.append(k)

            if missing:
                feedback = f"Missing fields for {', '.join(missing)}"
                return render_template("public/workspace.html", feedback=feedback)

            return redirect(request.url) # TODO: message to the user, that the workspace was set.

        return render_template("public/workspace.html") # TODO: message to the user, that the workspace wasn't changed.