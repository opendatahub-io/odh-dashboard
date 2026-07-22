package repositories

import (
	"context"
	"crypto/ed25519"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"log/slog"

	agentsopenshell "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/openshell"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

type GatewayRepository struct {
	discovery  *agentsopenshell.GatewayDiscovery
	registry   *agentsopenshell.GatewayRegistry
	k8sFactory k8s.KubernetesClientFactory
	logger     *slog.Logger
}

func NewGatewayRepository(discovery *agentsopenshell.GatewayDiscovery, registry *agentsopenshell.GatewayRegistry, k8sFactory k8s.KubernetesClientFactory, logger *slog.Logger) *GatewayRepository {
	return &GatewayRepository{
		discovery:  discovery,
		registry:   registry,
		k8sFactory: k8sFactory,
		logger:     logger,
	}
}

func (r *GatewayRepository) ListGateways(ctx context.Context, namespace string) (*models.GatewayListResponse, error) {
	gateways, err := r.discovery.DiscoverGateways(ctx, namespace)
	if err != nil {
		return nil, err
	}
	return &models.GatewayListResponse{Gateways: gateways}, nil
}

func (r *GatewayRepository) GetGateway(ctx context.Context, name string) (*models.Gateway, error) {
	entry, ok := r.registry.Get(name)
	if !ok {
		return nil, fmt.Errorf("gateway %q not found", name)
	}

	gw := &models.Gateway{
		Name:      entry.Name,
		Namespace: entry.Namespace,
		Endpoint:  entry.Endpoint,
		Status:    "unknown",
		IsGlobal:  entry.IsGlobal,
	}

	client, err := r.registry.GetClient(ctx, name)
	if err != nil {
		gw.Status = "unhealthy"
		return gw, nil
	}

	if health := client.Health(); health != nil {
		if _, err := health.Check(ctx); err == nil {
			gw.Status = "healthy"
		} else {
			gw.Status = "unhealthy"
		}
	}

	sandboxes, err := client.Sandboxes().List(ctx)
	if err == nil {
		gw.SandboxCount = len(sandboxes)
	}

	providers, err := client.Providers().List(ctx)
	if err == nil {
		gw.ProviderCount = len(providers)
	}

	return gw, nil
}

func (r *GatewayRepository) CreateGateway(_ context.Context, req *models.CreateGatewayRequest) (*models.Gateway, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("gateway name is required")
	}
	if req.Endpoint == "" {
		return nil, fmt.Errorf("gateway endpoint is required")
	}

	r.registry.Register(req.Name, req.Namespace, req.Endpoint, req.IsGlobal)

	return &models.Gateway{
		Name:      req.Name,
		Namespace: req.Namespace,
		Endpoint:  req.Endpoint,
		Status:    "unknown",
		IsGlobal:  req.IsGlobal,
	}, nil
}

func (r *GatewayRepository) DeleteGateway(_ context.Context, name string) error {
	if _, ok := r.registry.Get(name); !ok {
		return fmt.Errorf("gateway %q not found", name)
	}
	r.registry.Unregister(name)
	return nil
}

const (
	gatewayImage     = "ghcr.io/nvidia/openshell/gateway:dev"
	sandboxSAName    = "openshell-sandbox"
	jwtSecretSuffix  = "-jwt-keys"
)

