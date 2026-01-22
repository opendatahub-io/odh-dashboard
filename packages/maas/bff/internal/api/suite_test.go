package api

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	k8s "github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes/k8mocks"
	"k8s.io/client-go/dynamic"
	k8sclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var (
	k8Factory     k8s.KubernetesClientFactory
	testEnv       *envtest.Environment
	cancel        context.CancelFunc
	clientset     k8sclient.Interface
	dynamicClient dynamic.Interface
	logger        *slog.Logger
	restConfig    *rest.Config
)

func TestAPI(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "API Suite")
}

var _ = BeforeSuite(func() {
	logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))
	ctx, c := context.WithCancel(context.Background())
	cancel = c

	logger = slog.New(slog.NewTextHandler(os.Stdout, nil))

	var err error
	testEnv, clientset, dynamicClient, err = k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	})
	Expect(err).NotTo(HaveOccurred())
	restConfig = testEnv.Config
	cfg := config.EnvConfig{AuthMethod: config.AuthMethodInternal}
	k8Factory, err = k8mocks.NewMockedKubernetesClientFactory(clientset, dynamicClient, testEnv, cfg, logger)
	Expect(k8Factory).NotTo(BeNil())

	Expect(err).NotTo(HaveOccurred())
})

var _ = AfterSuite(func() {
	if testEnv != nil {
		Expect(testEnv.Stop()).To(Succeed())
	}
	if cancel != nil {
		cancel()
	}
})
