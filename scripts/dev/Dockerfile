

ARG BASE_IMAGE="registry.access.redhat.com/ubi8/nodejs-20:latest"

FROM ${BASE_IMAGE} AS builder

ARG TARGETPLATFORM
ARG TARGETARCH
ARG TARGETOS
ARG SOURCE_CODE=.
ARG OCP_CLI_VERSION=-4.6
# ARG YQ_URL=https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
# ARG OCP_CLI=https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable${OCP_CLI_VERSION}/openshift-client-linux.tar.gz
ARG NODE_ENV=development
ARG NODE_TLS_REJECT_UNAUTHORIZED=0
ARG USER=developer

USER root

# Install system dependencies
RUN dnf update -y && \
    dnf install --nodocs -y \
    git \
    curl \
    wget \
    tar \
    gzip \
    make \
    # gcc \
    # gcc-c++ \
    # python3 \
    # python3-pip \
    # podman \
    # skopeo \
    # buildah \
    jq \
    vim
# less && \

RUN dnf clean all

# Download yq based on architecture
RUN case "${TARGETARCH}" in \
    amd64) YQ_ARCH="amd64" ;; \
    arm64) YQ_ARCH="arm64" ;; \
    *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    wget "https://github.com/mikefarah/yq/releases/latest/download/yq_linux_${YQ_ARCH}" -O /usr/local/bin/yq && \
    chmod +x /usr/local/bin/yq

# setup directories
# RUN useradd -m -u 1001 -g 0 developer && \
# TODO: remove opt folder
RUN mkdir -p /usr/src/app /opt/crc /opt/oc && \
    chown -R 1001:0 /usr/src/app /opt/crc /opt/oc && \
    chmod -R g=u /usr/src/app /opt/crc /opt/oc

# Download OpenShift CLI based on architecture
RUN case "${TARGETARCH}" in \
    amd64) OCP_ARCH="openshift-client-linux" ;; \
    arm64) OCP_ARCH="openshift-client-linux-arm64" ;; \
    *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    wget -qO- "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/${OCP_ARCH}.tar.gz" | tar zxv -C /usr/local/bin/ oc kubectl

# Copy in source code
COPY --chown=1001:0 ${SOURCE_CODE} /usr/src/app

WORKDIR /usr/src/app

# Install dependencies
RUN npm install && \
    npm run build && \
    chown -R 1001:0 /usr/src/app && \
    chmod -R g+rw /usr/src/app && \
    chmod -R g+x /usr/src/app/node_modules/.bin



USER 1001:0

# ENV PATH="/opt/crc:/opt/oc:${PATH}" \
#   NODE_ENV=development \
#   NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NODE_ENV=$NODE_ENV
ENV NODE_TLS_REJECT_UNAUTHORIZED=$NODE_TLS_REJECT_UNAUTHORIZED

EXPOSE 4010 8080

CMD ["npm", "run", "dev"]

LABEL io.opendatahub.component="odh-dev" \
      description="Open Data Hub development environment" \
      name="open-data-hub/odh-dev" \
      summary="odh-dev"


