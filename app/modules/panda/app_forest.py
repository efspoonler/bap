import pandas as pd
import json
import pickle
from anytree import AnyNode, RenderTree
from anytree.exporter import DictExporter

rawData = []
df = pd.DataFrame()
df_dependencies = pd.DataFrame()
df_vulnerabilities = pd.DataFrame()

# This needs to be done, because json cannot handle NaN or None values. It just knows (and accepts inside the browser) null values.
def replaceNoneAndNaNValues(dataframe):
    dataframe.fillna('null', inplace=True)
    return dataframe

# the app forest contains all apps with there children (dependecies). Dependencies contain vulnerability information.
def load_app_forest():
    jsonData = pd.read_pickle('./app/static/pickleFiles/app_forest', compression='infer')
    return jsonData

# load pickle file and create dataFrames from these data.
def create_app_forest_pickle_file():
    global df_dependencies, rawData, df_vulnerabilities

    rawData = pd.read_pickle('./app/static/pickleFiles/picklefile_all_apps_with_deps_and_vulndeps', compression='infer')
    df_apps = pd.json_normalize(rawData, meta=['id'])[['id', 'gav', 'appIsVulnerable']] # ignore the dependencies by selecting just the three rows.
    replaceNoneAndNaNValues(df_apps)

    df_dependencies = pd.json_normalize(rawData, record_path='dependencies', meta=['id'])[['id', 'digest', 'libId', 'filename', 'scope', 'transitive', 'parent.digest', 'parent.libId']]
    replaceNoneAndNaNValues(df_dependencies)

    df_vulnerabilities = pd.json_normalize(rawData, record_path=['dependencies', 'vulnerabilties'], meta=['id', ['dependencies', 'digest']])[['id', 'dependencies.digest', 'cve', 'cvssScore', 'cvssVector', 'cvssVersion', 'description']]
    replaceNoneAndNaNValues(df_vulnerabilities)
    valuesList = df_vulnerabilities['dependencies.digest'].drop_duplicates().to_list()
    df_apps_with_deps = df_apps.merge(df_dependencies, how='inner', on='id')  # left join. All rows from the left dataframe are present if NaN if an app has no dependeicies. With an inner-join apps with noo dependencies are ignored.
    replaceNoneAndNaNValues(df_apps_with_deps)

    #return '{}'
    df_apps_with_deps= df_apps.merge(df_dependencies, how='inner', on='id' ) # left join. All rows from the left dataframe are present if NaN if an app has no dependeicies. With an inner-join apps with noo dependencies are ignored.
    replaceNoneAndNaNValues(df_apps_with_deps)

    app_forest=[]
    for inx, app_gav in enumerate(df_apps['gav'].tolist()):
       print(inx)
       all_deps =  df_apps_with_deps.loc[df_apps_with_deps['gav'] == app_gav, ['digest', 'transitive', 'scope', 'parent.digest', 'filename']]
       meta_scopes =all_deps['scope'].value_counts().to_dict()
       allDepsAsDict = df_apps_with_deps.loc[df_apps_with_deps['gav'] == app_gav, ['digest', 'transitive', 'scope', 'parent.digest', 'filename']].to_dict(orient='records')
       app_forest.append(testFunc(app_gav, allDepsAsDict, meta_scopes))

    filename = "app_forest"
    path = "./app/static/pickleFiles/"
    outfile = open(path + filename, "wb")

    pickle.dump(app_forest, outfile)
    outfile.close()

    #TODO: put appforest into pickle file.
    return 'finished creating app forest'

def returnColumnData():
    global df_deps

    appDepCount = df_deps.apply(lambda x: x['id'], axis=1).value_counts().to_json(orient='split')
    ret = []
    xyz = json.loads(appDepCount)
    for i, x in enumerate(xyz['index']):
        ret.append({'index': x, 'data': xyz['data'][i]})
    return ret  # json.loads(appDepCount)


