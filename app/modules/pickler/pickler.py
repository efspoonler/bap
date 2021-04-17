import pickle
import requests
from flask import Blueprint, jsonify

# vulndeps immer hinzufügen: null wenn nicht vorhanden.
# keine dependencies: null
pickler = Blueprint('pickle_blueprint', __name__)

url = 'http://127.0.0.1:5000'
path = "./app/static/pickleFiles/"


@pickler.route('/pickle/all/appdepsvulas/')
def pickleMe():
    '''
    Use this route to circumference the need of query optimization for long reuqests to Eclipse Steady database.
    The Class provides methods to dump data of long lasting queries into the static folder.
    Needs to be done manually every time the database is updated.
    IMPORTANT: register the Blueprint inside app/__init__.py to use it.
    '''

    '''
    dump all data
    '''
    filename = "picklefile_all_apps_with_deps_and_vulndeps_new"
    outfile = open(path + filename, "wb")

    response = requests.get(url + '/data/apps')
    applications = response.json()
    print(f'retrieved: {len(applications)} different applications') #returns correct number - same as in db.
    for i, app in enumerate(applications):
        print(i)
        mvnGroup = app['application']['group']
        artifact = app["application"]['artifact']
        version = app["application"]['version']
        appID = mvnGroup + '/' + artifact + '/' + version
        gav = mvnGroup + ':' + artifact + ':' + version
        id = mvnGroup = app['application']['id']
        applications[i] = {'gav': gav, 'id': id}

        # retrieve all dependencies for the respective application.
        deps = requests.get(url + '/data/apps/deps/' + appID)
        applications[i]['dependencies'] = []

        vulndepsList = requests.get(url + '/data/apps/vulndeps/' + appID)
        # print()

        if vulndepsList.status_code == 200:
            vulndepsList = vulndepsList.json()

            # add a flag to easily decide if an application is vulnerable.
            if not vulndepsList:
                applications[i]['appIsVulnerable'] = False
            else:
                applications[i]['appIsVulnerable'] = True

            for dep in deps.json():
                filename = dep["filename"]
                tempPath = dep["lib"]['libraryId']
                # there exists libs with inside the lib table which have a null value inside libaray_id_id (id of the table library_id-> the library_id table contains the group, artifact and version.
                try:
                    libId = tempPath['group'] + ':' + tempPath['artifact'] + ':' + tempPath['version']
                except:
                    libId = None
                    print('error in libId   ' + dep['lib']["digest"])
                digest = dep['lib']["digest"]
                origin = dep["origin"]
                scope = dep["scope"]
                transitive = dep["transitive"]
                if dep['parent'] == None:
                    parent = {}
                else:
                    pDigest = dep['parent']['lib']['digest']
                    pTempPath = dep['parent']['lib']['libraryId']
                    plibId = pTempPath['group'] + ':' + pTempPath['artifact'] + ':' + pTempPath['version']
                    parent = {'digest': pDigest, 'libId': plibId}
                # append the dependency.
                applications[i]['dependencies'].append(
                    {
                        'filename': filename,
                        'digest': digest,  # digest of the lib
                        'libId': libId,
                        'parent': parent,
                        'scope': scope,
                        'transitive': transitive,
                        'vulnerabilties': vulnDepsToLib(digest, vulndepsList)
                    }
                )

            #print(applications[i])

        else:
            print(f'statuscode 400 for {appID}')

    pickle.dump(applications, outfile)
    outfile.close()

    return jsonify({"pickle": "finished processing and dumping the data."})


def vulnDepsToLib(libDigest: str, vulnDepsList: list):
    # Maybe interesting, to make use of this, as soon as I received the  trace data.
    # retrieve all vulnerable dependencies for the respective application.

    vulnerabilityList = []
    for idx, vdep in enumerate(vulnDepsList):
        vDigest = vdep['dep']['lib']['digest']
        if libDigest == vDigest:
            vTempPath = vdep['bug']

            cve = vTempPath['bugId']
            vDescription = vTempPath['description']
            cvssScore = vTempPath['cvssScore']
            cvssVersion = vTempPath['cvssVersion']
            cvssVector = vTempPath['cvssVector']
            vulnerabilityList.append(
                {'cve': cve, 'cvssScore': cvssScore, 'cvssVector': cvssVector, 'cvssVersion': cvssVersion,
                 'description': vDescription})

    return vulnerabilityList
