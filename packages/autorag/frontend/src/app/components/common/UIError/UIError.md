# `UIError`

The goal of `UIError` is to provide odh-dashboard UI packages a standard, consistent, and clear way of communicating errors to users.

## As-Is Error handling

Users today that experience errors coming from the BFF often see a PatternFly Alert with a simple **"Something went wrong"** error in the worst case,
and in a slightly better case see a useful message: **"The connection could not be found."**

This current approach works okay for simple cases but leaves a few key error details out of view from the user.
Things like logs, detailed error info, and a more verbose error message with a remedy are not found.

By providing all the necessary information of an error to the user, they can more easily arrive at a solution and continue with successful use of the UI.

## The `UIError` strategy

This strategy consists of the following parts:
- `UIError` a consistent - "rich" - data shape that communicates errors clearly to users
- BFF: golang struct with constructor and utility functions
- UI: TS types, class and util functions to manage the errors coming from requests to the BFF
- UI: A React handler component for managing the rendering of the `UIError`s as PF Alerts, PF Modal.

## The `UIError` shape

The type definition for `UIError` outlines it's fields and it's use:
```TS
export interface UIError {
  /** Discriminator field to prevent false positives when matching API responses. */
  type: 'UIError';

  /** A unique identifier for the given error being thrown. (Recommendation is for the value to be in `plain_english_snake_case`) */
  messageId: string;

  /** A plain english reason for why the error occurred. (Logged in the backend and returned to the user as a backup of the error message) */
  reason: string;

  /** The HTTP status code the error generated. */
  status: number;

  /** A transaction ID provided for the given API call. (Depends on transactionId support in go backend) */
  transactionId?: string;

  /** Additional details that will be rendered for the user. (Useful for attaching additional information that may be required for easier customer support.) */
  details: Record<string, unknown> | null;
}
```

An example `UIError` could look like:
```JSON
{
    "type": "UIError",  
    "messageId": "invalid_pipeline_run_name",
    "reason": "pipeline run name \"invalid-name-00000000-0000-0000-0000-000000000000\" is not allowed",
    "status": 400,
    "transactionId": "00000000-0000-0000-0000-000000000000",
    "details": {
        "displayName": "invalid-name-00000000-0000-0000-0000-000000000000"
    }
}
```

## Using `UIError` in the BFF

While handling errors in the BFF, the `UIError` struct's `NewUIError` function can be used.
The builder pattern allows various items to be configured in one shot.
```GO
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
  /*...*/

  if !isAllowed(pipelineName) {
    errorReason := fmt.Sprintf("pipeline run name %q is not allowed", pipelineName)
    NewUIError(http.StatusBadRequest, "invalid_pipeline_run_name", errorReason).
      WithDetail("displayName", pipelineName).
      WithTracing(r).
      WriteTo(w)
    return
  }

  /*...*/
}
```

Since the `details` field is a configurable map of data the `WithDetail` function should be called multiple times to add more detail keys
```GO
NewUIError(http.StatusBadRequest, "example_error_id", "An error happened...").
  WithDetail("detail_a", detailA).
  WithDetail("detail_b", detailB).
  WithDetail("detail_c", detailC).
  WithTracing(r).
  WriteTo(w)
```

### BFF Transaction IDs

odh-dashboard BFF mod-arch generated packages should come with some level of transaction ID support via the `EnableTelemetry` middleware.
Added to the context of all requests when this is enabled is a `TraceIdKey` variable that `UIError` will make use of.

## Using `UIError` on the UI

When rendering your app, make use of the high-level `UIErrorHandler` component.
```TSX
<UIErrorHandler id="SomeComponent-UIErrorHandler" uiErrorMappings={myUIErrorMappings}>
  {myApp}
</UIErrorHandler>
```

The `UIErrorHandler` component offers a React hook that enables the easy rendering of `UIError`s we get back from API requests.  
```TSX
import { useCatchUIError } from '~/app/components/common/UIError/UIErrorHandler.tsx';

const catchUIError = useCatchUIError();

try {
  const result = await someApi.callEndpoint();
} catch (error) {
  catchUIError(error, () => {
    catchAnErrorThatIsNotAUIError(error);
  });
}
```
