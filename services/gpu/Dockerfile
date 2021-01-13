FROM nvidia/cuda:11.1-base-ubuntu20.04

EXPOSE 2001

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/gpu
WORKDIR $HOME/gpu

RUN apt-get update \
    && apt-get install -y wget

RUN wget -qP /tmp https://repo.anaconda.com/archive/Anaconda3-2020.02-Linux-x86_64.sh \
    && chmod +x /tmp/Anaconda3-2020.02-Linux-x86_64.sh \
    && /tmp/Anaconda3-2020.02-Linux-x86_64.sh -b
