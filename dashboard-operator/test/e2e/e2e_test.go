//go:build e2e

package e2e

import (
	"context"
	"crypto/x509"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

const (
	dashboardCRDName       = "dashboards.components.platform.opendatahub.io"
	serviceCAConfigMapName = "openshift-service-ca.crt"
	serviceCAConfigMapKey  = "service-ca.crt"
	preflightTimeout       = 30 * time.Second
	fixtureReadyTimeout    = 10 * time.Minute
)

var (
	k8sClient         client.Client
	restConfig        *rest.Config
	testNamespace     string
	testGatewayDomain string
	dashboardUID      types.UID
	gatewayCARoots    *x509.CertPool
	serviceCARoots    *x509.CertPool
)

func TestMain(m *testing.M) {
	if err := initializeE2E(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E preflight failed: %v\n", err)
		os.Exit(1)
	}

	uid, err := createDashboardCR(k8sClient, dashboardv1alpha1.DashboardSpec{
		ManagementSpec: common.ManagementSpec{ManagementState: common.Managed},
		Gateway: &dashboardv1alpha1.GatewaySpec{
			Domain: testGatewayDomain,
		},
	})
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E fixture setup failed: %v\n", err)
		os.Exit(1)
	}
	dashboardUID = uid

	if err := waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		string(common.ConditionTypeProvisioningSucceeded),
		metav1.ConditionTrue,
		fixtureReadyTimeout,
	); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E fixture readiness failed: %v\n", err)
		if cleanupErr := cleanupE2EFixture(); cleanupErr != nil {
			_, _ = fmt.Fprintf(os.Stderr, "E2E fixture cleanup also failed: %v\n", cleanupErr)
		}
		os.Exit(1)
	}

	exitCode := m.Run()
	if err := cleanupE2EFixture(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E fixture cleanup failed: %v\n", err)
		exitCode = 1
	}
	os.Exit(exitCode)
}

func cleanupE2EFixture() error {
	if err := cleanupDashboardCR(k8sClient, dashboardUID); err != nil {
		return err
	}
	return waitForOwnedOperandDeletion(k8sClient, testNamespace, dashboardUID, e2eCleanupTimeout)
}

func TestE2EFrameworkPreflight(t *testing.T) {
	if k8sClient == nil {
		t.Fatal("controller-runtime client was not initialized")
	}
	if testNamespace == "" {
		t.Fatal("test namespace was not initialized")
	}
	if testGatewayDomain == "" {
		t.Fatal("test gateway domain was not initialized")
	}
	if dashboardUID == "" {
		t.Fatal("Dashboard fixture UID was not initialized")
	}
}

