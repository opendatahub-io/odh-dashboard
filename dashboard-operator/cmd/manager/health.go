package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
)

const apiReadinessTimeout = 3 * time.Second

// apiServerReadyz reports the controller unready when it cannot reach the API
// server. Liveness remains a local ping so a temporary partition does not cause
// kubelet to restart a controller that can recover its watches after reconnecting.
func apiServerReadyz(reader client.Reader) healthz.Checker {
	return func(request *http.Request) error {
		ctx, cancel := context.WithTimeout(request.Context(), apiReadinessTimeout)
		defer cancel()

		dashboard := &dashboardv1alpha1.Dashboard{}
		err := reader.Get(ctx, client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard)
		if err == nil || apierrors.IsNotFound(err) {
			return nil
		}

		return fmt.Errorf("check API server connectivity: %w", err)
	}
}
