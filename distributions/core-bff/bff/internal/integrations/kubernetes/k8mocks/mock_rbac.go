package k8mocks

import (
	"context"
	"fmt"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sclient "k8s.io/client-go/kubernetes"
)

func createClusterAdminRBAC(ctx context.Context, k8sClient k8sclient.Interface, username string) error {
	clusterRoleBinding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("cluster-admin-binding-%s", username),
		},
		Subjects: []rbacv1.Subject{
			{
				Kind: "User",
				Name: username,
			},
		},
		RoleRef: rbacv1.RoleRef{
			Kind:     "ClusterRole",
			Name:     "cluster-admin",
			APIGroup: "rbac.authorization.k8s.io",
		},
	}

	_, err := k8sClient.RbacV1().ClusterRoleBindings().Create(ctx, clusterRoleBinding, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create cluster admin ClusterRoleBinding: %w", err)
	}

	return nil
}

// createNamedNamespaceGetRBAC grants exact, cluster-scoped get without list permission.
func createNamedNamespaceGetRBAC(ctx context.Context, client k8sclient.Interface, username, name string) error {
	role := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{Name: "named-namespace-get-" + name},
		Rules: []rbacv1.PolicyRule{{
			APIGroups:     []string{""},
			Resources:     []string{"namespaces"},
			ResourceNames: []string{name},
			Verbs:         []string{"get"},
		}},
	}
	if _, err := client.RbacV1().ClusterRoles().Create(ctx, role, metav1.CreateOptions{}); err != nil {
		return err
	}
	binding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "named-namespace-get-" + name},
		Subjects:   []rbacv1.Subject{{Kind: "User", Name: username}},
		RoleRef: rbacv1.RoleRef{
			Kind:     "ClusterRole",
			Name:     role.Name,
			APIGroup: "rbac.authorization.k8s.io",
		},
	}
	_, err := client.RbacV1().ClusterRoleBindings().Create(ctx, binding, metav1.CreateOptions{})
	return err
}

func createNamespaceRestrictedRBAC(ctx context.Context, k8sClient k8sclient.Interface, username, namespace string) error {
	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "namespace-restricted-role",
			Namespace: namespace,
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{""},
				Resources: []string{"services", "namespaces"},
				Verbs:     []string{"get", "list"},
			},
		},
	}

	_, err := k8sClient.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create Role: %w", err)
	}

	roleBinding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "namespace-restricted-binding",
			Namespace: namespace,
		},
		Subjects: []rbacv1.Subject{
			{
				Kind: "User",
				Name: username,
			},
		},
		RoleRef: rbacv1.RoleRef{
			Kind:     "Role",
			Name:     "namespace-restricted-role",
			APIGroup: "rbac.authorization.k8s.io",
		},
	}

	_, err = k8sClient.RbacV1().RoleBindings(namespace).Create(ctx, roleBinding, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create RoleBinding: %w", err)
	}

	return nil
}

func createGroupAccessRBAC(ctx context.Context, k8sClient k8sclient.Interface, groupName, namespace, serviceName string) error {
	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "group-service-access",
			Namespace: namespace,
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{""},
				Resources: []string{"services"},
				Verbs:     []string{"get", "list"},
				ResourceNames: []string{
					serviceName,
				},
			},
		},
	}

	_, err := k8sClient.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create Role for group: %w", err)
	}

	roleBinding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "group-access-binding",
			Namespace: namespace,
		},
		Subjects: []rbacv1.Subject{
			{
				Kind: "Group",
				Name: groupName,
			},
		},
		RoleRef: rbacv1.RoleRef{
			Kind:     "Role",
			Name:     "group-service-access",
			APIGroup: "rbac.authorization.k8s.io",
		},
	}

	_, err = k8sClient.RbacV1().RoleBindings(namespace).Create(ctx, roleBinding, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create RoleBinding for group: %w", err)
	}
	return nil
}

