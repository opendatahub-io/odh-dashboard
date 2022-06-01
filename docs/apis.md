# Backend APIs
The backend for the dashboard is node REST server that performs k8s calls on behalf of the frontend. The following are a list of current apis and there functionality.

## Endpoints and methods

### /builds
**GET** -  Gets the list of current builds status.  This returns an array of [build status objects](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L242)


### /cluster-settings

**GET** - Retrieves the current cluster settings. This get returns a [cluster settings object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L16).

### /cluster-settings/update

**GET** - Used to update the cluster settings.  The url parameters for this get are each of the fields in the [cluster settings object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L16).  Note that this GET will be updated to a POST in a future release.

### /components

**GET** - Retrieves the list of installed components.  The payload for this is an array of [ODHApplication objects](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L155)

### /config

**GET** - Retrieves the dashboard config.  This returns a [Dashboard config object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L5)

### /console

**GET** - Retrieves the list of console objects available for switching between apps.  The returns an array of [console link objects](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L106)

### /docs

**GET** - Retrieves the list of docs.  The returns an array of [document objects](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L218)

### /notebook

**GET** - Retrieves the list of notebooks.  The returns an array of [notebook objects](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L259)

**POST** - Creates a notebook.  The payload should be [notebook object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L259)

### /notebook/{notebook}

**GET** - Retrieves a specific notebook by it's id.  This returns a single [notebook object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L259)

**DELETE** - Deletes a specific notebook image using it's notebook id.  

**PUT** - Updates a specific notebook by it's id.  The payload should be the updated fields as shown in a [notebook object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L259)

### /quickstarts

**GET** - Retrieves the quick starts.  This returns an array of [QuickStart object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L23)

### /segment-key

**GET** - Retrieves the segment key if tracking is enabled and a key is available.  This returns a [Segment Key object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L248)

### /status

**GET** - Retrieves the current status of the odh dashboard application.  This returns a [Kube Status object](https://github.com/opendatahub-io/odh-dashboard/blob/bf49dc23cd4b5477111ad4590e401a423186fa54/backend/src/types.ts#L128)

### /validate-isv

**GET** - Use to validate if an ISV is enabled.  Note that this should be updated to a put in a future release.

### /validate-isv/results

**GET** - Retrieves the current status of an ISV. 