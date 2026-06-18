package charts_test

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

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

func renderChartClusterRoleRules(chartDir string) ([]rbacv1.PolicyRule, error) {
	cmd := exec.Command("helm", "template", "dashboard", chartDir, "--namespace", "opendatahub")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	for _, doc := range strings.Split(string(output), "---") {
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
