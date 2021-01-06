FROM tiangolo/uvicorn-gunicorn:python3.8

ENV CURL_CA_BUNDLE /etc/ssl/certs/ca-certificates.crt

WORKDIR /tmp

COPY dynamic_tiler/ dynamic_tiler/
COPY setup.py setup.py

RUN pip install -e . --no-cache-dir

ENV MODULE_NAME dynamic_tiler.main
ENV VARIABLE_NAME app
