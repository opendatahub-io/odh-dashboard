package controller

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func legacyMaaSPortalDeploymentExists(ctx context.Context, cli client.Client, namespace string) (bool, error) {
	err := cli.Get(ctx, client.ObjectKey{Name: legacyMaaSPortalName, Namespace: namespace}, &appsv1.Deployment{})
	if apierrors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("getting legacy MaaS Portal Deployment: %w", err)
	}
	return true, nil
}

// preserveLegacyMaaSPortalNetworkAccess keeps the serving legacy backend usable
// while shared policies are upgraded before portal route cutover. Once cleanup
// removes the old Deployment, the next render restores the new-only policies.
func preserveLegacyMaaSPortalNetworkAccess(ctx context.Context, cli client.Client, resources []unstructured.Unstructured, namespace string) error {
	exists, err := legacyMaaSPortalDeploymentExists(ctx, cli, namespace)
	if err != nil || !exists {
		return err
	}
	for i := range resources {
		if err := addLegacyMaaSPortalNetworkPolicyPeers(&resources[i]); err != nil {
			return err
		}
	}
	return nil
}

func addLegacyMaaSPortalNetworkPolicyPeers(resource *unstructured.Unstructured) error {
	if resource.GetKind() != "NetworkPolicy" {
		return nil
	}
	var policy networkingv1.NetworkPolicy
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(resource.Object, &policy); err != nil {
		return fmt.Errorf("converting MaaS Portal dependency NetworkPolicy: %w", err)
	}
	for i := range policy.Spec.Ingress {
		ingress := &policy.Spec.Ingress[i]
		ingress.From = appendLegacyMaaSPortalNetworkPeers(ingress.From)
	}
	object, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&policy)
	if err != nil {
		return fmt.Errorf("converting MaaS Portal dependency NetworkPolicy: %w", err)
	}
	resource.Object = object
	return nil
}

func appendLegacyMaaSPortalNetworkPeers(peers []networkingv1.NetworkPolicyPeer) []networkingv1.NetworkPolicyPeer {
	// range visits only the original peers; appended legacy peers are not revisited.
	for _, peer := range peers {
		if legacyPeer := legacyMaaSPortalNetworkPeer(peer); legacyPeer != nil {
			peers = append(peers, *legacyPeer)
		}
	}
	return peers
}

func legacyMaaSPortalNetworkPeer(peer networkingv1.NetworkPolicyPeer) *networkingv1.NetworkPolicyPeer {
	if peer.PodSelector == nil {
		return nil
	}
	deployment := peer.PodSelector.MatchLabels["deployment"] == maasPortalDeploymentName
	partOf := peer.PodSelector.MatchLabels["app.kubernetes.io/part-of"] == maasPortalDeploymentName
	if !deployment && !partOf {
		return nil
	}
	legacyPeer := peer.DeepCopy()
	if deployment {
		legacyPeer.PodSelector.MatchLabels["deployment"] = legacyMaaSPortalName
	}
	if partOf {
		legacyPeer.PodSelector.MatchLabels["app.kubernetes.io/part-of"] = legacyMaaSPortalName
	}
	return legacyPeer
}
