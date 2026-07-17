package pgvector

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	readinessPollInterval = 2 * time.Second
	readinessTimeout      = 5 * time.Second
	rollbackMaxRetries    = 3
	rollbackRetryDelay    = 500 * time.Millisecond
)

// ErrResourcesTerminating is returned when a previous pgvector instance is still
// being deleted. Callers should surface a user-friendly retry message.
var ErrResourcesTerminating = errors.New("previous pgvector resources are still being removed")

// Options configures the pgvector provisioner.
type Options struct {
	// Image is the PostgreSQL container image (from RELATED_IMAGE_POSTGRESQL_16_IMAGE).
	Image string
	// OGXServerLabelSelector is the pod label selector for the OGXServer workload,
	// used to scope the NetworkPolicy ingress rule.
	OGXServerLabelSelector map[string]string
	// Logger for diagnostic output. If nil, a default logger is used.
	Logger *slog.Logger
}

func (o Options) logger() *slog.Logger {
	if o.Logger != nil {
		return o.Logger
	}
	return slog.Default()
}

// managedLabels returns the labels applied to every auto-provisioned resource.
func managedLabels() map[string]string {
	return map[string]string{
		ManagedLabel: ManagedLabelValue,
	}
}

// EnsurePostgres provisions a pgvector-enabled PostgreSQL instance in the
// namespace if one does not already exist. It is idempotent: when an existing
// instance is found (by label), its connection details are returned without
// creating or modifying anything.
//
// On first creation the function creates, in order: Secret, PVC, Deployment,
// Service, NetworkPolicy. If any step fails the resources created so far are
// rolled back.
func EnsurePostgres(ctx context.Context, c client.Client, namespace string, opts Options) (*Connection, error) {
	log := opts.logger()

	if len(opts.OGXServerLabelSelector) == 0 {
		return nil, fmt.Errorf("OGXServerLabelSelector must be non-empty to scope the NetworkPolicy ingress rule")
	}

	// Check for an existing pgvector Deployment by its deterministic name.
	var existing appsv1.Deployment
	if err := c.Get(ctx, client.ObjectKey{Name: DeploymentName, Namespace: namespace}, &existing); err == nil {
		if existing.DeletionTimestamp == nil {
			if err := validateExistingManagedResources(ctx, c, namespace); err != nil {
				return nil, err
			}
			return connectionFromExisting(ctx, c, namespace)
		}
		log.Info("existing pgvector Deployment is still terminating", "namespace", namespace)
		return nil, fmt.Errorf("%w: the Deployment is still terminating — please wait a moment and try again", ErrResourcesTerminating)
	} else if !apierrors.IsNotFound(err) {
		return nil, fmt.Errorf("failed to check for existing pgvector Deployment: %w", err)
	}

	// The Deployment is gone, but other resources (especially PVCs) may still
	// be finalizing. Check for any terminating resources and fail fast rather
	// than blocking the HTTP request.
	if err := checkForTerminatingResources(ctx, c, namespace, log); err != nil {
		return nil, err
	}

	// Warn if no default StorageClass exists -- the PVC will hang in Pending.
	checkDefaultStorageClass(ctx, c, log)

	password, err := generatePassword()
	if err != nil {
		return nil, fmt.Errorf("failed to generate pgvector password: %w", err)
	}

	// Track created resources for rollback.
	var created []client.Object

	rollbackCtx := context.WithoutCancel(ctx)
	rollback := func() {
		for i := len(created) - 1; i >= 0; i-- {
			rollbackDelete(rollbackCtx, c, created[i], log)
		}
	}

	// 1. Secret
	secret := buildSecret(namespace, password)
	if err := c.Create(ctx, secret); err != nil {
		if isBeingDeleted(err) {
			return nil, fmt.Errorf("%w: Secret %q is still terminating — please wait a moment and try again", ErrResourcesTerminating, CredentialsSecretName)
		}
		return nil, fmt.Errorf("failed to create pgvector credentials Secret: %w", err)
	}
	created = append(created, secret)

	// 2. Init ConfigMap (creates the pgvector extension on first boot)
	initCM := buildInitConfigMap(namespace)
	if err := c.Create(ctx, initCM); err != nil {
		rollback()
		if isBeingDeleted(err) {
			return nil, fmt.Errorf("%w: ConfigMap %q is still terminating — please wait a moment and try again", ErrResourcesTerminating, InitConfigMapName)
		}
		return nil, fmt.Errorf("failed to create pgvector init ConfigMap: %w", err)
	}
	created = append(created, initCM)

	// 3. PVC
	pvc := buildPVC(namespace)
	if err := c.Create(ctx, pvc); err != nil {
		rollback()
		if isBeingDeleted(err) {
			return nil, fmt.Errorf("%w: PVC %q is still terminating — please wait a moment and try again", ErrResourcesTerminating, StoragePVCName)
		}
		return nil, fmt.Errorf("failed to create pgvector storage PVC: %w", err)
	}
	created = append(created, pvc)

	// 4. Deployment
	deploy := buildDeployment(namespace, opts.Image)
	if err := c.Create(ctx, deploy); err != nil {
		rollback()
		if isBeingDeleted(err) {
			return nil, fmt.Errorf("%w: Deployment %q is still terminating — please wait a moment and try again", ErrResourcesTerminating, DeploymentName)
		}
		return nil, fmt.Errorf("failed to create pgvector Deployment: %w", err)
	}
	created = append(created, deploy)

	// 5. Service
	svc := buildService(namespace)
	if err := c.Create(ctx, svc); err != nil {
		rollback()
		if isBeingDeleted(err) {
			return nil, fmt.Errorf("%w: Service %q is still terminating — please wait a moment and try again", ErrResourcesTerminating, ServiceName)
		}
		return nil, fmt.Errorf("failed to create pgvector Service: %w", err)
	}
	created = append(created, svc)

	// 6. NetworkPolicy
	netpol := buildNetworkPolicy(namespace, opts.OGXServerLabelSelector)
	if err := c.Create(ctx, netpol); err != nil {
		rollback()
		if isBeingDeleted(err) {
			return nil, fmt.Errorf("%w: NetworkPolicy %q is still terminating — please wait a moment and try again", ErrResourcesTerminating, NetworkPolicyName)
		}
		return nil, fmt.Errorf("failed to create pgvector NetworkPolicy: %w", err)
	}
	created = append(created, netpol)

	// Best-effort wait for pgvector readiness. Kept short (5s) because the
	// OGXServer's own restart logic handles the race on cold starts. On warm
	// starts (PVC already bound, image cached) this may succeed and avoid an
	// initial OGXServer restart cycle.
	if err := waitForReady(ctx, c, namespace, readinessTimeout, log); err != nil {
		log.Warn("pgvector not ready within timeout; OGXServer may retry on connect",
			"timeout", readinessTimeout, "error", err, "namespace", namespace)
	} else {
		log.Info("pgvector provisioned and ready", "namespace", namespace)
	}

	return &Connection{
		Host: fmt.Sprintf("%s.%s.svc.cluster.local", ServiceName, namespace),
		Port: DefaultPort,
		DB:   DefaultDB,
		User: DefaultUser,
		PasswordSecret: &SecretRef{
			Name: CredentialsSecretName,
			Key:  DefaultPasswordKey,
		},
	}, nil
}

