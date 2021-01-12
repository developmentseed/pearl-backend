FROM tiangolo/uvicorn-gunicorn:python3.8

WORKDIR /tmp

ENV CURL_CA_BUNDLE /etc/ssl/certs/ca-certificates.crt

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt --no-cache-dir

COPY dynamic_tiler/ dynamic_tiler/
COPY setup.py setup.py

RUN pip install . --no-cache-dir

RUN rm -rf dynamic_tiler setup.py

ENV MODULE_NAME dynamic_tiler.main
ENV VARIABLE_NAME app
