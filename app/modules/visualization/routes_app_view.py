from app.cache import cache  # import cache to work with blueprints
from flask import make_response, jsonify, Blueprint, stream_with_context, Response, request
from .data_processing import reorder_entities, get_connected_entities, init_vis

app_view_blueprint = Blueprint('app_view_blueprint', __name__)
cacheTimeout = 36000


@app_view_blueprint.route('/vis/app/init')
@cache.cached(timeout=cacheTimeout)
def init_app_model():
    ret = init_vis('app')

    return jsonify(ret)


@app_view_blueprint.route('/vis/app/clicked')
def get_entity_infromation():
    gav = request.args.get('id')
    ret = get_connected_entities('app', gav)
    #ret_no_duplicates = {k:list(dict.fromkeys(valuesList)) for k, valuesList in ret.items() }
    return jsonify(ret)    


@app_view_blueprint.route('/vis/app')
@cache.cached(timeout=cacheTimeout)
def order_apps():
    
    ordering = request.args.get('ordering')
    ret = reorder_entities('app', ordering, 'AUSFÜLLEN')
    return jsonify(ret)


