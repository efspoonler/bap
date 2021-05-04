import pandas as pd
from typing import TypeVar, List, Dict
import numpy as np
import re


from .data_processing import get_data_frame


global filter_dict, active_filters

#Todo: srtBy needs to run before color, since color changes the columns name. -
active_filters = {
    
}
sortBy = 'avg_severity'
color = 'avg_severity'

def add_filter(filter_name, parameter_list):
    global active_filters, color, sortBy
    
    print(parameter_list)
    if parameter_list == {}:
        remove_filter(filter_name)
    else:     
        active_filters[filter_name] = parameter_list
    
    return recalc_data()


def remove_filter(filter_name):
   print(f'delete filter {filter_name}')
   if filter_name in active_filters:
      
      del active_filters[filter_name]

def remove_all_filters():
    global filters

    filters = {}
    print('all filters are removed.')


def recalc_data():
   model_list = ['app', 'lib', 'vul']
   ret = {}
   for model in model_list:
       ret[model] = run_filters_on_dataset(model)

   return ret


def run_filters_on_dataset(calling_model:str):
   global filter_dict, active_filters

   modelId = calling_model 
   df = get_data_frame(calling_model) # get the whole df (deep copy). contains all information of the calling_model.

   # -- key == name of the function -- corresponds to the key inside the function_dict, which points to the coressponding function.
   # -- value == parameters -- are the parameters for the -- key -- function.
   for key, value in active_filters.items():
     if not df.empty:
        print(f'\n \n \n {df.empty} \n {not df.empty} \n')
        print(f'callingModel: {calling_model} -- function_name: {key} -- params: {value}')
        df_returned = filter_dict[key](calling_model, df, value) #This is where the magic happens.
        print(f'returnd from function_name: {key}')
        df = df_returned
   if not df.empty: 
      print('alles nomal - df hat rows')
      df = sort_df_by_column(calling_model, df, sortBy)
      df = set_column_as_color(calling_model, df, color)
      returnIds = []
      # each view uses different columns as the id for their objects.
      if modelId == 'app':
         df.rename(columns = {'gav': 'id'}, inplace = True)

      if modelId == 'lib':
          df.rename(columns = {'libDigest': 'id'}, inplace = True)

      if modelId == 'vul':
          df.rename(columns = {'cve': 'id'}, inplace = True)
      
      returnIds = df[['id', 'color']].to_dict(orient='records')
   else:
      returnIds = {}
   return returnIds
       



# cvssVersion
def get_artifacts_by_cvssversion(calling_model:str, df_param, params:Dict ):
  print(f'{calling_model} called -> sget_artifacts_by_cvssversionr: {params}')
  # The passed df is either the app, lib or vul df.
  v2 = params['v2']
  v3 = params['v3']
  noVersion = params['none']
  
  # Build regex
  myRegex = ''
  #print(f'value v2: {v2} -- v3: {v3}')
  if (v2 == 'true' and v3 == 'true' and noVersion == 'true' ):
    # myRegex = '^2 || ^3 || ^null'
    return df_param # all checkboxes are checked. Hence we do not need to modify the df.

  # v2 always true
  elif v2 == 'true' and v3 == 'false' and noVersion=='false':
      myRegex= '^2'  
  elif v2 == 'true' and v3 == 'true' and noVersion=='false':
    myRegex = '^2|^3'
  elif v2 == 'true' and v3 == 'false' and noVersion == 'true':
    myRegex = '^2|^null'
   
  #v3 always true 
  elif v2 == 'false' and v3 == 'true' and noVersion=='false':
    myRegex = '^3'  
  elif v2 == 'false' and v3 == 'true' and noVersion == 'true':
      myRegex = '^3|^null'

  else: # no chckbox selected or just none checkbox.
    myRegex = '^null' 
  

  print(myRegex)
  # vul 
  if calling_model == 'vul':
     #print(df['cvssVersion'].tolist())
     myFilter = df_param.loc[df_param.loc[:,'cvssVersion'].str.contains(fr'{myRegex}')] #, na=False)
     df_ret = myFilter

  # app and lib
  
  if calling_model == 'app' or calling_model == 'lib':
      select_indices=[]
       
      for index, row in df_param.iterrows(): # _ is the index
          # bool decides if the row (aplication or library) contains at least on cve which uses cvssVersion 2.
          #print(index)
          #print(df_param)
          add_index_if_matched = True # This boolean prevents that an index is added multiple times to our select_indices list.
          for cve in row['contained_vulnerabilities']:
              # we could also use re.match -> match starts always at the beginning.
              # We force search to start its search at the beginning by using '^' 
              if re.search(myRegex, cve['cvssVersion'] ) != None and add_index_if_matched: 
                  add_index_if_matched = False
                  select_indices.append(index)
                  break

      #print(select_indices)
      if select_indices: # we found matching rows with our Regex
         df_ret = df_param.loc[select_indices]
      else:
         df_ret = pd.DataFrame()
         print(f'no app our lib contains this vulnerability version {myRegex} - seems like there is a Problem.')
  return df_ret


