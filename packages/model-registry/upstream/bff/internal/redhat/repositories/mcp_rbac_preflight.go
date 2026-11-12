package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	authv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ErrMcpDeploymentRBAC identifies a missing dashboard service-account
// permission. It is deliberately separate from a user-facing MCPServer
// authorization failure: the BFF service account performs the Gateway-layer
// orchestration on behalf of the signed-in user.
var ErrMcpDeploymentRBAC = errors.New("MCP deployment RBAC preflight failed")

const mcpDeploymentRBACPreflightTimeout = 30 * time.Second

type mcpDeploymentPermission struct {
	verb      string
	group     string
	resource  string
	namespace string
	name      string
}

func (p mcpDeploymentPermission) description() string {
	resource := p.resource
	if p.group != "" {
		resource += "." + p.group
	}
	scope := "cluster-wide"
	if p.namespace != "" {
		scope = "namespace " + p.namespace
	}
	if p.name != "" {
		scope += ", name " + p.name
	}
	return fmt.Sprintf("%s %s (%s)", p.verb, resource, scope)
}

// preflightMcpDeploymentRBAC verifies the complete mutation path before the
// installer creates a ServiceAccount, RoleBinding, ConfigMap, MCPServer, or
// Gateway registration. This keeps arbitrary clusters from failing halfway
// through a one-click operation and makes the BFF's required authority
// auditable through the Project Matrix ClusterRole.
func preflightMcpDeploymentRBAC(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	server models.MCPServer,
	req models.McpDeploymentCreateRequest,
	target *mcpGatewayTarget,
) error {
	ctx, cancel := context.WithTimeout(ctx, mcpDeploymentRBACPreflightTimeout)
	defer cancel()

	cfg, err := restConfigForClient(client)
	if err != nil {
		return fmt.Errorf("failed to build RBAC preflight client: %w", err)
	}
	core, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return fmt.Errorf("failed to build RBAC preflight client: %w", err)
	}

	permissions := []mcpDeploymentPermission{
		{verb: "get", group: mcpServerGVR.Group, resource: mcpServerGVR.Resource, namespace: namespace, name: server.Metadata.Name},
		{verb: "list", group: mcpServerGVR.Group, resource: mcpServerGVR.Resource, namespace: namespace},
		{verb: "watch", group: mcpServerGVR.Group, resource: mcpServerGVR.Resource, namespace: namespace},
		{verb: "create", group: mcpServerGVR.Group, resource: mcpServerGVR.Resource, namespace: namespace},
		{verb: "delete", group: mcpServerGVR.Group, resource: mcpServerGVR.Resource, namespace: namespace, name: server.Metadata.Name},
		// The installer verifies operator-owned dependents during rollback. These
		// are read-only and remain namespace-scoped to the selected project.
		{verb: "get", resource: "pods", namespace: namespace},
		{verb: "list", resource: "pods", namespace: namespace},
		{verb: "get", group: "apps", resource: "deployments", namespace: namespace},
		{verb: "list", group: "apps", resource: "deployments", namespace: namespace},
		{verb: "get", group: "apps", resource: "replicasets", namespace: namespace},
		{verb: "list", group: "apps", resource: "replicasets", namespace: namespace},
	}
	if req.GatewayRegistration != nil {
		permissions = append(permissions,
			mcpDeploymentPermission{verb: "list", group: mcpGatewayExtensionGVR.Group, resource: mcpGatewayExtensionGVR.Resource},
			mcpDeploymentPermission{verb: "list", group: mcpServerRegistrationGVR.Group, resource: mcpServerRegistrationGVR.Resource},
			mcpDeploymentPermission{verb: "list", group: mcpHTTPRouteGVR.Group, resource: mcpHTTPRouteGVR.Resource},
			mcpDeploymentPermission{verb: "list", group: mcpReferenceGrantGVR.Group, resource: mcpReferenceGrantGVR.Resource},
		)
		if target != nil {
			permissions = append(permissions,
				mcpDeploymentPermission{verb: "get", group: gatewayGVR.Group, resource: gatewayGVR.Resource, namespace: target.namespace, name: target.name},
				mcpDeploymentPermission{verb: "get", group: mcpHTTPRouteGVR.Group, resource: mcpHTTPRouteGVR.Resource, namespace: target.namespace, name: mcpGatewayRouteName(server.Metadata.Name)},
				mcpDeploymentPermission{verb: "create", group: mcpHTTPRouteGVR.Group, resource: mcpHTTPRouteGVR.Resource, namespace: target.namespace},
				mcpDeploymentPermission{verb: "delete", group: mcpHTTPRouteGVR.Group, resource: mcpHTTPRouteGVR.Resource, namespace: target.namespace, name: mcpGatewayRouteName(server.Metadata.Name)},
				mcpDeploymentPermission{verb: "get", group: mcpReferenceGrantGVR.Group, resource: mcpReferenceGrantGVR.Resource, namespace: namespace, name: mcpGatewayReferenceGrantName(server.Metadata.Name)},
				mcpDeploymentPermission{verb: "create", group: mcpReferenceGrantGVR.Group, resource: mcpReferenceGrantGVR.Resource, namespace: namespace},
				mcpDeploymentPermission{verb: "delete", group: mcpReferenceGrantGVR.Group, resource: mcpReferenceGrantGVR.Resource, namespace: namespace, name: mcpGatewayReferenceGrantName(server.Metadata.Name)},
				mcpDeploymentPermission{verb: "get", group: mcpServerRegistrationGVR.Group, resource: mcpServerRegistrationGVR.Resource, namespace: target.namespace, name: server.Metadata.Name},
				mcpDeploymentPermission{verb: "create", group: mcpServerRegistrationGVR.Group, resource: mcpServerRegistrationGVR.Resource, namespace: target.namespace},
				mcpDeploymentPermission{verb: "delete", group: mcpServerRegistrationGVR.Group, resource: mcpServerRegistrationGVR.Resource, namespace: target.namespace, name: server.Metadata.Name},
			)
		}
	}

	for _, prerequisite := range req.Prerequisites {
		switch prerequisite.Type {
		case "ServiceAccount":
			permissions = append(permissions,
				mcpDeploymentPermission{verb: "get", resource: "serviceaccounts", namespace: namespace, name: prerequisite.Name},
				mcpDeploymentPermission{verb: "list", resource: "serviceaccounts", namespace: namespace},
				mcpDeploymentPermission{verb: "create", resource: "serviceaccounts", namespace: namespace},
				mcpDeploymentPermission{verb: "delete", resource: "serviceaccounts", namespace: namespace, name: prerequisite.Name},
			)
			if prerequisite.ClusterRole != "" {
				permissions = append(permissions,
					mcpDeploymentPermission{verb: "get", group: "rbac.authorization.k8s.io", resource: "rolebindings", namespace: namespace, name: mcpViewRoleBindingName(server.Metadata.Name)},
					mcpDeploymentPermission{verb: "list", group: "rbac.authorization.k8s.io", resource: "rolebindings", namespace: namespace},
					mcpDeploymentPermission{verb: "create", group: "rbac.authorization.k8s.io", resource: "rolebindings", namespace: namespace},
					mcpDeploymentPermission{verb: "delete", group: "rbac.authorization.k8s.io", resource: "rolebindings", namespace: namespace, name: mcpViewRoleBindingName(server.Metadata.Name)},
					mcpDeploymentPermission{verb: "bind", group: "rbac.authorization.k8s.io", resource: "clusterroles", name: prerequisite.ClusterRole},
				)
			}
		case "ConfigMap":
			permissions = append(permissions,
				mcpDeploymentPermission{verb: "get", resource: "configmaps", namespace: namespace, name: prerequisite.Name},
				mcpDeploymentPermission{verb: "list", resource: "configmaps", namespace: namespace},
				mcpDeploymentPermission{verb: "create", resource: "configmaps", namespace: namespace},
				mcpDeploymentPermission{verb: "delete", resource: "configmaps", namespace: namespace, name: prerequisite.Name},
			)
		default:
			return fmt.Errorf("%w: unsupported MCP prerequisite type %q", ErrMcpDeploymentRBAC, prerequisite.Type)
		}
	}

	seen := map[string]struct{}{}
	for _, permission := range permissions {
		key := strings.Join([]string{permission.verb, permission.group, permission.resource, permission.namespace, permission.name}, "\x00")
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		allowed, checkErr := selfSubjectAccessAllowed(ctx, core, permission)
		if checkErr != nil {
			return fmt.Errorf("%w: could not verify %s: %v", ErrMcpDeploymentRBAC, permission.description(), checkErr)
		}
		if !allowed {
			return fmt.Errorf("%w: dashboard installer is missing %s; apply the Project Matrix Gateway installer RBAC binding before retrying", ErrMcpDeploymentRBAC, permission.description())
		}
	}

	return nil
}

func selfSubjectAccessAllowed(ctx context.Context, client kubernetes.Interface, permission mcpDeploymentPermission) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, mcpLifecycleOperatorGetTimeout)
	defer cancel()

	response, err := client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{ResourceAttributes: &authv1.ResourceAttributes{
			Verb:      permission.verb,
			Group:     permission.group,
			Resource:  permission.resource,
			Namespace: permission.namespace,
			Name:      permission.name,
		}},
	}, metav1.CreateOptions{})
	if err != nil {
		return false, err
	}
	return response.Status.Allowed, nil
}
