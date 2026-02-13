package mlflowmocks

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

const (
	mlflowPort    = 5001
	mlflowVersion = "3.8.1"
	healthTimeout = 30 * time.Second
	healthPoll    = 2 * time.Second
	shutdownWait  = 5 * time.Second
)

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
	// Pre-flight: skip if externally managed (e.g. MLFLOW_TRACKING_URI set by operator)
	if uri := os.Getenv("MLFLOW_TRACKING_URI"); uri != "" {
		logger.Info("MLFLOW_TRACKING_URI already set, assuming externally managed", slog.String("uri", uri))
		return nil, nil
	}

	// Pre-flight: skip if MLflow is already running (e.g. from make mlflow-up)
	if isMLflowHealthy() {
		logger.Info("MLflow already running, skipping child process startup", slog.Int("port", mlflowPort))
		return nil, nil
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
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create MLflow data directory: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	cmd := exec.CommandContext(ctx, uvBin,
		"run", "--with", "mlflow=="+mlflowVersion,
		"mlflow", "server",
		"--host", "127.0.0.1",
		"--port", fmt.Sprintf("%d", mlflowPort),
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
		slog.Int("port", mlflowPort),
	)

	if err := waitForMLflowHealth(logger); err != nil {
		// Clean up the process we just started
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		cancel()
		return nil, fmt.Errorf("MLflow failed to become healthy: %w", err)
	}

	// Set env var so MockClientFactory picks up the correct URI
	trackingURI := fmt.Sprintf("http://127.0.0.1:%d", mlflowPort)
	os.Setenv("MLFLOW_TRACKING_URI", trackingURI)

	logger.Info("MLflow server started",
		slog.Int("port", mlflowPort),
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
		Port:    mlflowPort,
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

// resolveUVBinary finds the uv binary, checking the local bin directory first.
func resolveUVBinary() (string, error) {
	// Check project-local bin/ first (installed by make uv)
	cwd, err := os.Getwd()
	if err == nil {
		localUV := filepath.Join(cwd, "bin", "uv")
		if _, err := os.Stat(localUV); err == nil {
			return localUV, nil
		}
	}

	// Fall back to PATH
	return exec.LookPath("uv")
}

func isMLflowHealthy() bool {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/health", mlflowPort))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func waitForMLflowHealth(logger *slog.Logger) error {
	deadline := time.Now().Add(healthTimeout)
	for time.Now().Before(deadline) {
		if isMLflowHealthy() {
			return nil
		}
		logger.Debug("Waiting for MLflow health check...",
			slog.Duration("remaining", time.Until(deadline)),
		)
		time.Sleep(healthPoll)
	}
	return fmt.Errorf("MLflow did not respond to health check within %v", healthTimeout)
}
