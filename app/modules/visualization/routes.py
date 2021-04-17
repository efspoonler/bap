from app.cache import cache  # import cache to work with blueprints
from flask import make_response, jsonify, Blueprint, stream_with_context, Response, request
#import json
#from data_processing import init_vis
from .data_processing import init_vis, severityFilterInit #, get_artifacts_by_specific_cvssscore
from .filter import add_filter
#import data_processing as dp

vis_blueprint = Blueprint('vis_blueprint', __name__)
cacheTimeout = 36000


# @vis_blueprint.route('/vis/init')
# @cache.cached(timeout=cacheTimeout)
# def send_visualization_files():
#     ret = init_vis()
#     return jsonify(ret)


@vis_blueprint.route('/vis/filter/severityfilterinit')
def init_severity_filter():
    print('init severity route found')
    ret = severityFilterInit()
    print(ret)
    return jsonify(ret)


# @vis_blueprint.route('/vis/filter/byseverity')
# def get_entities_by_cvssscore():
#     score = request.args.get('cvssScore')
#     viewId = request.args.get('callingView')
#     print('view called byseverity filter:  ' + viewId)
#     #get_artifacts_containing_at_least_one_vulnerability_with_this_severity
#     retListOfIds = get_artifacts_by_specific_cvssscore(viewId, score)
#     #print(ret)
#     #ret_no_duplicates = {k:list(dict.fromkeys(valuesList)) for k, valuesList in ret.items()}
#     return jsonify(retListOfIds)   


@vis_blueprint.route('/vis/filter/add')
#Note: each change to a filter triggers a recalculation of the filterd data which is returned.
def set_new_filter():
    all_args = request.args.to_dict() #all args as a Dict.
    filter_name = all_args.pop('filter') #removes the key/value pair -> returns the removed value.
    params = all_args

    print(f'GET request to add filter: {filter_name} with parameters: {params}')
    
    returnret = add_filter(filter_name, params)
    
    return returnret
    #print(ret)
    #ret_no_duplicates = {k:list(dict.fromkeys(valuesList)) for k, valuesList in ret.items()}
    #return jsonify(retListOfIds)   
 

