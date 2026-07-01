package charts_test

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
)

func TestDashboardChartCRDInSync(t *testing.T) {
	root := ".."
	tests := []struct {
		name    string
		input   struct{ sourcePath, chartPath string }
		wantErr bool
	}{
		{
			name: "dashboard CRD matches generated source",
			input: struct{ sourcePath, chartPath string }{
				sourcePath: filepath.Join(root, "config", "crd", "bases", "components.platform.opendatahub.io_dashboards.yaml"),
				chartPath:  filepath.Join(root, "charts", "dashboard", "crds", "components.platform.opendatahub.io_dashboards.yaml"),
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			source, err := os.ReadFile(tt.input.sourcePath)
			if err != nil {
				if tt.wantErr {
					return
				}
				t.Fatalf("read source CRD: %v", err)
			}

			chart, err := os.ReadFile(tt.input.chartPath)
			if err != nil {
				if tt.wantErr {
					return
				}
				t.Fatalf("read chart CRD: %v", err)
			}

			if tt.wantErr {
				if bytes.Equal(source, chart) {
					t.Fatal("expected CRD drift, but files match")
				}
				return
			}

			if !bytes.Equal(source, chart) {
				t.Fatalf("chart CRD is out of sync with %s; run 'make sync-chart-crds'", tt.input.sourcePath)
			}
		})
	}
}

func TestDashboardChartWebhookCertManagerTemplatesOffline(t *testing.T) {
	if _, err := exec.LookPath("helm"); err != nil {
		t.Skip("helm not installed")
	}

	root := ".."
	chartDir := filepath.Join(root, "charts", "dashboard")
	const webhookTLSSecret = "dashboard-operator-webhook-tls"

	t.Run("operator values render cert-manager TLS contract", func(t *testing.T) {
		output, err := renderChartTemplate(
			chartDir,
			"--namespace", "opendatahub",
			"--set", "namePrefix=",
			"--set", "webhook.enabled=true",
			"--set", "webhook.certManager.enabled=true",
		)
		if err != nil {
			t.Fatalf("render chart: %v", err)
		}

		certificate, issuer := findWebhookCertManagerResources(t, output)
		if certificate.Metadata.Name != "dashboard-operator-webhook-cert" {
			t.Fatalf("expected Certificate metadata.name dashboard-operator-webhook-cert, got %q", certificate.Metadata.Name)
		}
		if certificate.Spec.SecretName != webhookTLSSecret {
			t.Fatalf("expected Certificate spec.secretName %q, got %q", webhookTLSSecret, certificate.Spec.SecretName)
		}
		if issuer.Metadata.Name != "dashboard-operator-selfsigned" {
			t.Fatalf("expected Issuer metadata.name dashboard-operator-selfsigned, got %q", issuer.Metadata.Name)
		}

		deploymentSecret := findDeploymentWebhookSecretName(t, output)
		if deploymentSecret != webhookTLSSecret {
			t.Fatalf("expected Deployment webhook-certs secretName %q, got %q", webhookTLSSecret, deploymentSecret)
		}
	})

	t.Run("cert-manager disabled omits Issuer and Certificate", func(t *testing.T) {
		output, err := renderChartTemplate(
			chartDir,
			"--namespace", "opendatahub",
			"--set", "webhook.certManager.enabled=false",
		)
		if err != nil {
			t.Fatalf("render chart: %v", err)
		}

		if strings.Contains(output, "kind: Certificate") || strings.Contains(output, "kind: Issuer") {
			t.Fatal("expected cert-manager resources to be omitted when webhook.certManager.enabled=false")
		}
	})
}

type webhookCertificate struct {
	Metadata struct {
		Name string `yaml:"name"`
	} `yaml:"metadata"`
	Spec struct {
		SecretName string `yaml:"secretName"`
	} `yaml:"spec"`
}

type webhookIssuer struct {
	Metadata struct {
		Name string `yaml:"name"`
	} `yaml:"metadata"`
}

