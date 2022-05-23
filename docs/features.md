# Configurable Features
By default the ODH Dashboard comes with a set of core features enabled that are design to work for most scenarios.  There are also advance features that can be enable and disabled by using the **odh-dashboard-config** `ConfigMap`.  The ODH Dashboard will attempt to read features from this `ConfigMap` to enable features that are not enabled by default.  

## Features
The following are a list of features that are supported, along with there default settings.

| Feature | Default | Description |
|-------|-------| ------- |
|  enablement| true | Enables the ability to enable ISVs to the dashboard |
|  disableInfo| false | Removes the information panel in Explore Application section |
|  disableSupport| false | Disables components related to support. |
|  disableClusterManager | false | Disables cluster management section for admins
|  disableTracking | true | Disables telemetry UI data. Note for this feature to work you need woopra and segement.io configured
|  disableBYONImageStream| true | Disables custom notebook images that are created via image streams
|  disableISVBadges | true | Removes the badge that indicate if a product is ISV or not.
|  disableAppLauncher | true | Removes the application launcher that is used in OKD environments

