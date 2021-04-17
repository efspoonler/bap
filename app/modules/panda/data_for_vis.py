import pandas as pd
import pickle

### TODO: should this be put in a new function - create new functions for application and vulnerability data.
### TODo: refactor filename after reorganization of this file.
### TODO: for speeding up the script - use threads. (nice to have...)

rawData = []
df = pd.DataFrame()
df_dependencies = pd.DataFrame()
df_vulnerabilities = pd.DataFrame()
df_apps_with_deps = pd.DataFrame()


# This needs to be done, because json cannot handle NaN or None values. It just knows (and accepts inside the browser) null values.
def replaceNoneAndNaNValues(dataframe):
    dataframe.fillna('null', inplace=True)
    return dataframe


# load pickle file and create dataFrames from these data.
def create_visualization_pickle_files():
    global df_dependencies, rawData, df_vulnerabilities, df_apps_with_deps

    rawData = pd.read_pickle('./app/static/pickleFiles/picklefile_all_apps_with_deps_and_vulndeps', compression='infer')

    #create DataFrames based on the rawData
    df_apps = pd.json_normalize(rawData, meta=['id'])[
        ['id', 'gav', 'appIsVulnerable']]  # ignore the dependencies by selecting just the three rows.
    replaceNoneAndNaNValues(df_apps)

    df_dependencies = pd.json_normalize(rawData, record_path='dependencies', meta=['id'])[
        ['id', 'digest', 'libId', 'filename', 'scope', 'transitive', 'parent.digest', 'parent.libId']]
    replaceNoneAndNaNValues(df_dependencies)
    df_vulnerabilities = \
        pd.json_normalize(rawData, record_path=['dependencies', 'vulnerabilties'],
                          meta=['id', ['dependencies', 'digest']])[
            ['id', 'dependencies.digest', 'cve', 'cvssScore', 'cvssVector', 'cvssVersion', 'description']]
    replaceNoneAndNaNValues(df_vulnerabilities)

    df_apps_with_deps = df_apps.merge(df_dependencies, how='inner',
                                      on='id')  # left join. All rows from the left dataframe are present if NaN if an app has no dependeicies. With an inner-join apps with noo dependencies are ignored.
    replaceNoneAndNaNValues(df_apps_with_deps)
    #
    ###Loading of the pickle-file + creation of the different dataframes is done.



    #
    #
    #
    #
    #
    #
    ### visualization_applications START ###
    #
    all_vulnerable_apps_by_ids = df_apps.loc[df_apps['appIsVulnerable'] == True, 'id'].tolist()
    visualization_applications = [] # this list gets written to the pickle file.
    for indx, vulnerable_app_id in enumerate(all_vulnerable_apps_by_ids):
         print(indx)
         gav = df_apps.loc[df_apps['id'] == vulnerable_app_id, 'gav'].to_list()[0]
         vulnerability_list = []
         vulnerable_libraries: list = []
         dict_of_libs = df_apps_with_deps.loc[df_apps_with_deps['id'] == vulnerable_app_id, ['digest', 'scope', 'transitive']].to_dict(orient='records') #
         #loop over each dependecy of an application and check which one contains a vulnerability.
         for potentially_vulnerable_lib in dict_of_libs:
             digest = potentially_vulnerable_lib['digest']
             vulas_in_lib =getVulnerabilitiesForLib(digest) #returns a list of dicts, where each entry is one vulnerability. Empty iff no vulnerability in that library was detected.

             if len(vulas_in_lib) > 0: # at least one vulnerability was detected
                 for vulnerability in vulas_in_lib: #add it to the vulnerability list
                     vulnerability_list.append(vulnerability)
                 vulnerable_libraries.append(potentially_vulnerable_lib) # just vulnerable libraries are added to the final json.


         application_dict = {
             'gav': gav,
             'vulnerable_libraries': vulnerable_libraries,
             'contained_vulnerabilities': vulnerability_list,
             'meta': {
                 'total_numb_of_libraries': len(dict_of_libs),
                 'numb_of_vulnerable_libraries': len(vulnerable_libraries),
                 'numb_of_vulnerabilities_in_app': len(vulnerability_list)
             }
         }

         print(application_dict)
         visualization_applications.append(application_dict)

    filename = "visualization_applications"
    path = "./app/static/pickleFiles/"
    outfile = open(path + filename, "wb")

    pickle.dump(visualization_applications, outfile)
    outfile.close()
    ### visualization_applications END ###
    #
    #
    #
    #
    ### visualization_libraries START ###
    to_vis_libs = []
    list_of_lib_digests_and_libid = df_dependencies.drop_duplicates(subset=["digest"])[['digest', 'libId']]
    list_of_lib_digests = list_of_lib_digests_and_libid['digest']
    just_for_print = len(list_of_lib_digests)
    for indx, lib_digest in enumerate(list_of_lib_digests):
        print(f'position: {indx} of {just_for_print}')
        vulnerabilities_in_lib = getVulnerabilitiesForLib(lib_digest)
        if vulnerabilities_in_lib:  # if the lib hasa deteced vulnerability
            list_of_apps = getAppsForLib(lib_digest)

            lib_id = list_of_lib_digests_and_libid.loc[
                         list_of_lib_digests_and_libid['digest'] == lib_digest, 'libId'].tolist()[0]  # strange way. Get current lib_id as a string.
            lib = {
                'libDigest': lib_digest,
                'libId': lib_id,
                'contained_vulnerabilities': vulnerabilities_in_lib,
                'affected_apps': list_of_apps,
                'meta': {
                    'numb_of_affected_apps': len(list_of_apps),
                    'numb_of_contained_vulnerabilities': len(vulnerabilities_in_lib)
                }}
            print(lib)
            to_vis_libs.append(lib)

    filename = "visualization_libraries"
    path = "./app/static/pickleFiles/"
    outfile = open(path + filename, "wb")

    pickle.dump(to_vis_libs, outfile)
    outfile.close()
    ### visualization_libraries END###
    #
    #
    #
    #
    #
    ### unique cves doesn't match the unique cves in the database... FUUUCKKKAAAAA!
    ### where is the problem?
    ### unique cves in applications dependencies registered by me: 463
    ### in the database: 485 (see screenshot) - Eclipse Steady API problem!? see pickler/pickle_errors.txt
    ### print(len(df_vulnerabilities['cve'].unique())) #Problem: the view definied in the db (see screenshots) detects ~15 more unique vulnerabilitites. But the Eclipse Steady api replies with an 500 error for some applications (also in the eclipse steady app - see file pickler/pickle_errors.txt) these could include the missing vulnerabilities!
    #
    #
    #
    #
    ### visualization_vulnerabilities START ###
    all_cves = df_vulnerabilities['cve'].unique()
    vis_applications = pd.read_pickle('./app/static/pickleFiles/visualization_applications',
                                      compression='infer')  # open pickle file.
    visualization_vulnerabilities = []  # this list will be saved to disc.
    for indx, cve in enumerate(all_cves):
        # print(indx)

        affected_apps = []  # saves all applications that detected a certain vulnerability.
        affected_libs = df_vulnerabilities.loc[df_vulnerabilities['cve'] == cve, 'dependencies.digest'].tolist()

        for app in vis_applications:
            contained_vulnerabilities = app["contained_vulnerabilities"]
            for vulnerability in contained_vulnerabilities:
                if vulnerability['cve'] == cve:
                    affected_apps.append(app['gav'])

        df_cve = df_vulnerabilities.loc[
            df_vulnerabilities['cve'] == cve, ['cve', 'cvssScore', 'cvssVector', 'cvssVersion',
                                               'description']].drop_duplicates()  # df_cve is a one row, dataframe.
        cve_data = df_cve.iloc[
            0].to_dict()  # iloc[0] -> transfrom datafram to a series. THis series can be converted to a dict.

        cve_data['affected_applications'] = affected_apps
        cve_data['affected_libraries'] = affected_libs
        meta = {
            'numb_of_affected_libraries': len(affected_libs),
            'numb_of_affected_applications': len(affected_apps)
        }
        cve_data['meta'] = meta

        visualization_vulnerabilities.append(cve_data)
        ### end of loop ###

    filename = "visualization_vulnerabilities"
    path = "./app/static/pickleFiles/"
    outfile = open(path + filename, "wb")

    pickle.dump(visualization_vulnerabilities, outfile)
    outfile.close()
    ### visualization_vulnerabilities END ###
    #
    #
    #
    #
    #
    return 'done creating files at: static/pickleFiles/visualization_*'



def getVulnerabilitiesForLib(digest):
    global df_vulnerabilities

    vulnerabilities_in_dep = df_vulnerabilities.loc[
        df_vulnerabilities['dependencies.digest'] == digest, ['cve', 'cvssScore', 'cvssVector', 'cvssVersion']]

    vulnerabilities_in_dep = vulnerabilities_in_dep.drop_duplicates()
    ret_list = vulnerabilities_in_dep.to_dict(orient='records')

    return ret_list


# retunrs a list of apps that depend on the given library
def getAppsForLib(digest):
    global df_apps_with_deps
    df_apps_depend_on_lib = df_apps_with_deps.loc[df_apps_with_deps['digest'] == digest, 'gav']

    ret_list = df_apps_depend_on_lib.unique().tolist()  # df_apps_depend_on_lib.tolist()

    return ret_list


def add_meta_data(total_vulnerabilities, total_vulnerable_dependencies, total_dependencies, scopes_statistic: dict):
    ret = {
        'count_dependencies': total_dependencies,
        'dependency_scope_statistics': scopes_statistic,
        'count_vulnerabilities': total_vulnerabilities,
        'count_vul_dependencies': total_vulnerable_dependencies,
    }
    return ret
    