def set_column_as_color(calling_model: str, df_param, column_name='avg_severity'):
    print(f'{calling_model} called -> set_column_as_color with parameter: {column_name}')
    if calling_model == 'vul':
       if column_name == 'avg_severity':
           column_name = 'cvssScore'
       df_ret = df_param.rename(columns = {column_name:'color'}, inplace = False)
    
    if calling_model == 'app' or calling_model == 'lib': 
       df_ret = df_param.rename(columns = {column_name:'color'}, inplace = False)
    
    return df_ret

def sort_df_by_column(calling_model, df_param, criteria = 'avg_severity'):
    print(df_param.columns)
    print(f'{calling_model} called -> sort_df_by_column: {criteria}') 
    if calling_model == 'vul':
           criteria = 'cvssScore'
           df_ret = df_param.sort_values(by=[criteria, 'cve'], inplace=False)
    
    if calling_model == 'lib':
       df_ret = df_param.sort_values(by=[criteria, 'libDigest'], inplace=False)
    
    if calling_model == 'app':
       df_ret = df_param.sort_values(by=[criteria, 'gav'], inplace=False)
    

    
    return df_ret

def get_artifacts_by_cve_base_vector(calling_model, df_param, params):
  print(f'cveBaseVecotr Function params: {params}')
  # creation of the regex
  # Example: (\/?AV:[N|L]\/?AC:[M].*|null)
  v2 = params['v2'].split(',')
  v3 = params['v3'].split(',')
  print(v2)
  print(v3)

  v2Regex = ""
  v3Regex = ""
  
  regex2Dict={
    'AV': 'A-Z',
    'AC':'A-Z',
    'Au': 'A-Z',
    'C': 'A-Z',
    'I': 'A-Z',
    'A': 'A-Z',
    'PR': 'A-Z',
    'UI': 'A-Z',
    'S': 'A-Z',
  }
  regex3Dict={
    'AV': 'A-Z',
    'AC':'A-Z',
    'Au': 'A-Z',
    'C': 'A-Z',
    'I': 'A-Z',
    'A': 'A-Z',
    'PR': 'A-Z',
    'UI': 'A-Z',
    'S': 'A-Z',
  }
  if len(params['v2']):
    
     for v in v2:
       selected_options = params[v].replace(',','|')
       indexer = re.sub('\d', '', v)  
       regex2Dict[indexer] = selected_options,
       v2Regex = f'AV:[{regex2Dict["AV"]}]/AC:[{regex2Dict["AC"]}]/Au:[{regex2Dict["Au"]}]/C:[{regex2Dict["C"]}]/I:[{regex2Dict["I"]}]/A:[{regex2Dict["A"]}]'
       v2Regex = re.sub('\d', '', v2Regex)
  
  if len(params['v3']):
     for v in v3:
       selected_options = params[v].replace(',','|')
       indexer = re.sub('\d', '', v)  
       regex3Dict[indexer] = selected_options,
       v3Regex = f'AV:[{regex3Dict["AV"]}]/AC:[{regex3Dict["AC"]}]/PR:[{regex3Dict["PR"]}]/UI:[{regex3Dict["UI"]}]/S:[{regex3Dict["S"]}]/C:[{regex3Dict["C"]}]/I:[{regex3Dict["I"]}]/A:[{regex3Dict["A"]}]'
       v3Regex = re.sub('\d', '', v3Regex)
       

  v3Regex = '(CVSS:3.\d/' + v3Regex + '.*|null|^$)' #the ^$ (matches an empty string) should be moved into the data preprocessing.  
  v2Regex = '(' + v2Regex + '.*|null|^$)' #the ^$ (matches an empty string) should be moved into the data preprocessing.  
  
  print(v3Regex)
  print(v2Regex)
  # vul
  if(calling_model == 'vul'):
    df_v2 = pd.DataFrame()
    df_v3 = pd.DataFrame()
    if len(params['v2']): #if the array is not empty
      versionRegex = '^2|null|^$'
      df_filtered_v2 = df_param.loc[df_param['cvssVersion'].str.contains(fr'{versionRegex}', regex=True)]
      df_v2 = df_filtered_v2.loc[df_filtered_v2['cvssVector'].str.contains(f'{v2Regex}', na=False, regex=True, case=False)] #flags=re.IGNORECASE)] #, na=False)
    if len(params['v3']):
      versionRegex = '^3|null|^$' 
      df_filtered_v3 = df_param.loc[df_param['cvssVersion'].str.contains(fr'{versionRegex}', regex=True)]
      df_v3 = df_filtered_v3.loc[df_filtered_v3['cvssVector'].str.contains(f'{v3Regex}', na=False, regex=True, case=False)] #flags=re.IGNORECASE)] #, na=False)
    

    print(df_v2)
    print(df_v3)
    frames = [df_v2, df_v3]
    df_filtered = pd.concat(frames) 
    df_filtered.drop_duplicates(subset=['cve'], inplace=True)
    return df_filtered
  

  # app and lib
  
  if calling_model == 'app' or calling_model == 'lib':
      select_indices = []
      df_v2 = pd.DataFrame()
      df_v3 = pd.DataFrame()
      for index, row in df_param.iterrows(): # _ is the index
          # bool decides if the row (aplication or library) contains at least on cve which uses cvssVersion 2.
          add_index_if_matched = True # This boolean prevents that an index is added multiple times to our select_indices list.
          for cve in row['contained_vulnerabilities']:
              # we could also use re.match -> match starts always at the beginning.
              # We force search to start its search at the beginning by using '^'
              if len(params['v2']):
                 if re.search('^2|null|""', cve['cvssVersion'] ) != None:
                     if re.search(v2Regex, cve['cvssVector'] ) != None and add_index_if_matched: 
                        add_index_if_matched = False
                        select_indices.append(index)
                        break
              if len(params['v3']):
                 if re.search('^3|null|""', cve['cvssVersion'] ) != None:
                     if re.search(v3Regex, cve['cvssVector'] ) != None and add_index_if_matched: 
                        add_index_if_matched = False
                        select_indices.append(index)
                        break
                      

      #print(select_indices)
      if select_indices: # we found matching rows with our Regex
         df_ret = df_param.loc[select_indices]
         if calling_model == 'app':
           df_ret.drop_duplicates(subset=['gav'], inplace=True)
           
         if calling_model == 'lib':
           df_ret.drop_duplicates(subset=['libDigest'], inplace=True)
      else:
         df_ret = pd.DataFrame()
         print(f'no app our lib contains this vulnerability version {myRegex} - seems like there is a Problem.')
  return df_ret






