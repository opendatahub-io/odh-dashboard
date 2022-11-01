# OpenShift Plugin SDK

[@openshift/dynamic-plugin-sdk](https://www.npmjs.com/package/@openshift/dynamic-plugin-sdk) is an SDK package for making k8s related calls.

It is technically split into three parts:

- [@openshift/dynamic-plugin-sdk](https://www.npmjs.com/package/@openshift/dynamic-plugin-sdk) -- Core set of tools to build a plugin, we don't use this a lot today, but this is needed to bootstrap our frontend for later inclusion on other systems
- [@openshift/dynamic-plugin-sdk-utils](https://www.npmjs.com/package/@openshift/dynamic-plugin-sdk-utils) -- This will be where we will pull the most of our content from, it has all the k8s utilities we should need
- [@openshift/dynamic-plugin-sdk-webpack](https://www.npmjs.com/package/@openshift/dynamic-plugin-sdk-webpack) -- Simply just as it states, a webpack set of tools to help configure out webpack to package up to be an SDK

As of today (2022-08-31), we are not looking to be a plugin. We just want to start moving that direction and making use of the utilities so we don't need custom backend to make API calls.

## Making API Calls

Instead of using our custom NodeJS backend, we'll want to migrate to using one of the following methods from the SDK.

- k8sGetResource
- k8sCreateResource
- k8sUpdateResource
- k8sPatchResource
- k8sDeleteResource

All these are heavily typed and are Generics`*`, so you should be able to infer from the types what is needed. But to help that along, here are a couple helpful notes:

- `model` -- Models are simply just a collection of properties that describes a K8s Resource Type. K8s ones like `ConfigMap` & `Pod` to CRDs like `Notebook` and `OdhDashboardConfig` -- we will create our list of these under `frontend/src/models` -- check it out for examples.
- `queryOptions` -- These are just simply additional options to help target your call at something; typically you'll be setting `name` and `ns` (aka `namespace`)

`*` A couple notes about the Generic nature of these functions

1. You can type the response as well as your input -- aim to do this always for better typing, best have TS doing as much as possible
2. Our old types may not be 1:1 compatible with other resource types we have. Likely all you will need to do is convert over to the `K8sResourceCommon` type from the SDK instead of using ours

### Pass Through API

We have set up a pass through API that will effectively take the path built by the SDK's utilities during one of the k8s{CRUD}Resource calls noted above. This API will use the token of your user provided by our OAuth container and send your request off to a kube instance. We will give up on custom error handling and let the client deal with the error from k8s. 

See the [k8s pass through API](../backend/src/routes/api/k8s/pass-through.ts) here.

## Patches

Patches are based on [jsonpatch](https://jsonpatch.com/). For those who are unaware of the details let's do a quick breakdown on how they work. When making a `k8sPatchResource` call, it will ask for `Patches[]`. A `Patch` is just simply a straight forward operation on the existing resource.

Say you wanted to update a `ConfigMap` to have a new property:

```ts
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';

k8sPatchResource({
  model: ConfigMapModel,
  queryOptions: { name: configMapName, ns: namespace },
  patches: [{ path: '/foo', op: 'add', value: 'bar' }]
})
```

- `op` is what kind of operation to apply to this path
  - 'add' -- adds a new item
  - 'replace' -- updates an existing item
  - 'remove' -- removes the item (you'd omit `value` naturally as there is no value for removing)
  - There are other operations you can do as well ([see the docs](https://jsonpatch.com/#operations))
- `path` is the path from the root of the k8s object using `/` as a deliminator, include the key you want to modify
  - Unless it is a complex object you're adding, you'll likely specify `value` as a string/number

Ideally you keep patches as small as needed to avoid any 409 Conflict errors.
