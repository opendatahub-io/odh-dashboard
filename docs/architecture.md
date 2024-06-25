[Dashboard Deployment `containers`]: ../manifests/core-bases/base/deployment.yaml
[OpenShift OAuth Proxy repo]: https://github.com/openshift/oauth-proxy
[OpenShift SDK]: https://github.com/openshift/dynamic-plugin-sdk
[SDK tidbits]: SDK.md

# ODH Dashboard Architecture

Main topics:

- [Overall Architecture](#overview)
- [Client Structure](#client-structure)

## Overview

![Overview](./meta/arch-overview.png)

> **OpenShift OAuth Proxy** is not part of the Dashboard (see [Dashboard Deployment `containers`]) but useful to understand its role. See [OpenShift OAuth Proxy repo] for more information. It is typically in the containers of all services we talk to from the proxy API, as well as the Dashboard itself when the client calls the NodeJS server (in the pod).

The main focus point here is that there are 5 kinds of calls from the client. These are split into two different types. The difference in these two types is one takes your request and does it on your behalf (via the service account), and the other does it as you (through direct calls with your bearer token).

Additional topics in this section:

- [Custom Backend Business Logic](#custom-backend-business-logic)
- [Proxy/Pass-through based efforts](#proxypass-through-based-efforts)

### Custom Backend Business Logic

> **Note**: this functionality is deprecated

These are made on your behalf. There is a Dashboard service account (`1`) that makes these calls on your behalf to the k8s server to create, read, update, and delete resources. This is usually done with impunity (`2`).

- Framework call
  - These are calls that get us your username, your allowed/admin status, the feature flags (OdhDashboardConfig), and other various infrastructure based items
- Jupyter / Admin call
  - The Jupyter application uses a similar custom based server-logic to process creating and managing the Notebook that you can create
  - The admin screens all save data on the server using the service-account; most admins will have permissions to do this, and it is only architected this way due to legacy reasons

The effort behind these calls are being discussed how best to remove them and bring all the logic to the frontend. The majority of these calls and their accompanying logic are k8s calls. Some of which require more than basic-user permissions. The basic-user calls will be moved to the client. The more than basic-user calls will be pushed to a new component outside, but part of the umbrella, of the Dashboard (to be described at a future date).

Notes:

- (`1`) Running in development mode locally, this service-account becomes your user. This is the main reason why when starting locally, you need to be a cluster-admin on the cluster
- (`2`) The service account has no regard for permissions to do something (it has its own k8s permissions, but they are very lax on what it can't do). To this extent we have build a shim layer to check your user's permissions before allowing your call to reach the service account

### Proxy/Pass-through based efforts

These are made using your user's k8s permissions. It consumes your OpenShift OAuth Proxy value during the call and makes the call directly to the endpoint of the caller's choosing. This functionality eliminates CORS issues when talking to services that are in OpenShift Console.

- Proxy call
  - These are always POST calls due to the nature of how the HTTP spec works - we want to send metadata to the endpoint and GETs are not used for this
  - The call is made from the client with the target OpenShift Route path, request params, and the actual method you want to use
- K8s call
  - Powered by the [OpenShift SDK]
  - These are crafted with the k8s<Verb>Resource calls and makes use of a known model system
    - Each call takes a `ResourceModel` and additional params like namespace (if applicable) & name (if applicable) and the SDK crafts a url to the endpoint
    - Our server will take this call and proxy it onto the k8s API server
  - See [SDK tidbits]
- Prometheus call
  - Uses known prometheus endpoints to get data
  - Somewhat deprecated - it could probably be reworked to use the Proxy call endpoint, but serves as isolated functionality

These all share the same underlying proxy to an endpoint call, they just structure the data differently before calling.

## Client Structure

> **Note**: All content assumes you are looking at the `/frontend` folder.

When building new client features, there are a few things worth noting about the current direction of the codebase.

Topics in this section:

- [Coding Structure](#coding-structure)

### Coding Structure

> **Note**: Some folders do not fully comply with this design - there is a cleanup effort underway - do not let that dissuade you from following the correct architecture choices noted down below when adding new features / code.

- `/src/api` - The current API
  - Allowed imports: `/src/utilities`
  - This content should be isolated to the main effort to make the call
  - There is some work here to clean up a little of the data, but effectively this folder should only talk about the very specific call structure needed to do a basic action (aka, less business logic - more functionality); eg, "Get Route" not "Get Notebook Route" or "Get DS Projects Notebook Route"
    - If it's a cornerstone of data and has a specific core use-case, separate the logic; eg "Get Projects" & "Get DS Projects" are both in here
- `/src/api/types/k8s.ts` - These are the types that are for k8s API data and responses
  - The k8s calls are usually the source of these types - any resource that is `K8sResourceCommon` is a `${Name}Kind` as it has a `.kind` parameter of the name
- `/src/components` - All generic components (not tied to a feature or functionality)
  - Allowed imports: `/src/utilities`
  - These components should not contain any application data concepts - no external side effects
  - eg. "IndentSection" - a component for indenting content
- `/src/components/pf-overrides` - All PatternFly component overrides
  - Allowed imports: `/src/utilities`
  - When a PatternFly component has an issue that has not yet landed, or will not land, in official PatternFly, create an override component that should be used instead.
  - eg. "Table" - a component to build tables and fixes layout
- `/src/concepts` - Sharable code and logic for multiple areas of the application; Read as "This is conceptually about X resource, doesn't care where it is mounted"
  - Disallowed imports: `/src/pages`
  - eg. Reading project details / shared context
  - eg. Shared conceptual logic - "Components and utilities to parse and read Notebook resources"
- `/src/pages` - All specific view/route logic; Read as "This is tied to the nav item for this page"
  - Allowed imports: `*`
  - Should contain constants, utilities, hooks, and anything else that is specifically needed for that area of the application
- `/src/utilities` - All generic utilities and hook-utilities not tied to a feature or functionality
  - Allowed imports: `none`
  - These utilities should not contain any application data concepts
  - eg. `useFetchState` - the generic fetch and store data hook
  - eg. `time`, `string`, etc - generic utilities for manipulation of not feature-related data
- `/src/types.ts` - The generic types
  - Allowed to be imported everywhere
  - Should not contain any application data concepts
  - _This will have duplicates from the old design (used in `/src/services`) - they will likely duplicate some effort in `/src/k8sTypes.ts`_
- `/src/typeHelpers.ts` - All TypeScript type utilities
  - Allowed to be imported everywhere

> **Note**: if the folder was not mentioned above, it is deprecated and should be avoided when modifying code (within reason).
