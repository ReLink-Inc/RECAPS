import json
import re


def maximal_parsable_json(partial_json):
    # TODO: Does not currently support boolean values
    # TODO: Does not currently support json_string that represents a list, but internal list in a dictionary is supported
    # TODO: Currently only support auto-fix quotes in string value field of a dictionary
    stack = []
    in_string = False
    escaped = False
    last_key_index = None
    last_string_value_index = None
    last_comma_index = None
    colon_index = None
    real_last_comma_index = None

    start = partial_json.find('{')
    if start == -1:
        start = partial_json.find('[')
    if start == -1:
        return ''
    partial_json = partial_json[start:]

    replace_targets = []
    for i, char in enumerate(partial_json):
        if not in_string:
            if char == '{':
                stack.append('}')
                last_key_index = None
                last_string_value_index = None
                last_comma_index = None
                colon_index = None
            elif char == '[':
                stack.append(']')
            elif char == '"':
                in_string = True
                if last_key_index is not None and colon_index is not None and colon_index > last_key_index and (
                        (last_comma_index is not None and last_key_index > last_comma_index)
                        or last_comma_index is None):
                    # Avoid the case of {"key1": [1, 2], "key2}
                    last_string_value_index = i
                else:
                    last_key_index = i
            elif char == ':' and stack and stack[-1] == '}':
                colon_index = i
            elif char == ',':
                real_last_comma_index = i
                if stack and stack[-1] == '}':
                    last_comma_index = i
            elif char in '}]':
                if not stack or char != stack[-1]:
                    return None  # Invalid Format
                stack.pop()
                if not stack:
                    break
        else:
            if char == '"' and not escaped:
                # We are in a string value field of a dictionary
                if last_string_value_index is not None and last_string_value_index > last_key_index and stack[-1] == '}':
                    # Check if the quote is incorrectly placed by looking at the first non-whitespace character after it
                    match = re.search(r"\S", partial_json[i+1:])
                    # No more non-space character ensues it, then we should assume end of string
                    # Assumes stack is populated, which should be the case
                    if match is None or match.group() in [',', stack[-1]]:
                        in_string = False
                    else:
                        replace_targets.append((i, '\\"'))
                else:
                    in_string = False
            elif char == '\\':
                escaped = not escaped
            elif char in '\t\n\r':
                if char == '\t':
                    replace_char = '\\t'
                elif char == '\n':
                    replace_char = '\\n'
                else:
                    replace_char = '\\r'
                replace_targets.append((i, replace_char))
            else:
                escaped = False
    partial_json = partial_json[:i+1] # truncate whatever is after
    if not in_string and partial_json[-1] == '.': # partial floating point number
        partial_json = partial_json[:-1]

    if in_string:
        if (stack[-1] == '}' and last_string_value_index and last_string_value_index > last_key_index) or stack[-1] == ']':  # in value field
            if escaped:
                partial_json += '\\"'
            else:
                partial_json += '"'
        else:  # in key field, then remove the key
            partial_json = partial_json[:last_key_index]

    if real_last_comma_index and partial_json[real_last_comma_index + 1:].isspace() or real_last_comma_index == len(partial_json) - 1:
        partial_json = partial_json[:real_last_comma_index]

    if stack and stack[-1] == '}':
        if colon_index is not None and last_key_index is not None:
            if ((colon_index > last_key_index and partial_json[colon_index + 1:].isspace())
                    or colon_index + 1 == len(partial_json) or colon_index < last_key_index):
                # The case of '{..., "key":' or '{..., "key": ' or '{..., "key"'
                partial_json = partial_json[:last_comma_index or last_key_index]
        # Now, consider the case of '{"key"'
        if colon_index is None and last_key_index is not None:
            partial_json = partial_json[:last_comma_index or last_key_index]

    while stack:
        if stack[-1] == '}':
            partial_json += '}'
        elif stack[-1] == ']':
            partial_json += ']'
        stack.pop()

    fixed_json_string = ""
    last_pos = 0
    for pos, replace_char in replace_targets:
        if pos <= len(partial_json):
            fixed_json_string += partial_json[last_pos:pos] + replace_char
            last_pos = pos + 1
    if last_pos <= len(partial_json):
        fixed_json_string += partial_json[last_pos:]

    return fixed_json_string


def parse_llm_json(json_string) -> dict | None:
    json_string = json_string.replace("\\", "\\\\")  # Fix escape characters
    json_string = maximal_parsable_json(json_string)
    if json_string is None:
        return None
    if json_string == '':
        return {}

    try:
        return json.loads(json_string)
    except json.decoder.JSONDecodeError as e:
        # print(orig_json_string)
        # print("----------------------")
        # print(json_string)
        raise e