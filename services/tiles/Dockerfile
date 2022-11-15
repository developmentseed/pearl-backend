FROM tiangolo/uvicorn-gunicorn:python3.8

WORKDIR /tmp


COPY dynamic_tiler/ dynamic_tiler/
COPY setup.py setup.py

RUN pip install . rasterio==1.1.8 markupsafe==2.0.1 --no-cache-dir

RUN rm -rf dynamic_tiler setup.py

COPY data/mosaics.db.zip /tmp/data/mosaics.db.zip
RUN cd /tmp/data/ && unzip mosaics.db.zip
RUN rm /tmp/data/mosaics.db.zip

ENV CURL_CA_BUNDLE /etc/ssl/certs/ca-certificates.crt

# GDAL config
ENV GDAL_CACHEMAX 200
ENV GDAL_INGESTED_BYTES_AT_OPEN 16383
ENV GDAL_DISABLE_READDIR_ON_OPEN EMPTY_DIR
ENV GDAL_HTTP_MERGE_CONSECUTIVE_RANGES YES
ENV GDAL_HTTP_MULTIPLEX YES
ENV GDAL_HTTP_VERSION 2
ENV VSI_CACHE TRUE
ENV VSI_CACHE_SIZE 5000000

# TiTiler mosaic config
ENV MOSAIC_CONCURRENCY 1

# rio-tiler config
ENV MAX_THREADS=4

# uvicorn/fastapi setup
ENV MODULE_NAME dynamic_tiler.main
ENV VARIABLE_NAME app
