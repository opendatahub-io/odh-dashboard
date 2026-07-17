package bffclient

import (
	"context"
	"log/slog"
	"os"
	"testing"
)

type stubClient struct {
	target BFFTarget
	label  string
}

func (s *stubClient) GetTarget() BFFTarget                    { return s.target }
func (s *stubClient) GetBaseURL() string                      { return "http://" + s.label }
func (s *stubClient) IsAvailable(_ context.Context) bool      { return true }
func (s *stubClient) Call(_ context.Context, _, _ string, _, _ interface{}) error {
	return nil
}

type stubFactory struct {
	label string
	cfg   *BFFClientConfig
}

func newStubFactory(label string) *stubFactory {
	return &stubFactory{label: label, cfg: NewDefaultBFFClientConfig()}
}

func (f *stubFactory) CreateClient(target BFFTarget, _ string) BFFClientInterface {
	return &stubClient{target: target, label: f.label}
}
func (f *stubFactory) CreateClientWithHeaders(target BFFTarget, _ string, _ map[string]string) BFFClientInterface {
	return &stubClient{target: target, label: f.label}
}
func (f *stubFactory) GetConfig(target BFFTarget) *BFFServiceConfig {
	return f.cfg.GetServiceConfig(target)
}
func (f *stubFactory) IsTargetConfigured(target BFFTarget) bool {
	return f.cfg.GetServiceConfig(target) != nil
}

func TestCompositeFactory_RoutesToRealForSpecifiedTargets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real")
	mockFactory := newStubFactory("mock")

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	tests := []struct {
		target   BFFTarget
		wantReal bool
	}{
		{BFFTargetMLflow, true},
		{BFFTargetMaaS, false},
		{BFFTargetGenAI, false},
		{BFFTargetModelRegistry, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.target), func(t *testing.T) {
			client := composite.CreateClient(tt.target, "token")
			got := client.(*stubClient).label
			if tt.wantReal && got != "real" {
				t.Errorf("expected real factory for %s, got %s", tt.target, got)
			}
			if !tt.wantReal && got != "mock" {
				t.Errorf("expected mock factory for %s, got %s", tt.target, got)
			}
		})
	}
}

func TestCompositeFactory_CreateClientWithHeaders(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real")
	mockFactory := newStubFactory("mock")

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	mlflowClient := composite.CreateClientWithHeaders(BFFTargetMLflow, "token", map[string]string{"X-Custom": "val"})
	if mlflowClient.(*stubClient).label != "real" {
		t.Error("expected real factory for MLflow with headers")
	}

	maasClient := composite.CreateClientWithHeaders(BFFTargetMaaS, "token", nil)
	if maasClient.(*stubClient).label != "mock" {
		t.Error("expected mock factory for MaaS with headers")
	}
}

func TestCompositeFactory_GetConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real")
	mockFactory := newStubFactory("mock")

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	if cfg := composite.GetConfig(BFFTargetMLflow); cfg == nil {
		t.Error("expected non-nil config for MLflow (real target)")
	}
	if cfg := composite.GetConfig(BFFTargetMaaS); cfg == nil {
		t.Error("expected non-nil config for MaaS (mock target)")
	}
}

func TestCompositeFactory_IsTargetConfigured(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real")
	mockFactory := newStubFactory("mock")

	composite := NewCompositeClientFactory(realFactory, mockFactory, []BFFTarget{BFFTargetMLflow}, logger)

	if !composite.IsTargetConfigured(BFFTargetMLflow) {
		t.Error("expected MLflow to be configured")
	}
	if !composite.IsTargetConfigured(BFFTargetMaaS) {
		t.Error("expected MaaS to be configured")
	}
}

func TestCompositeFactory_MultipleRealTargets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	realFactory := newStubFactory("real")
	mockFactory := newStubFactory("mock")

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
