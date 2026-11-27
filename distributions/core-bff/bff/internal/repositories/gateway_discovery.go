package repositories

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
)

const (
	// gatewayListPageSize bounds one Gateway list call.
	gatewayListPageSize = 500
	// gatewayListMaxPages stops a list whose continue tokens never end.
	gatewayListMaxPages = 100
	// gatewayDiscoveryTimeout bounds the discovery (every list page and the
	// namespace read). model-serving-api uses 5s for a cached list; the caller's
	// direct, paged list gets the access-review budget instead. The handler
	// applies the same budget to the access review and discovery together.
	GatewayDiscoveryTimeout = 10 * time.Second
)

// Gateway API AllowedRoutes.Namespaces.From values.
const (
	gatewayRoutesFromAll      = "All"
	gatewayRoutesFromSame     = "Same"
	gatewayRoutesFromSelector = "Selector"
)

// GatewayDiscoveryRepository answers which Gateway listeners admit routes from
// a namespace. It is the native replacement for model-serving-api's
// GET /api/v1/gateways on xKS (docs/model-serving-xks.md).
//
// The reads are user-initiated, so they follow the credential policy. Under
// the caller policy (xKS) both the Gateway list and the namespace read use the
// caller's credentials; nothing falls back to the service account.
type GatewayDiscoveryRepository struct {
	clients clientSource
}

// gatewayObject is the subset of a Gateway API Gateway the discovery reads.
type gatewayObject struct {
	metav1.ObjectMeta `json:"metadata"`
	Spec              struct {
		Listeners []gatewayListener `json:"listeners"`
	} `json:"spec"`
	Status struct {
		Conditions []gatewayCondition `json:"conditions"`
	} `json:"status"`
}

// gatewayCondition keeps only the fields the status needs, so a condition
// with an unparsable timestamp cannot fail the whole discovery.
type gatewayCondition struct {
	Type   string `json:"type"`
	Status string `json:"status"`
}

type gatewayListener struct {
	Name          string `json:"name"`
	AllowedRoutes *struct {
		Namespaces *struct {
			From     *string               `json:"from"`
			Selector *metav1.LabelSelector `json:"selector"`
		} `json:"namespaces"`
	} `json:"allowedRoutes"`
}

// Discover returns one GatewayRef per Gateway listener that admits routes from
// namespace. The caller must already be authorized to deploy in namespace (the
// handler checks it). The result is never nil.
//
// A Gateway API that is not installed yields an empty list. A denied Gateway
// list is returned as the API server's error. A listener that selects
// namespaces by label needs the namespace's labels; when the namespace cannot
// be read (forbidden or gone), only the kubernetes.io/metadata.name label is
// known (the API server sets it to the name), so a selector that uses only that
// label, or selects everything, is still decided and any other is left out
// rather than guessed, with a warning.
func (r *GatewayDiscoveryRepository) Discover(ctx context.Context, namespace string) ([]models.GatewayRef, error) {
	ctx, cancel := context.WithTimeout(ctx, GatewayDiscoveryTimeout)
	defer cancel()

	gateways, err := r.listGateways(ctx)
	if err != nil {
		return nil, err
	}

	view := namespaceView{labels: labels.Set{corev1.LabelMetadataName: namespace}, complete: true}
	reason := ""
	if hasSelectorListeners(gateways) {
		view, reason, err = r.readNamespace(ctx, namespace)
		if err != nil {
			return nil, err
		}
	}

	refs := []models.GatewayRef{}
	skipped := 0
	for i := range gateways {
		gw := &gateways[i]
		status := gatewayStatus(gw.Status.Conditions)
		for _, l := range gw.Spec.Listeners {
			admits, decided := listenerAdmits(l, gw.Namespace, namespace, view)
			if !decided {
				skipped++
			}
			if !admits {
				continue
			}
			refs = append(refs, models.GatewayRef{
				Name:        gw.Name,
				Namespace:   gw.Namespace,
				Listener:    l.Name,
				Status:      status,
				DisplayName: gw.Annotations[models.GatewayAnnotationDisplayName],
				Description: gw.Annotations[models.GatewayAnnotationDescription],
			})
		}
	}
	if skipped > 0 {
		// Not an error for the caller, but an install that grants Gateway read
		// without namespace get loses these listeners, so say so where an
		// operator looks.
		discoveryLogger(ctx).Warn(skippedListenersMessage(reason),
			slog.String("namespace", namespace), slog.String("code", reason),
			slog.Int("skippedListeners", skipped))
	}
	return refs, nil
}

func skippedListenersMessage(reason string) string {
	if reason == namespaceNotFound {
		return "gateway discovery left out label-selector listeners: the namespace does not exist"
	}
	return "gateway discovery left out label-selector listeners: the caller cannot read the namespace"
}

func (r *GatewayDiscoveryRepository) listGateways(ctx context.Context) ([]gatewayObject, error) {
	dyn, err := r.clients.dynamic(ctx)
	if err != nil {
		return nil, err
	}
	var out []gatewayObject
	opts := metav1.ListOptions{Limit: gatewayListPageSize}
	for page := 0; ; page++ {
		if page == gatewayListMaxPages {
			return nil, fmt.Errorf("gateway list did not finish after %d pages", gatewayListMaxPages)
		}
		list, err := dyn.Resource(models.GatewayGVR).List(ctx, opts)
		if err != nil {
			if k8serrors.IsNotFound(err) {
				// The Gateway API is not installed: there is nothing to attach to.
				return nil, nil
			}
			return nil, fmt.Errorf("failed to list gateways: %w", err)
		}
		for i := range list.Items {
			gw, err := decodeGateway(&list.Items[i])
			if err != nil {
				return nil, err
			}
			out = append(out, gw)
		}
		if list.GetContinue() == "" {
			return out, nil
		}
		opts.Continue = list.GetContinue()
	}
}