func (r *GatewayRepository) DeployGateway(ctx context.Context, req *models.CreateGatewayRequest) (*models.Gateway, error) {
	if r.k8sFactory == nil {
		return nil, fmt.Errorf("k8s client not available for gateway deployment")
	}
	if req.Name == "" || req.Namespace == "" {
		return nil, fmt.Errorf("name and namespace are required for gateway deployment")
	}

	k8sClient, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get k8s client: %w", err)
	}
	clientset := k8sClient.KubernetesClientset()
	ns := req.Namespace

	r.logger.Info("Deploying OpenShell gateway", slog.String("name", req.Name), slog.String("namespace", ns))

	// 1. ServiceAccount
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{Name: sandboxSAName, Namespace: ns},
	}
	if _, err := clientset.CoreV1().ServiceAccounts(ns).Create(ctx, sa, metav1.CreateOptions{}); err != nil {
		r.logger.Debug("ServiceAccount may already exist", slog.Any("error", err))
	}

	// 2. SCC RoleBinding (privileged for sandbox pods)
	rb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: fmt.Sprintf("openshell-scc-%s-%s", ns, req.Name)},
		RoleRef:    rbacv1.RoleRef{APIGroup: "rbac.authorization.k8s.io", Kind: "ClusterRole", Name: "system:openshift:scc:privileged"},
		Subjects:   []rbacv1.Subject{{Kind: "ServiceAccount", Name: "default", Namespace: ns}},
	}
	if _, err := clientset.RbacV1().ClusterRoleBindings().Create(ctx, rb, metav1.CreateOptions{}); err != nil {
		r.logger.Debug("ClusterRoleBinding may already exist", slog.Any("error", err))
	}

	// 3. JWT signing secret
	signingPEM, publicPEM, kid, err := generateJWTKeyPair()
	if err != nil {
		return nil, fmt.Errorf("failed to generate JWT key pair: %w", err)
	}
	jwtSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: req.Name + jwtSecretSuffix, Namespace: ns},
		Data: map[string][]byte{
			"signing.pem": signingPEM,
			"public.pem":  publicPEM,
			"kid":         kid,
		},
	}
	if _, err := clientset.CoreV1().Secrets(ns).Create(ctx, jwtSecret, metav1.CreateOptions{}); err != nil {
		r.logger.Debug("JWT secret may already exist", slog.Any("error", err))
	}

	// 4. StatefulSet
	replicas := int32(1)
	labels := map[string]string{
		"app.kubernetes.io/name":     "openshell",
		"app.kubernetes.io/instance": req.Name,
	}
	sts := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: req.Name, Namespace: ns, Labels: labels},
		Spec: appsv1.StatefulSetSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: labels},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec: corev1.PodSpec{
					ServiceAccountName: sandboxSAName,
					Containers: []corev1.Container{{
						Name:  "openshell-gateway",
						Image: gatewayImage,
						Args: []string{
							"--host", "0.0.0.0",
							"--port", "8080",
						},
						Env: []corev1.EnvVar{
							{Name: "OPENSHELL_DISABLE_TLS", Value: "true"},
							{Name: "OPENSHELL_AUTH_ALLOW_UNAUTHENTICATED_USERS", Value: "true"},
						},
						Ports: []corev1.ContainerPort{
							{Name: "grpc", ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
							{Name: "health", ContainerPort: 8081, Protocol: corev1.ProtocolTCP},
						},
						ReadinessProbe: &corev1.Probe{
							ProbeHandler: corev1.ProbeHandler{HTTPGet: &corev1.HTTPGetAction{
								Path: "/healthz", Port: intstr.FromString("health"),
							}},
							PeriodSeconds: 5,
						},
						VolumeMounts: []corev1.VolumeMount{
							{Name: "sandbox-jwt", MountPath: "/etc/openshell-jwt", ReadOnly: true},
						},
					}},
					Volumes: []corev1.Volume{
						{Name: "sandbox-jwt", VolumeSource: corev1.VolumeSource{
							Secret: &corev1.SecretVolumeSource{SecretName: req.Name + jwtSecretSuffix},
						}},
					},
				},
			},
			VolumeClaimTemplates: []corev1.PersistentVolumeClaim{{
				ObjectMeta: metav1.ObjectMeta{Name: "data"},
				Spec: corev1.PersistentVolumeClaimSpec{
					AccessModes: []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
					Resources:   corev1.VolumeResourceRequirements{Requests: corev1.ResourceList{corev1.ResourceStorage: resource.MustParse("1Gi")}},
				},
			}},
		},
	}
	if _, err := clientset.AppsV1().StatefulSets(ns).Create(ctx, sts, metav1.CreateOptions{}); err != nil {
		return nil, fmt.Errorf("failed to create StatefulSet: %w", err)
	}

	// 5. Headless Service
	svc := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: req.Name, Namespace: ns, Labels: labels},
		Spec: corev1.ServiceSpec{
			ClusterIP: "None",
			Selector:  labels,
			Ports: []corev1.ServicePort{
				{Name: "grpc", Port: 8080, TargetPort: intstr.FromInt(8080), Protocol: corev1.ProtocolTCP},
			},
		},
	}
	if _, err := clientset.CoreV1().Services(ns).Create(ctx, svc, metav1.CreateOptions{}); err != nil {
		return nil, fmt.Errorf("failed to create Service: %w", err)
	}

	// 6. Register in gateway registry
	endpoint := fmt.Sprintf("http://%s.%s.svc.cluster.local:8080", req.Name, ns)
	r.registry.Register(req.Name, ns, endpoint, req.IsGlobal)

	r.logger.Info("Gateway deployed successfully", slog.String("name", req.Name), slog.String("endpoint", endpoint))
	return &models.Gateway{
		Name:      req.Name,
		Namespace: ns,
		Endpoint:  endpoint,
		Status:    "deploying",
		IsGlobal:  req.IsGlobal,
	}, nil
}

func generateJWTKeyPair() (signingPEM, publicPEM, kid []byte, err error) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("ed25519 keygen: %w", err)
	}

	privBytes, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("marshal private key: %w", err)
	}
	signingPEM = pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes})

	pubBytes, err := x509.MarshalPKIXPublicKey(pub)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("marshal public key: %w", err)
	}
	publicPEM = pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubBytes})

	kid = []byte(base64.StdEncoding.EncodeToString(pubBytes)[:16])
	return signingPEM, publicPEM, kid, nil
}
