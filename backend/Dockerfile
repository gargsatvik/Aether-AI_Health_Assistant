# Use the official Python 3.9 image
FROM python:3.9

# Set the working directory inside the container
WORKDIR /code

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install the Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy your application code into the container
COPY ./api /code/api

# Command to run the application using Gunicorn
CMD ["gunicorn", "--workers", "1", "--timeout", "120", "-b", "0.0.0.0:7860", "api.index:app"]