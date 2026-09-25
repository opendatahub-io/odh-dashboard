package kubernetes

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	sandboxPort         = int32(8321)
	sandboxPortName     = "http"
	sandboxSelectorPoll = 2 * time.Second
	sandboxSelectorTTL  = 60 * time.Second
)

// WaitForSandboxSelector polls sandbox.status.selector until it is populated and returns the
// pod label selector map. The Sandbox controller populates this after creating the headless
// Service (usually within a few seconds of CR creation).
func (kc *TokenKubernetesClient) WaitForSandboxSelector(
	ctx context.Context,
	namespace, sandboxName string,
) (map[string]string, error) {
	deadline := time.Now().Add(sandboxSelectorTTL)
	for {
		sandbox := &unstructured.Unstructured{}
		sandbox.SetGroupVersionKind(schema.GroupVersionKind{
			Group:   sandboxGroup,
			Version: sandboxVersion,
			Kind:    sandboxKind,
		})
		if err := kc.Client.Get(ctx, client.ObjectKey{Namespace: namespace, Name: sandboxName}, sandbox); err != nil {
			return nil, fmt.Errorf("failed to read Sandbox %s: %w", sandboxName, err)
		}
		// status.selector is a label-selector string, e.g.
		// "agents.x-k8s.io/sandbox-name-hash=b5604712"
		selectorStr, found, err := unstructured.NestedString(sandbox.Object, "status", "selector")
		if err == nil && found && selectorStr != "" {
			selector := parseLabelSelectorString(selectorStr)
			if len(selector) > 0 {
				kc.Logger.Info("sandbox selector ready", "name", sandboxName, "selector", selector)
				return selector, nil
			}
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("timed out after %s waiting for Sandbox %s selector", sandboxSelectorTTL, sandboxName)
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(sandboxSelectorPoll):
		}
	}
}

// CreateSandboxService creates a ClusterIP Service named <sandboxName>-ext that targets the
// Sandbox pod using the selector from sandbox.status.selector. The Sandbox controller's own
// headless Service (ClusterIP: None) cannot back an OpenShift Route, so this service provides
// the stable cluster IP required for Route backing.
func (kc *TokenKubernetesClient) CreateSandboxService(
	ctx context.Context,
	namespace, sandboxName string,
	selector map[string]string,
) error {
	ownerRef, err := kc.sandboxOwnerReference(ctx, namespace, sandboxName)
	if err != nil {
		return err
	}
	svc := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      sandboxName + "-ext",
			Namespace: namespace,
			OwnerReferences: []metav1.OwnerReference{
				ownerRef,
			},
			Labels: map[string]string{
				dashboardLabel: "true",
			},
		},
		Spec: corev1.ServiceSpec{
			Selector: selector,
			Ports: []corev1.ServicePort{
				{
					Name:       sandboxPortName,
					Port:       sandboxPort,
					TargetPort: intstr.FromInt32(sandboxPort),
					Protocol:   corev1.ProtocolTCP,
				},
			},
		},
	}
	if err := kc.Client.Create(ctx, svc); err != nil {
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to create sandbox Service", "error", err, "namespace", namespace)
			return &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to create sandbox Service",
				},
			}
		}
		kc.Logger.Error("failed to create sandbox Service", "error", err, "name", sandboxName+"-ext")
		return fmt.Errorf("failed to create sandbox Service: %w", err)
	}
	kc.Logger.Info("created sandbox Service", "name", sandboxName+"-ext", "namespace", namespace)
	return nil
}

// CreateSandboxRoute creates an edge-TLS OpenShift Route named <sandboxName> pointing to the
// ClusterIP Service. spec.host is intentionally omitted so OpenShift's admission controller
// assigns it automatically as <route-name>-<namespace>.<cluster-domain>. Returns the full
// HTTPS URL read from spec.host on the created object.
func (kc *TokenKubernetesClient) CreateSandboxRoute(
	ctx context.Context,
	namespace, sandboxName string,
) (string, error) {
	ownerRef, err := kc.sandboxOwnerReference(ctx, namespace, sandboxName)
	if err != nil {
		return "", err
	}
	route := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "route.openshift.io/v1",
			"kind":       "Route",
			"metadata": map[string]interface{}{
				"name":      sandboxName,
				"namespace": namespace,
				"ownerReferences": []interface{}{
					map[string]interface{}{
						"apiVersion": ownerRef.APIVersion,
						"kind":       ownerRef.Kind,
						"name":       ownerRef.Name,
						"uid":        string(ownerRef.UID),
						"controller": true,
					},
				},
				"labels": map[string]interface{}{
					dashboardLabel: "true",
				},
			},
			"spec": map[string]interface{}{
				"to": map[string]interface{}{
					"kind": "Service",
					"name": sandboxName + "-ext",
				},
				"port": map[string]interface{}{
					"targetPort": sandboxPortName,
				},
				"tls": map[string]interface{}{
					"termination":                   "edge",
					"insecureEdgeTerminationPolicy": "Redirect",
				},
			},
		},
	}
	route.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "route.openshift.io",
		Version: "v1",
		Kind:    "Route",
	})
	if err := kc.Client.Create(ctx, route); err != nil {
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to create sandbox Route", "error", err, "namespace", namespace)
			return "", &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to create sandbox Route",
				},
			}
		}
		kc.Logger.Error("failed to create sandbox Route", "error", err, "name", sandboxName)
		return "", fmt.Errorf("failed to create sandbox Route: %w", err)
	}
	// OpenShift's admission controller populates spec.host synchronously during create.
	host, _, _ := unstructured.NestedString(route.Object, "spec", "host") //nolint:errcheck
	url := "https://" + host
	kc.Logger.Info("created sandbox Route", "name", sandboxName, "url", url)
	return url, nil
}

// parseLabelSelectorString converts a Kubernetes label selector string of the form
// "key1=val1,key2=val2" into a map. The Sandbox controller writes status.selector as
// this string format rather than a map.
func parseLabelSelectorString(s string) map[string]string {
	result := make(map[string]string)
	for _, pair := range strings.Split(s, ",") {
		kv := strings.SplitN(strings.TrimSpace(pair), "=", 2)
		if len(kv) == 2 && kv[0] != "" {
			result[kv[0]] = kv[1]
		}
	}
	return result
}
