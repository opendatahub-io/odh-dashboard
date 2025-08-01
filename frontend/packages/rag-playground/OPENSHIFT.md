# Deploying RAG Playground on OpenShift

This guide explains how to deploy the application on OpenShift using the `Dockerfile.openshift` container file.

## Prerequisites
- Access to an OpenShift cluster and the `oc` CLI
- The source code repository is accessible (public or with proper credentials)

## Steps

### 1. Create the OpenShift App
You can create a new app from your local directory or from a Git repository. Here is an example using the local directory:

```sh
oc new-app .
```

Or, using a Git repository:

```sh
oc new-app https://github.com/<your-org>/rag-playground.git
```

### 2. Patch the BuildConfig to Use `Dockerfile.openshift`
By default, OpenShift uses `Dockerfile` as the build file. To use `Dockerfile.openshift`, patch the BuildConfig after creation:

```sh
oc patch buildconfig rag-playground --type=merge -p '{"spec":{"strategy":{"dockerStrategy":{"dockerfilePath":"Dockerfile.openshift"}}}}'
```
Replace `rag-playground` with the name of your app (e.g., `rag-playground`).

### 3. Start a New Build
After patching, trigger a new build to use the updated Dockerfile:

```sh
oc start-build rag-playground
```

### 4. Monitor the Build
You can follow the build logs with:

```sh
oc logs -f buildconfig/rag-playground
```

### 5. Expose the Service (Optional)
To make your app accessible externally:

```sh
oc create route edge --service=rag-playground
```

## Notes
- Ensure any required environment variables (such as `LLAMA_STACK_URL`) are set in your deployment configuration.
- You can view and edit environment variables with:
  ```sh
  oc set env deployment/rag-playground LLAMA_STACK_URL=http://llama-stack-service:8080
  ```

---
For more details, see the main `README.md`. 