FROM alpine:3.19

RUN apk add --no-cache bash nodejs npm

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN npm install

CMD npm run dev
