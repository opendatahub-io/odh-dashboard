package controller

import (
	"context"
	"time"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const operatorConfigMapName = "dashboard-operator-config"
const minReconcileInterval = 5 * time.Second

// OperatorConfig holds internal controller flags read from a ConfigMap.
// A missing or malformed ConfigMap results in zero-value defaults and
// never blocks reconciliation.
type OperatorConfig struct {
	ReconcileInterval time.Duration
}

// readOperatorConfig reads the dashboard-operator-config ConfigMap from
// the given namespace. Returns zero-value OperatorConfig on any error.
func readOperatorConfig(ctx context.Context, cli client.Client, namespace string) OperatorConfig {
	logger := log.FromContext(ctx)
	cfg := OperatorConfig{}

	cm := &corev1.ConfigMap{}
	key := types.NamespacedName{Name: operatorConfigMapName, Namespace: namespace}

	if err := cli.Get(ctx, key, cm); err != nil {
		if !k8serrors.IsNotFound(err) {
			logger.Error(err, "Failed to read operator config ConfigMap")
		}

		return cfg
	}

	if cm.Data == nil {
		return cfg
	}

	if v, ok := cm.Data["reconcileInterval"]; ok {
		d, err := time.ParseDuration(v)
		if err != nil {
			logger.Error(err, "Invalid reconcileInterval in operator config", "value", v)
		} else if d < minReconcileInterval {
			logger.Info("reconcileInterval below minimum; ignoring", "value", v, "min", minReconcileInterval)
		} else {
			cfg.ReconcileInterval = d
		}
	}

	return cfg
}
