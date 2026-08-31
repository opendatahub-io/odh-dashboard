/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"crypto/tls"
	"flag"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"sigs.k8s.io/controller-runtime/pkg/client"

	istiov1 "istio.io/client-go/pkg/apis/networking/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
	gatewayv1beta1 "sigs.k8s.io/gateway-api/apis/v1beta1"

	kubefloworgv1beta1 "github.com/kubeflow/notebooks/workspaces/controller/api/v1beta1"
	"github.com/kubeflow/notebooks/workspaces/controller/internal/config"
	controllerInternal "github.com/kubeflow/notebooks/workspaces/controller/internal/controller"
	"github.com/kubeflow/notebooks/workspaces/controller/internal/helper"
	webhookInternal "github.com/kubeflow/notebooks/workspaces/controller/internal/webhook"
	// +kubebuilder:scaffold:imports
)

// +kubebuilder:webhookconfiguration:mutating=false,name=workspaces-validating-webhook-configuration

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(istiov1.AddToScheme(scheme))

	utilruntime.Must(gatewayv1.Install(scheme))
	utilruntime.Must(gatewayv1beta1.Install(scheme))

	utilruntime.Must(kubefloworgv1beta1.AddToScheme(scheme))
	// +kubebuilder:scaffold:scheme
}

func main() {
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
	var secureMetrics bool
	var enableHTTP2 bool

	// Define command line flags
	cfg := &config.EnvConfig{}

	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.BoolVar(&secureMetrics, "metrics-secure", false,
		"If set the metrics endpoint is served securely")
	flag.BoolVar(&enableHTTP2, "enable-http2", false,
		"If set, HTTP/2 will be enabled for the metrics and webhook servers")
	flag.StringVar(&cfg.IstioGateway, "istio-gateway", getEnvAsStr("ISTIO_GATEWAY", ""),
		"The name of the Istio gateway to use")
	flag.StringVar(&cfg.IstioHosts, "istio-hosts", getEnvAsStr("ISTIO_HOSTS", "*"),
		"The hosts to use for the Istio VirtualService")
	flag.StringVar(&cfg.ClusterDomain, "cluster-domain", getEnvAsStr("CLUSTER_DOMAIN", "cluster.local"),
		"The domain to use for the Istio VirtualService")
	flag.BoolVar(&cfg.UseIstio, "use-istio", getEnvAsBool("USE_ISTIO", false),
		"If set, Istio will be used")
	flag.BoolVar(&cfg.UseKubeGateway, "use-kube-gateway", getEnvAsBool("USE_KUBE_GATEWAY", false),
		"If set, Kubernetes Gateway API will be used for workspace access")
	flag.StringVar(&cfg.KubeGatewayName, "kube-gateway-name", getEnvAsStr("KUBE_GATEWAY_NAME", "kubeflow-gateway"),
		"The name of the Kubernetes Gateway to use")
	flag.StringVar(&cfg.KubeGatewayNamespace, "kube-gateway-namespace", getEnvAsStr("KUBE_GATEWAY_NAMESPACE", "kubeflow"),
		"The namespace of the Kubernetes Gateway")
	flag.StringVar(&cfg.KubeRbacProxyImage, "kube-rbac-proxy-image", getEnvAsStr("KUBE_RBAC_PROXY_IMAGE", ""),
		"The image to use for the kube-rbac-proxy sidecar")

	// Get controller namespace (from service account file or POD_NAMESPACE env var)
	cfg.ControllerNamespace = getControllerNamespace("kubeflow-workspaces")

	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	if cfg.UseIstio && cfg.UseKubeGateway {
		setupLog.Error(nil, "use-istio and use-kube-gateway cannot both be enabled")
		os.Exit(1)
	}
	if cfg.UseKubeGateway && cfg.KubeRbacProxyImage == "" {
		setupLog.Error(nil, "kube-rbac-proxy-image is required when use-kube-gateway is enabled")
		os.Exit(1)
	}

	// Log configuration values for debugging
	setupLog.Info("Configuration loaded",
		"UseIstio", cfg.UseIstio,
		"UseKubeGateway", cfg.UseKubeGateway,
		"KubeGatewayName", cfg.KubeGatewayName,
		"KubeGatewayNamespace", cfg.KubeGatewayNamespace,
		"ControllerNamespace", cfg.ControllerNamespace,
		"ClusterDomain", cfg.ClusterDomain,
		"IstioGateway", cfg.IstioGateway,
		"IstioHosts", cfg.IstioHosts,
		"KubeRbacProxyImage", sanitizeImageReference(cfg.KubeRbacProxyImage))

	// if the enable-http2 flag is false (the default), http/2 should be disabled
	// due to its vulnerabilities. More specifically, disabling http/2 will
	// prevent from being vulnerable to the HTTP/2 Stream Cancellation and
	// Rapid Reset CVEs. For more information see:
	// - https://github.com/advisories/GHSA-qppj-fm5r-hxr3
	// - https://github.com/advisories/GHSA-4374-p667-p6c8
	disableHTTP2 := func(c *tls.Config) {
		setupLog.Info("disabling http/2")
		c.NextProtos = []string{"http/1.1"}
	}

	tlsOpts := []func(*tls.Config){}
	if !enableHTTP2 {
		tlsOpts = append(tlsOpts, disableHTTP2)
	}

	webhookServer := webhook.NewServer(webhook.Options{
		Port:    9443,
		TLSOpts: tlsOpts,
	})

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme: scheme,
		Client: client.Options{
			Cache: &client.CacheOptions{
				// Disable caching for ConfigMaps and Secrets as caching all of them can take a LOT of memory in a large cluster.
				// We create special caches that are filtered by label selectors (e.g. the image source ConfigMaps).
				// REFERENCE: https://github.com/kubernetes-sigs/controller-runtime/issues/244#issuecomment-2466564541
				DisableFor: []client.Object{
					&corev1.ConfigMap{},
					&corev1.Secret{},
				},
			},
		},
		Metrics: metricsserver.Options{
			BindAddress:   metricsAddr,
			SecureServing: secureMetrics,
			TLSOpts:       tlsOpts,
		},
		WebhookServer:          webhookServer,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "kubeflow-workspace-controller",
		// LeaderElectionReleaseOnCancel defines if the leader should step down voluntarily
		// when the Manager ends. This requires the binary to immediately end when the
		// Manager is stopped, otherwise, this setting is unsafe. Setting this significantly
		// speeds up voluntary leader transitions as the new leader don't have to wait
		// LeaseDuration time first.
		//
		// In the default scaffold provided, the program ends immediately after
		// the manager stops, so would be fine to enable this option. However,
		// if you are doing or is intended to do any operation such as perform cleanups
		// after the manager stops then its usage might be unsafe.
		//
		// TODO: check if we are doing anything which would prevent us from using this option.
		// LeaderElectionReleaseOnCancel: true,
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	// setup field indexers on the manager cache. we use these indexes to efficiently
	// query the cache for things like which Workspaces are using a particular WorkspaceKind
	// NOTE: We use retry logic here because OpenShift uses bound service account tokens
	// (projected volumes) which may take a few seconds to become available after pod startup.
	// This is different from standard Kubernetes which uses pre-created token secrets.
	var indexerErr error
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		indexerErr = helper.SetupManagerFieldIndexers(mgr, cfg)
		if indexerErr == nil {
			break
		}
		setupLog.Info("failed to setup field indexers, retrying...",
			"attempt", i+1, "maxRetries", maxRetries, "error", indexerErr)
		time.Sleep(time.Duration(i+1) * time.Second) // exponential-ish backoff: 1s, 2s, 3s, 4s, 5s
	}
	if indexerErr != nil {
		setupLog.Error(indexerErr, "unable to setup field indexers after retries")
		os.Exit(1)
	}

	if err = (&controllerInternal.WorkspaceReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
		Config: cfg,
	}).SetupWithManager(mgr, &controller.Options{
		RateLimiter: helper.BuildRateLimiter(),
	}); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Workspace")
		os.Exit(1)
	}
	imageSourceCache, err := helper.BuildImageSourceConfigMapCache(mgr)
	if err != nil {
		setupLog.Error(err, "unable to build image source ConfigMap cache")
		os.Exit(1)
	}
	if err = (&controllerInternal.WorkspaceKindReconciler{
		Client:           mgr.GetClient(),
		Scheme:           mgr.GetScheme(),
		ImageSourceCache: imageSourceCache,
	}).SetupWithManager(mgr, &controller.Options{
		RateLimiter: helper.BuildRateLimiter(),
	}); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "WorkspaceKind")
		os.Exit(1)
	}
	// +kubebuilder:scaffold:builder

	if os.Getenv("ENABLE_WEBHOOKS") != "false" {
		if err = (&webhookInternal.WorkspaceValidator{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}).SetupWebhookWithManager(mgr); err != nil {
			setupLog.Error(err, "unable to create webhook", "webhook", "Workspace")
			os.Exit(1)
		}
	}
	if os.Getenv("ENABLE_WEBHOOKS") != "false" {
		if err = (&webhookInternal.WorkspaceKindValidator{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}).SetupWebhookWithManager(mgr); err != nil {
			setupLog.Error(err, "unable to create webhook", "webhook", "WorkspaceKind")
			os.Exit(1)
		}
	}

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}

