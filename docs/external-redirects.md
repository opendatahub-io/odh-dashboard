# External Redirects

The supported external redirect paths in the application.

## Why use `/external`?

`<dashboard-url>/external` is a reserved path on our route to allow for us to more easily expose a route to the external world (e.g., Elyra) — this way we can rework our internal route structures all we want and never break external apps.

## Supported Redirects

### Pipeline SDK Redirects

Redirecting from Pipeline SDK output URLs to internal dashboard routes.

#### Supported URL Patterns

1. **Experiment Details**
   ```
   /external/pipelinesSdk/{namespace}/#/experiments/details/{experimentId}
   ```
   Redirects to the internal experiment runs route for the specified experiment.

2. **Run Details**
   ```
   /external/pipelinesSdk/{namespace}/#/runs/details/{runId}
   ```
   Redirects to the internal pipeline run details route for the specified run.
