import re

def remove_braces(text):
    result = []
    stack = []
    i = 0

    while i < len(text):
        if text[i:i+2] == '{{':
            stack.append(i)
            i += 2
        elif text[i:i+2] == '}}' and stack:
            start = stack.pop()
            if not stack:
                # Only remove outermost {{ ... }}
                result = result[:start]
            i += 2
        else:
            if not stack:
                result.append(text[i])
            i += 1

    return ''.join(result)

def extract_events_info(text):
    text = remove_braces(text)
    text = re.sub(r"<code>(.*?)</code>", r"`\1`", text, re.DOTALL)
    text = re.sub(r"<.*?>", "", text)
    text = text.replace('"', '\\"')
    constants_file = open("out.txt", 'w', encoding="utf-8")
    for match in re.findall(r"==\s*(\w+?)\s*==\n(.*?)(?===\s*(\w+?)\s*==|$)", text, re.DOTALL):
        function_name = "OnGameEvent_" + match[0]
        print(function_name + '|', end='')
        constants_file.write(f'\t{function_name}: {{\n\t\tsignature: "{function_name}(params: table) -> void"')
        lines = match[1].split('*')
        has_description = False
        description = re.sub(r"^[ \s]*(.*?)\s*$", r'\1', lines[0], re.DOTALL).replace('\n', '\\n')

        for field in lines[1:]:
            field = re.sub(r"^\s*(.*?)\s*$", r'\1', field, re.DOTALL)

            if field != '':
                field = re.sub(r"(long|short|byte)", "int", field)
                field = re.sub(r"^(\w*)\s*\((.*?)\)", r"\1: \2", field)
                field = re.sub(r"(?<=\s)-(?=\s)", "—", field)
                if not has_description:
                    constants_file.write(',\n\t\tdescription: {')
                    if description != '':
                        constants_file.write(f'\n\t\t\t"{description}": false,\n\t\t\t"\\n\\n---\\nVariables of the `params` table:": false')
                    else:
                        constants_file.write('\n\t\t\t"Variables of the `params` table:": false')
                    has_description = True
                constants_file.write(f',\n\t\t\t"{field}": true')
        if has_description:
            constants_file.write("\n\t\t}")
        elif description != '':
            constants_file.write(f',\n\t\tdescription: "{description}"')
        constants_file.write("\n\t},\n")


if __name__ == '__main__':
    with open("input.txt", 'r', encoding='utf-8') as input_file:
        extract_events_info(input_file.read())