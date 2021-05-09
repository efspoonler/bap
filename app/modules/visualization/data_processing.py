import pandas as pd
from typing import TypeVar, List, Dict
import numpy as np

pandasDataFrame = TypeVar('pandas.core.frame.DataFrame')
global app_dataFrame, lib_dataFrame, vula_dataFrame


def load_app_forest():
  apps_json: List = pd.read_pickle('./app/static/pickleFiles/app_forest', compression='infer') # json
  print(apps_json) 

def load_pickle_files():
    global app_dataFrame, lib_dataFrame, vula_dataFrame
    print('load pickle files')   
    apps_json: List = pd.read_pickle('./app/static/pickleFiles/visualization_applications', compression='infer') # json
    libs_json: List = pd.read_pickle('./app/static/pickleFiles/visualization_libraries', compression='infer') # json
    vulas_json: List = pd.read_pickle('./app/static/pickleFiles/visualization_vulnerabilities', compression='infer') # json
    
    app_df: pandasDataFrame = pd.json_normalize(apps_json, meta=['gav'])
    lib_df: pandasDataFrame = pd.json_normalize(libs_json, meta=['gav'])
    vula_df: pandasDataFrame = pd.json_normalize(vulas_json, meta=['gav'])

    vula_df.replace('', 'null', inplace = True)
    
    vula_df['cvssScore'] = vula_df['cvssScore'].replace("null", "0.0").astype(float)# seet null -> 10 to enforce a worst case approach.

    #In die containdVulnerabilitites absteigen und cvssScore ändern!!
    #lib_df.replace('', 'null', inplace = True) #needed, since we work with regex in some filters.

    # Todo sort first by Cvssscor verison
    #
    # -> see output: null and '' both should be null
    # 3.0 and 
    #
    #

    app_df.rename(columns = {'meta.numb_of_vulnerable_libraries':'meta_vul_libs', 'meta.numb_of_vulnerabilities_in_app':'meta_vulas', 'meta.total_numb_of_libraries':'meta_numb_libs'
                            }, inplace = True)  # It is important to remove '.' in all column names. Eslint enforces the 'Require Dot Notation' rule.
    
    lib_df.rename(columns = {'meta.numb_of_affected_apps':'meta_affected_apps', 'meta.numb_of_contained_vulnerabilities':'meta_vulas'}, inplace=True)
    vula_df.rename(columns = {'meta.numb_of_affected_libraries':'meta_affected_libs', 'meta.numb_of_affected_applications':'meta_affected_apps'},inplace=True)
    '''
    apps_vul_libs_df: pandasDataFrame = pd.json_normalize(apps_json, record_path=['vulnerable_libraries'], meta=['gav'])
    apps_containd_vul: pandasDataFrame = pd.json_normalize(apps_json, record_path='contained_vulnerabilities', meta=['gav'])
    apps_info_df: pandasDataFrame = pd.json_normalize(apps_json, meta=['gav'])[['gav', 'meta.numb_of_vulnerabilities_in_app', 'meta.numb_of_vulnerable_libraries', 'meta.total_numb_of_libraries']] #, 'meta.numb_of_vulnerable_libraries', 'meta.numb_of_vulnerabilities_in_app']

    tes_df = apps_info_df.merge(apps_containd_vul, on='gav')
    test_2 = tes_df.merge(apps_vul_libs_df, on='gav') 
    '''
    app_dataFrame = app_df.copy(deep=True)
    lib_dataFrame = lib_df.copy(deep=True)
    vula_dataFrame = vula_df.copy(deep=True)
    return [app_df, lib_df, vula_df]

