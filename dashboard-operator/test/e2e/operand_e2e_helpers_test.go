//go:build e2e

package e2e

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"
	"sync"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
	streamhttp "k8s.io/streaming/pkg/httpstream"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

const (
	platformPartOfKey   = "platform.opendatahub.io/part-of"
	platformPartOfValue = "dashboard"
	operandReadyTimeout = 10 * time.Minute
)

func waitForOperandInventory(
	c client.Client,
	namespace string,
	ownerUID types.UID,
	timeout time.Duration,
) (operandInventory, error) {
	var inventory operandInventory
	var missing []string
	err := wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		timeout,
		true,
		func(ctx context.Context) (bool, error) {
			deployments, err := listOwnedDeployments(ctx, c, namespace, ownerUID)
			if err != nil {
				return false, err
			}
			services, err := listOwnedServices(ctx, c, namespace, ownerUID)
			if err != nil {
				return false, err
			}
			inventory = operandInventory{deployments: deployments, services: services}
			missing = missingOperandResources(inventory)
			return len(missing) == 0, nil
		},
	)
	if err != nil {
		return operandInventory{}, fmt.Errorf("wait for complete operand inventory (missing %s): %w", strings.Join(missing, ", "), err)
	}

	return inventory, nil
}

func listOwnedDeployments(ctx context.Context, c client.Client, namespace string, ownerUID types.UID) ([]appsv1.Deployment, error) {
	list := &appsv1.DeploymentList{}
	if err := c.List(ctx, list,
		client.InNamespace(namespace),
		client.MatchingLabels{platformPartOfKey: platformPartOfValue},
	); err != nil {
		return nil, fmt.Errorf("list dashboard Deployments: %w", err)
	}

	owned := make([]appsv1.Deployment, 0, len(list.Items))
	for i := range list.Items {
		if ownedByUID(&list.Items[i], ownerUID) {
			owned = append(owned, list.Items[i])
		}
	}
	return owned, nil
}

func listOwnedServices(ctx context.Context, c client.Client, namespace string, ownerUID types.UID) ([]corev1.Service, error) {
	list := &corev1.ServiceList{}
	if err := c.List(ctx, list,
		client.InNamespace(namespace),
		client.MatchingLabels{platformPartOfKey: platformPartOfValue},
	); err != nil {
		return nil, fmt.Errorf("list dashboard Services: %w", err)
	}

	owned := make([]corev1.Service, 0, len(list.Items))
	for i := range list.Items {
		if ownedByUID(&list.Items[i], ownerUID) {
			owned = append(owned, list.Items[i])
		}
	}
	return owned, nil
}

func listOwnedPDBs(ctx context.Context, c client.Client, namespace string, ownerUID types.UID) ([]policyv1.PodDisruptionBudget, error) {
	list := &policyv1.PodDisruptionBudgetList{}
	if err := c.List(ctx, list,
		client.InNamespace(namespace),
		client.MatchingLabels{platformPartOfKey: platformPartOfValue},
	); err != nil {
		return nil, fmt.Errorf("list dashboard PodDisruptionBudgets: %w", err)
	}
	owned := make([]policyv1.PodDisruptionBudget, 0, len(list.Items))
	for i := range list.Items {
		if ownedByUID(&list.Items[i], ownerUID) {
			owned = append(owned, list.Items[i])
		}
	}
	return owned, nil
}

func waitForOwnedOperandDeletion(
	c client.Client,
	namespace string,
	ownerUID types.UID,
	timeout time.Duration,
) error {
	err := wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		timeout,
		true,
		func(ctx context.Context) (bool, error) {
			deployments, err := listOwnedDeployments(ctx, c, namespace, ownerUID)
			if err != nil {
				return false, err
			}
			services, err := listOwnedServices(ctx, c, namespace, ownerUID)
			if err != nil {
				return false, err
			}
			pdbs, err := listOwnedPDBs(ctx, c, namespace, ownerUID)
			if err != nil {
				return false, err
			}
			routes := &gatewayv1.HTTPRouteList{}
			if err := c.List(ctx, routes,
				client.InNamespace(namespace),
				client.MatchingLabels{platformPartOfKey: platformPartOfValue},
			); err != nil {
				return false, fmt.Errorf("list dashboard HTTPRoutes during cleanup: %w", err)
			}
			ownedRoutes := 0
			for i := range routes.Items {
				if ownedByUID(&routes.Items[i], ownerUID) {
					ownedRoutes++
				}
			}
			return len(deployments) == 0 && len(services) == 0 && len(pdbs) == 0 && ownedRoutes == 0, nil
		},
	)
	if err != nil {
		return fmt.Errorf("wait for E2E-owned operand resources to be deleted: %w", err)
	}
	return nil
}

func waitForAdmittedHTTPRoute(
	c client.Client,
	namespace string,
	ownerUID types.UID,
	timeout time.Duration,
) (*gatewayv1.HTTPRoute, error) {
	var admitted *gatewayv1.HTTPRoute
	err := wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		timeout,
		true,
		func(ctx context.Context) (bool, error) {
			list := &gatewayv1.HTTPRouteList{}
			if err := c.List(ctx, list,
				client.InNamespace(namespace),
				client.MatchingLabels{platformPartOfKey: platformPartOfValue},
			); err != nil {
				return false, err
			}
			for i := range list.Items {
				route := &list.Items[i]
				if ownedByUID(route, ownerUID) && httpRouteAdmitted(route) {
					admitted = route.DeepCopy()
					return true, nil
				}
			}
			return false, nil
		},
	)
	if err != nil {
		return nil, fmt.Errorf("wait for an owned admitted HTTPRoute: %w", err)
	}
	return admitted, nil
}

