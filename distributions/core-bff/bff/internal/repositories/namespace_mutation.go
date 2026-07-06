package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
)

// NamespaceMutationRepository handles namespace label/annotation mutations
// for model serving platform changes. Uses the SA clientset for privileged
// namespace patches (privileged watcher model).
type NamespaceMutationRepository struct {
	saClientset kubernetes.Interface
	logger      *slog.Logger
}

func NewNamespaceMutationRepository(saClientset kubernetes.Interface, logger *slog.Logger) *NamespaceMutationRepository {
	if logger == nil {
		logger = slog.Default()
	}
	return &NamespaceMutationRepository{saClientset: saClientset, logger: logger}
}

// ApplyMutation patches a namespace with the appropriate labels/annotations
// based on the mutation context. Returns {applied: true} on success, or
// {applied: false} if the patch fails (matching Fastify's failure contract).
func (r *NamespaceMutationRepository) ApplyMutation(ctx context.Context, namespace string, appCase models.NamespaceApplicationCase, dryRun bool) (*models.NamespaceMutationResponse, error) {
	patch, err := buildMutationPatch(appCase)
	if err != nil {
		return nil, err
	}

	patchBytes, err := json.Marshal(patch)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal namespace patch: %w", err)
	}

	opts := metav1.PatchOptions{}
	if dryRun {
		opts.DryRun = []string{metav1.DryRunAll}
	}

	_, err = r.saClientset.CoreV1().Namespaces().Patch(ctx, namespace, types.MergePatchType, patchBytes, opts)
	if err != nil {
		r.logger.Error("failed to patch namespace",
			slog.String("namespace", namespace),
			slog.String("context", fmt.Sprintf("%d", appCase)),
			slog.Any("error", err))
		return &models.NamespaceMutationResponse{Applied: false}, nil
	}

	return &models.NamespaceMutationResponse{Applied: true}, nil
}

type namespacePatch struct {
	Metadata namespacePatchMetadata `json:"metadata"`
}

type namespacePatchMetadata struct {
	Labels      map[string]interface{} `json:"labels,omitempty"`
	Annotations map[string]interface{} `json:"annotations,omitempty"`
}

func buildMutationPatch(appCase models.NamespaceApplicationCase) (*namespacePatch, error) {
	switch appCase {
	case models.KServePromotion:
		return &namespacePatch{
			Metadata: namespacePatchMetadata{
				Labels: map[string]interface{}{
					models.LabelModelMeshEnabled: "false",
				},
			},
		}, nil

	case models.KServeNIMPromotion:
		return &namespacePatch{
			Metadata: namespacePatchMetadata{
				Annotations: map[string]interface{}{
					models.AnnotationNIMSupport: "true",
				},
			},
		}, nil

	case models.ResetModelServingPlatform:
		return &namespacePatch{
			Metadata: namespacePatchMetadata{
				Labels: map[string]interface{}{
					models.LabelModelMeshEnabled: nil,
				},
				Annotations: map[string]interface{}{
					models.AnnotationNIMSupport: nil,
				},
			},
		}, nil

	default:
		return nil, fmt.Errorf("unsupported namespace mutation context: %d", appCase)
	}
}