def init_vis(callingModel, load_pickle_files=False):
    global app_dataFrame, lib_dataFrame, vula_dataFrame

    if (load_pickle_files):
         app_df, lib_df, vul_df = load_pickle_files()
    
    if (callingModel == 'app'):
         print('init_vis_apps')
         calcAvgSeverity(app_dataFrame, 'app') 
         app_df = app_dataFrame.copy(deep=True)

         app_data = app_df[['gav', 'avg_severity', 'meta_vulas']].copy() #'cvssVersion'
         app_tooltip = app_df[['gav','meta_numb_libs', 'meta_vul_libs', 'meta_vulas', 'min_cvssScore', 'avg_severity', 'max_cvssScore' ]].copy()
         app_tooltip['name'] = app_tooltip['gav']
         app_tooltip.rename(columns = {'gav': 'id'}, inplace = True)

         app_data.sort_values(by=['avg_severity', 'gav'], inplace=True)
         app_data.rename(columns = {'avg_severity':'color', 'gav':'id'}, inplace = True)
         #normalizeColumnsLog(app_df)
         init_data: Dict = app_data.to_dict(orient='records')
        
         app_tooltip.set_index('id', inplace=True)
         init_tooltip: Dict = app_tooltip.to_dict(orient = 'index')
    
    elif (callingModel == 'lib'):
         print('init_vis_libs')
         calcAvgSeverity(lib_dataFrame, 'lib') 
         lib_df =lib_dataFrame.copy(deep=True) 
         lib_init_data_df = lib_df[['libDigest', 'avg_severity', 'meta_vulas' ]].copy() #libDigest
         lib_tooltip_df = lib_df[['libDigest',  'libId',  'meta_affected_apps', 'meta_vulas', 'avg_severity', 'min_cvssScore',
       'max_cvssScore']].copy()
         

         # the libId is not unique! --> see: print(lib_tooltip_df[lib_tooltip_df.duplicated(['id'], keep=False)]['id'])
         #hence we cannot use it as our index.
         lib_tooltip_df.rename(columns={'libDigest': 'id', 'libId': 'name'}, inplace=True)
         lib_tooltip_df.set_index('id', inplace=True)

         lib_init_data_df.sort_values(by=['avg_severity', 'libDigest'], inplace=True)
         lib_init_data_df.rename(columns = {'avg_severity': 'color', 'libDigest': 'id'}, inplace = True)
         #normalizeColumnsLog(lib_df)
         init_data: Dict = lib_init_data_df.to_dict(orient='records')
         init_tooltip: Dict = lib_tooltip_df.to_dict(orient = 'index')

    elif (callingModel == 'vul'):
         '''
          Incomplete Data
          With some vulnerabilities, all of the information needed to create CVSS scores may not be available.
          This typically happens when a vendor announces a vulnerability but declines to provide certain details.
          In such situations, NVD analysts assign CVSS scores using a worst case approach.
          Thus, if a vendor provides no details about a vulnerability, NVD will score that vulnerability as a 10.0 (the highest rating).    
         '''
         print('init_vis_vulas')
         
         vula_dataFrame['cvssScore'] = vula_dataFrame['cvssScore'].replace("null", "0.0").astype(float) # seet null -> 10 to enforce a worst case approach.
         vul_df =vula_dataFrame.copy(deep=True) 
         vul_init_tooltip = vul_df[['cve','cvssScore', 'cvssVector', 'cvssVersion', 'description', 'meta_affected_apps']].copy()
         vul_df = vul_df[['cvssScore', 'cve']]
         vul_df.sort_values(by=['cvssScore', 'cve'], inplace=True ) # ['cvssVersion', 'cvssScore' ]
         vul_df.rename(columns={'cvssScore': 'color', 'cve': 'id'}, inplace = True)
         vul_init_tooltip['name'] = vul_init_tooltip['cve']
         vul_init_tooltip.set_index('cve', inplace=True)
         #TODO: atm I ignore that not every vulnerability has a cvssScore. maybe filter these values? mark them in the vis.
         #normalizeColumns(vul_df)

         
         init_data: Dict = vul_df.to_dict(orient='records')
         init_tooltip: Dict = vul_init_tooltip.to_dict(orient='index')#app_tooltip_df(orient = 'records')
    else:
         print(f'error: could not find callingModel: {callingModel}')
    return {'data': init_data, 'tooltip': init_tooltip} 

def reorder_entities(viewId: str, current_data: List[str], orderBy: str) -> Dict: 
   df:pandasDataFrame = get_data_frame(viewId)
   df.sort_values(by='gav', inplace=True)
   df.rename(columns={ 'gav': 'id'}, inplace = True)
   return df.to_dict(orient='records')

''' return a deep copy of the respective dataframe '''
def get_data_frame(viewId:str) -> pandasDataFrame:
   global app_dataFrame, lib_dataFrame, vula_dataFrame
   if (viewId == 'app'):
      return app_dataFrame.copy(deep=True) 
   elif (viewId == 'lib'):
      return lib_dataFrame.copy(deep=True) 
   elif (viewId == 'vul'):
      return vula_dataFrame.copy(deep=True) 
   else:
      print('viewId does not fit any given ID in get_data_frame')
      return -1


'''
Calculates and adds the average severity of an lib and application. The avg value gets added to the Dataframe under meta.avg_severity.
'''
def calcAvgSeverity(df: pandasDataFrame, view:str):
    print(df)
    avg_severity: List = []
    for indx, row in df.iterrows():
        
      if(view == 'app' or view == 'lib'):
        temp_df = pd.DataFrame((row['contained_vulnerabilities']))
        temp_df['cvssScore'].replace('null', 0, inplace=True) #vulnerabilitites that do not have a cvssScore are ranked with 10/Critical.
        avg_severity = temp_df[["cvssScore"]].mean() 
        df.loc[indx,['avg_severity']]  = avg_severity.get(key = 'cvssScore')
        
        min_severity = temp_df[["cvssScore"]].min()
        df.loc[indx,['min_cvssScore']]  =min_severity.get(key = 'cvssScore')

        max_severity = temp_df[["cvssScore"]].max()
        df.loc[indx,['max_cvssScore']]  = max_severity.get(key = 'cvssScore')
      elif(view =='vul'):
        temp_df = pd.DataFrame((row['contained_vulnerabilities']))
        temp_df['cvssScore'].replace('null', 0, inplace=True) #vulnerabilitites that do not have a cvssScore are ranked with 10/Critical.



