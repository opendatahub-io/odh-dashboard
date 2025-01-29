# External Redirects

The supported external redirect paths in the application.

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
