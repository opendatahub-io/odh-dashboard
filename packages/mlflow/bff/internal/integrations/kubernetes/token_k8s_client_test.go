package kubernetes

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	testingk8s "k8s.io/client-go/testing"
)

func TestCanWritePromptsInNamespace(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	tests := []struct {
		name       string
		namespace  string
		verb       string
		allowed    bool
		wantErr    bool
		failCreate bool
	}{
		{
			name:       "create permission granted",
			namespace:  "test-namespace",
			verb:       "create",
			allowed:    true,
			wantErr:    false,
			failCreate: false,
		},
		{
			name:       "create permission denied",
			namespace:  "restricted-namespace",
			verb:       "create",
			allowed:    false,
			wantErr:    false,
			failCreate: false,
		},
		{
			name:       "delete permission granted",
			namespace:  "test-namespace",
			verb:       "delete",
			allowed:    true,
			wantErr:    false,
			failCreate: false,
		},
		{
			name:       "delete permission denied",
			namespace:  "restricted-namespace",
			verb:       "delete",
			allowed:    false,
			wantErr:    false,
			failCreate: false,
		},
		{
			name:       "invalid verb",
			namespace:  "test-namespace",
			verb:       "update",
			allowed:    false,
			wantErr:    true,
			failCreate: false,
		},
		{
			name:       "k8s api error",
			namespace:  "error-namespace",
			verb:       "create",
			allowed:    false,
			wantErr:    true,
			failCreate: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fakeClient := fake.NewSimpleClientset()

			fakeClient.PrependReactor(
				"create",
				"selfsubjectaccessreviews",
				func(action testingk8s.Action) (handled bool, ret runtime.Object, err error) {
					if tt.failCreate {
						return true, nil, assert.AnError
					}

					createAction := action.(testingk8s.CreateAction)
					sar := createAction.GetObject().(*authv1.SelfSubjectAccessReview)

					assert.Equal(t, tt.namespace, sar.Spec.ResourceAttributes.Namespace)
					assert.Equal(t, "mlflow.kubeflow.org", sar.Spec.ResourceAttributes.Group)
					assert.Equal(t, "registeredmodels", sar.Spec.ResourceAttributes.Resource)
					assert.Equal(t, tt.verb, sar.Spec.ResourceAttributes.Verb)

					sar.Status = authv1.SubjectAccessReviewStatus{
						Allowed: tt.allowed,
					}
					return true, sar, nil
				},
			)

			client := &TokenKubernetesClient{
				SharedClientLogic: SharedClientLogic{
					Client: fakeClient,
					Logger: logger,
				},
			}

			got, err := client.CanWritePromptsInNamespace(context.Background(), tt.namespace, tt.verb)

			if tt.wantErr {
				require.Error(t, err)
				assert.False(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.allowed, got)
			}
		})
	}
}
