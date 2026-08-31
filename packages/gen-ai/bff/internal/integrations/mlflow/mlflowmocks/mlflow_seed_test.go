package mlflowmocks

import (
	"log/slog"
	"os"
	"testing"
)

func TestSeedMCPRegistry(t *testing.T) {
	trackingURI := os.Getenv("MLFLOW_TRACKING_URI")
	if trackingURI == "" {
		t.Skip("MLFLOW_TRACKING_URI not set")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	if err := SeedMCPRegistry(trackingURI, logger); err != nil {
		t.Fatalf("SeedMCPRegistry failed: %v", err)
	}
}

func TestSeedPrompts(t *testing.T) {
	trackingURI := os.Getenv("MLFLOW_TRACKING_URI")
	if trackingURI == "" {
		t.Skip("MLFLOW_TRACKING_URI not set")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	if err := SeedPrompts(trackingURI, logger); err != nil {
		t.Fatalf("SeedPrompts failed: %v", err)
	}
}
