FROM pytorch/pytorch:1.9.0-cuda11.1-cudnn8-runtime

EXPOSE 2001

ENV HOME=/home/lulc
WORKDIR $HOME

ADD requirements.txt .
RUN pip install -r requirements.txt

COPY ./ $HOME/gpu
WORKDIR $HOME/gpu

CMD python worker.py
