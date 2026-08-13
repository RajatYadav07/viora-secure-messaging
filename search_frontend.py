import os
import re

def search():
    for root, _, files in os.walk('frontend'):
        for f in files:
            if f.endswith(('.tsx', '.ts')):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if '.' in content and 'message' in content.lower():
                        # Let's print out lines that assign to content or look suspicious
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if 'content' in line and ('.' in line or "'.'" in line or '"."' in line):
                                print(f"{path}:{i+1}: {line.strip()}")

search()