// DeletePostgresResources removes all auto-provisioned pgvector resources in
// the namespace by their known names. Errors are collected but the function
// attempts to delete everything. NotFound errors are ignored (resource already gone).
func DeletePostgresResources(ctx context.Context, c client.Client, namespace string) error {
	var errs []error

	deleteByName := func(obj client.Object, kind, name string) {
		obj.SetName(name)
		obj.SetNamespace(namespace)
		if err := c.Delete(ctx, obj); err != nil {
			if !apierrors.IsNotFound(err) {
				errs = append(errs, fmt.Errorf("%s %s: %w", kind, name, err))
			}
		}
	}

	deleteByName(&networkingv1.NetworkPolicy{}, "NetworkPolicy", NetworkPolicyName)
	deleteByName(&corev1.Service{}, "Service", ServiceName)
	deleteByName(&appsv1.Deployment{}, "Deployment", DeploymentName)
	deleteByName(&corev1.PersistentVolumeClaim{}, "PVC", StoragePVCName)
	deleteByName(&corev1.ConfigMap{}, "ConfigMap", InitConfigMapName)
	deleteByName(&corev1.Secret{}, "Secret", CredentialsSecretName)

	if len(errs) > 0 {
		return fmt.Errorf("failed to delete pgvector resources: %v", errs)
	}
	return nil
}

