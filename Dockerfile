FROM alpine:3.12

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME

ENV TEST=compose
ENV API=http://api:2000
ENV SOCKET=http://socket:1999

COPY ./ $HOME/

RUN apk add nodejs npm
RUN npm install

CMD npm test
