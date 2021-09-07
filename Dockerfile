FROM alpine:3.14

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME

ENV API=http://api:2000
ENV SOCKET=ws://socket:1999
ENV Postgres='postgres://docker:docker@postgis:5432/gis'

COPY ./ $HOME/

RUN apk add nodejs npm

RUN npm install \
    && npm --prefix ./services/api/ install

CMD npm test
