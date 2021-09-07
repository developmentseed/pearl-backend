FROM pytorch/pytorch:1.9.0-cuda11.1-cudnn8-runtime

EXPOSE 2001

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/gpu
WORKDIR $HOME/gpu

RUN echo 'bust cache and install pip may be'

RUN apt-get update \
    && apt-get install -y wget python3 python3-pip \
    && pip3 install -r requirements.txt

CMD python3 worker.py
