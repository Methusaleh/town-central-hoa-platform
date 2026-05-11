import os

# Focus on Node.js/Express logic
INCLUDE_EXTENSIONS = ('.js', '.json')
START_DIR = './backend'
IGNORE_DIRS = {'node_modules', '.git', 'dist'}

def generate_backend_bundle():
    output_file = 'backend_snapshot.txt'
    with open(output_file, 'w', encoding='utf-8') as outfile:
        if not os.path.exists(START_DIR):
            outfile.write(f"❌ Error: {START_DIR} not found.")
            return

        for root, dirs, files in os.walk(START_DIR):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                if file.endswith(INCLUDE_EXTENSIONS):
                    file_path = os.path.join(root, file)
                    outfile.write(f"\n{'='*50}\nFILE: {file_path}\n{'='*50}\n")
                    with open(file_path, 'r', encoding='utf-8') as f:
                        outfile.write(f.read())
    print(f"✅ {output_file} created!")

if __name__ == "__main__":
    generate_backend_bundle()