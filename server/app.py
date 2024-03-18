import json

from flask import Flask

from server.pipeline.pipeline import PipelineManager
from server.pipeline import pipeline_blueprint

app = Flask(__name__)

app.pipeline_manager = PipelineManager()

with open('server/configs/app_config.json') as config_file:
    app.config.update(json.load(config_file))
# mysql -h localhost -P 3306 --protocol=tcp -u root -p

app.register_blueprint(pipeline_blueprint)


@app.route('/')
def hello_world():
    return 'Welcome to RECAPS!'


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
