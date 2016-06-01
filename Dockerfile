FROM node:4.2

ADD . /var/www/slackbot
WORKDIR /var/www/slackbot

RUN npm install

EXPOSE 80

CMD npm start
