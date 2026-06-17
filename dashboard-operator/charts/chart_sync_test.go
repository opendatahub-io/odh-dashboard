package charts_test

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestDashboardChartCRDInSync(t *testing.T) {
	t.Helper()

	root := ".."
	sourcePath := filepath.Join(root, "config", "crd", "bases", "components.platform.opendatahub.io_dashboards.yaml")
	chartPath := filepath.Join(root, "charts", "dashboard", "crds", "components.platform.opendatahub.io_dashboards.yaml")

	source, err := os.ReadFile(sourcePath)
	if err != nil {
		t.Fatalf("read source CRD: %v", err)
	}

	chart, err := os.ReadFile(chartPath)
	if err != nil {
		t.Fatalf("read chart CRD: %v", err)
	}

	if !bytes.Equal(source, chart) {
		t.Fatalf("chart CRD is out of sync with %s; run 'make sync-chart-crds'", sourcePath)
	}
}
