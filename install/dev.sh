#!/usr/bin/env bash
printf "\n\n######## dev ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

ENV_FILE=${DIR}/../../.env.development

if [ -f "${ENV_FILE}" ]; then
  source ${ENV_FILE}
  for ENV_VAR in $(sed 's/=.*//' ${ENV_FILE}); do export "${ENV_VAR}"; done
fi

PORT=${BACKEND_DEV_PORT}
npm install
npm run dev
