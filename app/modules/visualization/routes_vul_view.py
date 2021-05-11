from app.cache import cache  # import cache to work with blueprints
from flask import make_response, jsonify, Blueprint, stream_with_context, Response, request
from .data_processing import reorder_entities, get_connected_entities, init_vis 

vul_view_blueprint = Blueprint('vul_view_blueprint', __name__)
cacheTimeout = 36000


@vul_view_blueprint.route('/vis/vul/init')
@cache.cached(timeout=cacheTimeout)
def init_vul_model():
    ret = init_vis('vul')
    return jsonify(ret)

@vul_view_blueprint.route('/vis/vul')
@cache.cached(timeout=cacheTimeout)
def order_apps():
    
    ordering = request.args.get('ordering')
    ret = reorder_entities('vul', ordering, 'AUSFÜLLEN')
    return jsonify(ret)


@vul_view_blueprint.route('/vis/vul/clicked')
def get_entity_infromation():
    cve = request.args.get('id')
    ret = get_connected_entities('vul', cve)
    #ret_no_duplicates = {k:list(dict.fromkeys(valuesList)) for k, valuesList in ret.items()}
    return jsonify(ret)   



