package controller

import (
	"context"
	"fmt"
	"time"
	"unicode/utf8"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const operatorConfigMapName = "dashboard-operator-config"
const distributionConfigMapName = "odh-dashboard-config"
const minReconcileInterval = 5 * time.Second
const maxDistributionFieldLen = 256

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

// readDistributionConfig reads the distribution identity from the
// chart-deployed ConfigMap. Returns (nil, nil) when the ConfigMap is
// absent or contains no distribution keys, and (nil, err) on transient
// read failures so the caller can preserve last-known-good status.
func readDistributionConfig(ctx context.Context, cli client.Client, namespace string) (*v1alpha1.Distribution, error) {
	logger := log.FromContext(ctx)

	cm := &corev1.ConfigMap{}
	key := types.NamespacedName{Name: distributionConfigMapName, Namespace: namespace}

	if err := cli.Get(ctx, key, cm); err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, nil
		}

		return nil, fmt.Errorf("failed to read distribution config ConfigMap: %w", err)
	}

	if cm.Data == nil {
		return nil, nil
	}

	name := cm.Data["distribution.name"]
	version := cm.Data["distribution.version"]

	if name == "" && version == "" {
		return nil, nil
	}

	if runeCount := utf8.RuneCountInString(name); runeCount > maxDistributionFieldLen {
		logger.Info("Truncating distribution.name", "original_runes", runeCount)
		name = string([]rune(name)[:maxDistributionFieldLen])
	}

	if runeCount := utf8.RuneCountInString(version); runeCount > maxDistributionFieldLen {
		logger.Info("Truncating distribution.version", "original_runes", runeCount)
		version = string([]rune(version)[:maxDistributionFieldLen])
	}

	return &v1alpha1.Distribution{
		Name:    name,
		Version: version,
	}, nil
}

// readPlatformVersion reads the platformVersion key from the
// chart-deployed ConfigMap. Returns ("", nil) when the ConfigMap is
// absent or the key is missing, and ("", err) on transient read failures.
func readPlatformVersion(ctx context.Context, cli client.Client, namespace string) (string, error) {
	logger := log.FromContext(ctx)

	cm := &corev1.ConfigMap{}
	key := types.NamespacedName{Name: distributionConfigMapName, Namespace: namespace}

	if err := cli.Get(ctx, key, cm); err != nil {
		if k8serrors.IsNotFound(err) {
			return "", nil
		}

		return "", fmt.Errorf("failed to read platform config ConfigMap: %w", err)
	}

	if cm.Data == nil {
		return "", nil
	}

	version := cm.Data["platformVersion"]
	if runeCount := utf8.RuneCountInString(version); runeCount > maxDistributionFieldLen {
		logger.Info("Truncating platformVersion", "original_runes", runeCount)
		version = string([]rune(version)[:maxDistributionFieldLen])
	}

	return version, nil
}
