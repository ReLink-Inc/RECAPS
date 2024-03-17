import atexit

import json

from flask import Flask

from pipeline.pipeline import PipelineManager

app = Flask(__name__)

app.pipeline_manager = PipelineManager()

with open('configs/app_config.json') as config_file:
    app.config.update(json.load(config_file))
# mysql -h localhost -P 3306 --protocol=tcp -u root -p

app.register_blueprint(prop_blueprint)
app.register_blueprint(repository_blueprint)
app.register_blueprint(user_blueprint)
app.register_blueprint(db_blueprint)
app.register_blueprint(file_blueprint)
app.register_blueprint(email_blueprint)
app.register_blueprint(pipeline_blueprint)

db.init_app(app)
mail.init_app(app)


# app.current_sessions = {'claude': {}, 'openai': {}, 'mistral': {}, 'gemini': {}}
# app.history_session_time = {'claude': {}, 'openai': {}, 'mistral': {}, 'gemini': {}}


@app.route('/')
def hello_world():
    return 'Welcome to RECAPS!'


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
