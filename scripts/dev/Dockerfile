FROM registry.access.redhat.com/ubi8/nodejs-20:latest AS builder

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
  # gcc \
  # gcc-c++ \
  # python3 \
  # python3-pip \
  # podman \
  # skopeo \
  # buildah \
  jq \
  vim \
  less && \
  dnf clean all


# setup directories
RUN useradd -m -u 1500 -g 0 odh && \
  mkdir -p /app/odh-dashboard /opt/crc /opt/oc && \
  chown -R 1500:0 /app /opt/crc /opt/oc && \
  chmod -R g=u /app /opt/crc /opt/oc


WORKDIR /app/odh-dashboard

COPY --chown=1500:0 package*.json ./
COPY --chown=1500:0 frontend/package*.json ./frontend/
COPY --chown=1500:0 backend/package*.json ./backend/

# Install dependencies (do this in entrypoint to avoid caching issues)
RUN npm install && \
  cd frontend && npm install && \
  cd ../backend && npm install

COPY --chown=1500:0 install/dev/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER 1500

ENV PATH="/opt/crc:/opt/oc:${PATH}" \
  NODE_ENV=development \
  NODE_TLS_REJECT_UNAUTHORIZED=0

EXPOSE 4010 8080

CMD ["npm", "run", "dev"]

