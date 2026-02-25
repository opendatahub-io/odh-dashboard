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

	"github.com/opendatahub-io/gen-ai/internal/testutil"
)

const (
	defaultMLflowPort    = 5001
	defaultMLflowVersion = "3.9.0"
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
	Cmd     *exec.Cmd
	Port    int
	DataDir string
	Ctx     context.Context
	Cancel  context.CancelFunc
}

// SetupMLflow starts a local MLflow server as a child process.
// If MLFLOW_TRACKING_URI is already set or MLflow is already running on the target port,
// it returns nil (no-op). The caller is responsible for calling CleanupMLflowState on shutdown.
func SetupMLflow(logger *slog.Logger) (*MLflowState, error) {
	port := mlflowPort()
	version := mlflowVersion()

	// Pre-flight: skip if externally managed (e.g. MLFLOW_TRACKING_URI set by operator)
	if uri := os.Getenv("MLFLOW_TRACKING_URI"); uri != "" {
		logger.Info("MLFLOW_TRACKING_URI already set, assuming externally managed", slog.String("uri", uri))
		return nil, nil
	}

	// Pre-flight: skip process startup if MLflow is already running (e.g. from make mlflow-up),
	// but still seed prompts so tests have expected data.
	if isMLflowHealthy(port) {
		logger.Warn("MLflow already running on port — reusing existing instance. "+
			"Its database may contain stale data from previous dev sessions, which can cause test failures. "+
			fmt.Sprintf("Stop the external MLflow process (lsof -t -i :%d | xargs kill) and re-run for a clean state.", port),
			slog.Int("port", port))
		trackingURI := fmt.Sprintf("http://127.0.0.1:%d", port)
		os.Setenv("MLFLOW_TRACKING_URI", trackingURI)
		if err := SeedPrompts(trackingURI, logger); err != nil {
			return nil, fmt.Errorf("failed to seed already-running MLflow: %w", err)
		}
		return nil, nil
	}

	uvBin, err := testutil.ResolveUVBinary()
	if err != nil {
		return nil, fmt.Errorf("uv binary not found: %w", err)
	}
	logger.Debug("Resolved uv binary", slog.String("path", uvBin))

	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get working directory: %w", err)
	}
	dataDir := filepath.Join(cwd, ".mlflow")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
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

	// Create a process group so we can kill the entire tree on shutdown.
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

	if err := waitForMLflowHealth(port, logger); err != nil {
		// Clean up the process we just started
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		cancel()
		return nil, fmt.Errorf("MLflow failed to become healthy: %w", err)
	}

	// Set env var so MockClientFactory picks up the correct URI
	trackingURI := fmt.Sprintf("http://127.0.0.1:%d", port)
	os.Setenv("MLFLOW_TRACKING_URI", trackingURI)

	logger.Info("MLflow server started",
		slog.Int("port", port),
		slog.String("data_dir", dataDir),
	)

	if err := SeedPrompts(trackingURI, logger); err != nil {
		// Clean up the process we just started
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		cancel()
		return nil, fmt.Errorf("failed to seed MLflow: %w", err)
	}

	return &MLflowState{
		Cmd:     cmd,
		Port:    port,
		DataDir: dataDir,
		Ctx:     ctx,
		Cancel:  cancel,
	}, nil
}

// CleanupMLflowState performs graceful shutdown of the MLflow child process.
// Sends SIGTERM to the process group, waits for exit, then SIGKILL if needed.
// Follows the same shape as CleanupTestEnvState for consistency.
func CleanupMLflowState(
	state *MLflowState,
	errorLogger func(string, ...any),
	infoLogger func(string, ...any),
) {
	if state == nil {
		return
	}

	pid := state.Cmd.Process.Pid

	// SIGTERM the process group (negative PID targets the group)
	if err := syscall.Kill(-pid, syscall.SIGTERM); err != nil {
		errorLogger("Failed to send SIGTERM to MLflow process group (PID %d): %v", pid, err)
	} else {
		infoLogger("Sent SIGTERM to MLflow process group (PID %d)", pid)
	}

	// Wait for the process to exit, with a timeout
	done := make(chan error, 1)
	go func() {
		done <- state.Cmd.Wait()
	}()

	select {
	case <-done:
		infoLogger("MLflow process exited gracefully")
	case <-time.After(shutdownWait):
		errorLogger("MLflow did not exit within %v, sending SIGKILL", shutdownWait)
		if err := syscall.Kill(-pid, syscall.SIGKILL); err != nil {
			errorLogger("Failed to send SIGKILL to MLflow process group (PID %d): %v", pid, err)
		}
		<-done
	}

	state.Cancel()

	// Remove the data directory so the next startup begins with a fresh database
	if state.DataDir != "" {
		if err := os.RemoveAll(state.DataDir); err != nil {
			errorLogger("Failed to remove MLflow data directory %s: %v", state.DataDir, err)
		} else {
			infoLogger("Removed MLflow data directory %s", state.DataDir)
		}
	}
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

func waitForMLflowHealth(port int, logger *slog.Logger) error {
	deadline := time.Now().Add(healthTimeout)
	for time.Now().Before(deadline) {
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