// SetOwnerReferences patches all auto-provisioned pgvector resources in the
// namespace to include the given OwnerReference. This enables Kubernetes garbage
// collection when the owner (e.g. OGXServer) is deleted. Resources that are not
// found are silently skipped (they may not have been provisioned).
func SetOwnerReferences(ctx context.Context, c client.Client, namespace string, ownerRef metav1.OwnerReference) error {
	var errs []error

	patchOwner := func(obj client.Object, kind, name string) {
		key := client.ObjectKey{Name: name, Namespace: namespace}
		if err := c.Get(ctx, key, obj); err != nil {
			if !apierrors.IsNotFound(err) {
				errs = append(errs, fmt.Errorf("get %s %s: %w", kind, name, err))
			}
			return
		}
		obj.SetOwnerReferences([]metav1.OwnerReference{ownerRef})
		if err := c.Update(ctx, obj); err != nil {
			errs = append(errs, fmt.Errorf("update %s %s owner: %w", kind, name, err))
		}
	}

	patchOwner(&corev1.Secret{}, "Secret", CredentialsSecretName)
	patchOwner(&corev1.ConfigMap{}, "ConfigMap", InitConfigMapName)
	patchOwner(&corev1.PersistentVolumeClaim{}, "PVC", StoragePVCName)
	patchOwner(&appsv1.Deployment{}, "Deployment", DeploymentName)
	patchOwner(&corev1.Service{}, "Service", ServiceName)
	patchOwner(&networkingv1.NetworkPolicy{}, "NetworkPolicy", NetworkPolicyName)

	if len(errs) > 0 {
		return fmt.Errorf("failed to set owner references on pgvector resources: %v", errs)
	}
	return nil
}

// ClearOwnerReferences removes owner references from all pgvector-managed
// resources in the namespace. This prevents Kubernetes garbage collection from
// cascading-deleting pgvector when the OGXServer is deleted during a reconfigure.
func ClearOwnerReferences(ctx context.Context, c client.Client, namespace string) error {
	var errs []error

	clearOwner := func(obj client.Object, kind, name string) {
		key := client.ObjectKey{Name: name, Namespace: namespace}
		if err := c.Get(ctx, key, obj); err != nil {
			if !apierrors.IsNotFound(err) {
				errs = append(errs, fmt.Errorf("get %s %s: %w", kind, name, err))
			}
			return
		}
		if len(obj.GetOwnerReferences()) == 0 {
			return
		}
		obj.SetOwnerReferences(nil)
		if err := c.Update(ctx, obj); err != nil {
			errs = append(errs, fmt.Errorf("clear %s %s owner: %w", kind, name, err))
		}
	}

	clearOwner(&corev1.Secret{}, "Secret", CredentialsSecretName)
	clearOwner(&corev1.ConfigMap{}, "ConfigMap", InitConfigMapName)
	clearOwner(&corev1.PersistentVolumeClaim{}, "PVC", StoragePVCName)
	clearOwner(&appsv1.Deployment{}, "Deployment", DeploymentName)
	clearOwner(&corev1.Service{}, "Service", ServiceName)
	clearOwner(&networkingv1.NetworkPolicy{}, "NetworkPolicy", NetworkPolicyName)

	if len(errs) > 0 {
		return fmt.Errorf("failed to clear owner references on pgvector resources: %v", errs)
	}
	return nil
}

