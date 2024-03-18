from abc import ABC, abstractmethod

import time
import traceback
import uuid
import threading


class BasePipeline(ABC):
    log_lock = threading.RLock()

    def __init__(self):
        self.pipeline_id = str(uuid.uuid4())
        self.creation_time = time.time()
        self.end_time = None
        self.run_thread = None
        self.active = True
        self.error_message = ""
        self._stage_flags = dict()
        self._completed_flags = dict()
        self._stage_lock = threading.RLock()
        self._status_lock = threading.RLock()

    @abstractmethod
    def run(self):
        """
        Implement the pipeline process logic here.
        This method must be implemented by all subclasses of BasePipeline.
        """
        pass

    @abstractmethod
    def consolidate_data(self):
        """
        A pipeline is required to consolidate its data upon request.
        """
        pass

    def run_async(self):
        self.run_thread = threading.Thread(target=self.run)
        self.run_thread.start()

    def join_async(self):
        self.run_thread.join()

    def raise_flag(self, stage_flag):
        with self._stage_lock:
            self._stage_flags[stage_flag] = self._stage_flags.get(stage_flag, 0) + 1

    def check_flag_ever_raised(self, stage_flag):
        return stage_flag in self._stage_flags or stage_flag in self._completed_flags

    def check_active_flag(self, stage_flag):
        return stage_flag in self._stage_flags

    def check_completed_flag(self, stage_flag):
        return stage_flag in self._completed_flags and stage_flag not in self._stage_flags

    def archive_flag(self, stage_flag):
        with self._stage_lock:
            if stage_flag in self._stage_flags:
                self._stage_flags[stage_flag] = self._stage_flags.get(stage_flag, 1) - 1
                self._completed_flags[stage_flag] = self._completed_flags.get(stage_flag, 0) + 1
                if self._stage_flags[stage_flag] == 0:
                    del self._stage_flags[stage_flag]

    def finish(self):
        with self._status_lock:
            self.active = False
            self.end_time = time.time()

    def inactive_past_timeout(self, timeout):
        return self.end_time is not None and not self.active and (time.time() - self.end_time) > timeout

    def get_status(self):
        data = {} if self.error_message else self.consolidate_data()
        with self._status_lock, self._stage_lock:
            return {
                "pipeline_id": self.pipeline_id,
                "creation_time": self.creation_time,
                "end_time": self.end_time,
                "current_stages": self._stage_flags,
                "completed_stages": self._completed_flags,
                "active": self.active,
                "processed_data": data,
                "error_message": self.error_message
            }

    def format_stage(self):
        with self._stage_lock:
            formatted_status = ""
            for flag, raised_num in self._stage_flags.items():
                formatted_status += f"{raised_num} threads are currently {flag}\n"
            return formatted_status

    def raise_error(self, error):
        with self._status_lock:
            self.error_message += str(error) + "\n"
            self.finish()

    def log_error(self, error, output=None):
        if isinstance(error, str):
            error_message = str(error) + '\n'
        else:
            error_message = repr(error) + '\n' + traceback.format_exc()
        if output:
            error_message += "----RAW OUTPUT----\n" + output.get_output() + '\n'
        with BasePipeline.log_lock:
            with open('server/logs/error.log', 'a') as out:
                out.write(error_message)


class PipelineManager:
    def __init__(self):
        self.pipelines: dict[str, BasePipeline] = {}
        self.lock = threading.Lock()  # Create a lock for managing access to pipelines

    def add_pipeline(self, pipeline):
        with self.lock:
            self.pipelines[pipeline.pipeline_id] = pipeline

    def get_pipeline(self, pipeline_id):
        return self.pipelines.get(pipeline_id, None)

    def remove_pipeline(self, pipeline_id):
        with self.lock:
            if pipeline_id in self.pipelines:
                del self.pipelines[pipeline_id]

    def check_and_remove_inactive_pipelines(self, timeout):
        with self.lock:
            inactive_pipelines = [pid for pid, pline in self.pipelines.items() if
                                  pline.inactive_past_timeout(timeout)]
            for pid in inactive_pipelines:
                self.pipelines[pid].join_async()
                del self.pipelines[pid]
                # TODO: Move Data to Database

    def get_all_pipelines(self):
        return {pid: pline.get_status() for pid, pline in self.pipelines.items()}
