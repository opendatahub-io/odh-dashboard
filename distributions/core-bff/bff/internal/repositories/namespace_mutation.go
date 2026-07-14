package repositories

import (
	"context"
	"encoding/json"
	"fmt"

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
}

func NewNamespaceMutationRepository(saClientset kubernetes.Interface) *NamespaceMutationRepository {
	return &NamespaceMutationRepository{saClientset: saClientset}
}

// ApplyMutation patches a namespace with the appropriate labels/annotations
// based on the mutation context. Returns an error if the patch fails;
// the caller decides whether to surface or absorb it.
func (r *NamespaceMutationRepository) ApplyMutation(ctx context.Context, namespace string, appCase models.NamespaceApplicationCase, dryRun bool) error {
	patch, err := buildMutationPatch(appCase)
	if err != nil {
		return err
	}

	patchBytes, err := json.Marshal(patch)
	if err != nil {
		return fmt.Errorf("failed to marshal namespace patch: %w", err)
	}

	opts := metav1.PatchOptions{}
	if dryRun {
		opts.DryRun = []string{metav1.DryRunAll}
	}

	_, err = r.saClientset.CoreV1().Namespaces().Patch(ctx, namespace, types.MergePatchType, patchBytes, opts)
	if err != nil {
		return fmt.Errorf("failed to patch namespace %q: %w", namespace, err)
	}

	return nil
}

type namespacePatch struct {
	Metadata namespacePatchMetadata `json:"metadata"`
}

type namespacePatchMetadata struct {
	Labels      map[string]any `json:"labels,omitempty"`
	Annotations map[string]any `json:"annotations,omitempty"`
}

func buildMutationPatch(appCase models.NamespaceApplicationCase) (*namespacePatch, error) {
	switch appCase {
	case models.KServePromotion:
		return &namespacePatch{
			Metadata: namespacePatchMetadata{
				Labels: map[string]any{
					models.LabelModelMeshEnabled: "false",
				},
			},
		}, nil

	case models.KServeNIMPromotion:
		return &namespacePatch{
			Metadata: namespacePatchMetadata{
				Annotations: map[string]any{
					models.AnnotationNIMSupport: "true",
				},
			},
		}, nil

	case models.ResetModelServingPlatform:
		return &namespacePatch{
			Metadata: namespacePatchMetadata{
				Labels: map[string]any{
					models.LabelModelMeshEnabled: nil,
				},
				Annotations: map[string]any{
					models.AnnotationNIMSupport: nil,
				},
			},
		}, nil

	default:
		return nil, fmt.Errorf("unsupported namespace mutation context: %d", appCase)
	}
}