// validateExistingManagedResources verifies the full pgvector resource set
// (Secret, ConfigMap, PVC, Service, NetworkPolicy) exists and none are
// terminating. This prevents returning a Connection when supporting resources
// are missing (e.g. Service deleted → DB unreachable, NetworkPolicy deleted →
// ingress unrestricted).
func validateExistingManagedResources(ctx context.Context, c client.Client, namespace string) error {
	checks := []struct {
		obj  client.Object
		name string
		kind string
	}{
		{&corev1.Secret{}, CredentialsSecretName, "Secret"},
		{&corev1.ConfigMap{}, InitConfigMapName, "ConfigMap"},
		{&corev1.PersistentVolumeClaim{}, StoragePVCName, "PVC"},
		{&corev1.Service{}, ServiceName, "Service"},
		{&networkingv1.NetworkPolicy{}, NetworkPolicyName, "NetworkPolicy"},
	}

	for _, check := range checks {
		key := client.ObjectKey{Name: check.name, Namespace: namespace}
		if err := c.Get(ctx, key, check.obj); err != nil {
			if apierrors.IsNotFound(err) {
				return fmt.Errorf("pgvector Deployment exists but managed %s %q is missing — cannot return connection safely", check.kind, check.name)
			}
			return fmt.Errorf("failed to verify pgvector %s %q: %w", check.kind, check.name, err)
		}
		if check.obj.GetDeletionTimestamp() != nil {
			return fmt.Errorf("%w: %s %q is still terminating — please wait a moment and try again",
				ErrResourcesTerminating, check.kind, check.name)
		}
		if check.obj.GetLabels()[ManagedLabel] != ManagedLabelValue {
			return fmt.Errorf("pgvector %s %q exists but was not created by the provisioner (missing %s label)", check.kind, check.name, ManagedLabel)
		}
	}
	return nil
}

// connectionFromExisting reads the existing credentials Secret and returns
// a Connection for the already-provisioned pgvector instance.
func connectionFromExisting(ctx context.Context, c client.Client, namespace string) (*Connection, error) {
	var secret corev1.Secret
	if err := c.Get(ctx, client.ObjectKey{Name: CredentialsSecretName, Namespace: namespace}, &secret); err != nil {
		return nil, fmt.Errorf("pgvector Deployment exists but credentials Secret %q not found: %w", CredentialsSecretName, err)
	}
	return &Connection{
		Host: fmt.Sprintf("%s.%s.svc.cluster.local", ServiceName, namespace),
		Port: DefaultPort,
		DB:   DefaultDB,
		User: DefaultUser,
		PasswordSecret: &SecretRef{
			Name: CredentialsSecretName,
			Key:  DefaultPasswordKey,
		},
	}, nil
}

func int32Ptr(v int32) *int32 { return &v }

func generatePassword() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func buildSecret(namespace, password string) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      CredentialsSecretName,
			Namespace: namespace,
			Labels:    managedLabels(),
		},
		Data: map[string][]byte{
			DefaultPasswordKey: []byte(password),
		},
	}
}

func buildInitConfigMap(namespace string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      InitConfigMapName,
			Namespace: namespace,
			Labels:    managedLabels(),
		},
		Data: map[string]string{
			"enable-pgvector.sh": `#!/bin/bash
psql -U postgres -d "${POSTGRESQL_DATABASE}" -c "CREATE EXTENSION IF NOT EXISTS vector;"
`,
		},
	}
}

func buildPVC(namespace string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      StoragePVCName,
			Namespace: namespace,
			Labels:    managedLabels(),
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse("5Gi"),
				},
			},
		},
	}
}

