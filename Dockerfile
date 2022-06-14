# Build arguments
ARG SOURCE_CODE=.

# Use ubi8/nodejs-14 as default base image
ARG BASE_IMAGE="registry.access.redhat.com/ubi8/nodejs-14:latest"


FROM ${BASE_IMAGE}

## Build args to be used at this step
ARG SOURCE_CODE

LABEL io.opendatahub.component="odh-dashboard" \
      io.k8s.display-name="odh-dashboard" \
      name="open-data-hub/odh-dashboard-ubi8" \
      summary="odh-dashboard" \
      description="Open Data Hub Dashboard"


## Switch to root as required for some operations
USER root

## Install additional packages. Headers needed by node-gyp and node-sass,
## the version of node-gyp (3.8.0) requires python 2 and update nodejs-nodemon
## for vulnerability
RUN dnf module install -y nodejs:14/development && \
    dnf install -y python2 && \
    dnf clean all && rm -rf /var/cache/yum

## Copying in source code
RUN mkdir /tmp/src && chown -R 1001:0 /tmp/src
COPY --chown=default:root ${SOURCE_CODE} /tmp/src

## For npm context. The assemble script will "mv /tmp/src/* /opt/app-root/src"
#@ but that won't pick up .* files at the root
COPY ${SOURCE_CODE}/.npmrc /opt/app-root/src/

# Change file ownership to the assemble user
USER default

## Build dashboard using NPM
ENV NPM_CONFIG_NODEDIR=/usr
RUN /usr/libexec/s2i/assemble

CMD /usr/libexec/s2i/run