func decodeGateway(u *unstructured.Unstructured) (gatewayObject, error) {
	var gw gatewayObject
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(u.UnstructuredContent(), &gw); err != nil {
		return gatewayObject{}, fmt.Errorf("failed to decode gateway %s/%s: %w", u.GetNamespace(), u.GetName(), err)
	}
	return gw, nil
}

const (
	namespaceForbidden = "NAMESPACE_FORBIDDEN"
	namespaceNotFound  = "NAMESPACE_NOT_FOUND"
)

// namespaceView is what discovery knows about the target namespace's labels.
// complete is false when the namespace could not be read; labels then hold only
// kubernetes.io/metadata.name, which the API server always sets to the name.
type namespaceView struct {
	labels   labels.Set
	complete bool
}

// readNamespace reads the namespace's labels. When these credentials cannot
// read it, or it no longer exists, it returns the partial view and a reason code.
func (r *GatewayDiscoveryRepository) readNamespace(ctx context.Context, namespace string) (namespaceView, string, error) {
	partial := namespaceView{labels: labels.Set{corev1.LabelMetadataName: namespace}}
	typed, err := r.clients.typed(ctx)
	if err != nil {
		return namespaceView{}, "", err
	}
	ns, err := typed.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	switch {
	case err == nil:
		return namespaceView{labels: labels.Set(ns.Labels), complete: true}, "", nil
	case k8serrors.IsForbidden(err):
		return partial, namespaceForbidden, nil
	case k8serrors.IsNotFound(err):
		return partial, namespaceNotFound, nil
	default:
		return namespaceView{}, "", fmt.Errorf("failed to get namespace %q: %w", namespace, err)
	}
}

// hasSelectorListeners reports whether any listener needs namespace labels:
// a Selector listener with a selector (a nil selector admits nothing).
func hasSelectorListeners(gateways []gatewayObject) bool {
	for i := range gateways {
		for _, l := range gateways[i].Spec.Listeners {
			if from := listenerFrom(l); from != nil && *from == gatewayRoutesFromSelector && l.AllowedRoutes.Namespaces.Selector != nil {
				return true
			}
		}
	}
	return false
}

// discoveryLogger is the request's trace logger when there is one.
func discoveryLogger(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(constants.TraceLoggerKey).(*slog.Logger); ok && logger != nil {
		return logger
	}
	return slog.Default()
}

func listenerFrom(l gatewayListener) *string {
	if l.AllowedRoutes == nil || l.AllowedRoutes.Namespaces == nil {
		return nil
	}
	return l.AllowedRoutes.Namespaces.From
}

// listenerAdmits mirrors model-serving-api's listenerAllowsNamespace: an unset
// From means Same (the Gateway API default), an unknown value admits nothing.
// decided is false only for a Selector listener whose answer depends on labels
// the view does not have; such a listener is not admitted.
func listenerAdmits(l gatewayListener, gwNamespace, target string, view namespaceView) (admits, decided bool) {
	from := listenerFrom(l)
	if from == nil {
		return gwNamespace == target, true
	}
	switch *from {
	case gatewayRoutesFromAll:
		return true, true
	case gatewayRoutesFromSame:
		return gwNamespace == target, true
	case gatewayRoutesFromSelector:
		if l.AllowedRoutes.Namespaces.Selector == nil {
			return false, true
		}
		selector, err := metav1.LabelSelectorAsSelector(l.AllowedRoutes.Namespaces.Selector)
		if err != nil {
			return false, true
		}
		if !view.complete && !usesOnlyNameLabel(selector) {
			return false, false
		}
		return selector.Matches(view.labels), true
	default:
		return false, true
	}
}

// usesOnlyNameLabel reports whether selector can be decided from
// kubernetes.io/metadata.name alone (an empty selector included).
func usesOnlyNameLabel(selector labels.Selector) bool {
	reqs, selectable := selector.Requirements()
	if !selectable {
		return false
	}
	for _, req := range reqs {
		if req.Key() != corev1.LabelMetadataName {
			return false
		}
	}
	return true
}

// gatewayStatus is Ready when Accepted and Programmed are both True, NotReady
// when either is False, and Unknown otherwise.
func gatewayStatus(conditions []gatewayCondition) string {
	accepted := findGatewayCondition(conditions, "Accepted")
	programmed := findGatewayCondition(conditions, "Programmed")
	if accepted == string(metav1.ConditionTrue) && programmed == string(metav1.ConditionTrue) {
		return models.GatewayStatusReady
	}
	if accepted == string(metav1.ConditionFalse) || programmed == string(metav1.ConditionFalse) {
		return models.GatewayStatusNotReady
	}
	return models.GatewayStatusUnknown
}

func findGatewayCondition(conditions []gatewayCondition, condType string) string {
	for i := range conditions {
		if conditions[i].Type == condType {
			return conditions[i].Status
		}
	}
	return ""
}