func buildDeployment(namespace, image string) *appsv1.Deployment {
	replicas := int32(1)
	lbls := managedLabels()
	lbls["app"] = DeploymentName

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      DeploymentName,
			Namespace: namespace,
			Labels:    managedLabels(),
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: lbls,
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: lbls,
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "postgresql",
							Image: image,
							Ports: []corev1.ContainerPort{
								{ContainerPort: int32(DefaultPort), Protocol: corev1.ProtocolTCP},
							},
							Env: []corev1.EnvVar{
								{Name: pgDBEnvVar, Value: DefaultDB},
								{Name: pgUserEnvVar, Value: DefaultUser},
								{
									Name: pgPasswordEnvVar,
									ValueFrom: &corev1.EnvVarSource{
										SecretKeyRef: &corev1.SecretKeySelector{
											LocalObjectReference: corev1.LocalObjectReference{Name: CredentialsSecretName},
											Key:                  DefaultPasswordKey,
										},
									},
								},
							},
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("250m"),
									corev1.ResourceMemory: resource.MustParse("256Mi"),
								},
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "pgdata",
									MountPath: "/var/lib/pgsql/data",
								},
								{
									Name:      "init-scripts",
									MountPath: "/opt/app-root/src/postgresql-start",
									ReadOnly:  true,
								},
							},
							StartupProbe: &corev1.Probe{
								ProbeHandler: corev1.ProbeHandler{
									Exec: &corev1.ExecAction{
										Command: []string{"pg_isready", "-U", DefaultUser, "-d", DefaultDB},
									},
								},
								InitialDelaySeconds: 10,
								PeriodSeconds:       5,
								FailureThreshold:    18,
							},
							ReadinessProbe: &corev1.Probe{
								ProbeHandler: corev1.ProbeHandler{
									Exec: &corev1.ExecAction{
										Command: []string{"pg_isready", "-U", DefaultUser, "-d", DefaultDB},
									},
								},
								PeriodSeconds: 10,
							},
							LivenessProbe: &corev1.Probe{
								ProbeHandler: corev1.ProbeHandler{
									Exec: &corev1.ExecAction{
										Command: []string{"pg_isready", "-U", DefaultUser, "-d", DefaultDB},
									},
								},
								PeriodSeconds: 20,
							},
							SecurityContext: &corev1.SecurityContext{
								AllowPrivilegeEscalation: &[]bool{false}[0],
								RunAsNonRoot:             &[]bool{true}[0],
								Capabilities: &corev1.Capabilities{
									Drop: []corev1.Capability{"ALL"},
								},
							},
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "pgdata",
							VolumeSource: corev1.VolumeSource{
								PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
									ClaimName: StoragePVCName,
								},
							},
						},
						{
							Name: "init-scripts",
							VolumeSource: corev1.VolumeSource{
								ConfigMap: &corev1.ConfigMapVolumeSource{
									LocalObjectReference: corev1.LocalObjectReference{Name: InitConfigMapName},
									DefaultMode:          int32Ptr(0755),
								},
							},
						},
					},
				},
			},
		},
	}
}

func buildService(namespace string) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ServiceName,
			Namespace: namespace,
			Labels:    managedLabels(),
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeClusterIP,
			Selector: map[string]string{
				ManagedLabel: ManagedLabelValue,
				"app":        DeploymentName,
			},
			Ports: []corev1.ServicePort{
				{
					Port:       int32(DefaultPort),
					TargetPort: intstr.FromInt32(int32(DefaultPort)),
					Protocol:   corev1.ProtocolTCP,
					Name:       "postgresql",
				},
			},
		},
	}
}

// waitForReady polls the pgvector Deployment until at least one replica is
// ready or the timeout elapses. This ensures the OGXServer is never created
// against a database that isn't accepting connections.
func waitForReady(ctx context.Context, c client.Client, namespace string, timeout time.Duration, log *slog.Logger) error {
	deadline := time.Now().Add(timeout)
	for {
		var deploy appsv1.Deployment
		if err := c.Get(ctx, client.ObjectKey{Name: DeploymentName, Namespace: namespace}, &deploy); err != nil {
			return fmt.Errorf("failed to get pgvector Deployment: %w", err)
		}
		if deploy.Status.ReadyReplicas > 0 {
			log.Info("pgvector Deployment ready", "namespace", namespace,
				"readyReplicas", deploy.Status.ReadyReplicas)
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("pgvector Deployment not ready after %s", timeout)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(readinessPollInterval):
		}
	}
}

// rollbackDelete attempts to delete a resource with retries on transient failures.
// NotFound errors are treated as success (the resource is already gone).
func rollbackDelete(ctx context.Context, c client.Client, obj client.Object, log *slog.Logger) {
	for attempt := 1; attempt <= rollbackMaxRetries; attempt++ {
		if err := c.Delete(ctx, obj); err != nil {
			if apierrors.IsNotFound(err) {
				return
			}
			log.Warn("rollback delete failed",
				"resource", fmt.Sprintf("%s/%s", obj.GetNamespace(), obj.GetName()),
				"attempt", attempt, "error", err)
			if attempt < rollbackMaxRetries {
				time.Sleep(rollbackRetryDelay)
				continue
			}
			log.Error("rollback delete exhausted retries, resource may be leaked",
				"resource", fmt.Sprintf("%s/%s", obj.GetNamespace(), obj.GetName()))
		}
		return
	}
}

