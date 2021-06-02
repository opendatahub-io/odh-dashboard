#!/usr/bin/env bash
printf "\n\n######## dev backend ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd ${DIR}/../backend
pwd

PORT=${BACKEND_DEV_PORT}
npm install
npm run start:dev
