package bffclient

import (
	"context"
	"log/slog"
	"os"
	"testing"
)

type stubClient struct {
	target    BFFTarget
	label     string
	authToken string
	headers   map[string]string
}

func (s *stubClient) GetTarget() BFFTarget               { return s.target }
func (s *stubClient) GetBaseURL() string                 { return "http://" + s.label }
func (s *stubClient) IsAvailable(_ context.Context) bool { return true }
func (s *stubClient) Call(_ context.Context, _, _ string, _, _ interface{}) error {
	return nil
}

type stubFactory struct {
	label   string
	targets map[BFFTarget]*BFFServiceConfig
}

func newStubFactory(label string, targets map[BFFTarget]*BFFServiceConfig) *stubFactory {
	return &stubFactory{label: label, targets: targets}
}

func (f *stubFactory) CreateClient(target BFFTarget, authToken string) BFFClientInterface {
	return &stubClient{target: target, label: f.label, authToken: authToken}
}
func (f *stubFactory) CreateClientWithHeaders(target BFFTarget, authToken string, headers map[string]string) BFFClientInterface {
	return &stubClient{target: target, label: f.label, authToken: authToken, headers: headers}
}
func (f *stubFactory) GetConfig(target BFFTarget) *BFFServiceConfig {
	return f.targets[target]
}
func (f *stubFactory) IsTargetConfigured(target BFFTarget) bool {
	_, ok := f.targets[target]
	return ok
}

func TestCompositeFactory_RoutesToRealForSpecifiedTargets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMLflow: {Target: BFFTargetMLflow, Port: 8343},
	})
	mockFactory := newStubFactory("mock", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMaaS:          {Target: BFFTargetMaaS, Port: 9001},
		BFFTargetGenAI:         {Target: BFFTargetGenAI, Port: 9002},
		BFFTargetModelRegistry: {Target: BFFTargetModelRegistry, Port: 9003},
	})

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	tests := []struct {
		target    BFFTarget
		wantLabel string
	}{
		{BFFTargetMLflow, "real"},
		{BFFTargetMaaS, "mock"},
		{BFFTargetGenAI, "mock"},
		{BFFTargetModelRegistry, "mock"},
	}

	for _, tt := range tests {
		t.Run(string(tt.target), func(t *testing.T) {
			client := composite.CreateClient(tt.target, "my-token")
			sc := client.(*stubClient)
			if sc.label != tt.wantLabel {
				t.Errorf("expected %s factory for %s, got %s", tt.wantLabel, tt.target, sc.label)
			}
			if sc.authToken != "my-token" {
				t.Errorf("expected authToken 'my-token', got %q", sc.authToken)
			}
			if sc.target != tt.target {
				t.Errorf("expected target %s, got %s", tt.target, sc.target)
			}
		})
	}
}

func TestCompositeFactory_CreateClientWithHeaders(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMLflow: {Target: BFFTargetMLflow, Port: 8343},
	})
	mockFactory := newStubFactory("mock", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMaaS: {Target: BFFTargetMaaS, Port: 9001},
	})

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	headers := map[string]string{"X-Custom": "val"}
	mlflowClient := composite.CreateClientWithHeaders(BFFTargetMLflow, "real-token", headers)
	sc := mlflowClient.(*stubClient)
	if sc.label != "real" {
		t.Error("expected real factory for MLflow with headers")
	}
	if sc.authToken != "real-token" {
		t.Errorf("expected authToken 'real-token', got %q", sc.authToken)
	}
	if sc.target != BFFTargetMLflow {
		t.Errorf("expected target %s, got %s", BFFTargetMLflow, sc.target)
	}
	if sc.headers["X-Custom"] != "val" {
		t.Errorf("expected header X-Custom=val, got %v", sc.headers)
	}

	maasClient := composite.CreateClientWithHeaders(BFFTargetMaaS, "mock-token", nil)
	mc := maasClient.(*stubClient)
	if mc.label != "mock" {
		t.Error("expected mock factory for MaaS with headers")
	}
	if mc.authToken != "mock-token" {
		t.Errorf("expected authToken 'mock-token', got %q", mc.authToken)
	}
	if mc.target != BFFTargetMaaS {
		t.Errorf("expected target %s, got %s", BFFTargetMaaS, mc.target)
	}
}

func TestCompositeFactory_GetConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realCfg := &BFFServiceConfig{Target: BFFTargetMLflow, Port: 8343}
	mockCfg := &BFFServiceConfig{Target: BFFTargetMaaS, Port: 9001}
	realFactory := newStubFactory("real", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMLflow: realCfg,
	})
	mockFactory := newStubFactory("mock", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMaaS: mockCfg,
	})

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	mlflowCfg := composite.GetConfig(BFFTargetMLflow)
	if mlflowCfg == nil {
		t.Fatal("expected non-nil config for MLflow (real target)")
	}
	if mlflowCfg.Port != 8343 {
		t.Errorf("expected MLflow config from real factory (port 8343), got port %d", mlflowCfg.Port)
	}

	maasCfg := composite.GetConfig(BFFTargetMaaS)
	if maasCfg == nil {
		t.Fatal("expected non-nil config for MaaS (mock target)")
	}
	if maasCfg.Port != 9001 {
		t.Errorf("expected MaaS config from mock factory (port 9001), got port %d", maasCfg.Port)
	}
}

func TestCompositeFactory_IsTargetConfigured(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMLflow: {Target: BFFTargetMLflow, Port: 8343},
	})
	mockFactory := newStubFactory("mock", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMaaS: {Target: BFFTargetMaaS, Port: 9001},
	})

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	if !composite.IsTargetConfigured(BFFTargetMLflow) {
		t.Error("expected MLflow to be configured (from real factory)")
	}
	if !composite.IsTargetConfigured(BFFTargetMaaS) {
		t.Error("expected MaaS to be configured (from mock factory)")
	}
	if composite.IsTargetConfigured(BFFTargetGenAI) {
		t.Error("expected GenAI to be unconfigured (not in either factory)")
	}
}

func TestCompositeFactory_MultipleRealTargets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real", map[BFFTarget]*BFFServiceConfig{
		BFFTargetMLflow: {Target: BFFTargetMLflow, Port: 8343},
		BFFTargetMaaS:   {Target: BFFTargetMaaS, Port: 8243},
	})
	mockFactory := newStubFactory("mock", map[BFFTarget]*BFFServiceConfig{
		BFFTargetGenAI: {Target: BFFTargetGenAI, Port: 9002},
	})

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow, BFFTargetMaaS}, logger)

	if composite.CreateClient(BFFTargetMLflow, "").(*stubClient).label != "real" {
		t.Error("expected real for MLflow")
	}
	if composite.CreateClient(BFFTargetMaaS, "").(*stubClient).label != "real" {
		t.Error("expected real for MaaS")
	}
	if composite.CreateClient(BFFTargetGenAI, "").(*stubClient).label != "mock" {
		t.Error("expected mock for GenAI")
	}
}
