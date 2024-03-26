from autopilot.agent import  Agent

class DifficultyIdentifier(Agent):
    def __init__(self, model):
        with open('prompts/difficulty_identifier.txt') as inp:
            sys_prompt = inp.read()
        xml_structure = {
            'output': {
                'root_difficulties': {},
                'refined_problem_formulation': {},
            }
        }
        super().__init__(model=model, sys_prompt=sys_prompt, xml_structure=xml_structure)

    def identify(self, question, answer_attempt=None):
        kwargs = {'Question': question, 'Answer Attempt': answer_attempt}
        for result in self.run(**kwargs):
            yield result

if  __name__ == "__main__":
    identifier = DifficultyIdentifier('opus')
    for i in identifier.identify("Solve P vs NP"):
        print('\r', end='')
        print(i, end='')