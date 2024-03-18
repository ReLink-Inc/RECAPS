import threading

from flask import current_app, request, jsonify

from server.pipeline import pipeline_blueprint
from server.pipeline.example_pipeline import ExamplePipeline

@pipeline_blueprint.route('/example', methods=['POST'])
def launch_pipeline():
    data = request.json
    pdf_path = data["pdf_path"]
    pipeline = ExamplePipeline(pdf_path)
    current_app.pipeline_manager.add_pipeline(pipeline)
    pipeline.run_async()
    current_app.pipeline_manager.check_and_remove_inactive_pipelines(current_app.config['pipeline_remove_after'])

    return jsonify({"id": pipeline.pipeline_id}), 200

@pipeline_blueprint.route('/<pipeline_id>', methods=['GET'])
def get_pipeline_status(pipeline_id):
    pipeline = current_app.pipeline_manager.get_pipeline(pipeline_id)
    if pipeline is None:
        return "Pipeline not found", 404
    return jsonify(pipeline.get_status()), 200
