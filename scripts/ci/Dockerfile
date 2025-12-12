FROM quay.io/fedora/fedora:43

ARG USER=cypress
ARG USER_HOME=/home/$USER
ARG NPM_CACHE=$USER_HOME/.npm-cache
ARG CYPRESS_CACHE=$USER_HOME/.cypress-cache
ARG XDG_CONFIG_HOME=$USER_HOME/.config
ARG POETRY_CACHE=$USER_HOME/.poetry-cache
ARG CHROME=https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
ARG OCP_CLI=https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz
ARG NVM_INSTALLER=https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh
ARG NODE_VERSION=v22.5.1
ARG OCM_CLI=https://github.com/openshift-online/ocm-cli/releases/download/v1.0.7/ocm-linux-amd64
ARG CYPRESS_VERSION=^13.14.2
ARG JUNIT_REPORT_MERGER_VERSION=6.0.0

USER root

# Add local user to avoid permissions issues during job execution
RUN mkdir -p "$USER_HOME"
RUN useradd -m -g root "$USER" -d "$USER_HOME"
RUN mkdir -p "$XDG_CONFIG_HOME/Cypress"
RUN chgrp -R 0 "$USER_HOME"
RUN chmod -R 775 "$USER_HOME"

# Create local NPM cache directory
RUN mkdir -p "$NPM_CACHE"
RUN chown -R $USER:0 "$NPM_CACHE"
RUN chmod -R 775 "$NPM_CACHE"

# Create local Cypress cache directory
RUN mkdir -p "$CYPRESS_CACHE"
RUN chown -R $USER:0 "$CYPRESS_CACHE"
RUN chmod -R 775 "$CYPRESS_CACHE"

# Create local Poetry cache directory
RUN mkdir -p "$POETRY_CACHE"
RUN chown -R $USER:0 "$POETRY_CACHE"
RUN chmod -R 775 "$POETRY_CACHE"

# Install tools including Xvfb, Chrome, and additional required packages
RUN dnf update -y
RUN dnf install --nodocs -y \
    wget \
    unzip \
    xz \
    jq \
    git \
    xorg-x11-server-Xvfb \
    krb5-workstation \
    python3.11 \
    python3.11-devel \
    yq \
    curl \
    openssl \
    chromedriver \
    gcc \
    gcc-c++ \
    make \
    libcap \
    skopeo \
    awscli2 \
    dbus-x11 \
    dbus-daemon \
    procps-ng \
    "$CHROME"

# Create D-Bus directories and socket for Cypress/Electron
RUN mkdir -p /run/dbus && \
    dbus-uuidgen > /etc/machine-id && \
    chmod 777 /run/dbus

# Install OCP client
RUN wget -qO- "$OCP_CLI" | tar zxv -C /usr/local/bin/ oc kubectl

# Install OCM CLI
RUN curl -Lo /usr/local/bin/ocm "$OCM_CLI" && \
    chmod +x /usr/local/bin/ocm

# Install droute tool (to send results to Report Portal)
COPY --from=quay.io/dno/droute:latest /droute /usr/local/bin/droute
RUN chmod +x /usr/local/bin/droute

# Install ca-certificates and prepare for corporate certificates
RUN dnf install -y ca-certificates

# Install pip for Python 3.11 and Poetry
RUN python3.11 -m ensurepip --upgrade && \
    python3.11 -m pip install --upgrade pip setuptools wheel && \
    python3.11 -m pip install poetry

# Clean system cache
RUN dnf clean all
RUN rm -rf /var/cache/yum

# Copy full repository (excluding files from .dockerignore) so npm workspaces can resolve properly
WORKDIR $USER_HOME
COPY . .
RUN chown -R $USER:0 $USER_HOME

# Switch to the user and export env variables for the cache directories
USER $USER
ENV USER $USER
ENV HOME $USER_HOME
ENV NVM_DIR $USER_HOME/nvm
ENV NODE_PATH "$NVM_DIR/versions/node/$NODE_VERSION/lib/node_modules"
ENV PATH "$NVM_DIR/versions/node/$NODE_VERSION/bin:/bin:$HOME/.local/bin:/root/.local/bin:/usr/local/bin:$NPM_CACHE/bin:/usr/bin:$PATH"
ENV NPM_CONFIG_CACHE $NPM_CACHE
ENV npm_config_cache $NPM_CACHE
ENV CYPRESS_CACHE_FOLDER $CYPRESS_CACHE
ENV XDG_CONFIG_HOME $XDG_CONFIG_HOME
ENV POETRY_CACHE_DIR $POETRY_CACHE

# Cypress Electron launch arguments for containerized environment (e.g. to prevent Vulkan errors in containers).
ENV ELECTRON_EXTRA_LAUNCH_ARGS="--disable-dev-shm-usage --no-sandbox --disable-gpu --disable-software-rasterizer --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding"

RUN mkdir -p $NVM_DIR

# Install Node Version Manager and NodeJS
RUN curl -o- $NVM_INSTALLER | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use --delete-prefix $NODE_VERSION && \
    echo 'export PATH=$PATH' >> '$USER_HOME/.bashrc'"

# Populate npm cache - use npm ci then remove node_modules
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    npm ci && \
    rm -rf node_modules && \
    npm cache verify"

# Install Cypress and additional NodeJS packages globally
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    npm install --prefix=$NPM_CACHE -g \
    cypress@$CYPRESS_VERSION \
    junit-report-merger@$JUNIT_REPORT_MERGER_VERSION && \
    dbus-run-session -- cypress verify"

# Prevent EACCES (permission denied) after cypress verify created new files
USER root
RUN chmod -R 777 "$XDG_CONFIG_HOME"
USER $USER

# Label the Image
LABEL io.opendatahub.component="odh-cypress" \
      io.k8s.display-name="odh-cypress" \
      name="open-data-hub/odh-cypress" \
      summary="odh-cypress" \
      description="Image for Running Cypress Tests for Open Data Hub Dashboard"
