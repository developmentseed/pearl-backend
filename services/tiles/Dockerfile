FROM tiangolo/uvicorn-gunicorn:python3.8

WORKDIR /tmp

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt --no-cache-dir

COPY dynamic_tiler/ dynamic_tiler/
COPY setup.py setup.py
RUN pip install . --no-cache-dir
RUN rm -rf dynamic_tiler setup.py

# Use WIP cogeo-misaic
RUN pip install https://github.com/developmentseed/cogeo-mosaic/archive/SQLiteBackend.zip  --no-cache-dir -U

COPY data/mosaics.db.zip /tmp/data/mosaics.db.zip
RUN cd /tmp/data/ && unzip mosaics.db.zip
RUN rm /tmp/data/mosaics.db.zip

# GDAL config
ENV GDAL_CACHEMAX 75%
ENV GDAL_DISABLE_READDIR_ON_OPEN EMPTY_DIR
ENV GDAL_HTTP_MERGE_CONSECUTIVE_RANGES YES
ENV GDAL_HTTP_MULTIPLEX YES
ENV GDAL_HTTP_VERSION 2
ENV VSI_CACHE TRUE
ENV VSI_CACHE_SIZE 536870912

# uvicorn/fastapi setup
ENV MODULE_NAME dynamic_tiler.main
ENV VARIABLE_NAME app
ENV WORKERS_PER_CORE 1
