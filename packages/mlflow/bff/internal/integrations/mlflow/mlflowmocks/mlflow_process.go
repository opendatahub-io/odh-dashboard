//go:build !windows

package mlflowmocks

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"time"
)

const (
	defaultMLflowPort    = 5001
	defaultMLflowVersion = "3.10.1"
	healthTimeout        = 30 * time.Second
	healthPoll           = 2 * time.Second
	shutdownWait         = 5 * time.Second
)

func mlflowPort() int {
	if v := os.Getenv("MLFLOW_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			return p
		}
	}
	return defaultMLflowPort
}

func mlflowVersion() string {
	if v := os.Getenv("MLFLOW_VERSION"); v != "" {
		return v
	}
	return defaultMLflowVersion
}

// MLflowState tracks the MLflow child process, enabling targeted cleanup
// when the BFF shuts down — preventing orphaned MLflow servers.
type MLflowState struct {
	Cmd         *exec.Cmd
	Port        int
	DataDir     string
	TrackingURI string
	Ctx         context.Context
	Cancel      context.CancelFunc
	ProcessDone <-chan error
}

// SetupMLflow starts a local MLflow server as a child process and returns
// its state including the tracking URI. The returned MLflowState.TrackingURI
// should be passed to NewMockClientFactory to avoid os.Setenv races.
// If MLFLOW_TRACKING_URI is already set or MLflow is already running on the target port,
// it returns a state with only TrackingURI populated (no child process to clean up).
func SetupMLflow(logger *slog.Logger) (*MLflowState, error) {
	port := mlflowPort()
	version := mlflowVersion()

	if uri := os.Getenv("MLFLOW_TRACKING_URI"); uri != "" {
		logger.Info("MLFLOW_TRACKING_URI already set, assuming externally managed", slog.Bool("tracking_uri_set", true))
		return &MLflowState{TrackingURI: uri}, nil
	}

	// Reuse existing instance if MLflow is already running (e.g. from make mlflow-up),
	// but still seed data so tests have expected state.
	if isMLflowHealthy(port) {
		logger.Warn("MLflow already running on port — reusing existing instance. "+
			"Its database may contain stale data from previous dev sessions, which can cause test failures. "+
			fmt.Sprintf("Stop the external MLflow process (lsof -t -i :%d | xargs kill) and re-run for a clean state.", port),
			slog.Int("port", port))
		trackingURI := fmt.Sprintf("http://127.0.0.1:%d", port)
		if err := SeedExperimentsAndRuns(trackingURI, logger); err != nil {
			return nil, fmt.Errorf("failed to seed already-running MLflow: %w", err)
		}
		return &MLflowState{TrackingURI: trackingURI}, nil
	}

	uvBin, err := resolveUVBinary()
	if err != nil {
		return nil, fmt.Errorf("uv binary not found: %w", err)
	}
	logger.Debug("Resolved uv binary", slog.String("path", uvBin))

	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get working directory: %w", err)
	}
	dataDir := filepath.Join(cwd, ".mlflow")
	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return nil, fmt.Errorf("failed to create MLflow data directory: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	cmd := exec.CommandContext(ctx, uvBin,
		"run", "--with", "mlflow=="+version,
		"mlflow", "server",
		"--host", "127.0.0.1",
		"--port", fmt.Sprintf("%d", port),
		"--backend-store-uri", fmt.Sprintf("sqlite:///%s/mlflow.db", dataDir),
		"--default-artifact-root", filepath.Join(dataDir, "artifacts"),
	)

	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		cancel()
		return nil, fmt.Errorf("failed to start MLflow: %w", err)
	}

	logger.Info("MLflow process started, waiting for health check...",
		slog.Int("pid", cmd.Process.Pid),
		slog.Int("port", port),
	)

	processDone := make(chan error, 1)
	go func() { processDone <- cmd.Wait() }()

	cleanup := func() {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		select {
		case <-processDone:
		case <-time.After(shutdownWait):
		}
		cancel()
		_ = os.RemoveAll(dataDir)
	}

	if err := waitForMLflowHealth(port, logger, processDone); err != nil {
		cleanup()
		return nil, fmt.Errorf("MLflow failed to become healthy: %w", err)
	}

	trackingURI := fmt.Sprintf("http://127.0.0.1:%d", port)

	logger.Info("MLflow server started",
		slog.Int("port", port),
		slog.String("data_dir", dataDir),
	)

	if err := SeedExperimentsAndRuns(trackingURI, logger); err != nil {
		cleanup()
		return nil, fmt.Errorf("failed to seed MLflow: %w", err)
	}

	return &MLflowState{
		Cmd:         cmd,
		Port:        port,
		DataDir:     dataDir,
		TrackingURI: trackingURI,
		Ctx:         ctx,
		Cancel:      cancel,
		ProcessDone: processDone,
	}, nil
}

