from agent import Agent


class Answerer(Agent):
    def __init__(self, model):
        with open('prompts/answerer.txt') as inp:
            sys_prompt = inp.read()
        xml_structure = {
            'response': {
                'reasoning': {},
                'answer': {},
                'assumptions_limitations': {},
                'success': {}
            }
        }
        super().__init__(model=model, sys_prompt=sys_prompt, xml_structure=xml_structure)

    def answer(self, question, dependencies=None):
        kwargs = {}
        if dependencies:
            kwargs["Context Question Answers"] = dependencies
        kwargs['Main Question'] = question
        for result in self.run(**kwargs):
            yield result