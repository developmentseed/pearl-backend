FROM alpine:3.14

EXPOSE 1999

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/socket
WORKDIR $HOME/socket

RUN apk add nodejs npm
RUN npm install

CMD npm run dev
