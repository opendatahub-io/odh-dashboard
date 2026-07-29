# `UIError`

The goal of `UIError` is to provide odh-dashboard UI packages a standard, consistent, and clear way of communicating errors to users.

## As-Is Error handling

Users today that experience errors coming from the BFF often see a PF Alert with a simple **"Something went wrong"** error in the worst case,
and in a slightly better case see a useful message: **"The connection could not be found. Verify the connection exists and try again."**

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
  /** A unique identifier for the given error being thrown. (Recommendation is for the value to be in `plain_english_camel_case`) */
  messageId: string;

  /** A plain english reason for why the error occurred. (Logged in the backend and returned to the user as a backup of the error message) */
  reason: string;

  /** The HTTP status code the error generated. */
  status: number;

  /** A transaction ID provided for the given API call. (Depends on transactionId|TraceIdKey support in go backend) */
  transactionId: string;

  /** Additional details that will be rendered for the user. (Useful for attaching additional information that may be required for easier customer support.) */
  details: Record<string, unknown>;
}
```
An example `UIError` could look like:
```JSON
{
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

``` go
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
  /*...*/

  if pipelineType != constants.PipelineTypeAutoRAG {
    errorReason := fmt.Sprintf("unsupported pipelineType %q: only %q is supported", pipelineType, constants.PipelineTypeAutoRAG)
    NewUIError(http.StatusBadRequest, "unsupported_pipeline_type", errorReason).
      WithDetail("reason", errorReason).
      WithTracing(r).
      WriteTo(w)
    return
  }

  /*...*/
}
```

## Using `UIError` on the UI

```tsx
<UIErrorHandler id="SomeComponent-UIErrorHandler" uiErrorMappings={myUIErrorMappings}>
  {myApp}
</UIErrorHandler>
```

```tsx
import { useCatchUIError } from '~/app/components/common/UIError/UIErrorHandler.tsx';

const catchUIError = useCatchUIError();

try {
  const result = someApi.callEndpoint();
} catch (error) {
  catchUIError(error, () => {
    catchAnErrorThatIsNotAUIError(error);
  });
}
```
