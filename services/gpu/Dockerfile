FROM mcr.microsoft.com/azureml/openmpi3.1.2-cuda10.1-cudnn7-ubuntu18.04:20210301.v1

EXPOSE 2001

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/gpu
WORKDIR $HOME/gpu

RUN apt-get update \
    && apt-get install -y wget python3 python3-pip \
    && pip3 install -r requirements.txt

CMD python3 worker.py
