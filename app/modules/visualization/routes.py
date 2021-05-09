from app.cache import cache  # import cache to work with blueprints
from flask import make_response, jsonify, Blueprint, stream_with_context, Response, request
from .data_processing import init_vis, severityFilterInit #, get_artifacts_by_specific_cvssscore
from .filter import add_filter, remove_all_filters

vis_blueprint = Blueprint('vis_blueprint', __name__)
cacheTimeout = 36000


@vis_blueprint.route('/vis/filter/severityfilterinit')
def init_severity_filter():
    print('init severity route found')
    ret = severityFilterInit()
    print(ret)
    return jsonify(ret)


@vis_blueprint.route('/vis/filter/add')
#Note: each change to a filter triggers a recalculation of the filterd data which is returned.
def set_new_filter():
    all_args = request.args.to_dict() #all args as a Dict.
    filter_name = all_args.pop('filter') #removes the key/value pair -> returns the removed value.
    params = all_args

    print(f'GET request to add filter: {filter_name} with parameters: {params}')
    
    returnret = add_filter(filter_name, params)
    
    return returnret
 
@vis_blueprint.route('/vis/filter/reset')
#Note: resets all set filters. This is triggered when ever the application is loaded.
def reset_all_filters():
    print(f'reset all filters.')
    returnret = remove_all_filters()
    return returnret