def get_artifacts_by_specific_cvssscore(calling_model, df_param, params):
  
  df_filtered = pd.DataFrame()
  cvssScores = list(params.keys())
  listOfCveIds = []



  

  # vul
  if(calling_model == 'vul'):
    for score in cvssScores:
      #we call the function with GET parameters. These are by default of type str.
      score = int(score)
      #select all rows which fall into the intervall:     cvssScore  <= score < cvssScore+1 
      df_filtered = df_filtered.append(df_param.loc[(df_param['cvssScore'] >= score) & (df_param['cvssScore'] < score+1)])
    return df_filtered
    

  # app and lib
  if calling_model == 'app' or calling_model == 'lib':
    df_vul = get_data_frame('vul')
    select_indices=[]
    for score in cvssScores:
      #we call the function with GET parameters. These are by default of type str.
      score = int(score)
      #select all rows which fall into the intervall:     cvssScore  <= score < cvssScore+1 
      df_filtered = df_filtered.append(df_vul.loc[(df_vul['cvssScore'] >= score) & (df_vul['cvssScore'] < score+1)]) 
      
    listOfCveIds = df_filtered['cve'].tolist()   
    for index, row in df_param.iterrows(): # _ is the index
          # bool decides if the row (aplication or library) contains at least on cve which uses cvssVersion 2.
          add_index_if_matched = True # This boolean prevents that an index is added multiple times to our select_indices list.
          for cve in row['contained_vulnerabilities']:
              # we could also use re.match -> match starts always at the beginning.
              # We force search to start its search at the beginning by using '^' 
              if  add_index_if_matched and cve['cve'] in listOfCveIds: 
                  add_index_if_matched = False
                  select_indices.append(index)

    if select_indices: # we found matching rows with our Regex
       df_ret = df_param.loc[select_indices] # Hier chenaged to loc    

    else:  
       df_ret = pd.DataFrame() #empty dataframe 
       print(f'no app our lib contains this vulnerability version  - seems like there is a Problem.')

  return df_ret



