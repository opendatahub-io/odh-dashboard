package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"os"

	routev1 "github.com/openshift/api/route/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	ctrlwebhook "sigs.k8s.io/controller-runtime/pkg/webhook"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
	"github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/webhook"
)

var scheme = runtime.NewScheme()

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(v1alpha1.AddToScheme(scheme))
	utilruntime.Must(routev1.AddToScheme(scheme))
	utilruntime.Must(apiextensionsv1.AddToScheme(scheme))
}

func main() {
	var (
		manifestsBasePath string
		metricsAddr       string
		healthProbeAddr   string
		leaderElect       bool
		secureMetrics     bool
		operatorNamespace string
		webhookPort       int
	)

	flag.StringVar(&manifestsBasePath, "manifests-base-path", "/opt/manifests/dashboard", "Base path for dashboard manifests")
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8443", "Address the metrics endpoint binds to")
	flag.StringVar(&healthProbeAddr, "health-probe-bind-address", ":8081", "Address the health probe endpoint binds to")
	flag.BoolVar(&leaderElect, "leader-elect", false, "Enable leader election for controller manager")
	flag.BoolVar(&secureMetrics, "secure-metrics", true, "Serve metrics over HTTPS using cert-manager certificates")
	flag.StringVar(&operatorNamespace, "namespace", "", "Namespace where the operator is deployed")
	flag.IntVar(&webhookPort, "webhook-port", 9443, "Port the webhook server binds to")

	opts := zap.Options{Development: true}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))
	setupLog := ctrl.Log.WithName("setup")

	if operatorNamespace == "" {
		operatorNamespace = os.Getenv("OPERATOR_NAMESPACE")
	}
	if operatorNamespace == "" {
		setupLog.Error(fmt.Errorf("namespace is required"), "set --namespace flag or OPERATOR_NAMESPACE env var")
		os.Exit(1)
	}

	applicationsNamespace := os.Getenv("APPLICATIONS_NAMESPACE")
	if applicationsNamespace == "" {
		applicationsNamespace = operatorNamespace
	}

	metricsOpts := metricsserver.Options{BindAddress: metricsAddr}
	if secureMetrics {
		metricsOpts.SecureServing = true
		metricsOpts.CertDir = "/tmp/k8s-metrics-server/serving-certs"
		metricsOpts.TLSOpts = []func(*tls.Config){
			func(c *tls.Config) {
				c.MinVersion = tls.VersionTLS12
				c.NextProtos = []string{"http/1.1"}
			},
		}
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		Metrics:                metricsOpts,
		HealthProbeBindAddress: healthProbeAddr,
		LeaderElection:         leaderElect,
		LeaderElectionID:       "dashboard.components.platform.opendatahub.io",
		WebhookServer:          ctrlwebhook.NewServer(ctrlwebhook.Options{Port: webhookPort}),
	})
	if err != nil {
		setupLog.Error(err, "unable to create manager")
		os.Exit(1)
	}

	ctx := context.Background()
	platform, err := cluster.DetectPlatform(ctx, mgr.GetClient(), os.Getenv("ODH_PLATFORM_TYPE"), operatorNamespace)
	if err != nil {
		setupLog.Error(err, "unable to detect platform")
		os.Exit(1)
	}
	setupLog.Info("Detected platform", "platform", platform)

	if err := controller.SetupWithManager(mgr, controller.Options{
		ManifestsBasePath:     manifestsBasePath,
		Platform:              platform,
		Namespace:             operatorNamespace,
		ApplicationsNamespace: applicationsNamespace,
	}); err != nil {
		setupLog.Error(err, "unable to create Dashboard controller")
		os.Exit(1)
	}

	mgr.GetWebhookServer().Register("/validate-dashboard", webhook.NewSingletonHandler(mgr.GetAPIReader()))
	setupLog.Info("Registered singleton validation webhook", "path", "/validate-dashboard")

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	setupLog.Info("Starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}