// checkForTerminatingResources inspects all pgvector-managed resources by
// name. If any exist with a deletionTimestamp (still finalizing), it returns
// ErrResourcesTerminating so the caller can surface a user-friendly retry
// message instead of blocking the HTTP request for an indeterminate time.
func checkForTerminatingResources(ctx context.Context, c client.Client, namespace string, log *slog.Logger) error {
	checks := []struct {
		obj  client.Object
		name string
		kind string
	}{
		{&corev1.Secret{}, CredentialsSecretName, "Secret"},
		{&corev1.ConfigMap{}, InitConfigMapName, "ConfigMap"},
		{&corev1.PersistentVolumeClaim{}, StoragePVCName, "PVC"},
		{&appsv1.Deployment{}, DeploymentName, "Deployment"},
		{&corev1.Service{}, ServiceName, "Service"},
		{&networkingv1.NetworkPolicy{}, NetworkPolicyName, "NetworkPolicy"},
	}

	for _, check := range checks {
		key := client.ObjectKey{Name: check.name, Namespace: namespace}
		if err := c.Get(ctx, key, check.obj); err == nil {
			if check.obj.GetDeletionTimestamp() != nil {
				log.Info("pgvector resource is still terminating",
					"kind", check.kind, "name", check.name, "namespace", namespace)
				return fmt.Errorf("%w: %s %q is still terminating — please wait a moment and try again",
					ErrResourcesTerminating, check.kind, check.name)
			}
		}
	}
	return nil
}

// isBeingDeleted returns true when a Create call failed because the named
// object still exists and has a deletionTimestamp (Kubernetes returns HTTP 409
// Conflict with "object is being deleted" in this case).
func isBeingDeleted(err error) bool {
	if err == nil {
		return false
	}
	var statusErr *apierrors.StatusError
	if !errors.As(err, &statusErr) {
		return false
	}
	return apierrors.IsConflict(err) || strings.Contains(statusErr.Error(), "object is being deleted")
}

// checkDefaultStorageClass logs a warning if no default StorageClass is
// configured on the cluster. Without one, PVCs with no explicit
// storageClassName will hang in Pending indefinitely.
func checkDefaultStorageClass(ctx context.Context, c client.Client, log *slog.Logger) {
	var scList storagev1.StorageClassList
	if err := c.List(ctx, &scList); err != nil {
		log.Warn("unable to list StorageClasses to check for default", "error", err)
		return
	}
	for i := range scList.Items {
		annotations := scList.Items[i].Annotations
		if annotations["storageclass.kubernetes.io/is-default-class"] == "true" ||
			annotations["storageclass.beta.kubernetes.io/is-default-class"] == "true" {
			return
		}
	}
	log.Warn("no default StorageClass found; pgvector PVC may hang in Pending")
}

func buildNetworkPolicy(namespace string, ogxServerLabels map[string]string) *networkingv1.NetworkPolicy {
	port := intstr.FromInt32(int32(DefaultPort))
	tcp := corev1.ProtocolTCP

	ingress := networkingv1.NetworkPolicyIngressRule{
		Ports: []networkingv1.NetworkPolicyPort{
			{Port: &port, Protocol: &tcp},
		},
	}

	if len(ogxServerLabels) > 0 {
		ingress.From = []networkingv1.NetworkPolicyPeer{
			{
				PodSelector: &metav1.LabelSelector{
					MatchLabels: ogxServerLabels,
				},
			},
		}
	}

	return &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      NetworkPolicyName,
			Namespace: namespace,
			Labels:    managedLabels(),
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{
				MatchLabels: map[string]string{
					ManagedLabel: ManagedLabelValue,
					"app":        DeploymentName,
				},
			},
			PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress},
			Ingress:     []networkingv1.NetworkPolicyIngressRule{ingress},
		},
	}
}