func sanitizeImageReference(image string) string {
	if image == "" {
		return ""
	}
	parsed, err := url.Parse(image)
	if err != nil || parsed.User == nil {
		return image
	}
	parsed.User = url.UserPassword("REDACTED", "REDACTED")
	return parsed.String()
}

func getEnvAsStr(name string, defaultVal string) string {
	if value, exists := os.LookupEnv(name); exists {
		return value
	}
	return defaultVal
}

func getEnvAsBool(name string, defaultVal bool) bool {
	if value, exists := os.LookupEnv(name); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultVal
}

// getControllerNamespace returns the namespace the controller is running in.
// It first checks the standard Kubernetes service account namespace file,
// then falls back to the POD_NAMESPACE environment variable.
func getControllerNamespace(defaultVal string) string {
	// First, try to read from the service account namespace file
	// This works in both OpenShift and standard Kubernetes
	const namespaceFile = "/var/run/secrets/kubernetes.io/serviceaccount/namespace"
	if data, err := os.ReadFile(namespaceFile); err == nil {
		if namespace := strings.TrimSpace(string(data)); namespace != "" {
			return namespace
		}
	}

	// Fallback to environment variable (useful for local development or custom setups)
	if value, exists := os.LookupEnv("POD_NAMESPACE"); exists {
		if namespace := strings.TrimSpace(value); namespace != "" {
			return namespace
		}
	}

	return defaultVal
}
