package fake

import (
	"context"
	"fmt"

	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

// K8sClient is a fake implementation of kubernetes.Client for local development and testing.
// It returns realistic namespaces, secrets, and DSPA resources so the automl UI
// renders a fully functional experience without a live cluster.
type K8sClient struct{}

var _ kubernetes.Client = (*K8sClient)(nil)

var fakeNamespaces = []v1.Namespace{
	{ObjectMeta: metav1.ObjectMeta{Name: "my-project", Annotations: map[string]string{"openshift.io/display-name": "my-project"}}},
	{ObjectMeta: metav1.ObjectMeta{Name: "no-dspa", Annotations: map[string]string{"openshift.io/display-name": "no-dspa"}}},
}

// fakeSecrets maps namespace → secret name → secret.
// Namespaces with secrets get a DSPA in ListResources.
var fakeSecrets = map[string][]v1.Secret{
	"my-project": {
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "data-connection",
				Namespace: "my-project",
				UID:       "65a51caf-b42f-4db7-aaac-a30e76a2410f",
				Annotations: map[string]string{
					"openshift.io/display-name": "data-connection",
				},
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("fake-access-key"),
				"AWS_SECRET_ACCESS_KEY": []byte("fake-secret-key"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.us-east-1.amazonaws.com"),
				"AWS_S3_BUCKET":         []byte("automl-data"),
			},
		},
	},
}

func (c *K8sClient) ListResources(_ context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	// Return fake ModelRegistry CRs in the registries namespace
	if gvr.Resource == "modelregistries" && namespace == "rhoai-model-registries" {
		mr := unstructured.Unstructured{Object: map[string]any{
			"apiVersion": gvr.Group + "/" + gvr.Version,
			"kind":       "ModelRegistry",
			"metadata": map[string]any{
				"name":      "fake-registry",
				"namespace": namespace,
				"uid":       "6fb09186-eb11-4b68-8e3a-8017fb3bf18f",
				"annotations": map[string]any{
					"openshift.io/display-name": "Fake Model Registry",
					"openshift.io/description":  "A fake model registry for local development",
				},
			},
			"status": map[string]any{
				"conditions": []any{
					map[string]any{
						"type":   "Available",
						"status": "True",
					},
				},
				"hosts": []any{
					"fake-registry-rest.apps.cluster.example.com",
					fmt.Sprintf("fake-registry.%s.svc.cluster.local", namespace),
				},
			},
		}}
		return &unstructured.UnstructuredList{Items: []unstructured.Unstructured{mr}}, nil
	}

	// Return a fake DSPA for any namespace that has secrets
	if gvr.Resource == "datasciencepipelinesapplications" {
		if _, ok := fakeSecrets[namespace]; ok {
			dspa := unstructured.Unstructured{}
			dspa.SetName("dspa")
			dspa.SetNamespace(namespace)
			dspa.Object = map[string]any{
				"apiVersion": gvr.Group + "/" + gvr.Version,
				"kind":       "DataSciencePipelinesApplication",
				"metadata": map[string]any{
					"name":      "dspa",
					"namespace": namespace,
				},
				"spec": map[string]any{
					"apiServer": map[string]any{
						"deploy": true,
					},
					"objectStorage": map[string]any{
						"externalStorage": map[string]any{
							"host":   "s3.us-east-1.amazonaws.com",
							"port":   "",
							"scheme": "https",
							"region": "us-east-1",
							"bucket": "automl-data",
							"s3CredentialsSecret": map[string]any{
								"secretName": "data-connection",
								"accessKey":  "AWS_ACCESS_KEY_ID",
								"secretKey":  "AWS_SECRET_ACCESS_KEY",
							},
						},
					},
				},
				"status": map[string]any{
					"ready": true,
					"conditions": []any{
						map[string]any{
							"type":   "Ready",
							"status": "True",
						},
					},
					"components": map[string]any{
						"apiServer": map[string]any{
							"url": fmt.Sprintf("https://ds-pipeline-dspa.%s.svc.cluster.local:8443", namespace),
						},
					},
				},
			}
			return &unstructured.UnstructuredList{Items: []unstructured.Unstructured{dspa}}, nil
		}
	}
	return &unstructured.UnstructuredList{}, nil
}

func (c *K8sClient) GetResource(_ context.Context, _ schema.GroupVersionResource, _, _ string) (*unstructured.Unstructured, error) {
	return &unstructured.Unstructured{}, nil
}

func (c *K8sClient) CreateResource(_ context.Context, _ schema.GroupVersionResource, _ string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return obj, nil
}

func (c *K8sClient) PatchResource(_ context.Context, _ schema.GroupVersionResource, _, _ string, _ types.PatchType, _ []byte) (*unstructured.Unstructured, error) {
	return &unstructured.Unstructured{}, nil
}

func (c *K8sClient) PatchDeployment(_ context.Context, _, _ string, _ types.PatchType, _ []byte) error {
	return nil
}

func (c *K8sClient) GetNamespaces(_ context.Context) ([]v1.Namespace, error) {
	return fakeNamespaces, nil
}

func (c *K8sClient) GetPods(_ context.Context, _ string) (*v1.PodList, error) {
	return &v1.PodList{}, nil
}

func (c *K8sClient) GetSecrets(_ context.Context, namespace string) ([]v1.Secret, error) {
	if secrets, ok := fakeSecrets[namespace]; ok {
		return secrets, nil
	}
	return []v1.Secret{}, nil
}

func (c *K8sClient) GetSecret(_ context.Context, namespace, secretName string) (*v1.Secret, error) {
	if secrets, ok := fakeSecrets[namespace]; ok {
		for i := range secrets {
			if secrets[i].Name == secretName {
				return &secrets[i], nil
			}
		}
	}
	return nil, fmt.Errorf("secret %q not found in namespace %q", secretName, namespace)
}

func (c *K8sClient) GetUser(_ context.Context) (string, error) {
	return "fake-user@example.com", nil
}

func (c *K8sClient) IsClusterAdmin(_ context.Context) (bool, error) {
	return true, nil
}

func (c *K8sClient) CanAccessResource(_ context.Context, _, _, _, _, _ string) (bool, error) {
	return true, nil
}

func (c *K8sClient) DiscoverResourceGVR(_ context.Context, group, resource, _ string, knownVersions []string) (schema.GroupVersionResource, error) {
	if len(knownVersions) > 0 {
		return schema.GroupVersionResource{
			Group:    group,
			Version:  knownVersions[0],
			Resource: resource,
		}, nil
	}
	return schema.GroupVersionResource{}, nil
}
