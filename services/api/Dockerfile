FROM alpine:3.11

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN apk add nodejs
RUN npm install \
    && npm run doc

CMD npm run prod