func waitForAdmittedHTTPRouteByName(
	c client.Client,
	namespace string,
	name string,
	timeout time.Duration,
) (*gatewayv1.HTTPRoute, error) {
	return waitForAdmittedHTTPRouteByNames(c, namespace, []string{name}, timeout)
}

func waitForAdmittedHTTPRouteByNames(
	c client.Client,
	namespace string,
	names []string,
	timeout time.Duration,
) (*gatewayv1.HTTPRoute, error) {
	var admitted *gatewayv1.HTTPRoute
	err := wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		timeout,
		true,
		func(ctx context.Context) (bool, error) {
			for _, name := range names {
				route := &gatewayv1.HTTPRoute{}
				key := client.ObjectKey{Namespace: namespace, Name: name}
				if err := c.Get(ctx, key, route); err != nil {
					if apierrors.IsNotFound(err) {
						continue
					}
					return false, err
				}
				if !httpRouteAdmitted(route) {
					continue
				}
				admitted = route.DeepCopy()
				return true, nil
			}
			return false, nil
		},
	)
	if err != nil {
		return nil, fmt.Errorf("wait for an admitted HTTPRoute named %s in namespace %s: %w", strings.Join(names, " or "), namespace, err)
	}
	return admitted, nil
}

func readyPodForService(ctx context.Context, c client.Client, service *corev1.Service) (*corev1.Pod, error) {
	if len(service.Spec.Selector) == 0 {
		return nil, fmt.Errorf("service %s/%s has no selector", service.Namespace, service.Name)
	}
	pods := &corev1.PodList{}
	if err := c.List(ctx, pods,
		client.InNamespace(service.Namespace),
		client.MatchingLabels(service.Spec.Selector),
	); err != nil {
		return nil, fmt.Errorf("list pods for Service %s/%s: %w", service.Namespace, service.Name, err)
	}
	for i := range pods.Items {
		pod := &pods.Items[i]
		if pod.DeletionTimestamp != nil {
			continue
		}
		for _, condition := range pod.Status.Conditions {
			if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
				return pod.DeepCopy(), nil
			}
		}
	}
	return nil, fmt.Errorf("no ready pod backs Service %s/%s", service.Namespace, service.Name)
}

func startPodPortForward(
	ctx context.Context,
	config *rest.Config,
	namespace string,
	podName string,
	remotePort int32,
) (uint16, func(), error) {
	roundTripper, upgrader, err := spdy.RoundTripperFor(config)
	if err != nil {
		return 0, nil, fmt.Errorf("create port-forward transport: %w", err)
	}
	serverURL, err := url.Parse(config.Host)
	if err != nil {
		return 0, nil, fmt.Errorf("parse API server URL: %w", err)
	}
	serverURL.Path = path.Join(serverURL.Path, "api", "v1", "namespaces", namespace, "pods", podName, "portforward")
	spdyDialer := spdy.NewDialer(upgrader, &http.Client{Transport: roundTripper}, http.MethodPost, serverURL)
	websocketDialer, err := portforward.NewSPDYOverWebsocketDialer(serverURL, config)
	if err != nil {
		return 0, nil, fmt.Errorf("create WebSocket port-forward transport: %w", err)
	}
	dialer := portforward.NewFallbackDialer(websocketDialer, spdyDialer, func(err error) bool {
		return streamhttp.IsUpgradeFailure(err) || streamhttp.IsHTTPSProxyError(err)
	})

	stopChannel := make(chan struct{})
	readyChannel := make(chan struct{})
	errorChannel := make(chan error, 1)
	var output bytes.Buffer
	var errorOutput bytes.Buffer
	forwarder, err := portforward.New(
		dialer,
		[]string{fmt.Sprintf("0:%d", remotePort)},
		stopChannel,
		readyChannel,
		&output,
		&errorOutput,
	)
	if err != nil {
		return 0, nil, fmt.Errorf("create port forward to pod %s/%s: %w", namespace, podName, err)
	}
	go func() {
		errorChannel <- forwarder.ForwardPorts()
	}()

	var stopOnce sync.Once
	stop := func() {
		stopOnce.Do(func() { close(stopChannel) })
	}
	go func() {
		<-ctx.Done()
		stop()
	}()

	select {
	case <-readyChannel:
	case err := <-errorChannel:
		stop()
		return 0, nil, fmt.Errorf("start port forward to pod %s/%s: %w: %s", namespace, podName, err, errorOutput.String())
	case <-ctx.Done():
		stop()
		return 0, nil, fmt.Errorf("start port forward to pod %s/%s: %w", namespace, podName, ctx.Err())
	}

	forwardedPorts, err := forwarder.GetPorts()
	if err != nil {
		stop()
		return 0, nil, fmt.Errorf("get forwarded port for pod %s/%s: %w", namespace, podName, err)
	}
	if len(forwardedPorts) != 1 {
		stop()
		return 0, nil, fmt.Errorf("expected one forwarded port for pod %s/%s, got %d", namespace, podName, len(forwardedPorts))
	}

	return forwardedPorts[0].Local, stop, nil
}

func getService(ctx context.Context, c client.Client, namespace, name string) (*corev1.Service, error) {
	service := &corev1.Service{}
	if err := c.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, service); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, fmt.Errorf("Service %s/%s was not created", namespace, name)
		}
		return nil, fmt.Errorf("get Service %s/%s: %w", namespace, name, err)
	}
	return service, nil
}
