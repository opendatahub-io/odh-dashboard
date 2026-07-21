package k8mocks

import (
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DefaultCRDs returns the set of custom resource definitions used by the core BFF.
func DefaultCRDs() []*apiextensionsv1.CustomResourceDefinition {
	return []*apiextensionsv1.CustomResourceDefinition{
		CreateServingRuntimeCRD(),
		CreateNIMAccountCRD(),
	}
}

// CreateServingRuntimeCRD creates a minimal CRD for KServe ServingRuntime so envtest accepts the type.
func CreateServingRuntimeCRD() *apiextensionsv1.CustomResourceDefinition {
	preserveUnknown := true
	return &apiextensionsv1.CustomResourceDefinition{
		ObjectMeta: metav1.ObjectMeta{Name: "servingruntimes.serving.kserve.io"},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "serving.kserve.io",
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{{
				Name: "v1alpha1", Served: true, Storage: true,
				Schema: &apiextensionsv1.CustomResourceValidation{
					OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
						Type: "object",
						Properties: map[string]apiextensionsv1.JSONSchemaProps{
							"spec":   {Type: "object", XPreserveUnknownFields: &preserveUnknown},
							"status": {Type: "object", XPreserveUnknownFields: &preserveUnknown},
						},
					},
				},
			}},
			Scope: apiextensionsv1.NamespaceScoped,
			Names: apiextensionsv1.CustomResourceDefinitionNames{
				Plural: "servingruntimes", Singular: "servingruntime",
				Kind: "ServingRuntime", ListKind: "ServingRuntimeList",
			},
		},
	}
}

// CreateNIMAccountCRD creates a minimal CRD for NIM Account so envtest accepts the type.
func CreateNIMAccountCRD() *apiextensionsv1.CustomResourceDefinition {
	preserveUnknown := true
	return &apiextensionsv1.CustomResourceDefinition{
		ObjectMeta: metav1.ObjectMeta{Name: "accounts.nim.opendatahub.io"},
		Spec: apiextensionsv1.CustomResourceDefinitionSpec{
			Group: "nim.opendatahub.io",
			Versions: []apiextensionsv1.CustomResourceDefinitionVersion{{
				Name: "v1", Served: true, Storage: true,
				Schema: &apiextensionsv1.CustomResourceValidation{
					OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
						Type: "object",
						Properties: map[string]apiextensionsv1.JSONSchemaProps{
							"spec":   {Type: "object", XPreserveUnknownFields: &preserveUnknown},
							"status": {Type: "object", XPreserveUnknownFields: &preserveUnknown},
						},
					},
				},
			}},
			Scope: apiextensionsv1.NamespaceScoped,
			Names: apiextensionsv1.CustomResourceDefinitionNames{
				Plural: "accounts", Singular: "account",
				Kind: "Account", ListKind: "AccountList",
			},
		},
	}
}
