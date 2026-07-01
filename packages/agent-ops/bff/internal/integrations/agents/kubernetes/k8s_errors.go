package kubernetes

import (
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

func mapK8sError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case apierrors.IsNotFound(err):
		return agents.ErrNotFound
	case apierrors.IsForbidden(err):
		return agents.ErrForbidden
	case apierrors.IsAlreadyExists(err):
		return agents.ErrAlreadyExists
	case apierrors.IsConflict(err):
		return agents.ErrConflict
	default:
		return err
	}
}
