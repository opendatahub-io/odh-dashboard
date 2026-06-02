// Package k8mocks provides envtest-based mock Kubernetes environments for integration tests.
package k8mocks

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	kubernetes2 "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

// DefaultTestUsers provides a default set of test users for envtest scenarios.
//
//nolint:gosec // G101: test-only fake tokens, not real credentials
var DefaultTestUsers = []TestUser{
	{
		UserName: "user@example.com",
		Token:    "FAKE_CLUSTER_ADMIN_TOKEN",
		Groups:   []string{},
	},
	{
		UserName: "userA@example.com",
		Token:    "FAKE_USER_A_TOKEN",
		Groups:   []string{"test-ns-a-group", "test-ns-a-service-group"},
	},
	{
		UserName: "userB@example.com",
		Token:    "FAKE_USER_B_TOKEN",
		Groups:   []string{},
	},
}

// TestUser represents a test user with fake token and group memberships.
type TestUser struct {
	UserName string
	Token    string
	Groups   []string
}

// TestEnvInput holds configuration for setting up a test environment.
type TestEnvInput struct {
	Users []TestUser
	Ctx   context.Context
}

// SetupEnvTest creates an envtest environment with configured test users.
func SetupEnvTest(input TestEnvInput) (*envtest.Environment, kubernetes.Interface, error) {
	if input.Ctx == nil {
		input.Ctx = context.Background()
	}

	var binaryAssetsDir string
	if envtestAssets := os.Getenv("ENVTEST_ASSETS"); envtestAssets != "" {
		binaryAssetsDir = envtestAssets
	} else {
		projectRoot, err := getProjectRoot()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to find project root: %w", err)
		}
		binaryAssetsDir = filepath.Join(projectRoot, "bin", "k8s", fmt.Sprintf("1.29.3-%s-%s", runtime.GOOS, runtime.GOARCH))
	}

	testEnv := &envtest.Environment{
		BinaryAssetsDirectory: binaryAssetsDir,
	}

	cfg, err := testEnv.Start()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to start envtest: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		_ = testEnv.Stop()
		return nil, nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	if err := setupMock(input.Ctx, clientset, input.Users); err != nil {
		_ = testEnv.Stop()
		return nil, nil, fmt.Errorf("failed to setup mock data: %w", err)
	}

	return testEnv, clientset, nil
}

func setupMock(ctx context.Context, mockK8sClient kubernetes.Interface, users []TestUser) error {
	if len(users) == 0 {
		users = DefaultTestUsers
	}

	err := createNamespace(ctx, mockK8sClient, "opendatahub")
	if err != nil {
		return err
	}

	err = createNamespace(ctx, mockK8sClient, "test-ns-a")
	if err != nil {
		return err
	}

	err = createNamespace(ctx, mockK8sClient, "test-ns-b")
	if err != nil {
		return err
	}

	err = createNamespace(ctx, mockK8sClient, "test-ns-c")
	if err != nil {
		return err
	}

	err = createService(ctx, mockK8sClient, "dashboard", "opendatahub", "Dashboard", "Dashboard service", "10.0.0.10", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "dashboard-one", "opendatahub", "Dashboard One", "Dashboard One service", "10.0.0.11", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "dashboard-ns-a", "test-ns-a", "Dashboard NS A", "Dashboard NS A service", "10.0.0.12", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "dashboard-ns-b", "test-ns-b", "Dashboard NS B", "Dashboard NS B service", "10.0.0.13", "core")
	if err != nil {
		return err
	}
	err = createService(ctx, mockK8sClient, "non-dashboard", "opendatahub", "Not a Dashboard service", "Not a Dashboard service description", "10.0.0.14", "")
	if err != nil {
		return err
	}

	if len(users) > 0 {
		err = createClusterAdminRBAC(ctx, mockK8sClient, users[0].UserName)
		if err != nil {
			return fmt.Errorf("failed to create cluster admin RBAC: %w", err)
		}
	}

	if len(users) > 1 {
		err = createNamespaceRestrictedRBAC(ctx, mockK8sClient, users[1].UserName, "test-ns-a")
		if err != nil {
			return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
		}
	}

	if len(users) > 2 {
		err = createNamespaceRestrictedRBAC(ctx, mockK8sClient, users[2].UserName, "test-ns-b")
		if err != nil {
			return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
		}
	}

	if len(users) > 1 && len(users[1].Groups) > 1 {
		err = createGroupAccessRBAC(ctx, mockK8sClient, users[1].Groups[1], "test-ns-a", "dashboard-ns-a")
		if err != nil {
			return fmt.Errorf("failed to create group-based RBAC: %w", err)
		}
	}

	if len(users) > 1 && len(users[1].Groups) > 0 {
		err = createGroupNamespaceAccessRBAC(ctx, mockK8sClient, users[1].Groups[0], "test-ns-a")
		if err != nil {
			return fmt.Errorf("failed to set up group access to namespace: %w", err)
		}
	}

	return nil
}

func createNamespace(ctx context.Context, k8sClient kubernetes.Interface, namespace string) error {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}

	_, err := k8sClient.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create namespace %s: %w", namespace, err)
	}

	return nil
}

func createClusterAdminRBAC(ctx context.Context, k8sClient kubernetes.Interface, username string) error {
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

func createNamespaceRestrictedRBAC(ctx context.Context, k8sClient kubernetes.Interface, username, namespace string) error {
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

func createGroupAccessRBAC(ctx context.Context, k8sClient kubernetes.Interface, groupName, namespace, serviceName string) error {
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

func createGroupNamespaceAccessRBAC(ctx context.Context, k8sClient kubernetes.Interface, groupName, namespace string) error {

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

func createService(ctx context.Context, k8sClient kubernetes.Interface, name string, namespace string, displayName string, description string, clusterIP string, componentLabel string) error {

	annotations := map[string]string{}

	if displayName != "" {
		annotations["displayName"] = displayName
	}

	if description != "" {
		annotations["description"] = description
	}

	labels := map[string]string{}
	if componentLabel != "" {
		labels["component"] = componentLabel
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:        name,
			Namespace:   namespace,
			Annotations: annotations,
			Labels:      labels,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{
				"component": kubernetes2.ComponentLabelValue,
			},
			Type:      corev1.ServiceTypeClusterIP,
			ClusterIP: clusterIP,
			Ports: []corev1.ServicePort{
				{
					Name:        "http-api",
					Port:        8080,
					Protocol:    corev1.ProtocolTCP,
					AppProtocol: strPtr("http"),
				},
				{
					Name:        "grpc-api",
					Port:        9090,
					Protocol:    corev1.ProtocolTCP,
					AppProtocol: strPtr("grpc"),
				},
			},
		},
	}

	// Create the service using kubernetes.Interface
	_, err := k8sClient.CoreV1().Services(namespace).Create(ctx, service, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create service: %w", err)
	}

	return nil
}

func strPtr(s string) *string {
	return &s
}

func getProjectRoot() (string, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(currentDir, "go.mod")); err == nil {
			// Found the project root where go.mod is located
			return currentDir, nil
		}

		parentDir := filepath.Dir(currentDir)
		if parentDir == currentDir {
			// We reached the root directory and did not find the go.mod
			return "", fmt.Errorf("could not find project root")
		}

		currentDir = parentDir
	}
}
