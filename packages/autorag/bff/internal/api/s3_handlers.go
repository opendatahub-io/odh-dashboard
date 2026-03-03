package api

import (
  "errors"
  "fmt"
  "net/http"

  "github.com/julienschmidt/httprouter"
  "github.com/opendatahub-io/autorag-library/bff/internal/constants"
  "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// GetS3FilesHandler retrieves files from S3 storage using credentials from a Kubernetes secret.
func (app *App) GetS3FilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
  app.logger.Warn("In progress...")

  // Validate identity
  ctx := r.Context()
  identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
  if !ok || identity == nil {
    app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
    return
  }

  // Validate parameters
  namespace, secretName, bucket, path, parameterError := validateParameters(r)
  if parameterError != nil {
    app.badRequestResponse(w, r, fmt.Errorf(err.Error()))
    return
  }

  // Main
  app.logger.Info(fmt.Sprintf("GetS3FilesHandler got value for namespace: %s", namespace))
  app.logger.Info(fmt.Sprintf("GetS3FilesHandler got value for secretName: %s", secretName))
  app.logger.Info(fmt.Sprintf("GetS3FilesHandler got value for bucket: %s", bucket))
  app.logger.Info(fmt.Sprintf("GetS3FilesHandler got value for path: %s", path))
}

func validateParameters(r *http.Request) (namespace string, secretName string, bucket string, path string, err error) {
  queryParams := r.URL.Query()

  namespace = queryParams.Get("namespace")
  if namespace == "" {
    return "", "", "", "", errors.New("query parameter 'namespace' is required")
  }

  secretName = queryParams.Get("secret_name")
  if secretName == "" {
    return "", "", "", "", errors.New("query parameter 'secret_name' is required")
  }

  bucket = queryParams.Get("bucket")
  if bucket == "" {
    return "", "", "", "", errors.New("query parameter 'bucket' is required")
  }

  path = queryParams.Get("path")
  if path == "" {
    return "", "", "", "", errors.New("query parameter 'path' is required")
  }

  return namespace, secretName, bucket, path, nil
}
