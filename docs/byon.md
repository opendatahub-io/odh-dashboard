# Bring Your Own Notebook

ODH provides several out-of-the-box notebook images that automatically include packages to make it easy for users to get started with common components. However, in many/most instances, users need a specific set of packages/libraries with specific versions depending on the projects. That is why ODH Dashboard has the ability to import existing notebook images to spawn as custom notebooks.

## Enabling BYON

To enable this feature, you need to have first enable the [admin panel](admin_dashboard.md) and then the flag `disableBYONImageStream` in the [dashboard configuration](dashboard_config.md) turned to `false`.

Once you have completed both steps you will see a section called `Notebook Images` inside the `Settings` panel.

## Minimum requirements for BYON

For image to be spawnable via the launcher, it is required to meet the following criteria:

* It needs to have a default launching command (CMD in its Dockerfile).
* It needs to listen on port 8888.
* Currently, 3 types of images are supported by the launcher: JupyterLab (default), RStudio and Code-Server.
* For JupyterLab-based images, you simply have to import them. The standard configuration for Env variables, probes,... will be applied.
* For RStudio based images you must:
  * Edit the corresponding ImageStream and add the following annotations:

```YAML
metadata:
  annotations:
    ...
    opendatahub.io/notebook-type: rstudio
    ...
```

* For Code-Server based images you must:
  * Edit the corresponding ImageStream and add the following annotations:

```YAML
metadata:
  annotations:
    ...
    opendatahub.io/notebook-type: code-server
    opendatahub.io/notebook-liveness-endpoint: healthz
    opendatahub.io/notebook-readiness-endpoint: healthz
    ...
```
