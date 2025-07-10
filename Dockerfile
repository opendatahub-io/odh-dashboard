# Build arguments
ARG SOURCE_CODE=.

# Use ubi8/nodejs-18 as default base image
ARG BASE_IMAGE="registry.access.redhat.com/ubi8/nodejs-20:latest"

FROM ${BASE_IMAGE} as builder

## Build args to be used at this step
ARG SOURCE_CODE

WORKDIR /usr/src/app

## Copying in source code
COPY --chown=default:root ${SOURCE_CODE} /usr/src/app

# Change file ownership to the assemble user
USER default

RUN npm cache clean --force

RUN npm ci --omit=optional --ignore-scripts
RUN cd frontend && npm ci --omit=optional --ignore-scripts
RUN cd backend && npm ci --omit=optional --ignore-scripts

RUN npm run build

# Install only production dependencies
# This is needed to remove the dev dependencies that were installed in the previous step
RUN cd backend && npm prune --omit=dev

FROM ${BASE_IMAGE} as runtime

WORKDIR /usr/src/app

RUN mkdir /usr/src/app/logs && chmod 775 /usr/src/app/logs

USER 1001:0

COPY --chown=default:root --from=builder /usr/src/app/frontend/public /usr/src/app/frontend/public
COPY --chown=default:root --from=builder /usr/src/app/backend/package.json /usr/src/app/backend/package.json
COPY --chown=default:root --from=builder /usr/src/app/backend/package-lock.json /usr/src/app/backend/package-lock.json
COPY --chown=default:root --from=builder /usr/src/app/backend/node_modules /usr/src/app/backend/node_modules
COPY --chown=default:root --from=builder /usr/src/app/backend/dist /usr/src/app/backend/dist
COPY --chown=default:root --from=builder /usr/src/app/.npmrc /usr/src/app/backend/.npmrc
COPY --chown=default:root --from=builder /usr/src/app/.env /usr/src/app/.env
COPY --chown=default:root --from=builder /usr/src/app/data /usr/src/app/data

WORKDIR /usr/src/app/backend

CMD ["npm", "run", "start"]

LABEL io.opendatahub.component="odh-dashboard" \
      io.k8s.display-name="odh-dashboard" \
      name="open-data-hub/odh-dashboard-ubi8" \
      summary="odh-dashboard" \
      description="Open Data Hub Dashboard"
