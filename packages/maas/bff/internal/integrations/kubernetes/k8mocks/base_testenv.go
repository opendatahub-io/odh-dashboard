package k8mocks

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"

	"go.yaml.in/yaml/v3"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	kubernetes2 "github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
)

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
		UserName: "bellaNonAdmin@example.com",
		Token:    "FAKE_BELLA_TOKEN",
		Groups:   []string{},
	},
}

type TestUser struct {
	UserName string
	Token    string
	Groups   []string
}

type TestEnvInput struct {
	Users  []TestUser
	Logger *slog.Logger
	Ctx    context.Context
	Cancel context.CancelFunc
}

func SetupEnvTest(input TestEnvInput) (*envtest.Environment, kubernetes.Interface, dynamic.Interface, error) {
	projectRoot, err := getProjectRoot()
	if err != nil {
		input.Logger.Error("failed to find project root", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	testEnv := &envtest.Environment{
		BinaryAssetsDirectory: filepath.Join(projectRoot, "bin", "k8s", fmt.Sprintf("1.29.0-%s-%s", runtime.GOOS, runtime.GOARCH)),
		CRDDirectoryPaths: []string{
			filepath.Join("internal", "testdata", "crd"),
		},
	}

	cfg, err := testEnv.Start()
	if err != nil {
		input.Logger.Error("failed to start envtest", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		input.Logger.Error("failed to create clientset", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	dynamicClient, err := dynamic.NewForConfig(cfg)
	if err != nil {
		input.Logger.Error("failed to create dynamic client", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	// bootstrap resources
	err = setupMock(clientset, dynamicClient, input.Ctx)
	if err != nil {
		input.Logger.Error("failed to setup mock data", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	return testEnv, clientset, dynamicClient, nil
}

func setupMock(mockK8sClient kubernetes.Interface, mockDynamicClient dynamic.Interface, ctx context.Context) error {

	err := createNamespace(mockK8sClient, ctx, "kubeflow")
	if err != nil {
		return err
	}

	err = createNamespace(mockK8sClient, ctx, "dora-namespace")
	if err != nil {
		return err
	}

	err = createNamespace(mockK8sClient, ctx, "bella-namespace")
	if err != nil {
		return err
	}

	err = createNamespace(mockK8sClient, ctx, "bento-namespace")
	if err != nil {
		return err
	}

	err = createNamespace(mockK8sClient, ctx, "maas-api")
	if err != nil {
		return err
	}

	err = createNamespace(mockK8sClient, ctx, "openshift-ingress")
	if err != nil {
		return err
	}

	err = createMaaSTiersConfigMap(mockK8sClient, ctx, "maas-api", "tier-to-group-mapping")
	if err != nil {
		return err
	}

	err = createMaaSLimitPolicies(mockDynamicClient, ctx, "openshift-ingress")
	if err != nil {
		return err
	}

	err = createService(mockK8sClient, ctx, "maas", "kubeflow", "Mod Arch", "Mod Arch Description", "10.0.0.10", "maas")
	if err != nil {
		return err
	}
	err = createService(mockK8sClient, ctx, "maas-one", "kubeflow", "Mod Arch One", "Mod Arch One description", "10.0.0.11", "maas")
	if err != nil {
		return err
	}
	err = createService(mockK8sClient, ctx, "maas-dora", "dora-namespace", "Mod Arch Dora", "Mod Arch Dora description", "10.0.0.12", "maas")
	if err != nil {
		return err
	}
	err = createService(mockK8sClient, ctx, "maas-bella", "bella-namespace", "Mod Arch Bella", "Mod Arch Bella description", "10.0.0.13", "maas")
	if err != nil {
		return err
	}
	err = createService(mockK8sClient, ctx, "non-maas", "kubeflow", "Not a Mod Arch", "Not a Mod Arch Bella description", "10.0.0.14", "")
	if err != nil {
		return err
	}

	err = createClusterAdminRBAC(mockK8sClient, ctx, DefaultTestUsers[0].UserName)
	if err != nil {
		return fmt.Errorf("failed to create cluster admin RBAC: %w", err)
	}

	err = createNamespaceRestrictedRBAC(mockK8sClient, ctx, DefaultTestUsers[1].UserName, "dora-namespace")
	if err != nil {
		return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
	}

	err = createNamespaceRestrictedRBAC(mockK8sClient, ctx, DefaultTestUsers[2].UserName, "bella-namespace")
	if err != nil {
		return fmt.Errorf("failed to create namespace-restricted RBAC: %w", err)
	}

	err = createGroupAccessRBAC(mockK8sClient, ctx, DefaultTestUsers[1].Groups[1], "dora-namespace", "maas-dora")
	if err != nil {
		return fmt.Errorf("failed to create group-based RBAC: %w", err)
	}

	err = createGroupNamespaceAccessRBAC(mockK8sClient, ctx, DefaultTestUsers[1].Groups[0], "dora-namespace")
	if err != nil {
		return fmt.Errorf("failed to set up group access to namespace: %w", err)
	}

	return nil
}

func createNamespace(k8sClient kubernetes.Interface, ctx context.Context, namespace string) error {
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

func createClusterAdminRBAC(k8sClient kubernetes.Interface, ctx context.Context, username string) error {
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

func createNamespaceRestrictedRBAC(k8sClient kubernetes.Interface, ctx context.Context, username, namespace string) error {
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

func createGroupAccessRBAC(k8sClient kubernetes.Interface, ctx context.Context, groupName, namespace, serviceName string) error {
	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "group-maas-access",
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
			Name:     "group-maas-access",
			APIGroup: "rbac.authorization.k8s.io",
		},
	}

	_, err = k8sClient.RbacV1().RoleBindings(namespace).Create(ctx, roleBinding, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create RoleBinding for group: %w", err)
	}
	return nil
}

func createGroupNamespaceAccessRBAC(k8sClient kubernetes.Interface, ctx context.Context, groupName, namespace string) error {

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

func createService(k8sClient kubernetes.Interface, ctx context.Context, name string, namespace string, displayName string, description string, clusterIP string, componentLabel string) error {

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

func createMaaSTiersConfigMap(k8sClient kubernetes.Interface, ctx context.Context, namespace, cmName string) error {
	cmTiers := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: namespace,
			Name:      cmName,
		},
		Data: map[string]string{
			"tiers": `
- name: tier0
  groups:
    - tier0-users
    - system:authenticated
  level: 0
- name: tier1
  groups:
    - tier1-users
    - tier1-group
  level: 1`,
		},
	}

	_, err := k8sClient.CoreV1().ConfigMaps(namespace).Create(ctx, cmTiers, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create tiers ConfigMap %s: %w", namespace, err)
	}

	return nil
}

func createMaaSLimitPolicies(k8sClient dynamic.Interface, ctx context.Context, namespace string) error {
	rateLimitYaml, err := os.ReadFile("internal/testdata/rate-limit-policy.yaml")
	if err != nil {
		return err
	}

	var rateLimit map[string]interface{}
	err = yaml.Unmarshal(rateLimitYaml, &rateLimit)
	if err != nil {
		return err
	}

	_, err = k8sClient.Resource(constants.RatePolicyGvr).Namespace(namespace).Create(ctx, &unstructured.Unstructured{Object: rateLimit}, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	// The token-limit-policy.yaml file is multi-document. Using Decoder instead of Unmarshall
	tokenLimitYaml, err := os.ReadFile("internal/testdata/token-limit-policy.yaml")
	if err != nil {
		return err
	}

	decoder := yaml.NewDecoder(bytes.NewReader(tokenLimitYaml))
	for {
		var tokenLimit map[string]interface{}
		err = decoder.Decode(&tokenLimit)
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to decode token limit policy: %w", err)
		}

		_, err = k8sClient.Resource(constants.TokenPolicyGvr).Namespace(namespace).Create(ctx, &unstructured.Unstructured{Object: tokenLimit}, metav1.CreateOptions{})
		if err != nil {
			return fmt.Errorf("failed to create token limit policy: %w", err)
		}
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
