package controller

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestUpdateStatusIfChanged_ConditionPairs(t *testing.T) {
	condition := func(status metav1.ConditionStatus, timestamp int64) common.Condition {
		return common.Condition{
			Type: conditionMaaSPortalAvailable, Status: status,
			LastTransitionTime: metav1.NewTime(time.Unix(timestamp, 0)),
		}
	}
	oldFalse := condition(metav1.ConditionFalse, 1)
	otherFalse := condition(metav1.ConditionFalse, 2)
	oldTrue := condition(metav1.ConditionTrue, 3)
	newFalse := condition(metav1.ConditionFalse, 4)
	newTrue := condition(metav1.ConditionTrue, 5)

	tests := []struct {
		name                    string
		previous, current, want []common.Condition
		wantWrites              int
	}{
		{
			name:     "unique pair retains previous time without a write",
			previous: []common.Condition{oldFalse}, current: []common.Condition{newFalse},
			want: []common.Condition{oldFalse},
		},
		{
			name:     "duplicate previous pair retains current time",
			previous: []common.Condition{oldFalse, otherFalse}, current: []common.Condition{newFalse},
			want: []common.Condition{newFalse}, wantWrites: 1,
		},
		{
			name:     "duplicate current pair retains each current time",
			previous: []common.Condition{oldFalse}, current: []common.Condition{newFalse, otherFalse},
			want: []common.Condition{newFalse, otherFalse}, wantWrites: 1,
		},
		{
			name:     "unchanged duplicate pairs do not cause a write",
			previous: []common.Condition{oldFalse, otherFalse}, current: []common.Condition{oldFalse, otherFalse},
			want: []common.Condition{oldFalse, otherFalse},
		},
		{
			name:     "same type with different statuses forms unique pairs",
			previous: []common.Condition{oldFalse, oldTrue}, current: []common.Condition{newFalse, newTrue},
			want: []common.Condition{oldFalse, oldTrue},
		},
		{
			name:     "duplicates do not prevent preserving an unrelated unique pair",
			previous: []common.Condition{oldFalse, otherFalse, oldTrue}, current: []common.Condition{newFalse, newTrue},
			want: []common.Condition{newFalse, oldTrue}, wantWrites: 1,
		},
		{
			name:     "status transition retains current time",
			previous: []common.Condition{oldFalse}, current: []common.Condition{newTrue},
			want: []common.Condition{newTrue}, wantWrites: 1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			scheme := runtime.NewScheme()
			require.NoError(t, v1alpha1.AddToScheme(scheme))
			dashboard := &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
				Status:     v1alpha1.DashboardStatus{Status: common.Status{Conditions: tt.previous}},
			}
			writes := 0
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(dashboard).
				WithStatusSubresource(dashboard).WithInterceptorFuncs(interceptor.Funcs{
				SubResourceUpdate: func(ctx context.Context, c client.Client, subresource string, obj client.Object, opts ...client.SubResourceUpdateOption) error {
					writes++
					return c.SubResource(subresource).Update(ctx, obj, opts...)
				},
			}).Build()
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(dashboard), dashboard))
			previous := dashboard.Status.DeepCopy()
			dashboard.Status.Conditions = tt.current
			r := &DashboardReconciler{Client: cli}
			require.NoError(t, r.updateStatusIfChanged(ctx, dashboard, previous))
			assert.Equal(t, tt.wantWrites, writes)
			require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(dashboard), dashboard))
			assert.Equal(t, tt.want, dashboard.Status.Conditions)
			assert.Equal(t, tt.previous, previous.Conditions, "persisted snapshot must remain unchanged")
		})
	}
}
