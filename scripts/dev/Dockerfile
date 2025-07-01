from registry.access.redhat.com/ubi8/nodejs-20:latest as builder

USER root

# Install system dependencies
RUN dnf update -y && \
  dnf install -y \
  git \
  curl \
  wget \
  tar \
  gzip \
  make \
  gcc \
  gcc-c++ \
  python3 \
  python3-pip \
  podman \
  skopeo \
  buildah \
  jq \
  vim \
  less && \
  dnf clean all


# setup directories
RUN useradd -m -u 1001 -g 0 odh && \
  mkdir -p /app/odh-dashboard /opt/crc /opt/oc && \
  chown -R 1001:0 /app /opt/crc /opt/oc && \
  chmod -R g=u /app /opt/crc /opt/oc

WORKDIR /app/odh-dashboard

COPY --chown=1001:0 package*.json ./
COPY --chown=1001:0 frontend/pakcage*.json ./frontend/
COPY --chown=1001:0 backend/package*.json ./backend/

# Install dependencies
RUN npm install && \
  cd frontend && npm install && \
  cd ../backend && npm install

USER 1001

ENV PATH="/opt/oc:${PATH}" \
  NODE_ENV=development \
  NODE_TLS_REJECT_UNAUTHORIZED=0

EXPOSE 4010 8080

CMD ["npm", "run", "dev"]

