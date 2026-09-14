//go:build e2e

package e2e

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/clientcmd"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

const (
	dashboardCRDName = "dashboards.components.platform.opendatahub.io"
	preflightTimeout = 30 * time.Second
)

var (
	k8sClient     client.Client
	testNamespace string
)

func TestMain(m *testing.M) {
	if err := initializeE2E(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "E2E preflight failed: %v\n", err)
		os.Exit(1)
	}

	os.Exit(m.Run())
}

func TestE2EFrameworkPreflight(t *testing.T) {
	if k8sClient == nil {
		t.Fatal("controller-runtime client was not initialized")
	}
	if testNamespace == "" {
		t.Fatal("test namespace was not initialized")
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

	k8sClient = c
	testNamespace = namespace

	return nil
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
