"""

JSON api.

"""

from app.cache import cache  # import cache to work with blueprints
from flask import make_response, jsonify, Blueprint, stream_with_context, Response
import pandas as pd
import requests
import pickle
from app.modules.panda import app_forest, data_for_vis
import json

eclipseSteadyURL = 'http://localhost:8033'
workspace = '46464E25761F99038CA2BCB9DD8187BE'

api_blueprint = Blueprint('api_blueprint', __name__)
cacheTimeout = 36000  # timeout of cache in seconds 36,000 = 10hrs
'''
application information.
Sorted set of all applications of the respective tenant and space.
'''
pickleData = 0


'''
returns all files needed for the initialization of the visualization:
  - visualization_applications
  - visualization_libraries
  - visualization_vulnerabilities
for the structure of the data contained inside these files please look at: /pickleFiles/data_structures.txt
'''
@api_blueprint.route('/data/for-visualization')
@cache.cached(timeout=cacheTimeout)
def send_visualization_files():
    vis_apps = pd.read_pickle('./app/static/pickleFiles/visualization_applications', compression='infer')
    vis_libs= pd.read_pickle('./app/static/pickleFiles/visualization_libraries', compression='infer')
    vis_vulas = pd.read_pickle('./app/static/pickleFiles/visualization_vulnerabilities', compression='infer')

    ret = {
        'apps': vis_apps,
        'libs': vis_libs,
        'vulas': vis_vulas
    }

    return jsonify(ret)


# TODO: add RequestParams
@api_blueprint.route('/data/apps')
@cache.cached(timeout=cacheTimeout)
def allapps():
    print("allapps in routes")
    response = requests.get(eclipseSteadyURL + '/backend/hubIntegration/apps/json')  # entire response
    data = response.json()  # get the json content of the response.
    if response.status_code == 200:
        res = make_response(jsonify(data), 200)
        return jsonify(data)
    else:
        return make_response(jsonify(data), 400)


# returns all relevant vulnerabilties for the particular library.
@api_blueprint.route('/data/libs/vulnerabilties/<digest>')
def lib_vulas(digest):
    response = requests.get(eclipseSteadyURL + '/backend/libs/' + digest + '/bugs')  # whole response
    data = response.json()  # get the json content of the response.
    if response.status_code == 200:
        res = make_response(jsonify(data), 200)
        return jsonify(data)
    else:
        return make_response(jsonify(data), 400)

'''
all vulnerable dependencies of the particular application.
'''

def writeToFile(error):
    f = open("app/modules/pickler/pickle_errors.txt", "a")
    f.write(error + "\n")
    f.close()

@api_blueprint.route('/data/apps/vulndeps/<mvnGroup>/<artifact>/<version>')
def vulndeps(mvnGroup, artifact, version):
    paramDict = [mvnGroup, artifact, version]
    concatParams = "/".join(paramDict)
    response = requests.get(eclipseSteadyURL + '/backend/apps/' + concatParams + '/vulndeps',
                            headers={"X-Vulas-Space": workspace})
    data = response.json()  # get the json content of the response.

    if response.status_code == 200:
        res = make_response(jsonify(data), 200)
        return res
    else:
        error = "/data/apps/vulndeps/<mvnGroup>/<artifact>/<version> for " + concatParams
        writeToFile(error)
        writeToFile(response.json())
        print(f"/data/apps/vulndeps/<mvnGroup>/<artifact>/<version> for {concatParams}")
        #print(data)
        return make_response(jsonify(data), 400)




'''
all dependencies of the particular application.
'''


@api_blueprint.route('/data/apps/deps/<mvnGroup>/<artifact>/<version>')
def deps(mvnGroup, artifact, version):
    paramDict = [mvnGroup, artifact, version]
    concatParams = "/".join(paramDict)
    response = requests.get(eclipseSteadyURL + '/backend/apps/' + concatParams + '/deps',
                            headers={"X-Vulas-Space": workspace})
    data = response.json()  # get the json content of the response.
    if response.status_code == 200:
        res = make_response(jsonify(data), 200)
        return res
    else:
        error = "Problem in /data/apps/deps/<mvnGroup>/<artifact>/<version> for " + concatParams
        writeToFile(error)
        print(f"Problem in /data/apps/deps/<mvnGroup>/<artifact>/<version> for {concatParams}")
        return make_response(jsonify(data), 400)


@api_blueprint.route('/data/apps/vulnerabilites/<mvnGroup>/<artifact>/<version>')
def vulList(mvnGroup, artifact, version):
    paramDict = [mvnGroup, artifact, version]
    concatParams = "/".join(paramDict)
    response = requests.get(eclipseSteadyURL + '/backend/apps/' + concatParams + '/bugs',
                            headers={"X-Vulas-Space": workspace})
    data = response.json()  # get the json content of the response.
    if response.status_code == 200:
        res = make_response(jsonify(data), 200)
        return res
    else:
        error = "Problem in /data/apps/deps/<mvnGroup>/<artifact>/<version> for " + concatParams
        writeToFile(error)
        print(f"Problem in /data/apps/deps/<mvnGroup>/<artifact>/<version> for for {concatParams}")
        return make_response(jsonify(data), 400)



'''
/{mvnGroup:.+}/{artifact:.+}/{version:.+}/deps
/backend/apps/MY_EBR_BUNDLES_GROUP/ch.qos.logback.classic.ebr/1.2.3-SNAPSHOT/deps
Need to send: X-Vulas-Space: 46464E25761F99038CA2BCB9DD8187BE Header with request.
'''


# * Returns a list of all {@link Bug}s affecting the given Maven artifact.
# * This list can be filtered by proving a CVSS threshold (geCvss) or bug identifiers (selecteBugs).
@api_blueprint.route('/data/libids/bugs/<mvnGroup>/<artifact>/<version>')
def bugsPerApp(mvnGroup, artifact, version):
    paramDict = [mvnGroup, artifact, version]
    concatParams = "/".join(paramDict)
    response = requests.get(eclipseSteadyURL + '/backend/libids/' + concatParams + '/bugs',
                            headers={"X-Vulas-Space": workspace})
    data = response.json()  # get the json content of the response.
    if response.status_code == 200:
        res = make_response(jsonify(data), 200)
        return res
    else:
        return make_response(jsonify(data), 400)


'''

needed to create new files after the db was updated.

'''
# creation of the visualization_* pickle files.
@api_blueprint.route('/data/create/files-for-visualization')
def send_data_for_visualization():
    global pickleData
    print("Start creating files filled with suitable data for the three main views")
    print("comment out exit")
    exit()
    ret = data_for_vis.create_visualization_pickle_files()

    return jsonify(ret)


# creation of the app_forest pickle file
@api_blueprint.route('/data/create/app-forest')
def send_pickle_files():
    global pickleData
    print("creat app_forest based on 'picklefile_all_apps_with_deps_and_vulndeps'")
    print("comment out exit")
    exit()
    forest = app_forest.create_app_forest_pickle_file()

    return jsonify({'app_forest': forest})
