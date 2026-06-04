package api

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"

	bfferrors "github.com/opendatahub-io/mod-arch-library/bff/internal/errors"
	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
)

var dns1123LabelRegex = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)

func isValidDNS1123Label(label string) bool {
	if len(label) == 0 || len(label) > 63 {
		return false
	}
	return dns1123LabelRegex.MatchString(label)
}

func isValidDNS1123Subdomain(name string) bool {
	return len(k8svalidation.IsDNS1123Subdomain(name)) == 0
}

func validateAgentPathParams(namespace, name string) error {
	if !isValidDNS1123Subdomain(namespace) {
		return fmt.Errorf("invalid namespace %q", namespace)
	}
	if !isValidDNS1123Label(name) {
		return fmt.Errorf("invalid agent name %q", name)
	}
	return nil
}

func (app *App) handleAgentRepositoryError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, bfferrors.ErrNotFound) {
		app.notFoundResponse(w, r)
		return
	}
	if errors.Is(err, bfferrors.ErrUpstreamUnavailable) {
		app.serverErrorResponse(w, r, err)
		return
	}
	app.serverErrorResponse(w, r, err)
}