func findWebhookCertManagerResources(t *testing.T, rendered string) (webhookCertificate, webhookIssuer) {
	t.Helper()

	var certificate webhookCertificate
	var issuer webhookIssuer
	foundCert := false
	foundIssuer := false

	for _, doc := range strings.Split(rendered, "---") {
		doc = strings.TrimSpace(doc)
		if doc == "" {
			continue
		}

		if strings.Contains(doc, "kind: Certificate") {
			if err := yaml.Unmarshal([]byte(doc), &certificate); err != nil {
				t.Fatalf("parse Certificate: %v", err)
			}
			foundCert = true
			continue
		}

		if strings.Contains(doc, "kind: Issuer") {
			if err := yaml.Unmarshal([]byte(doc), &issuer); err != nil {
				t.Fatalf("parse Issuer: %v", err)
			}
			foundIssuer = true
		}
	}

	if !foundCert {
		t.Fatal("expected Certificate in rendered chart output")
	}
	if !foundIssuer {
		t.Fatal("expected Issuer in rendered chart output")
	}

	return certificate, issuer
}

func findDeploymentWebhookSecretName(t *testing.T, rendered string) string {
	t.Helper()

	for _, doc := range strings.Split(rendered, "---") {
		doc = strings.TrimSpace(doc)
		if doc == "" || !strings.Contains(doc, "kind: Deployment") {
			continue
		}

		var deployment appsv1.Deployment
		if err := yaml.Unmarshal([]byte(doc), &deployment); err != nil {
			t.Fatalf("parse Deployment: %v", err)
		}

		for _, volume := range deployment.Spec.Template.Spec.Volumes {
			if volume.Name == "webhook-certs" && volume.Secret != nil {
				return volume.Secret.SecretName
			}
		}
	}

	t.Fatal("expected Deployment volume webhook-certs with secretName")
	return ""
}

func TestDashboardChartRBACInSync(t *testing.T) {
	if _, err := exec.LookPath("helm"); err != nil {
		t.Skip("helm not installed")
	}

	root := ".."
	tests := []struct {
		name    string
		input   struct{ rolePath, chartDir string }
		wantErr bool
	}{
		{
			name: "chart ClusterRole rules match config/rbac/role.yaml",
			input: struct{ rolePath, chartDir string }{
				rolePath: filepath.Join(root, "config", "rbac", "role.yaml"),
				chartDir: filepath.Join(root, "charts", "dashboard"),
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sourceRole, err := loadClusterRoleRules(tt.input.rolePath)
			if err != nil {
				t.Fatalf("load source ClusterRole: %v", err)
			}

			chartRole, err := renderChartClusterRoleRules(tt.input.chartDir)
			if err != nil {
				t.Fatalf("render chart ClusterRole: %v", err)
			}

			if tt.wantErr {
				if rulesEqual(sourceRole, chartRole) {
					t.Fatal("expected RBAC drift, but rules match")
				}
				return
			}

			if !rulesEqual(sourceRole, chartRole) {
				t.Fatalf("chart ClusterRole rules differ from %s; update charts/dashboard/templates/rbac.yaml", tt.input.rolePath)
			}
		})
	}
}

func loadClusterRoleRules(path string) ([]rbacv1.PolicyRule, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var role rbacv1.ClusterRole
	if err := yaml.Unmarshal(data, &role); err != nil {
		return nil, err
	}

	return role.Rules, nil
}

func renderChartTemplate(chartDir string, extraArgs ...string) (string, error) {
	args := append([]string{"template", "dashboard", chartDir}, extraArgs...)
	cmd := exec.Command("helm", args...)
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

func renderChartClusterRoleRules(chartDir string) ([]rbacv1.PolicyRule, error) {
	output, err := renderChartTemplate(chartDir, "--namespace", "opendatahub")
	if err != nil {
		return nil, err
	}

	for _, doc := range strings.Split(output, "---") {
		doc = strings.TrimSpace(doc)
		if doc == "" || !strings.Contains(doc, "kind: ClusterRole") {
			continue
		}

		var role rbacv1.ClusterRole
		if err := yaml.Unmarshal([]byte(doc), &role); err != nil {
			return nil, err
		}
		if role.Kind == "ClusterRole" {
			return role.Rules, nil
		}
	}

	return nil, os.ErrNotExist
}

func rulesEqual(a, b []rbacv1.PolicyRule) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if !policyRuleEqual(a[i], b[i]) {
			return false
		}
	}
	return true
}

func policyRuleEqual(a, b rbacv1.PolicyRule) bool {
	return stringSliceEqual(a.APIGroups, b.APIGroups) &&
		stringSliceEqual(a.Resources, b.Resources) &&
		stringSliceEqual(a.Verbs, b.Verbs)
}

func stringSliceEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
