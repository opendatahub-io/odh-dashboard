FROM quay.io/fedora/fedora:40

ARG USER=cypress
ARG USER_HOME=/home/$USER
ARG NPM_CACHE=/opt/app-root/src/.npm-global
ARG CYPRESS_CACHE=$USER_HOME/.cypress-cache
ARG CHROME=https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
ARG OCP_CLI=https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz
ARG NVM_INSTALLER=https://raw.githubusercontent.com/creationix/nvm/v0.39.7/install.sh
ARG NODE_VERSION=v20.15.0

USER root

# Add local user to avoid permissions issues during job execution
RUN mkdir -p "$USER_HOME"
RUN useradd -m -g root "$USER" -d "$USER_HOME" --uid 1000
RUN chgrp -R 0 "$USER_HOME"
RUN chmod -R g=u "$USER_HOME"

# Create global NPM cache directory
RUN mkdir -p "$NPM_CACHE"
RUN chgrp -R 0 "$NPM_CACHE"
RUN chmod -R 777 "$NPM_CACHE"

# Create local Cypress cache directory
RUN mkdir -p "$CYPRESS_CACHE"
RUN chgrp -R 0 "$CYPRESS_CACHE"
RUN chmod -R 777 "$CYPRESS_CACHE"

# Install tools including Xvfb and Chrome
RUN dnf update -y
RUN dnf install --nodocs -y \
    wget \
    unzip \
    xz \
    jq \
    git \
    xorg-x11-server-Xvfb \
    "$CHROME"

# Install OCP client
RUN wget -qO- "$OCP_CLI" | tar zxv -C /usr/local/bin/ oc kubectl

# Clean system cache
RUN dnf clean all
RUN rm -rf /var/cache/yum

# Set capability to adjust OOM score for Node
RUN echo CAP_SYS_NICE >> /etc/security/limits.conf

# Copy NodeJS packages lists (json files) from "frontend" directory 
WORKDIR $USER_HOME
COPY ./frontend/package*.json ./
RUN chown $USER:0 ./*

# Switch to the user, export env variables, and prepare NVM directories
USER $USER
ENV USER $USER
ENV HOME $USER_HOME
ENV NVM_DIR $USER_HOME/nvm
ENV NODE_PATH "$NVM_DIR/versions/node/$NODE_VERSION/lib/node_modules"
ENV PATH "$NVM_DIR/versions/node/$NODE_VERSION/bin:/bin:$HOME/.local/bin:/root/.local/bin:$PATH"
RUN mkdir -p $NVM_DIR

# Install Node Version Manager, NodeJS and the packages for CI (package-lock.json) 
RUN curl -o- $NVM_INSTALLER | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use --delete-prefix $NODE_VERSION && \
    npm config set prefix '$NPM_CACHE' && \
    echo 'export PATH=$PATH' >> '$USER_HOME/.profile' && \
    source $USER_HOME/.profile && \
    npm cache -g clean --force && \
    npm ci --cache=$NPM_CACHE"

# Export NPM and Cypress Cache directories (to be accesible by rootless user)
ENV NPM_CONFIG_CACHE $NPM_CACHE
ENV CYPRESS_CACHE_FOLDER $CYPRESS_CACHE

# Label the Image
LABEL io.opendatahub.component="odh-cypress" \
      io.k8s.display-name="odh-cypress" \
      name="open-data-hub/odh-cypress" \
      summary="odh-cypress" \
      description="Image for Running Cypress Tests for Open Data Hub Dashboard"
