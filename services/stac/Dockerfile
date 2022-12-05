FROM alpine:3.17

EXPOSE 2002

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/stac
WORKDIR $HOME/stac

RUN apk add --no-cache bash nodejs npm python3 py3-pip

RUN pip install -U pip

RUN python -m pip install . --no-cache-dir

CMD ["bash", "start.sh"]
