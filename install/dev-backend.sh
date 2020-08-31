#!/usr/bin/env bash
printf "\n\n######## dev backend ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

ENV_FILE=${DIR}/../../.env.dev
if [ -f "${ENV_FILE}" ]; then
  source ${ENV_FILE}
  for ENV_VAR in $(sed 's/=.*//' ${ENV_FILE}); do export "${ENV_VAR}"; done
fi

cd ${DIR}/..
pwd

npm install
PORT=${BACKEND_DEV_PORT} npm run dev
