import json
import uuid
import threading

# from flask import copy_current_request_context, current_app

import anthropic
from openai import OpenAI
from openai._types import NOT_GIVEN as OPENAI_NOT_GIVEN
from mistralai.client import MistralClient
import google.generativeai as genai
from mistralai.models.chat_completion import ChatMessage
import time

def check_json_complete(json_string):
    if json_string == '':
        return False
    in_string = False
    brace_balance = 0
    for c in json_string:
        if c == '"':
            in_string = not in_string
        elif c == '{' and not in_string:
            brace_balance += 1
        elif c == '}' and not in_string:
            brace_balance -= 1
    return brace_balance <= 0


class ThreadWithControl:
    def __init__(self):
        self.output = ""
        self.log_str = ""
        self.active = True
        self.finish_reason = None
        self.error = ""

    def log(self, text):
        self.log_str += text

    def get_log(self):
        return self.log_str

    def append_output(self, text):
        self.output += text

    def get_output(self):
        return self.output

    def restart(self):
        self.output = ""
        self.active = True

    def stop(self):
        self.active = False

    def raise_error(self, e):
        self.error = str(e)

    def finished(self):
        return not self.active


class AgentTask(threading.Thread):
    def __init__(self, agent, prompt_generator, try_force_json, *args, **kwargs):
        super(AgentTask, self).__init__(*args, **kwargs)
        self.output_control = ThreadWithControl()
        self.session_id = uuid.uuid4()
        self.status_lock = threading.Lock()
        self.finish_event = threading.Condition(lock=self.status_lock)
        self.agent = agent
        self.prompt_generator = prompt_generator
        self.try_force_json = try_force_json
        self.started = False

    def run(self):
        # @copy_current_request_context
        def task(system_prompt, user_prompt):
            # current_app.current_sessions[self.agent.agent_type].update({self.session_id: self})
            # current_app.history_session_time[self.agent.agent_type].update(
            #     {self.session_id: {'model_name': self.agent.model_name, 'start': time.time(), 'aborted': False}})

            attempt = 0
            while attempt <= self.agent.retry_number and not self.output_control.finished():
                try:
                    if self.agent.agent_type == 'claude':
                        self.agent._get_claude_response(system_prompt, user_prompt, self.output_control,
                                                        self.try_force_json)
                    elif self.agent.agent_type == 'openai':
                        self.agent._get_openai_response(system_prompt, user_prompt, self.output_control,
                                                        self.try_force_json)
                    elif self.agent.agent_type == 'mistral':
                        self.agent._get_mistral_response(system_prompt, user_prompt, self.output_control,
                                                         self.try_force_json)
                    elif self.agent.agent_type == 'gemini':
                        self.agent._get_gemini_response(system_prompt, user_prompt, self.output_control,
                                                        self.try_force_json)
                    with self.status_lock:
                        self.output_control.stop()
                    # current_app.history_session_time[self.agent.agent_type][self.session_id]['end'] = time.time()
                    # Normally finished
                    if not self.output_control.finished():
                        with self.status_lock:
                            self.output_control.stop()
                        # current_app.history_session_time[self.agent.agent_type][self.session_id]['end'] = time.time()
                    else:  # Aborted
                        pass
                        # current_app.history_session_time[self.agent.agent_type][self.session_id]['aborted'] = True
                    # If response is successfully generated, mark it as done
                except Exception as e:
                    # Log the exception
                    self.output_control.log(f"Attempt {attempt + 1} failed: {str(e)}")
                    self.output_control.restart()  # Clear output before retrying
                    attempt += 1
                    if attempt > self.agent.retry_number:
                        # All retries have been exhausted, mark the control as stopped
                        with self.status_lock:
                            self.output_control.raise_error(e)
                            self.output_control.stop()
                        # Error
                        # current_app.history_session_time[self.agent.agent_type][self.session_id][
                        #     'error'] = self.output_control.error
                        break
                    time.sleep(1)  # Add delay before retrying
            # del current_app.current_sessions[self.agent.agent_type][self.session_id]
            with self.finish_event:
                self.finish_event.notify_all()
        with self.status_lock:
            if self.started:
                return
            else:
                self.started = True
        # Prompt generation deferred just in case they depend on other tasks
        try:
            system_prompt, user_prompt = self.prompt_generator()
        except Exception as e:
            with self.status_lock:
                self.output_control.raise_error(e)
                self.output_control.stop()
            return
        task(system_prompt, user_prompt)

    def join(self, timeout=None):
        super(AgentTask, self).join(timeout)

    def abort(self):
        # External call to stop the thread safely
        with self.status_lock:
            self.output_control.stop()

    def wait(self):
        with self.finish_event:
            self.finish_event.wait_for(self.output_control.finished)


def determine_agent_type(model_name):
    # Mapping model name identifiers to agent types
    if 'claude' in model_name.lower():
        return 'claude'
    elif any(sub in model_name.lower() for sub in ['gpt', 'openai']):
        return 'openai'
    elif 'mistral' in model_name.lower():
        return 'mistral'
    elif 'gemini' in model_name.lower():
        return 'gemini'
    else:
        raise ValueError("Unknown model name or agent type")


with open("configs/llm_api_keys.json") as keys:
    API_KEYS = json.load(keys)


