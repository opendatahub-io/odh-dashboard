# Build arguments
ARG SOURCE_CODE=.

# Use ubi8/nodejs-18 as default base image
ARG BASE_IMAGE="registry.access.redhat.com/ubi8/nodejs-18:latest"


FROM ${BASE_IMAGE} as builder

## Build args to be used at this step
ARG SOURCE_CODE


WORKDIR /usr/src/app

## Copying in source code
COPY --chown=default:default ${SOURCE_CODE} /usr/src/app

# Change file ownership to the assemble user
USER default

RUN npm ci --omit=optional

RUN npm run build

CMD ["npm", "run", "start"]

LABEL io.opendatahub.component="odh-dashboard" \
      io.k8s.display-name="odh-dashboard" \
      name="open-data-hub/odh-dashboard-ubi8" \
      summary="odh-dashboard" \
      description="Open Data Hub Dashboard"