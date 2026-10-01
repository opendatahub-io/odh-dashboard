//go:build e2e

package e2e

import (
	"context"
	"crypto/x509"
	"errors"
	"flag"
	"fmt"
	"os"
	"testing"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
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
	fixtureModeFlag   = flag.String("fixture-mode", string(fixtureModeExisting), "Dashboard fixture mode: existing or managed")
	k8sClient         client.Client
	restConfig        *rest.Config
	testNamespace     string
	testGatewayDomain string
	testPlatform      string
	testFixtureMode   fixtureMode
	e2eOwnsFixture    bool
	dashboardUID      types.UID
	gatewayCARoots    *x509.CertPool
	serviceCARoots    *x509.CertPool
)

func TestMain(m *testing.M) {
	flag.Parse()

	mode, err := parseFixtureMode(*fixtureModeFlag)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E configuration failed: %v\n", err)
		os.Exit(1)
	}
	testFixtureMode = mode

	if err := initializeE2E(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E preflight failed: %v\n", err)
		os.Exit(1)
	}

	if err := setupE2EFixture(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E fixture setup failed: %v\n", err)
		if e2eOwnsFixture {
			if cleanupErr := cleanupE2EFixture(); cleanupErr != nil {
				_, _ = fmt.Fprintf(os.Stderr, "E2E fixture cleanup also failed: %v\n", cleanupErr)
			}
		}
		os.Exit(1)
	}

	exitCode := m.Run()
	if e2eOwnsFixture {
		if err := cleanupE2EFixture(); err != nil {
			_, _ = fmt.Fprintf(os.Stderr, "E2E fixture cleanup failed: %v\n", err)
			exitCode = 1
		}
	}
	os.Exit(exitCode)
}

func setupE2EFixture() error {
	if testFixtureMode == fixtureModeManaged {
		gatewayDomain, err := resolveManagedGatewayDomain(os.Getenv("TEST_GATEWAY_DOMAIN"))
		if err != nil {
			return fmt.Errorf("configure managed Dashboard fixture: %w", err)
		}
		testGatewayDomain = gatewayDomain
		uid, err := createDashboardCR(k8sClient, dashboardv1alpha1.DashboardSpec{
			ManagementSpec: common.ManagementSpec{ManagementState: common.Managed},
			Gateway: &dashboardv1alpha1.GatewaySpec{
				Domain: gatewayDomain,
			},
		})
		if err != nil {
			return err
		}
		dashboardUID = uid
		e2eOwnsFixture = true
	} else {
		ctx, cancel := context.WithTimeout(context.Background(), preflightTimeout)
		defer cancel()

		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			return fmt.Errorf("get installed Dashboard %q: %w", dashboardv1alpha1.DashboardInstanceName, err)
		}
		if dashboard.UID == "" {
			return fmt.Errorf("installed Dashboard %q has no UID", dashboard.Name)
		}
		if dashboard.Spec.ManagementState != common.Managed {
			return fmt.Errorf("installed Dashboard %q must have managementState %q, got %q", dashboard.Name, common.Managed, dashboard.Spec.ManagementState)
		}
		dashboardUID = dashboard.UID
	}

	if err := waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		string(common.ConditionTypeProvisioningSucceeded),
		metav1.ConditionTrue,
		fixtureReadyTimeout,
	); err != nil {
		return fmt.Errorf("wait for Dashboard fixture readiness: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), preflightTimeout)
	defer cancel()

	dashboard := &dashboardv1alpha1.Dashboard{}
	if err := k8sClient.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
		return fmt.Errorf("get ready Dashboard %q: %w", dashboardv1alpha1.DashboardInstanceName, err)
	}
	gatewayDomain, err := resolveGatewayDomain(os.Getenv("TEST_GATEWAY_DOMAIN"), dashboard.Status.URL)
	if err != nil {
		return err
	}
	platform, err := discoverPlatform(ctx, k8sClient, testNamespace, os.Getenv("TEST_PLATFORM"))
	if err != nil {
		return err
	}
	gatewayRoots, err := loadGatewayCARoots(os.Getenv("TEST_GATEWAY_CA_BUNDLE"))
	if err != nil {
		return err
	}
	serviceRoots, err := loadServiceCARoots(ctx, k8sClient, testNamespace)
	if err != nil {
		return err
	}

	testGatewayDomain = gatewayDomain
	testPlatform = platform
	gatewayCARoots = gatewayRoots
	serviceCARoots = serviceRoots
	return nil
}

func discoverPlatform(ctx context.Context, c client.Client, namespace, explicit string) (string, error) {
	if explicit != "" {
		return resolvePlatform(explicit, false, false)
	}
	hasODHService, err := serviceExists(ctx, c, namespace, "odh-dashboard")
	if err != nil {
		return "", err
	}
	hasRHOAIService, err := serviceExists(ctx, c, namespace, "rhods-dashboard")
	if err != nil {
		return "", err
	}
	return resolvePlatform("", hasODHService, hasRHOAIService)
}

func serviceExists(ctx context.Context, c client.Client, namespace, name string) (bool, error) {
	service := &corev1.Service{}
	err := c.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, service)
	switch {
	case err == nil:
		return true, nil
	case apierrors.IsNotFound(err):
		return false, nil
	default:
		return false, fmt.Errorf("discover platform from Service %s/%s: %w", namespace, name, err)
	}
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
	if testPlatform == "" {
		t.Fatal("test platform was not initialized")
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

	namespace, err := resolveTestNamespace(os.Getenv("TEST_NAMESPACE"), os.Getenv("E2E_TEST_APPLICATIONS_NAMESPACE"))
	if err != nil {
		return err
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
		return fmt.Errorf("verify cluster connectivity and applications namespace %q: %w", namespace, err)
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

	k8sClient = c
	restConfig = config
	testNamespace = namespace

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