# TODO: Add auto management of rate limiting
class Agent:
    last_client_idx = {'claude': -1, 'openai': -1, 'mistral': -1, 'gemini': -1}  # Load balancing purpose
    client_idx_lock = {'claude': threading.Lock(), 'openai': threading.Lock(), 'mistral': threading.Lock(), 'gemini': threading.Lock()}

    def __init__(self, model_name, agent_type=None, temperature=0.0, top_p=1.0,
                 retry_number=0, timeout=None):
        self.model_name = model_name
        self.agent_type = agent_type if agent_type else determine_agent_type(model_name)
        self.temperature = temperature
        self.top_p = top_p
        self.retry_number = retry_number
        self.timeout = timeout
        self.json_prefill = True
        self.sessions = []
        self.clients = []
        self.initialize_client()

    @property
    def client(self):
        with Agent.client_idx_lock[self.agent_type]:
            Agent.last_client_idx[self.agent_type] = (Agent.last_client_idx[self.agent_type] + 1) % len(self.clients)
            return self.clients[Agent.last_client_idx[self.agent_type]]

    def initialize_client(self):
        if self.agent_type == 'claude':
            if isinstance(API_KEYS['claude'], list):
                for api_key in API_KEYS['claude']:
                    self.clients.append(anthropic.Anthropic(api_key=api_key))
            else:
                self.clients.append(anthropic.Anthropic(api_key=API_KEYS['claude']))
        elif self.agent_type == 'openai':
            self.clients.append(OpenAI(api_key=API_KEYS['openai']))
        elif self.agent_type == 'mistral':
            self.clients.append(MistralClient(api_key=API_KEYS['mistral']))
        elif self.agent_type == 'gemini':
            genai.configure(api_key=API_KEYS['gemini'])
            self.clients.append(genai.GenerativeModel(self.model_name))

    def create_task(self, prompt_generator, try_force_json=False):
        return AgentTask(self, prompt_generator, try_force_json)

    def _get_claude_response(self, system_prompt, user_prompt, output_control, try_force_json=False):
        # output_control.append_output("{}")
        # return
        messages = [{"role": "user", "content": user_prompt}, None]
        if try_force_json:
            output_control.append_output("{")
        # is_json_complete = check_json_complete(output_control.get_output())
        # while not is_json_complete:
        messages[1] = {"role": "assistant", "content": output_control.get_output()}
        with self.client.messages.stream(
                model=self.model_name,
                max_tokens=4096,
                messages=messages,
                system=system_prompt if system_prompt else anthropic._types.NOT_GIVEN,
                temperature=self.temperature,
        ) as stream:
            for chunk in stream:
                if output_control.finished():
                    # print("----output aborted!-----")
                    break
                if chunk.type == "content_block_delta" and chunk.delta.type == "text_delta":
                    chunk_str = chunk.delta.text
                    output_control.append_output(chunk_str)
                elif chunk.type == "message_stop":
                    output_control.finish_reason = "stop"
                    break
            # print("-----------RAW OUTPUT----------")
            # print(output_control.get_output())
            # is_json_complete = check_json_complete(output_control.get_output())

    def _get_openai_response(self, system_prompt, user_prompt, output_control, try_force_json=False):
        messages = [{'content': user_prompt, 'role': 'user'}]
        if system_prompt:
            messages.insert(0, {'content': system_prompt, 'role': 'system'})

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            stream=True,
            temperature=self.temperature,
            top_p=self.top_p,
            max_tokens=4096,
            response_format={"type": "json_object"} if try_force_json else OPENAI_NOT_GIVEN,
        )
        for chunk in response:
            if output_control.finished():
                break
            content = chunk.choices[0].delta.content or ""
            output_control.append_output(content)
            if chunk.choices[0].finish_reason:
                break

    def _get_mistral_response(self, system_prompt, user_prompt, output_control, try_force_json=False):
        # Mistral response, assuming similar structure to your description
        # output_control.append_output("{}")
        # return
        messages = [ChatMessage(role="user", content=user_prompt)]
        if system_prompt:
            messages.insert(0, ChatMessage(role="system", content=system_prompt))

        stream = self.client.chat_stream(
            model=self.model_name,
            messages=messages,
            temperature=self.temperature,
            top_p=self.top_p
        )
        for chunk in stream:
            if output_control.finished():
                break
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                output_control.append_output(content)
                if chunk.choices[0].finish_reason:  # If there is a stopping criterion
                    break

    def _get_gemini_response(self, system_prompt, user_prompt, output_control, try_force_json=False):
        # Using the Gemini API, assuming similar structure
        messages = [{'role': 'user', 'parts': [user_prompt]}]
        if system_prompt:
            messages.insert(0, {'role': 'model', 'parts': ["Understood."]}, )
            messages.insert(0, {'role': 'user', 'parts': [system_prompt]})

        response = self.client.generate_content(
            messages,
            generation_config=genai.types.GenerationConfig(
                candidate_count=1,
                max_output_tokens=4096,
                temperature=self.temperature,
                top_p=self.top_p
            ),
            stream=True
        )
        for chunk in response:
            if output_control.finished():
                break
            output_control.append_output(chunk.text.encode('utf-8').decode('unicode-escape'))
            if response._done:
                break
