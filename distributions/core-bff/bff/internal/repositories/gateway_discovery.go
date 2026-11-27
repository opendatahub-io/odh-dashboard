package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
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
// list is returned as the API server's error. When a listener selects
// namespaces by label and the namespace cannot be read (forbidden or gone),
// those listeners are left out rather than guessed: the namespace labels are
// unknown, so the listener is not shown as usable.
func (r *GatewayDiscoveryRepository) Discover(ctx context.Context, namespace string) ([]models.GatewayRef, error) {
	gateways, err := r.listGateways(ctx)
	if err != nil {
		return nil, err
	}

	var nsLabels labels.Set
	selectorsUsable := false
	if needsNamespaceLabels(gateways) {
		nsLabels, selectorsUsable, err = r.namespaceLabels(ctx, namespace)
		if err != nil {
			return nil, err
		}
	}

	refs := []models.GatewayRef{}
	for i := range gateways {
		gw := &gateways[i]
		status := gatewayStatus(gw.Status.Conditions)
		for _, l := range gw.Spec.Listeners {
			if !listenerAdmits(l, gw.Namespace, namespace, nsLabels, selectorsUsable) {
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
	return refs, nil
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

// namespaceLabels reads the labels of namespace. usable is false when the
// namespace cannot be read by these credentials or no longer exists.
func (r *GatewayDiscoveryRepository) namespaceLabels(ctx context.Context, namespace string) (labels.Set, bool, error) {
	typed, err := r.clients.typed(ctx)
	if err != nil {
		return nil, false, err
	}
	ns, err := typed.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsForbidden(err) || k8serrors.IsNotFound(err) {
			return nil, false, nil
		}
		return nil, false, fmt.Errorf("failed to get namespace %q: %w", namespace, err)
	}
	return labels.Set(ns.Labels), true, nil
}

func needsNamespaceLabels(gateways []gatewayObject) bool {
	for i := range gateways {
		for _, l := range gateways[i].Spec.Listeners {
			if from := listenerFrom(l); from != nil && *from == gatewayRoutesFromSelector {
				return true
			}
		}
	}
	return false
}

func listenerFrom(l gatewayListener) *string {
	if l.AllowedRoutes == nil || l.AllowedRoutes.Namespaces == nil {
		return nil
	}
	return l.AllowedRoutes.Namespaces.From
}

// listenerAdmits mirrors model-serving-api's listenerAllowsNamespace: an unset
// From means Same (the Gateway API default), an unknown value admits nothing.
func listenerAdmits(l gatewayListener, gwNamespace, target string, nsLabels labels.Set, selectorsUsable bool) bool {
	from := listenerFrom(l)
	if from == nil {
		return gwNamespace == target
	}
	switch *from {
	case gatewayRoutesFromAll:
		return true
	case gatewayRoutesFromSame:
		return gwNamespace == target
	case gatewayRoutesFromSelector:
		if !selectorsUsable || l.AllowedRoutes.Namespaces.Selector == nil {
			return false
		}
		selector, err := metav1.LabelSelectorAsSelector(l.AllowedRoutes.Namespaces.Selector)
		if err != nil {
			return false
		}
		return selector.Matches(nsLabels)
	default:
		return false
	}
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