func createGroupNamespaceAccessRBAC(ctx context.Context, k8sClient k8sclient.Interface, groupName, namespace string) error {

	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "group-namespace-access-role",
			Namespace: namespace,
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{""},
				Resources: []string{"namespaces", "services"},
				Verbs:     []string{"get", "list"},
			},
		},
	}

	_, err := k8sClient.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create Role for group namespace access: %w", err)
	}

	roleBinding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "group-namespace-access-binding",
			Namespace: namespace,
		},
		Subjects: []rbacv1.Subject{
			{
				Kind: "Group",
				Name: groupName,
			},
		},
		RoleRef: rbacv1.RoleRef{
			Kind:     "Role",
			Name:     "group-namespace-access-role",
			APIGroup: "rbac.authorization.k8s.io",
		},
	}

	_, err = k8sClient.RbacV1().RoleBindings(namespace).Create(ctx, roleBinding, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create RoleBinding for group namespace access: %w", err)
	}

	return nil
}

// createServingRuntimeEditorRBAC lets a user create ServingRuntimes in one
// namespace and nothing else: in particular no patch on the cluster-scoped
// Namespace object.
func createServingRuntimeEditorRBAC(ctx context.Context, k8sClient k8sclient.Interface, username, namespace string) error {
	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{Name: "serving-runtime-editor", Namespace: namespace},
		Rules: []rbacv1.PolicyRule{{
			APIGroups: []string{"serving.kserve.io"},
			Resources: []string{"servingruntimes"},
			Verbs:     []string{"get", "list", "create"},
		}},
	}
	if _, err := k8sClient.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create Role: %w", err)
	}
	binding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "serving-runtime-editor", Namespace: namespace},
		Subjects:   []rbacv1.Subject{{Kind: "User", Name: username}},
		RoleRef:    rbacv1.RoleRef{Kind: "Role", Name: "serving-runtime-editor", APIGroup: "rbac.authorization.k8s.io"},
	}
	if _, err := k8sClient.RbacV1().RoleBindings(namespace).Create(ctx, binding, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create RoleBinding: %w", err)
	}
	return nil
}

// createLLMInferenceServiceRBAC grants a namespace-scoped RHAII role, so the
// xKS namespace discovery can be exercised for users who cannot list
// namespaces. readOnly limits it to the view verbs.
func createLLMInferenceServiceRBAC(ctx context.Context, client k8sclient.Interface, username, namespace string, readOnly bool) error {
	verbs := []string{"get", "list", "watch", "create", "update", "patch", "delete"}
	name := "rhaii-deployer"
	rules := []rbacv1.PolicyRule{}
	if readOnly {
		verbs = []string{"get", "list", "watch"}
		name = "rhaii-viewer"
	} else {
		rules = append(rules,
			rbacv1.PolicyRule{
				APIGroups: []string{""},
				Resources: []string{"secrets"},
				Verbs:     []string{"create", "get", "list", "update", "delete"},
			},
			rbacv1.PolicyRule{
				APIGroups: []string{""},
				Resources: []string{"serviceaccounts"},
				Verbs:     []string{"get", "create"},
			},
			rbacv1.PolicyRule{
				APIGroups: []string{"rbac.authorization.k8s.io"},
				Resources: []string{"roles", "rolebindings"},
				Verbs:     []string{"get", "create"},
			},
			rbacv1.PolicyRule{
				APIGroups: []string{"serving.kserve.io"},
				Resources: []string{"llminferenceserviceconfigs"},
				Verbs:     []string{"get", "list", "watch", "update", "patch"},
			},
		)
	}
	rules = append(rules, rbacv1.PolicyRule{
		APIGroups: []string{"serving.kserve.io"},
		Resources: []string{"llminferenceservices"},
		Verbs:     verbs,
	})
	role := &rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}, Rules: rules}
	if _, err := client.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create %s Role: %w", name, err)
	}
	binding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: name + "-binding", Namespace: namespace},
		Subjects:   []rbacv1.Subject{{Kind: "User", Name: username}},
		RoleRef:    rbacv1.RoleRef{Kind: "Role", Name: name, APIGroup: "rbac.authorization.k8s.io"},
	}
	if _, err := client.RbacV1().RoleBindings(namespace).Create(ctx, binding, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create %s RoleBinding: %w", name, err)
	}
	return nil
}
