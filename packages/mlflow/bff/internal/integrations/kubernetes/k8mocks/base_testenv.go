package k8mocks

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	kubernetes2 "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

const (
	nsMLflow  = "mlflow"
	nsDora    = "dora-namespace"
	nsGiulio  = "giulio-namespace"
	nsBento   = "bento-namespace"
	rbacGroup = "rbac.authorization.k8s.io"
)

// DefaultTestUsers provides pre-configured test users for envtest scenarios.
var DefaultTestUsers = []TestUser{
	{
		UserName: "user@example.com",
		Token:    "FAKE_CLUSTER_ADMIN_TOKEN",
		Groups:   []string{},
	},
	{
		UserName: "doraNonAdmin@example.com",
		Token:    "FAKE_DORA_TOKEN",
		Groups:   []string{"dora-namespace-group", "dora-service-group"},
	},
	{
		UserName: "giulioNonAdmin@example.com",
		Token:    "FAKE_GIULIO_TOKEN",
		Groups:   []string{},
	},
}

// TestUser holds identity data for a test user.
type TestUser struct {
	UserName string
	Token    string
	Groups   []string
}

// TestEnvInput bundles the inputs needed by SetupEnvTest.
type TestEnvInput struct {
	Users []TestUser
	Ctx   context.Context
}

// SetupEnvTest creates a controller-runtime envtest environment, bootstraps
// mock resources, and returns the environment plus a Kubernetes clientset.
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

	if err := setupMock(input.Ctx, clientset); err != nil {
		_ = testEnv.Stop()
		return nil, nil, fmt.Errorf("failed to setup mock data: %w", err)
	}

	return testEnv, clientset, nil
}

func setupMock(ctx context.Context, mockK8sClient kubernetes.Interface) error {
	namespaces := []string{nsMLflow, nsDora, nsGiulio, nsBento}
	for _, ns := range namespaces {
		if err := createNamespace(ctx, mockK8sClient, ns); err != nil {
			return err
		}
	}

	services := []testServiceDef{
		{Name: "mlflow", Namespace: nsMLflow, DisplayName: "MLflow", Description: "MLflow Description", ClusterIP: "10.0.0.10", ComponentLabel: "mlflow"},
		{Name: "mlflow-one", Namespace: nsMLflow, DisplayName: "MLflow One", Description: "MLflow One description", ClusterIP: "10.0.0.11", ComponentLabel: "mlflow"},
		{Name: "mlflow-dora", Namespace: nsDora, DisplayName: "MLflow Dora", Description: "MLflow Dora description", ClusterIP: "10.0.0.12", ComponentLabel: "mlflow"},
		{Name: "mlflow-giulio", Namespace: nsGiulio, DisplayName: "MLflow Giulio", Description: "MLflow Giulio description", ClusterIP: "10.0.0.13", ComponentLabel: "mlflow"},
		{Name: "non-mlflow", Namespace: nsMLflow, DisplayName: "Not a MLflow", Description: "Not a MLflow description", ClusterIP: "10.0.0.14"},
	}
	for _, svc := range services {
		if err := createService(ctx, mockK8sClient, svc); err != nil {
			return err
		}
	}

	if err := createClusterAdminRBAC(ctx, mockK8sClient, DefaultTestUsers[0].UserName); err != nil {
		return fmt.Errorf("failed to create cluster admin RBAC: %w", err)
	}

	if err := createNamespaceRestrictedRBAC(ctx, mockK8sClient, DefaultTestUsers[1].UserName, nsDora); err != nil {
		return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
	}

	if err := createNamespaceRestrictedRBAC(ctx, mockK8sClient, DefaultTestUsers[2].UserName, nsGiulio); err != nil {
		return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
	}

	if err := createGroupAccessRBAC(ctx, mockK8sClient, DefaultTestUsers[1].Groups[1], nsDora, "mlflow-dora"); err != nil {
		return fmt.Errorf("failed to create group-based RBAC: %w", err)
	}

	if err := createGroupNamespaceAccessRBAC(ctx, mockK8sClient, DefaultTestUsers[1].Groups[0], nsDora); err != nil {
		return fmt.Errorf("failed to set up group access to namespace: %w", err)
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
			APIGroup: rbacGroup,
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
			APIGroup: rbacGroup,
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
			Name:      "group-mlflow-access",
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
			Name:     "group-mlflow-access",
			APIGroup: rbacGroup,
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
			APIGroup: rbacGroup,
		},
	}

	_, err = k8sClient.RbacV1().RoleBindings(namespace).Create(ctx, roleBinding, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create RoleBinding for group namespace access: %w", err)
	}

	return nil
}

type testServiceDef struct {
	Name           string
	Namespace      string
	DisplayName    string
	Description    string
	ClusterIP      string
	ComponentLabel string
}

func createService(ctx context.Context, k8sClient kubernetes.Interface, svc testServiceDef) error {
	annotations := map[string]string{}
	if svc.DisplayName != "" {
		annotations["displayName"] = svc.DisplayName
	}
	if svc.Description != "" {
		annotations["description"] = svc.Description
	}

	labels := map[string]string{}
	if svc.ComponentLabel != "" {
		labels["component"] = svc.ComponentLabel
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:        svc.Name,
			Namespace:   svc.Namespace,
			Annotations: annotations,
			Labels:      labels,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{
				"component": kubernetes2.ComponentLabelValue,
			},
			Type:      corev1.ServiceTypeClusterIP,
			ClusterIP: svc.ClusterIP,
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

	_, err := k8sClient.CoreV1().Services(svc.Namespace).Create(ctx, service, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create service %s: %w", svc.Name, err)
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
			return currentDir, nil
		}

		parentDir := filepath.Dir(currentDir)
		if parentDir == currentDir {
			return "", fmt.Errorf("could not find project root")
		}

		currentDir = parentDir
	}
}
