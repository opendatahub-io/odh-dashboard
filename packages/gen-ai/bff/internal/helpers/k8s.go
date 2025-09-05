package helper

import (
	"fmt"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	clientRest "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// GetKubeconfig returns the current KUBECONFIG configuration based on the default loading rules.
func GetKubeconfig() (*clientRest.Config, error) {
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	return kubeConfig.ClientConfig()
}

// BuildScheme builds a new runtime scheme with all the necessary types registered.
func BuildScheme() (*runtime.Scheme, error) {
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add Kubernetes types to scheme: %w", err)
	}
	if err := lsdapi.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add LlamaStackDistribution types to scheme: %w", err)
	}
	if err := kservev1alpha1.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add KServe v1alpha1 types to scheme: %w", err)
	}
	if err := kservev1beta1.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add KServe v1beta1 types to scheme: %w", err)
	}

	return scheme, nil
}
