# RHAII Development Environment

Tilt-based inner loop for the RHAII distribution: a Kind cluster running the
dashboard plus a federated Model Serving remote, rebuilt and redeployed on
every change.

## Quick Start

```bash
make tilt-up   # creates the Kind cluster, installs KServe, starts the stack
make tilt-down # stops Tilt and removes its resources
```

## Prerequisites

- **kind, kubectl, tilt, curl, go** — standard tooling; `make tilt-up` fails
  fast with install instructions when missing.
- **A container runtime** (Docker or Podman) that owns the Kind node
  containers. `scripts/setup-kind.sh` detects the owning runtime from the
  nodes themselves and creates the local registry in that same runtime.
- **The podman CLI** when your daemon is Podman (including Docker-compatible
  sockets). Tilt builds with the docker CLI when available, but pushing to the
  plain-HTTP local registry requires `podman push --tls-verify=false`; the
  Podman compat API rejects insecure pushes even for `localhost`. Without a
  podman CLI on a Podman daemon, the build fails with an actionable error.

## How It Fits Together

- `scripts/setup-kind.sh` creates (or resumes) the `rhaii-tilt` Kind cluster
  and a `kind-registry` container publishing `127.0.0.1:5001`, attached to the
  `kind` network. Kind nodes resolve `localhost:5001` to this registry through
  per-node containerd `certs.d` config, and the `local-registry-hosting`
  ConfigMap in `kube-public` advertises it to Tilt.
- The registry exists because `kind load` is broken on the Podman provider
  (kubernetes-sigs/kind#3945): Tilt pushes images to `localhost:5001` instead
  of loading them into nodes.
- `scripts/setup-kserve.sh` installs KServe and its dependencies, and
  `scripts/setup-hardware-profiles.sh` the HardwareProfile CRD.
- The Tiltfile builds `rhaii-dashboard` from the repo-root Dockerfile and runs
  the Model Serving dev server as a federated remote on port 9109.

> **Warning**: A pre-existing container named `kind-registry` is reused only if
> it publishes `127.0.0.1:5001`; otherwise setup aborts with an error. A
> stopped registry is started (not recreated) so previously pushed images
> survive.

## Testing

```bash
python3 scripts/tests/test_setup_kind.py
```

Runs `setup-kind.sh` against stubbed CLIs (Bash and Python 3 required; no
cluster or runtime is contacted).