// CleanupMLflowState performs graceful shutdown of the MLflow child process.
// Sends SIGTERM to the process group, waits for exit, then SIGKILL if needed.
// States without a child process (externally managed or reused) are no-ops.
func CleanupMLflowState(state *MLflowState, logger *slog.Logger) {
	if state == nil || state.Cmd == nil {
		return
	}

	pid := state.Cmd.Process.Pid

	if err := syscall.Kill(-pid, syscall.SIGTERM); err != nil {
		logger.Error("Failed to send SIGTERM to MLflow process group", slog.Int("pid", pid), slog.Any("error", err))
	} else {
		logger.Info("Sent SIGTERM to MLflow process group", slog.Int("pid", pid))
	}

	select {
	case <-state.ProcessDone:
		logger.Info("MLflow process exited gracefully")
	case <-time.After(shutdownWait):
		logger.Error("MLflow did not exit in time, sending SIGKILL", slog.Duration("timeout", shutdownWait))
		if err := syscall.Kill(-pid, syscall.SIGKILL); err != nil {
			logger.Error("Failed to send SIGKILL to MLflow process group", slog.Int("pid", pid), slog.Any("error", err))
		}
		select {
		case <-state.ProcessDone:
		case <-time.After(shutdownWait):
			logger.Error("MLflow process did not exit after SIGKILL", slog.Int("pid", pid), slog.Duration("timeout", shutdownWait))
		}
	}

	state.Cancel()

	if state.DataDir != "" {
		if err := os.RemoveAll(state.DataDir); err != nil {
			logger.Error("Failed to remove MLflow data directory", slog.String("dir", state.DataDir), slog.Any("error", err))
		} else {
			logger.Info("Removed MLflow data directory", slog.String("dir", state.DataDir))
		}
	}
}

// resolveUVBinary finds the uv binary by walking up to the project root (go.mod),
// then checking <projectRoot>/bin/uv. Falls back to PATH lookup.
func resolveUVBinary() (string, error) {
	cwd, err := os.Getwd()
	if err == nil {
		projectRoot := cwd
		for {
			if _, err := os.Stat(filepath.Join(projectRoot, "go.mod")); err == nil {
				localUV := filepath.Join(projectRoot, "bin", "uv")
				if _, err := os.Stat(localUV); err == nil {
					return localUV, nil
				}
				break
			}
			parent := filepath.Dir(projectRoot)
			if parent == projectRoot {
				break
			}
			projectRoot = parent
		}
	}

	return exec.LookPath("uv")
}

func isMLflowHealthy(port int) bool {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/health", port))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func waitForMLflowHealth(port int, logger *slog.Logger, processDone <-chan error) error {
	deadline := time.Now().Add(healthTimeout)
	for time.Now().Before(deadline) {
		select {
		case err := <-processDone:
			return fmt.Errorf("MLflow process exited before becoming healthy: %w", err)
		default:
		}
		if isMLflowHealthy(port) {
			return nil
		}
		logger.Debug("Waiting for MLflow health check...",
			slog.Duration("remaining", time.Until(deadline)),
		)
		time.Sleep(healthPoll)
	}
	return fmt.Errorf("MLflow did not respond to health check within %v", healthTimeout)
}
