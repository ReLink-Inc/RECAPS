import re
from llmlingua import PromptCompressor

if __name__ == "__main__":
    prompt_name = "exploitative_plan_builder"
    with open(f'prompts/{prompt_name}.txt') as inp:
        prompt = inp.read()
    xml_tags = re.findall(r'<([a-zA-Z][a-zA-Z0-9]*)(\s+[^>]*)*>(.*?)', prompt)
    xml_tags = set([xml_tag[0] for xml_tag in xml_tags])
    print(xml_tags)
    # llm_lingua = PromptCompressor(
    #     model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
    #     use_llmlingua2=True,  # Whether to use llmlingua-2
    # )
    force_tokens = ['\n', '?', '<', '>', '/', '</']
    for xml_tag in xml_tags:
        force_tokens += [xml_tag, f'<{xml_tag}>', f'</{xml_tag}>']
    print(force_tokens)
    llm_lingua = PromptCompressor(
        model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
        use_llmlingua2=True  # Whether to use llmlingua-2
    )
    compressed_prompt = llm_lingua.compress_prompt(prompt, rate=0.66, force_tokens = force_tokens)
    for k in ['origin_tokens', 'compressed_tokens', 'ratio', 'rate', 'saving']:
        print(f"{k}:", compressed_prompt[k])
    # print(len(compressed_prompt['compressed_prompt_list']))
    # print(compressed_prompt['compressed_prompt_list'])
    compressed_prompt = compressed_prompt['compressed_prompt']
    fixed_prompt = []
    last_end = 0
    for match in re.finditer(r'<\/?\s*[a-zA-Z][a-zA-Z0-9]*\s*([^>]*)>', compressed_prompt):
        fixed_prompt.append(compressed_prompt[last_end:match.start()])
        fixed_prompt.append(match[0].replace(' ', ''))
        last_end = match.end()
    fixed_prompt.append(compressed_prompt[last_end:])
    fixed_prompt = ''.join(fixed_prompt)
    with open(f'prompts/compressed_{prompt_name}.txt', 'w') as out:
        out.write(fixed_prompt)