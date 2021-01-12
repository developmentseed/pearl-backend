FROM alpine:3.12

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN apk add nodejs npm
RUN npm install \
    && npm run doc

CMD npm run prod
