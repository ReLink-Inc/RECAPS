from agent import Agent


class AnswererReviewer(Agent):
    def __init__(self, model):
        with open('prompts/answer_reviewer.txt') as inp:
            sys_prompt = inp.read()
        xml_structure = {
            'reviewer_response': {
                'feedback': {},
                'working_solution': {},
                'decision': {}
            }
        }
        super().__init__(model=model, sys_prompt=sys_prompt, xml_structure=xml_structure)

    def review(self, question, answers):
        kwargs = {'Main Question': question, 'Answer Attempts': answers}
        for result in self.run(**kwargs):
            yield result