from agent import Agent


class NoveltyExplorer(Agent):
    def __init__(self, model):
        with open('prompts/novel_solution_explorer.txt') as inp:
            sys_prompt = inp.read()
        xml_structure = {
            'output': {
                'idea': {
                    'reasoning': {},
                    'research_direction': {}
                }
            }
        }
        super().__init__(model=model, sys_prompt=sys_prompt, xml_structure=xml_structure)

    def explore(self, question):
        kwargs = {'Question': question}
        for result in self.run(**kwargs):
            yield result