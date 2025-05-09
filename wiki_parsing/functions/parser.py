import re

def extract_methods_info(class_text):
    class_text = class_text.replace('\\', '\\\\')
    class_text = class_text.replace('"', '\\"')

    methods_file = open('out.txt', 'w', encoding='utf-8')
    obsolete_methods_files = open('out_obsolete.txt', 'w', encoding='utf-8')
    last_index = 0
    table_regex = re.compile(r"!\s*Function\s*!\s*Signature\s*!\s*Description\s*(.*?)\|}", re.MULTILINE | re.DOTALL)
    print("\\\\b(", end='')
    for class_match in re.finditer(r"(?<!=)===\s*(\w+)\s*===(?!=)", class_text):
        class_name = class_match.group(1)
        last_index = class_match.end()

        table_match = re.search(table_regex, class_text[last_index:])
        if not table_match:
            continue

        normal_output, obsolete_output = wiki_table_to_function_info(table_match.group(1), class_name)
        methods_file.write(normal_output)
        obsolete_methods_files.write(obsolete_output)

    methods_file.close()
    obsolete_methods_files.close()

    methods_file = open('out_global.txt', 'w', encoding='utf-8')
    obsolete_methods_files = open('out_global_obsolete.txt', 'w', encoding='utf-8')

    for table in re.findall(table_regex, class_text[last_index:]):
        normal_output, obsolete_output = wiki_table_to_function_info(table)
        methods_file.write(normal_output)
        obsolete_methods_files.write(obsolete_output)

    print(")\\\\b")
    methods_file.close()
    obsolete_methods_files.close()


def get_header(name):
    header = "\t/* --------------------------- *\n"
    header += f"\t * {name: <28}*\n"
    header += "\t * --------------------------- */\n"

    return header

def save_and_replace_links(method_signature):
    links = []
    for link in re.findall(r"\[\[([^|]*)\|(.*?)]]", method_signature):
        links.append(f"[{link[1]}](https://developer.valvesoftware.com/wiki/{link[0]})")
    method_signature = re.sub(r"\[\[[^|]*\|(.*?)]]", r"\1", method_signature)

    return links, method_signature

def convert_signature_to_markdown(method_name, method_signature, table_class = None):
    return_type = None
    if method_name == "constructor":
        return_type = table_class
    else:
        return_type_match = re.search(r"\w+(?=\s)", method_signature)
        if return_type_match:
            return_type = return_type_match.group()

    if return_type:
        method_signature = method_signature[len(return_type):].strip() + " -> " + return_type


    # method_signature = re.sub(r"\s*=[^,)]*", r"?", method_signature)
    # method_signature = re.sub(r"(\w+)\s+(?:'')?(\w+)(?:'')?(\?)?", r"\2\3: \1", method_signature)

    method_signature = re.sub(r"(\w+)\s+(?:'')?(\w+)(?:'')?", r"\2: \1", method_signature)

    if table_class:
        method_signature = table_class + ('.' if method_name != "constructor" else '') + method_signature

    return method_signature

def convert_wiki_to_markdown_format(method_description):
    method_description = re.sub(r"'''([^']*)'''", r"**\1**", method_description)
    method_description = re.sub(r"''([^']*)''", r"*\1*", method_description)
    method_description = re.sub(r"<code>([^<]*)</code>", r"`\1`", method_description)
    method_description = re.sub(r"\[\[([^|]*)\|(.*?)]]", r"[\2](https://developer.valvesoftware.com/wiki/\1)",
                                method_description)
    method_description = re.sub(r"\[\[(.*?)]]", r"[\1](https://developer.valvesoftware.com/wiki/\1)",
                                method_description)
    return method_description

def wiki_table_to_function_info(table_text, table_class = None):
    normal_output = ''
    obsolete_output = ''

    def concat(method_name, method_signature, method_description, links, obsolete):
        if not obsolete:
            print(method_name, end='|')

        if len(links) != 0:
            method_description += ("\\n\\n" if method_description != '' else '') + "See " + " ,".join(links) + '.'

        description_part = ''
        if method_description != '':
            description_part = f',\n\t\tdescription: "{method_description}"'


        if obsolete:
            nonlocal obsolete_output
            obsolete_output += f'\t{method_name}: {{\n\t\tsignature: "{method_signature}"{description_part}\n\t}},\n'
        else:
            nonlocal normal_output
            normal_output += f'\t{method_name}: {{\n\t\tsignature: "{method_signature}"{description_part}\n\t}},\n'

    def get_obsolete_state_and_description(method_declaration, table_class):
        nonlocal obsolete_output, normal_output
        obsolete = method_declaration.find("{{obs}}") != -1

        method_description = ''
        if obsolete:
            if table_class and obsolete_output == '':
                obsolete_output = get_header(table_class)
            substitution_match = re.search(r"\(.*\)", lines[0])
            if substitution_match:
                method_description = f"`{substitution_match.group(0)}`."
                method_description = method_description.replace('&rarr;', '→')
        else:
            if table_class and normal_output == '':
                normal_output = get_header(table_class)

        return obsolete, method_description

    for method_info in table_text.split("|-\n"):
        lines = method_info.split('\n')

        method_name_match = re.search(r">\s*(\w+).*<", lines[0])
        if not method_name_match:
            continue
        method_name = method_name_match.group(1).strip()

        method_signature_match = re.search(r">\s*([^<]*)<", lines[1])
        if not method_signature_match:
            continue
        method_signature = method_signature_match.group(1)

        links, method_signature = save_and_replace_links(method_signature)
        method_signature = convert_signature_to_markdown(method_name, method_signature, table_class)
        if method_name == "constructor":
            method_name = table_class

        obsolete, method_description = get_obsolete_state_and_description(lines[0], table_class)

        method_description_match = re.search(r"(?<=\| )[^{]+", lines[2])
        if not method_description_match:
            concat(method_name, method_signature, method_description, links, obsolete)
            continue

        if method_description != '':
            method_description += "\\n\\n"

        method_description += method_description_match.group(0).strip()
        method_description = convert_wiki_to_markdown_format(method_description)

        concat(method_name, method_signature, method_description, links, obsolete)

    return normal_output, obsolete_output

if __name__ == "__main__":
    # you also need to convert every \ to \\ to avoid escape chars
    with open("input.txt", 'r', encoding='utf-8') as input_file:
        extract_methods_info(input_file.read())