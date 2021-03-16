FROM nvidia/cuda:11.1-base-ubuntu20.04

EXPOSE 2001

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/gpu
WORKDIR $HOME/gpu

RUN apt-get update \
    && apt-get install -y wget python3 python3-pip \
    && pip3 install -r requirements.txt -f https://download.pytorch.org/whl/torch_stable.html

CMD python3 worker.py
