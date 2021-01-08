FROM alpine:3.11

EXPOSE 1999

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/gpu
WORKDIR $HOME/gpu

RUN apk add nodejs
RUN npm install

CMD npm run prod

