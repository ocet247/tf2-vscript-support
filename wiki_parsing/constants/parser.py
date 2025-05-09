import re

def extract_constants_info(constants_text):
    table_regex = re.compile(r"!\s*Name\s*!\s*Value\s*(.*?)\|}", re.MULTILINE | re.DOTALL)

    constants_file = open("out.txt", 'w', encoding='utf-8')
    for enum_match in re.finditer(r"(?<!=)===\s*(\w+)\s*===(?!=)", constants_text):
        enum = enum_match.group(1)

        table_match = re.search(table_regex, constants_text[enum_match.end():])
        if not table_match:
            continue

        output = wiki_table_to_enum_info(table_match.group(1), enum)
        constants_file.write(output)

    constants_file.close()



def wiki_table_to_enum_info(table_text, enum_name):
    output = f"\t{enum_name}: {{\n"
    print(f'\t{enum_name}: {{\n\t\tsignature: "{enum_name}: enum"\n\t}},')
    for constant_info in table_text.split("|-\n"):
        lines = constant_info.split('\n')

        constant_name_match = re.search(r">\s*(\w+).*<", lines[0])
        if not constant_name_match:
            continue
        constant_name = constant_name_match.group(1).strip()

        constant_value = lines[1][2:].strip()

        output += f'\t\t{constant_name}: {{\n\t\t\tsignature: "{constant_name}: int",\n\t\t\tdescription: "Value: `{constant_value}`"\n\t\t}},\n'

    return output + "\t},\n"

if __name__ == "__main__":
    with open("input.txt", 'r', encoding="utf-8") as input_file:
        extract_constants_info(input_file.read())