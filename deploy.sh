#! /bin/bash
set -ev

TAG=$1
docker login -e="$DOCKER_EMAIL" -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"
docker build -t xteam/unleash-slack-bot:$TAG .
docker push xteam/unleash-slack-bot
