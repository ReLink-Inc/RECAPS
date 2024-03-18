from flask import Blueprint
from flask_cors import CORS

pipeline_blueprint = Blueprint('pipeline', __name__, url_prefix='/pipeline')

CORS(pipeline_blueprint)

from server.pipeline import routes  # noqa: E402, F401