def testFunc(app, dependencies, meta_scopes):
    myList = {}
    meta_data= {}
    meta_total_vulnerability_count = []
    meta_total_vulnerable_libs = []
    meta_total_dependencies_count = len(dependencies) #at the end len(myList)-1 should be of same length.
    root = AnyNode(app_gav=app)
    myList[root.app_gav] = root
    noParentsYet = []
    for indx, dep in enumerate(dependencies):
        name = dep.get('digest')
        parent_pointer = str(dep.get('parent.digest'))
        trans = dep.get('transitive')

        if (parent_pointer == 'null') and (trans == True): # there exist libs that are declared as transitive, but have no parent. To prevent any lose of vulnerability information, these dependencies are handled as direct dependencies.
            print('false data: transitive dependency with no parent pointer in: ' + app + ' lib: ' + name)
            myList[name] = AnyNode(digest=name, filename=dep.get('filename'), scope=dep.get('scope'), vulnerabilities=getVulnerabilitiesForLib(name, meta_total_vulnerability_count, meta_total_vulnerable_libs), parent=root)
        if (dep.get('transitive') == False) and str(dep.get('parent.digest')) == 'null':
            myList[name] = AnyNode(digest=name, filename=dep.get('filename'), scope=dep.get('scope'), vulnerabilities=getVulnerabilitiesForLib(name, meta_total_vulnerability_count, meta_total_vulnerable_libs), parent=root)
        else:
            if str(dep.get('parent.digest')) in myList:

                myList[name] = AnyNode(digest=name, filename=dep.get('filename'), scope=dep.get('scope'), vulnerabilities=getVulnerabilitiesForLib(name, meta_total_vulnerability_count, meta_total_vulnerable_libs), parent=myList[dep.get('parent.digest')])
            else:
                noParentsYet.append(dep)

    maxIter = 10000 # len(noParentsYet)
    while (noParentsYet != [] and maxIter != 0):

        dep = noParentsYet.pop(0)
        name = dep.get('digest')
        if str(dep.get('parent.digest')) in myList:
            myList[name] = AnyNode(digest=name, filename=dep.get('filename'), scope=dep.get('scope'), vulnerabilities=getVulnerabilitiesForLib(name, meta_total_vulnerability_count, meta_total_vulnerable_libs), parent=myList[dep.get('parent.digest')])
        else:
            noParentsYet.append(dep)

        maxIter = maxIter - 1
    if noParentsYet != []:
        print('no matching parent dependencies in: ' + root.app_gav + ' added dependency as \'direct\'')

    for pre, _, node in RenderTree(root):
        try:
            if node.name:
                print("%s%s" % (pre, node.name))
        except :
            pass

        try:
            if node.gav:
                print("%s%s" % (pre, node.gav))
        except :
            pass
        try:
            if node.digest:
                print("%s%s" % (pre, node.digest))
        except:
            pass
    meta = add_meta_data(len(meta_total_vulnerability_count), len(meta_total_vulnerable_libs), meta_total_dependencies_count, meta_scopes)
    root.meta_data= meta # append an key/value pair to the
    exporter = DictExporter()
    jsonTree = exporter.export(root)
    print(jsonTree)
    return jsonTree

def getVulnerabilitiesForLib(digest, vulnerability_count, vulnerability_count_distinct):
    global df_vulnerabilities

    vulnerabilities_in_dep = df_vulnerabilities.loc[df_vulnerabilities['dependencies.digest'] == digest, ['cve', 'cvssScore', 'cvssVector', 'cvssVersion', 'description']]
    vulnerabilities_in_dep = vulnerabilities_in_dep.drop_duplicates()
    ret_list =  vulnerabilities_in_dep.to_dict(orient='records')
    if ret_list: #[] => False, [1] => True
        vulnerability_count_distinct.append(ret_list) #TODO: re-write in a better way. (maybe use enumerate)
        for vul in ret_list:
            vulnerability_count.append(vul)
    return ret_list




def add_meta_data(total_vulnerabilities, total_vulnerable_dependencies,  total_dependencies, scopes_statistic: dict):
    ret= {
        'count_dependencies': total_dependencies,
        'dependency_scope_statistics': scopes_statistic,
        'count_vulnerabilities': total_vulnerabilities,
        'count_vul_dependencies': total_vulnerable_dependencies,

    }
    return ret
