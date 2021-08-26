FROM node:16-alpine3.14

EXPOSE 2000

ENV HOME=/home/lulc
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN npm install \
    && npm run doc

CMD npm run dev
