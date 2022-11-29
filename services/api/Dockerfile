FROM alpine:3.17

RUN apk add --no-cache bash nodejs npm

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN npm install \
    && npm run doc

CMD npm run dev
