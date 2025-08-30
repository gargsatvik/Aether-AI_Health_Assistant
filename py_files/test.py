import kagglehub

# Download latest version
path = kagglehub.dataset_download("xuehaihe/medical-dialogue-dataset")

print("Path to dataset files:", path)