def get_connected_entities(calling_view:str, id:str, intersection=False):
    global app_dataFrame, lib_dataFrame, vula_dataFrame
    
    if calling_view == 'app':
      row = app_dataFrame.loc[app_dataFrame['gav'] == id]
      lib_ids = []
      vul_ids = []
      vul_libraries = row['vulnerable_libraries'].values[0]#.tolist()
      for lib in vul_libraries:
          lib_ids.append(lib['digest'])

      for vulnerability in row['contained_vulnerabilities'].values[0]:
          vul_ids.append(vulnerability['cve'])

      ret = {'lib': lib_ids, 'vul': vul_ids}

    if calling_view == 'lib':
        row =  lib_dataFrame.loc[lib_dataFrame['libDigest'] == id]
        app_ids=[]
        vul_ids=[]
        app_ids =    row['affected_apps'].values[0]
        for vulnerability in row['contained_vulnerabilities'].values[0]:
          vul_ids.append(vulnerability['cve'])
        ret = {'app': app_ids, 'vul': vul_ids}
    if calling_view == 'vul':
        row = vula_dataFrame[vula_dataFrame['cve'] == id]
        app_ids = row['affected_applications'].values[0] 
        lib_ids = row['affected_libraries'].values[0]
        ret = {'app': app_ids, 'lib': lib_ids}
    return ret


def severityFilterInit():
  global app_dataFrame, lib_dataFrame, vula_dataFrame
  allVulas = app_dataFrame.loc[:,['contained_vulnerabilities']].to_dict()
  scores = []
  allVulas = allVulas['contained_vulnerabilities']
  #print(allVulas)
  for key in allVulas:
    #print(key) 
    for val in allVulas[key]:
      #print(val)
      currentVal = val['cvssScore']
      if currentVal == 'null':
        scores.append(0)
      else:
        scores.append(currentVal)

  arrayScores = np.array(scores, dtype='float64')
  arrayBins= np.array(scores, dtype='int64')
  unique, counts = np.unique(arrayScores, return_counts=True)
  # json does not recognize NumPy data types. need to convert nupmpy.int64 to int.
  # the method xxx.tolist() is almost the same as list(xxx), except that tolist changes numpy scalars to Python scalars
  # before tha, counts contains int64 types.
  granularBins = dict(zip(unique, counts.tolist())) 
  bins = np.bincount(arrayBins).tolist()#same same - cahnge datatypes to int.

  # create suitable datastructure for the vis.
  # the index coresponds to the cvssScore!
  #[
  #  [
  #     int (total number of found vulnerabilities that fall into the range (<=index, >inex+1]), 
  #     {object with the detailted distribut} 
  #  ]
  # 
  # ]
  #
  solution = []
  for i in range(11): # we have cvssScores in the interval (0.0, 10)
     temp_obj = {}
     for k,v in granularBins.items(): #granularBins is an object that contains the total number for each exact cvssScore
       
       #collect all data relevant for the current bin. i.e. in bin '2' (at index 2) we collect the detailed information
       # for all cvssScores that are greater-equal 2 and smaller 3. (2.0, 2.1, 2.3, ..., 2.9) 
       if int(k) >= i and int(k) < i+1:  
        temp_obj[k] = v
     solution.append([ bins[i], temp_obj, i])

  return solution 

# maybe useful.
# def normalizeColumns(df: pandasDataFrame) -> pandasDataFrame:
#     df_num: pandasDataFrame = df.select_dtypes(include=[np.number])
#     df_norm = (df_num - df_num.min()) / (df_num.max() - df_num.min())
#     df[df_norm.columns] = df_norm
#     return df


# def normalizeColumnsLog(df: pandasDataFrame) -> pandasDataFrame:
#     df_num: pandasDataFrame = df.select_dtypes(include=[np.number])
#     df_norm = (np.log(df_num) -np.log(df_num.min())) / (np.log(df_num.max()) - np.log(df_num.min()))
#     df[df_norm.columns] = df_norm
#     return df


# filter_function = {

#   'cvssVersion': get_artifacts_by_cvssversion #takes three arguments.
# }
