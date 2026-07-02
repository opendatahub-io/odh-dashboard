package fake

import (
	"net/http"

	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// IdentityExtractor is a fake implementation of kubernetes.IdentityExtractor
// for local development and testing.
type IdentityExtractor struct{}

var _ kubernetes.IdentityExtractor = (*IdentityExtractor)(nil)

func (e *IdentityExtractor) Extract(_ http.Header) (*kubernetes.RequestIdentity, error) {
	return &kubernetes.RequestIdentity{
		UserID: "fake-user@example.com",
		Groups: []string{"system:masters"},
	}, nil
}
