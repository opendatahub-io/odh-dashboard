package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// prepareKFPSafeRunRequest rewrites non-ASCII CSV column headers to ASCII aliases before
// submitting a run to Kubeflow Pipelines. KFP persists substituted parameters inside
// WorkflowRuntimeManifest; MySQL-backed deployments commonly reject multibyte UTF-8 there.
func (app *App) prepareKFPSafeRunRequest(
	r *http.Request,
	req models.CreateAutoMLRunRequest,
	pipelineType string,
) (models.CreateAutoMLRunRequest, error) {
	nonASCIIColumns := repositories.CollectNonASCIIKFPColumnNames(req, pipelineType)
	if len(nonASCIIColumns) == 0 {
		return req, nil
	}
	if app.config.MockPipelineServerClient {
		// Mock KFP does not enforce WorkflowRuntimeManifest charset limits.
		return req, nil
	}

	s3, err := app.resolveS3ClientForRun(r, req.TrainDataSecretName, req.TrainDataBucketName)
	if err != nil {
		return req, err
	}

	reader, _, err := s3.client.GetObject(r.Context(), s3.bucket, req.TrainDataFileKey)
	if err != nil {
		if isS3ConnectivityError(err) {
			return req, fmt.Errorf("failed to read training data from S3: %w", err)
		}
		return req, fmt.Errorf("failed to read training data CSV %q from bucket %q: %w", req.TrainDataFileKey, s3.bucket, err)
	}
	defer reader.Close()

	csvData, err := readTrainingCSV(reader)
	if err != nil {
		return req, err
	}

	aliases := repositories.BuildKFPColumnAliasMap(nonASCIIColumns)
	rewrittenCSV, err := repositories.RewriteCSVHeaderNames(csvData, aliases)
	if err != nil {
		return req, repositories.NewValidationError(fmt.Sprintf("failed to prepare training data for pipeline server: %s", err.Error()))
	}

	asciiKey := repositories.DeriveASCIICompatibleCSVKey(req.TrainDataFileKey, rewrittenCSV)
	if err := uploadASCIICompatibleTrainingCSV(r.Context(), s3.client, s3.bucket, asciiKey, rewrittenCSV); err != nil {
		return req, err
	}

	return repositories.ApplyKFPColumnAliasMap(req, aliases, pipelineType, asciiKey), nil
}

func (app *App) resolveS3ClientForRun(r *http.Request, secretName, bucket string) (*resolvedS3, error) {
	ctx := r.Context()

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		return nil, fmt.Errorf("missing RequestIdentity in context")
	}

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		return nil, fmt.Errorf("missing namespace in context")
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	secretName = strings.TrimSpace(secretName)
	bucket = strings.TrimSpace(bucket)
	if secretName == "" {
		return nil, repositories.NewValidationError("train_data_secret_name is required to prepare non-ASCII column names for pipeline server")
	}
	if bucket == "" {
		return nil, repositories.NewValidationError("train_data_bucket_name is required to prepare non-ASCII column names for pipeline server")
	}

	creds, err := app.repositories.S3.GetS3Credentials(ctx, k8sClient, namespace, secretName, identity)
	if err != nil {
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				return nil, repositories.NewValidationError(fmt.Sprintf("namespace '%s' or secret '%s' not found", namespace, secretName))
			}
			if apierrors.IsForbidden(statusErr) {
				return nil, fmt.Errorf("access denied reading S3 secret %q: %w", secretName, err)
			}
		}
		return nil, fmt.Errorf("failed to resolve S3 credentials for secret %q: %w", secretName, err)
	}

	if app.portForwardManager != nil && creds.EndpointURL != "" {
		if rewritten, pfErr := app.portForwardManager.ForwardURL(ctx, creds.EndpointURL); pfErr != nil {
			app.logger.Warn("dynamic port-forward failed for S3 endpoint, using original URL",
				"error", pfErr, "url", creds.EndpointURL)
		} else {
			creds.EndpointURL = rewritten
		}
	}

	s3Client, err := app.s3ClientFactory.CreateClient(creds)
	if err != nil {
		if errors.Is(err, s3int.ErrEndpointValidation) {
			return nil, repositories.NewValidationError(err.Error())
		}
		return nil, fmt.Errorf("failed to create S3 client: %w", err)
	}

	return &resolvedS3{client: s3Client, bucket: bucket}, nil
}

func readTrainingCSV(reader io.Reader) ([]byte, error) {
	csvData, err := io.ReadAll(io.LimitReader(reader, s3MaxUploadFileBytes+1))
	if err != nil {
		return nil, fmt.Errorf("failed to read training data CSV: %w", err)
	}
	if int64(len(csvData)) > s3MaxUploadFileBytes {
		return nil, repositories.NewValidationError(s3FilePartTooLargeMsg)
	}
	return csvData, nil
}

func uploadASCIICompatibleTrainingCSV(
	ctx context.Context,
	client s3int.S3ClientInterface,
	bucket, asciiKey string,
	rewrittenCSV []byte,
) error {
	if err := client.UploadObject(ctx, bucket, asciiKey, bytes.NewReader(rewrittenCSV), "text/csv"); err != nil {
		if errors.Is(err, s3int.ErrObjectAlreadyExists) {
			if verifyErr := verifyASCIICompatibleCSVContent(ctx, client, bucket, asciiKey, rewrittenCSV); verifyErr != nil {
				return verifyErr
			}
			return nil
		}
		if isS3ConnectivityError(err) {
			return fmt.Errorf("failed to upload ASCII-compatible training data to S3: %w", err)
		}
		return fmt.Errorf("failed to upload ASCII-compatible training data to S3 key %q: %w", asciiKey, err)
	}
	return nil
}

func verifyASCIICompatibleCSVContent(
	ctx context.Context,
	client s3int.S3ClientInterface,
	bucket, key string,
	expected []byte,
) error {
	reader, _, err := client.GetObject(ctx, bucket, key)
	if err != nil {
		return fmt.Errorf("failed to read existing ASCII-compatible training data from S3 key %q: %w", key, err)
	}
	defer reader.Close()

	existing, err := readTrainingCSV(reader)
	if err != nil {
		return err
	}
	if !bytes.Equal(existing, expected) {
		return fmt.Errorf("existing ASCII-compatible training data at %q does not match expected rewritten CSV", key)
	}
	return nil
}
