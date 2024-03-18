import threading

from server.pipeline.agent_pipeline import AgentPipeline

from functools import partial


class ExamplePipeline(AgentPipeline):
    def __init__(self, example_user_string):
        super().__init__()
        self.example_user_string = example_user_string
        self.example_outputs = []
        self.consolidated_example = {}
        self.consolidation_status_lock = threading.Lock()
        self.finished_consolidating_example = False

    def example_prompt(self, example_additional_arg):
        return "Echo any user string with {\"user\": <user input>}", example_additional_arg + self.example_user_string

    def run(self):
        example_additional_arg = "Additional content "
        if not self.await_response_parallel('claude-3-haiku-20240307', [partial(self.example_prompt, example_additional_arg)],
                                            self.example_outputs, flags="Example Stage"):
            return
        self.finish()

    def consolidate_example(self):
        # Lock is used to prevent other threads invoked by pipeline.get_status() from entering this section,
        # which may cause partial changes to the global state
        with self.consolidation_status_lock:
            # 1. check if the example has finished consolidation
            # 2. check if we have entered the example stage yet
            if self.finished_consolidating_example or not self.check_flag_ever_raised("Example Stage"):
                return
            if self.check_completed_flag("Example Stage"):
                self.finished_consolidating_example = True
            example_output_json = self.parse_json(self.example_outputs[0], "Example Stage")
            self.consolidated_example = example_output_json

    def consolidate_data(self):
        try:
            self.consolidate_example()
            return {"example_field": self.consolidated_example}
        except Exception as e:
            self.abort_all(e)
