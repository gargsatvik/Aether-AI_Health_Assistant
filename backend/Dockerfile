# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /code

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code (including the models folder)
# The first '.' means "everything from the repository root"
# The second '.' means "paste it into the current WORKDIR (/code)"
COPY . .

# Make port 7860 available to the world outside this container
EXPOSE 7860

# Define the command to run your app using gunicorn
# This assumes your Flask app file is at api/index.py and the Flask variable is named 'app'
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "api.index:app"]