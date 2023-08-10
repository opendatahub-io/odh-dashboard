# Build arguments
ARG SOURCE_CODE=.

# Use ubi8/nodejs-18 as default base image
ARG BASE_IMAGE="registry.access.redhat.com/ubi8/nodejs-18:latest"

FROM ${BASE_IMAGE} as builder

## Build args to be used at this step
ARG SOURCE_CODE

WORKDIR /usr/src/app

## Copying in source code
COPY --chown=default:root ${SOURCE_CODE} /usr/src/app

# Change file ownership to the assemble user
USER default

RUN npm cache clean --force

RUN npm ci --omit=optional

RUN npm run build

FROM ${BASE_IMAGE} as runtime

WORKDIR /usr/src/app

RUN mkdir /usr/src/app/logs && chmod 775 /usr/src/app/logs

USER default

COPY --chown=default:root --from=builder /usr/src/app/frontend/public /usr/src/app/frontend/public
COPY --chown=default:root --from=builder /usr/src/app/backend/package.json /usr/src/app/backend/package.json
COPY --chown=default:root --from=builder /usr/src/app/backend/package-lock.json /usr/src/app/backend/package-lock.json
COPY --chown=default:root --from=builder /usr/src/app/backend/dist /usr/src/app/backend/dist
COPY --chown=default:root --from=builder /usr/src/app/.npmrc /usr/src/app/backend/.npmrc
COPY --chown=default:root --from=builder /usr/src/app/.env /usr/src/app/.env
COPY --chown=default:root --from=builder /usr/src/app/data /usr/src/app/data

RUN cd backend && npm cache clean --force && npm ci --omit=dev --omit=optional && chmod -R g+w ${HOME}/.npm

WORKDIR /usr/src/app/backend

CMD ["npm", "run", "start"]

LABEL io.opendatahub.component="odh-dashboard" \
      io.k8s.display-name="odh-dashboard" \
      name="open-data-hub/odh-dashboard-ubi8" \
      summary="odh-dashboard" \
      description="Open Data Hub Dashboard"
