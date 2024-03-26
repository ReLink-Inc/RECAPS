from agent import Agent


class Planner(Agent):
    def __init__(self, model):
        with open('prompts/exploitative_plan_builder.txt') as inp:
            sys_prompt = inp.read()
        xml_structure = {
            'plan': {
                'step': {
                    'description': {},
                    'delegation_question': {},
                    'dependencies': {}
                }
            }
        }
        super().__init__(model=model, sys_prompt=sys_prompt, xml_structure=xml_structure)

    def plan(self, question):
        kwargs = {'Question': question}
        for result in self.run(**kwargs):
            yield result