package k8smocks

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

// TODO: Expand this to include more test users with right permissions.
var DefaultTestUsers = []TestUser{
	{
		Token: "FAKE_BEARER_TOKEN",
	},
}

type TestUser struct {
	Token string `json:"token"`
}

type TestEnvInput struct {
	Users  []TestUser
	Logger *slog.Logger
	Ctx    context.Context
	Cancel context.CancelFunc
}

func SetupEnvTest(input TestEnvInput) (*envtest.Environment, client.Client, error) {
	// Use ENVTEST_ASSETS environment variable if set, otherwise fall back to project root
	var binaryAssetsDir string
	if envtestAssets := os.Getenv("ENVTEST_ASSETS"); envtestAssets != "" {
		binaryAssetsDir = envtestAssets
		input.Logger.Info("Using ENVTEST_ASSETS environment variable", slog.String("path", binaryAssetsDir))
	} else {
		projectRoot, err := getProjectRoot()
		if err != nil {
			input.Logger.Error("failed to find project root", slog.String("error", err.Error()))
			input.Cancel()
			os.Exit(1)
		}
		binaryAssetsDir = filepath.Join(projectRoot, "bin", "k8s", "1.29.0-darwin-arm64")
		input.Logger.Info("Using fallback binary assets directory", slog.String("path", binaryAssetsDir))
	}

	testEnv := &envtest.Environment{
		BinaryAssetsDirectory: binaryAssetsDir,
		CRDs: []*apiextensionsv1.CustomResourceDefinition{
			createLlamaStackDistributionCRD(),
		},
	}

	cfg, err := testEnv.Start()
	if err != nil {
		input.Logger.Error("failed to start envtest", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	// Create scheme and add core Kubernetes types
	scheme := runtime.NewScheme()
	err = clientgoscheme.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add Kubernetes types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	err = lsdapi.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add LlamaStackDistribution types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	err = kservev1alpha1.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add KServe v1alpha1 types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	err = kservev1beta1.AddToScheme(scheme)
	if err != nil {
		input.Logger.Error("failed to add KServe v1beta1 types to scheme", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	ctrlClient, err := client.New(cfg, client.Options{Scheme: scheme})
	if err != nil {
		input.Logger.Error("failed to create controller-runtime client", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	// bootstrap resources
	err = setupMock(ctrlClient, input.Ctx)
	if err != nil {
		input.Logger.Error("failed to setup mock data", slog.String("error", err.Error()))
		input.Cancel()
		os.Exit(1)
	}

	return testEnv, ctrlClient, nil
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

func setupMock(mockK8sClient client.Client, ctx context.Context) error {
	err := createNamespace(mockK8sClient, ctx, "llama-stack")
	if err != nil {
		return fmt.Errorf("failed to create llama-stack namespace: %w", err)
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

	return nil
}

func createNamespace(k8sClient client.Client, ctx context.Context, namespace string) error {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}

	err := k8sClient.Create(ctx, ns)
	if err != nil {
		return fmt.Errorf("failed to create namespace %s: %w", namespace, err)
	}

	return nil
}

// createLlamaStackDistributionCRD creates the CRD for LlamaStackDistribution
// Based on the official CRD from https://github.com/llamastack/llama-stack-k8s-operator/blob/main/config/crd/bases/llamastack.io_llamastackdistributions.yaml
// A better approach to replicate real CRD install would be to download the CRD and place it in the CRDDirectoryPaths, given
// pointing to a remote location is not supported yet by envtest: https://github.com/kubernetes-sigs/controller-runtime/issues/1558
func createLlamaStackDistributionCRD() *apiextensionsv1.CustomResourceDefinition {
	return &apiextensionsv1.CustomResourceDefinition{
		ObjectMeta: metav1.ObjectMeta{
			Name: "llamastackdistributions.llamastack.io",
		},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "llamastack.io",
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{
				{
					Name:    "v1alpha1",
					Served:  true,
					Storage: true,
					Schema: &apiextensionsv1.CustomResourceValidation{
						OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
							Type: "object",
							Properties: map[string]apiextensionsv1.JSONSchemaProps{
								"spec": {
									Type: "object",
									Properties: map[string]apiextensionsv1.JSONSchemaProps{
										"replicas": {
											Type: "integer",
										},
										"server": {
											Type: "object",
											Properties: map[string]apiextensionsv1.JSONSchemaProps{
												"containerSpec": {
													Type: "object",
													Properties: map[string]apiextensionsv1.JSONSchemaProps{
														"command": {
															Type: "array",
															Items: &apiextensionsv1.JSONSchemaPropsOrArray{
																Schema: &apiextensionsv1.JSONSchemaProps{
																	Type: "string",
																},
															},
														},
														"resources": {
															Type: "object",
														},
														"env": {
															Type: "array",
															Items: &apiextensionsv1.JSONSchemaPropsOrArray{
																Schema: &apiextensionsv1.JSONSchemaProps{
																	Type: "object",
																},
															},
														},
														"name": {
															Type: "string",
														},
														"port": {
															Type: "integer",
														},
													},
												},
												"distribution": {
													Type: "object",
													Properties: map[string]apiextensionsv1.JSONSchemaProps{
														"name": {
															Type: "string",
														},
													},
												},
												"userConfig": {
													Type: "object",
													Properties: map[string]apiextensionsv1.JSONSchemaProps{
														"configMapName": {
															Type: "string",
														},
													},
												},
											},
										},
									},
								},
								"status": {
									Type: "object",
									Properties: map[string]apiextensionsv1.JSONSchemaProps{
										"phase": {
											Type: "string",
										},
									},
								},
							},
						},
					},
				},
			},
			Scope: apiextensionsv1.NamespaceScoped,
			Names: apiextensionsv1.CustomResourceDefinitionNames{
				Plural:     "llamastackdistributions",
				Singular:   "llamastackdistribution",
				Kind:       "LlamaStackDistribution",
				ShortNames: []string{"lsd"},
			},
		},
	}
}
