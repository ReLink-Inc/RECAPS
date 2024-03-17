import threading
import traceback
from abc import ABC

from server.pipeline.pipeline import BasePipeline
from server.llm.agent import Agent, AgentTask
from server.llm.utils import parse_llm_json


class AgentPipeline(BasePipeline, ABC):
    def __init__(self):
        super().__init__()
        self._tasks = []
        self._event_flags = {'finished': 0, 'error_free': True}
        self._event_cond = threading.Condition(lock=threading.Lock())

    def _wait_for_all_or_any_error(self, tasks: list[AgentTask], dependency_dict, flags=None):
        self._event_flags = {'finished': 0, 'error_free': True}

        def task_waiter(task: AgentTask, idx: int, dependencies: list[int]):
            for dependent_task_idx in dependencies:
                tasks[dependent_task_idx].wait()
            with self._event_cond:
                if not self._event_flags['error_free']:
                    return
            if flags:
                self.raise_flag(flags[idx])

            task.run()  # No need to create a separate thread with .start() .wait() and .join()

            with self._event_cond:
                self._event_flags['finished'] += 1  # Indicate that some condition was triggered
                if task.output_control.error:
                    if flags:
                        self.raise_error(f"{flags[idx]}: {task.output_control.error}")
                        self.log_error(f"{flags[idx]}: {task.output_control.error}", task.output_control)
                    self._event_flags['error_free'] = False
                if flags:
                    self.archive_flag(flags[idx])
                self._event_cond.notify()  # Wake up the main thread

        # Start a thread for each condition
        task_waiters = []
        with self._event_cond:
            for i, task in enumerate(tasks):
                t = threading.Thread(target=task_waiter,
                                 args=(task, i, dependency_dict.get(i, [])))
                task_waiters.append(t)
                t.start()

            while self._event_flags['finished'] != len(tasks) and self._event_flags['error_free']:
                self._event_cond.wait()  # Wait until some condition is triggered
        if not self._event_flags['error_free']:
            for task in tasks:
                task.abort()
        for task_waiter in task_waiters:
            task_waiter.join()
        return self._event_flags['error_free']

    def await_response_parallel(self, model_names, prompt_generators, output_controls, dependencies=None, flags=None):
        # NOTE: this function is not thread-safe
        if dependencies is None:
            dependencies = {}
        # TODO: Add cycle detection for dependencies
        if flags:
            if isinstance(flags, list):
                assert len(flags) == len(prompt_generators)
            else:
                flags = [flags] * len(prompt_generators)
        tasks = []
        agents = []
        if isinstance(model_names, list):
            for model_name in model_names:
                agents.append(Agent(model_name))
        else:
            agents = [Agent(model_names)] * len(prompt_generators)
        for i, (agent, prompt_generator) in enumerate(zip(agents, prompt_generators)):
            agent_task = agent.create_task(prompt_generator)
            tasks.append(agent_task)
            output_controls.append(agent_task.output_control)
        self._tasks = tasks
        return self._wait_for_all_or_any_error(tasks, dependencies, flags)

    def parse_json(self, output, stage_flag=None):
        try:
            out = parse_llm_json(output.get_output())
            if out is None:
                error_message = ""
                if stage_flag:
                    error_message += f"During {stage_flag}: "
                error_message += "Invalid JSON Format"
                self.abort_all(error_message, output)
                print(error_message)
            return out
        except Exception as e:
            self.abort_all(e, output)
            print(repr(e))
            print(traceback.format_exc())

    def abort_all(self, error=None, output=None):
        if error:
            self.raise_error(error)
            self.log_error(error, output)
        with self._event_cond:
            self._event_flags['error_free'] = False
        for task in self._tasks:
            task.abort()