func initializeE2E() error {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		return errors.New("KUBECONFIG must point to a kubeconfig file")
	}

	info, err := os.Stat(kubeconfig)
	if err != nil {
		return fmt.Errorf("cannot access KUBECONFIG: %w", err)
	}
	if !info.Mode().IsRegular() {
		return errors.New("KUBECONFIG must point to a regular file")
	}

	namespace := os.Getenv("TEST_NAMESPACE")
	if namespace == "" {
		return errors.New("TEST_NAMESPACE must name an existing namespace")
	}
	if problems := k8svalidation.IsDNS1123Label(namespace); len(problems) > 0 {
		return fmt.Errorf("TEST_NAMESPACE %q is invalid: %v", namespace, problems)
	}

	gatewayDomain := os.Getenv("TEST_GATEWAY_DOMAIN")
	if gatewayDomain == "" {
		return errors.New("TEST_GATEWAY_DOMAIN must name the externally reachable Dashboard gateway host")
	}
	if problems := k8svalidation.IsDNS1123Subdomain(gatewayDomain); len(problems) > 0 {
		return fmt.Errorf("TEST_GATEWAY_DOMAIN %q is invalid: %v", gatewayDomain, problems)
	}

	scheme, err := newE2EScheme()
	if err != nil {
		return err
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return fmt.Errorf("build REST config from KUBECONFIG: %w", err)
	}

	c, err := client.New(config, client.Options{Scheme: scheme})
	if err != nil {
		return fmt.Errorf("create controller-runtime client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), preflightTimeout)
	defer cancel()

	if err := c.Get(ctx, client.ObjectKey{Name: namespace}, &corev1.Namespace{}); err != nil {
		return fmt.Errorf("verify cluster connectivity and TEST_NAMESPACE %q: %w", namespace, err)
	}

	crd := &apiextensionsv1.CustomResourceDefinition{}
	if err := c.Get(ctx, client.ObjectKey{Name: dashboardCRDName}, crd); err != nil {
		return fmt.Errorf("verify Dashboard CRD %q: %w", dashboardCRDName, err)
	}

	served := false
	for _, version := range crd.Spec.Versions {
		if version.Name == dashboardv1alpha1.GroupVersion.Version && version.Served {
			served = true
			break
		}
	}
	if !served {
		return fmt.Errorf(
			"Dashboard CRD %q does not serve version %q",
			dashboardCRDName,
			dashboardv1alpha1.GroupVersion.Version,
		)
	}

	gatewayRoots, err := loadGatewayCARoots(os.Getenv("TEST_GATEWAY_CA_BUNDLE"))
	if err != nil {
		return err
	}
	serviceRoots, err := loadServiceCARoots(ctx, c, namespace)
	if err != nil {
		return err
	}

	k8sClient = c
	restConfig = config
	testNamespace = namespace
	testGatewayDomain = gatewayDomain
	gatewayCARoots = gatewayRoots
	serviceCARoots = serviceRoots

	return nil
}

func loadGatewayCARoots(bundlePath string) (*x509.CertPool, error) {
	roots, err := x509.SystemCertPool()
	if err != nil {
		return nil, fmt.Errorf("load system certificate roots: %w", err)
	}
	if bundlePath == "" {
		return roots, nil
	}

	info, err := os.Stat(bundlePath)
	if err != nil {
		return nil, fmt.Errorf("cannot access TEST_GATEWAY_CA_BUNDLE: %w", err)
	}
	if !info.Mode().IsRegular() {
		return nil, errors.New("TEST_GATEWAY_CA_BUNDLE must point to a regular file")
	}
	bundle, err := os.ReadFile(bundlePath)
	if err != nil {
		return nil, fmt.Errorf("read TEST_GATEWAY_CA_BUNDLE: %w", err)
	}
	if !roots.AppendCertsFromPEM(bundle) {
		return nil, errors.New("TEST_GATEWAY_CA_BUNDLE does not contain a valid PEM certificate")
	}
	return roots, nil
}

func loadServiceCARoots(ctx context.Context, c client.Client, namespace string) (*x509.CertPool, error) {
	configMap := &corev1.ConfigMap{}
	if err := c.Get(ctx, client.ObjectKey{Namespace: namespace, Name: serviceCAConfigMapName}, configMap); err != nil {
		return nil, fmt.Errorf("get Service CA ConfigMap %s/%s: %w", namespace, serviceCAConfigMapName, err)
	}
	bundle := configMap.Data[serviceCAConfigMapKey]
	roots := x509.NewCertPool()
	if bundle == "" || !roots.AppendCertsFromPEM([]byte(bundle)) {
		return nil, fmt.Errorf("Service CA ConfigMap %s/%s does not contain a valid %q PEM bundle", namespace, serviceCAConfigMapName, serviceCAConfigMapKey)
	}
	return roots, nil
}

func newE2EScheme() (*runtime.Scheme, error) {
	scheme := runtime.NewScheme()
	registrations := []struct {
		name        string
		addToScheme func(*runtime.Scheme) error
	}{
		{name: "Kubernetes", addToScheme: clientgoscheme.AddToScheme},
		{name: "apiextensions", addToScheme: apiextensionsv1.AddToScheme},
		{name: "Dashboard", addToScheme: dashboardv1alpha1.AddToScheme},
		{name: "Gateway API", addToScheme: gatewayv1.Install},
	}
	for _, registration := range registrations {
		if err := registration.addToScheme(scheme); err != nil {
			return nil, fmt.Errorf("register %s APIs with E2E scheme: %w", registration.name, err)
		}
	}

	return scheme, nil
}
