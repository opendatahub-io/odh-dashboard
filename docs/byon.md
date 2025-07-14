<!-- TODO: Clean up & add to feature documentation -->

# Bring Your Own Notebook

ODH provides several out-of-the-box notebook images that automatically include packages to make it easy for users to get started with common components. However, in many/most instances, users need a specific set of packages/libraries with specific versions depending on the projects. That is why ODH Dashboard has the ability to import existing notebook images to spawn as custom notebooks.

## Enabling BYON

To enable this feature, you need to have first enabled the [admin panel](admin-dashboard.md) and then the flag `disableBYONImageStream` in the [dashboard configuration](dashboard-config.md) turned to `false`.

Once you have completed both steps you will see a section called `Notebook Images` inside the `Settings` panel.

## Minimum requirements for BYON

For image to be spawnable via Jupyter Spawner, it is required to meet the following criteria:

* It needs to include Python runtime,  >= 3.8.
* Python packages `jupyter` and `jupyterlab` need to be installed.
* Environment variable `HOME` is set and points to a writable directory for every user.
* A script `start-singleuser.sh` is present in `PATH`.
* The `start-singleuser.sh` calls jupyter executable with `labhub` argument. Additionally it either passes extra command line arguments to the jupyter call or manually sets `--ip=0.0.0.0 --port=8080`.
