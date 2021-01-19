FROM alpine:3.12

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME

COPY ./package.json $HOME/
COPY ./package-lock.json $HOME/
COPY ./test $HOME/test

RUN apk add nodejs npm
RUN npm install

CMD npm test
