FROM alpine:3.17

RUN apk add --no-cache bash nodejs npm python3 py3-pip

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/stac
WORKDIR $HOME/stac

RUN pip install -r requirements.txt



