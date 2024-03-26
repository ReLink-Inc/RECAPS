import re
import json

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from json_parser import MaximalJSONOutputParser
from xml_parser import MaximalXMLOutputParser


with open('config.json') as inp:
    api_keys = json.load(inp)['anthropic']


def escape_all_braces(prompt):
    segments = []
    last_idx = 0
    for match in re.finditer('({|})', prompt):
        segments.append(prompt[last_idx:match.end()])
        last_idx = match.start()
    segments.append(prompt[last_idx:])
    return ''.join(segments)


def print_list(l, curr_indent=""):
    strings = []
    for i, item in enumerate(l):
        if isinstance(item, dict):
            strings.append(f"{curr_indent}{i}:\n" + print_nested_dictionary(item, curr_indent + '\t'))
        elif isinstance(item, list):
            strings.append(f"{curr_indent}{i}:\n" + print_list(item, curr_indent + '\t'))
        elif isinstance(item, str):
            strings.append(f"{curr_indent}{i}: " + f"{item}")
    return '\n'.join(strings)

def print_nested_dictionary(d, curr_indent=""):
    strings = []
    for k, v in d.items():
        if isinstance(v, dict):
            strings.append(f"{curr_indent}{k}:\n" + print_nested_dictionary(v, curr_indent+'\t'))
        elif isinstance(v, list):
            strings.append(f"{curr_indent}{k}:\n" + print_list(v, curr_indent+'\t'))
        elif isinstance(v, str):
            strings.append(f"{curr_indent}{k}: " + f"{v}")
    return '\n'.join(strings)


class Agent:
    def __init__(self, model="sonnet", sys_prompt="", xml_structure=None):
        self.model = self.resolve_model(model)
        self.llm = ChatAnthropic(model=self.model, temperature=0.0, max_tokens=4096, anthropic_api_key=api_keys[0])
        self.sys_prompt = escape_all_braces(sys_prompt)
        if xml_structure:
            self.chain = self.llm | MaximalXMLOutputParser(xml_structure)
        else:
            self.chain = self.llm | MaximalJSONOutputParser()

    def resolve_model(self, model):
        if model == "haiku":
            return "claude-3-haiku-20240307"
        if model == "opus":
            return "claude-3-opus-20240229"
        return "claude-3-sonnet-20240229"

    def run(self, **kwargs):
        user_prompt = print_nested_dictionary({k: v for k, v in kwargs.items() if v is not None})
        prompt = ChatPromptTemplate.from_messages([("system", self.sys_prompt), ("user", user_prompt)])
        for chunk in (prompt | self.chain).stream({}):
            yield chunk

