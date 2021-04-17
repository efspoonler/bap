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
        print(f'callingModel: {calling_model} -- function_name: {key} -- params: {value}')
        df_returned = filter_dict[key](calling_model, df, value) #This is where the magic happens.
        print(f'returnd from function_name: {key}')
        df = df_returned
   
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
   return returnIds
       



# cvssVersion
def get_artifacts_by_cvssversion(calling_model:str, df_param, params:Dict ):
  print(f'{calling_model} called -> sget_artifacts_by_cvssversionr: {params}')
  # The passed df is either the app, lib or vul df.
  v2 = params['v2']
  v3 = params['v3']
  
  # Build regex
  myRegex = ''
  #print(f'value v2: {v2} -- v3: {v3}')
  if (v2 == 'true' and v3 == 'true' ):
    # myRegex = '^2 || ^3 || ^null'
    return df_param # all checkboxes are checked. Hence we do not need to modify the df.
  elif v2 == 'true' :
    myRegex = '^2'
  elif v3 == 'true':
    myRegex = '^3'  
  else: # no chckbox selected
    myRegex = '^null' 
  
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
            df_ret = df_param.iloc[select_indices]
      else:
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
    print(f'{calling_model} called -> sort_df_by_column: {criteria}') 
    if calling_model == 'vul':
           criteria = 'cvssScore'
    
    df_ret = df_param.sort_values(by=criteria, inplace=False)
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
           print(f'no app our lib contains this vulnerability version  - seems like there is a Problem.')

  return df_ret


filter_dict = {
    'cvssVersion': get_artifacts_by_cvssversion,
    'color': set_column_as_color,
    'sortBy': sort_df_by_column,
    'severity': get_artifacts_by_specific_cvssscore 
}