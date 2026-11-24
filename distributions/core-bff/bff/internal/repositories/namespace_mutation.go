package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
)

// NamespaceMutationRepository handles namespace label/annotation mutations
// for model serving platform changes. The patch follows the credential policy:
// on OpenShift the service account patches after the handler's SSAR (privileged
// watcher model); on xKS the caller patches, so the API server authorizes
// "patch namespaces" for the caller rather than inferring it from a
// servingruntimes review.
type NamespaceMutationRepository struct {
	clients clientSource
}

func NewNamespaceMutationRepository(saClientset kubernetes.Interface) *NamespaceMutationRepository {
	return &NamespaceMutationRepository{clients: saSource(saClientset, nil)}
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

	cs, err := r.clients.typed(ctx)
	if err != nil {
		return err
	}
	_, err = cs.CoreV1().Namespaces().Patch(ctx, namespace, types.MergePatchType, patchBytes, opts)
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

// IsCredentialFailure reports whether err from ApplyMutation means the caller's
// own credential could not be used (caller policy only): no resolved identity,
// or a token the API server rejected. A mutation the credential may not
// perform, or a server-side failure building clients, is not one. Under the
// service-account policy a 401 concerns the dashboard's credential, never the
// caller's.
func (r *NamespaceMutationRepository) IsCredentialFailure(err error) bool {
	return r.clients.policy == CredentialPolicyCaller &&
		(errors.Is(err, httpcontract.ErrIdentityUnresolved) || k8serrors.IsUnauthorized(err))
}
