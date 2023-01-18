FROM pytorch/pytorch:1.13.1-cuda11.6-cudnn8-runtime

EXPOSE 2001

ENV HOME=/home/lulc
WORKDIR $HOME

ADD requirements.txt .
RUN apt install gdal-config
RUN pip install -r requirements.txt

COPY ./ $HOME/gpu
WORKDIR $HOME/gpu

CMD python worker.py
