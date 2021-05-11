from app.cache import cache  # import cache to work with blueprints
from flask import make_response, jsonify, Blueprint, stream_with_context, Response, request
from .data_processing import reorder_entities, get_connected_entities, init_vis

lib_view_blueprint = Blueprint('lib_view_blueprint', __name__)
cacheTimeout = 36000


@lib_view_blueprint.route('/vis/lib/init')
@cache.cached(timeout=cacheTimeout)
def init_lib_model():
    ret = init_vis('lib')
    return jsonify(ret)


@lib_view_blueprint.route('/vis/lib')
@cache.cached(timeout=cacheTimeout)
def order_apps():
    
    ordering = request.args.get('ordering')
    ret = reorder_entities('lib', ordering, 'AUSFÜLLEN')
    return jsonify(ret)


@lib_view_blueprint.route('/vis/lib/clicked')
def get_entity_infromation():
    digest = request.args.get('id')
    ret = get_connected_entities('lib', digest)
    #ret_no_duplicates = {k:list(dict.fromkeys(valuesList)) for k, valuesList in ret.items()}
    return jsonify(ret)   