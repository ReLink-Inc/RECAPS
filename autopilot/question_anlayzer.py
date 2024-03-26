from autopilot.agent import  Agent

class QuestionAnalyzer(Agent):
    def __init__(self, model):
        with open('prompts/question_analyzer.txt') as inp:
            sys_prompt = inp.read()
        xml_structure = {
            'response': {
                'reasoning': {},
                'approach': {},
            }
        }
        super().__init__(model=model, sys_prompt=sys_prompt, xml_structure=xml_structure)

    def analyze(self, question):
        kwargs = {'Question': question}
        for result in self.run(**kwargs):
            yield result