def get_artifacts_with_max_min_cvssscore(calling_model, df_param, params):
  
  df_filtered = pd.DataFrame()
  minScore = float(params['min'])
  maxScore = float(params['max'])
  listOfCveIds = []

  # vul
  if(calling_model == 'vul'):
    #select all rows which fall into the intervall:     cvssScore  <= score < cvssScore+1 
    df_filtered = df_filtered.append(df_param.loc[(df_param['cvssScore'] >= minScore) & (df_param['cvssScore'] < maxScore)])
    return df_filtered
    

  # app and lib
  if calling_model == 'app' or calling_model == 'lib':
    df_vul = get_data_frame('vul')
    select_indices=[]
    df_filtered = df_filtered.append(df_vul.loc[(df_vul['cvssScore'] >= minScore) & (df_vul['cvssScore'] < maxScore)])
      
    listOfCveIds = df_filtered['cve'].tolist()   
    for index, row in df_param.iterrows(): # _ is the index
          # bool decides if the row (aplication or library) contains at least on cve which uses cvssVersion 2.
          add_index_if_matched = True # This boolean prevents that an index is added multiple times to our select_indices list.
          for cve in row['contained_vulnerabilities']:
              # we could also use re.match -> match starts always at the beginning.
              # We force search to start its search at the beginning by using '^' 
              if add_index_if_matched:
                 if isinstance(cve['cvssScore'], float):
                    if cve['cvssScore'] >= minScore and cve['cvssScore'] <= maxScore: 
                       pass
                    else:
                       #the app or lib is ignored.
                       add_index_if_matched = False
          
          if add_index_if_matched:
             select_indices.append(index)

    if select_indices: # we found matching rows with our Regex
       df_ret = df_param.loc[select_indices] # Hier chenaged to loc    

    else:  
       df_ret = pd.DataFrame() #empty dataframe 
       print(f'no app our lib contains this vulnerability version  - seems like there is a Problem.')

  return df_ret


filter_dict = {
    'cvssVersion': get_artifacts_by_cvssversion,
    'color': set_column_as_color,
    'sortBy': sort_df_by_column,
    'severity': get_artifacts_by_specific_cvssscore, 
    'baseVector': get_artifacts_by_cve_base_vector,
    'rangeSlider': get_artifacts_with_max_min_cvssscore
}