//go:build e2e

package e2e

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"testing"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const httpRequestTimeout = 30 * time.Second

func TestE2E_OperandDeployments_ReachAvailable(t *testing.T) {
	inventory, err := waitForOperandInventory(k8sClient, testNamespace, dashboardUID, operandReadyTimeout)
	require.NoError(t, err)

	sort.Slice(inventory.deployments, func(i, j int) bool {
		return inventory.deployments[i].Name < inventory.deployments[j].Name
	})
	for i := range inventory.deployments {
		deployment := inventory.deployments[i]
		t.Run(deployment.Name, func(t *testing.T) {
			require.NoError(t, waitForDeploymentReady(
				k8sClient,
				deployment.Namespace,
				deployment.Name,
				operandReadyTimeout,
			))
		})
	}
}

func TestE2E_OperandServices_Reachable(t *testing.T) {
	inventory, err := waitForOperandInventory(k8sClient, testNamespace, dashboardUID, operandReadyTimeout)
	require.NoError(t, err)

	sort.Slice(inventory.services, func(i, j int) bool {
		return inventory.services[i].Name < inventory.services[j].Name
	})
	for i := range inventory.services {
		service := inventory.services[i]
		t.Run(service.Name, func(t *testing.T) {
			require.NotEmpty(t, service.Spec.Selector, "Service must select operand pods")
			require.NotEmpty(t, service.Spec.Ports, "Service must expose at least one port")
			require.NoError(t, waitForServiceEndpoints(
				k8sClient,
				service.Namespace,
				service.Name,
				operandReadyTimeout,
			))
		})
	}
}

func TestE2E_DashboardRoute_Admitted(t *testing.T) {
	route, err := waitForAdmittedHTTPRoute(k8sClient, testNamespace, dashboardUID, operandReadyTimeout)
	require.NoError(t, err)
	require.Contains(t, []string{"odh-dashboard", "rhods-dashboard"}, route.Name)

	dashboard := &dashboardv1alpha1.Dashboard{}
	require.NoError(t, k8sClient.Get(context.Background(), client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard))
	require.NotEmpty(t, dashboard.Status.URL)
	dashboardURL, err := url.Parse(dashboard.Status.URL)
	require.NoError(t, err)
	require.Equal(t, "https", dashboardURL.Scheme)
	require.Equal(t, testGatewayDomain, dashboardURL.Hostname())

	ctx, cancel := context.WithTimeout(context.Background(), httpRequestTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, dashboardURL.String(), nil)
	require.NoError(t, err)
	response, err := routeHTTPClient().Do(request)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, response.Body.Close())
	}()
	_, err = io.Copy(io.Discard, io.LimitReader(response.Body, 1<<20))
	require.NoError(t, err)
	require.True(t, routeResponseHealthy(response.StatusCode), "Dashboard route returned %s", response.Status)
}

func TestE2E_BFFHealthchecks(t *testing.T) {
	_, err := waitForOperandInventory(k8sClient, testNamespace, dashboardUID, operandReadyTimeout)
	require.NoError(t, err)

	for _, target := range bffTargets {
		t.Run(target.name, func(t *testing.T) {
			require.NoError(t, waitForServiceEndpoints(
				k8sClient,
				testNamespace,
				target.service,
				operandReadyTimeout,
			))

			ctx, cancel := context.WithTimeout(context.Background(), httpRequestTimeout)
			defer cancel()
			service, err := getService(ctx, k8sClient, testNamespace, target.service)
			require.NoError(t, err)
			require.True(t, ownedByUID(service, dashboardUID), "Service is not owned by the E2E Dashboard")
			pod, err := readyPodForService(ctx, k8sClient, service)
			require.NoError(t, err)
			remotePort, err := resolveServiceTargetPort(service, pod, target.port)
			require.NoError(t, err)

			localPort, stop, err := startPodPortForward(ctx, restConfig, testNamespace, pod.Name, remotePort)
			require.NoError(t, err)
			defer stop()

			healthcheckURL := fmt.Sprintf("https://127.0.0.1:%d/healthcheck", localPort)
			request, err := http.NewRequestWithContext(ctx, http.MethodGet, healthcheckURL, nil)
			require.NoError(t, err)
			response, err := bffHTTPClient(target.service).Do(request)
			require.NoError(t, err)
			defer func() {
				require.NoError(t, response.Body.Close())
			}()
			body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, response.StatusCode,
				"healthcheck returned status %s, content type %q, and %d response bytes",
				response.Status, response.Header.Get("Content-Type"), len(body))
		})
	}
}

func TestE2E_PodDisruptionBudget_Created(t *testing.T) {
	inventory, err := waitForOperandInventory(k8sClient, testNamespace, dashboardUID, operandReadyTimeout)
	require.NoError(t, err)
	coreDeployment, err := findCoreDeployment(inventory.deployments)
	require.NoError(t, err)

	var pdbs int
	err = wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		operandReadyTimeout,
		true,
		func(ctx context.Context) (bool, error) {
			ownedPDBs, listErr := listOwnedPDBs(ctx, k8sClient, testNamespace, dashboardUID)
			if listErr != nil {
				return false, listErr
			}
			pdbs = len(ownedPDBs)
			return pdbs == 1, nil
		},
	)
	require.NoError(t, err, "expected exactly one owned PDB, found %d", pdbs)
	ownedPDBs, err := listOwnedPDBs(context.Background(), k8sClient, testNamespace, dashboardUID)
	require.NoError(t, err)
	require.Len(t, ownedPDBs, 1)
	pdb := &ownedPDBs[0]
	require.NotNil(t, pdb.Spec.MinAvailable)
	require.Equal(t, 1, pdb.Spec.MinAvailable.IntValue())
	matched, err := pdbSelectsDeployment(pdb, coreDeployment)
	require.NoError(t, err)
	require.True(t, matched, "PDB selector does not match the core Dashboard pod template")

	podSelector, err := metav1.LabelSelectorAsSelector(pdb.Spec.Selector)
	require.NoError(t, err)
	pods := &corev1.PodList{}
	require.NoError(t, k8sClient.List(context.Background(), pods,
		client.InNamespace(testNamespace),
		client.MatchingLabelsSelector{Selector: podSelector},
	))
	require.NotEmpty(t, pods.Items, "PDB selector does not select any live pods")
	require.True(t, anyReadyPod(pods.Items), "PDB selector does not select a ready pod")
}

func routeHTTPClient() *http.Client {
	return verifiedHTTPClient(testGatewayDomain, gatewayCARoots)
}

func bffHTTPClient(serviceName string) *http.Client {
	return verifiedHTTPClient(fmt.Sprintf("%s.%s.svc", serviceName, testNamespace), serviceCARoots)
}

func verifiedHTTPClient(serverName string, roots *x509.CertPool) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{
		MinVersion: tls.VersionTLS12,
		RootCAs:    roots,
		ServerName: serverName,
	}
	return &http.Client{
		Transport: transport,
		Timeout:   httpRequestTimeout,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}
