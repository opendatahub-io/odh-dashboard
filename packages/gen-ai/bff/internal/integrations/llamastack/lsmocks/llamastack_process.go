package lsmocks

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

	"github.com/opendatahub-io/gen-ai/internal/testutil"
)

const (
	lsHealthTimeout = 90 * time.Second
	lsHealthPoll    = 2 * time.Second
	lsShutdownWait  = 5 * time.Second
)

func llamaStackVersion() string {
	return testutil.RequiredEnv("TEST_LLAMA_STACK_VERSION")
}

func llamaStackTestID() string {
	return testutil.RequiredEnv("LLAMA_STACK_TEST_ID")
}

// LlamaStackState tracks the Llama Stack child process, enabling targeted cleanup
// when the BFF shuts down — preventing orphaned servers.
// When reusing an existing server (Cmd is nil), only Seed is populated.
type LlamaStackState struct {
	Cmd          *exec.Cmd
	Port         int
	DataDir      string
	RecordingDir string
	Ctx          context.Context
	Cancel       context.CancelFunc
	Seed         *SeedResult
}

// SetupLlamaStack starts a local Llama Stack server as a child process in replay mode.
// If Llama Stack is already running on the target port, it reuses that instance.
// The caller is responsible for calling CleanupLlamaStackState on shutdown.
func SetupLlamaStack(logger *slog.Logger) (state *LlamaStackState, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("llama stack setup failed: %v", r)
		}
	}()

	port := testutil.GetTestLlamaStackPort()

	if isLlamaStackHealthy(port) {
		logger.Warn("Llama Stack already running on port — reusing existing instance. "+
			"Its database may contain stale data from previous dev sessions, which can cause test failures. "+
			fmt.Sprintf("Stop the external process (lsof -t -i :%d | xargs kill) and re-run for a clean state.", port),
			slog.Int("port", port))
		llamaStackURL := fmt.Sprintf("http://127.0.0.1:%d", port)
		seed, err := SeedData(llamaStackURL, llamaStackTestID(), logger)
		if err != nil {
			return nil, fmt.Errorf("failed to seed already-running Llama Stack: %w", err)
		}
		return &LlamaStackState{Seed: seed}, nil
	}

	version := llamaStackVersion()

	uvBin, err := testutil.ResolveUVBinary()
	if err != nil {
		return nil, fmt.Errorf("uv binary not found: %w", err)
	}
	logger.Debug("Resolved uv binary", slog.String("path", uvBin))

	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get working directory: %w", err)
	}

	projectRoot := testutil.FindProjectRoot(cwd)

	dataDir := filepath.Join(projectRoot, "testdata", "llamastack", ".data")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create Llama Stack data directory: %w", err)
	}

	recordingDir := filepath.Join(projectRoot, "testdata", "llamastack")
	configPath := filepath.Join(projectRoot, "testdata", "llamastack", "config.yaml")

	// Determine inference mode and API key
	inferenceMode := os.Getenv("LLAMA_STACK_TEST_INFERENCE_MODE")
	if inferenceMode == "" {
		inferenceMode = "replay"
	}

	geminiKey := os.Getenv("GEMINI_API_KEY")
	if geminiKey == "" && inferenceMode == "replay" {
		geminiKey = "dummy-key-for-replay"
	}

	ctx, cancel := context.WithCancel(context.Background())

	cmd := exec.CommandContext(ctx, uvBin,
		"run",
		"--with", "llama-stack=="+version,
		"--with", "milvus-lite",
		"--with", "pymilvus",
		"--with", "chardet",
		"--with", "ollama",
		"llama", "stack", "run", configPath,
		"--port", fmt.Sprintf("%d", port),
	)

	cmd.Env = append(os.Environ(),
		"SQLITE_STORE_DIR="+dataDir,
		"GEMINI_API_KEY="+geminiKey,
		"LLAMA_STACK_TEST_INFERENCE_MODE="+inferenceMode,
		"LLAMA_STACK_TEST_RECORDING_DIR="+recordingDir,
		"LLAMA_STACK_TEST_STACK_CONFIG_TYPE=server",
	)

	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	cleanup := func() {
		if cmd.Process != nil {
			_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		}
		cancel()
		os.RemoveAll(dataDir)
	}

	if err := cmd.Start(); err != nil {
		cleanup()
		return nil, fmt.Errorf("failed to start Llama Stack: %w", err)
	}

	logger.Info("Llama Stack process started, waiting for health check...",
		slog.Int("pid", cmd.Process.Pid),
		slog.Int("port", port),
		slog.String("mode", inferenceMode),
	)

	if err := waitForLlamaStackHealth(port, logger); err != nil {
		cleanup()
		return nil, fmt.Errorf("llama stack failed to become healthy: %w", err)
	}

	llamaStackURL := fmt.Sprintf("http://127.0.0.1:%d", port)

	logger.Info("Llama Stack server started",
		slog.Int("port", port),
		slog.String("data_dir", dataDir),
		slog.String("recording_dir", recordingDir),
	)

	seed, err := SeedData(llamaStackURL, llamaStackTestID(), logger)
	if err != nil {
		cleanup()
		return nil, fmt.Errorf("failed to seed Llama Stack: %w", err)
	}

	return &LlamaStackState{
		Cmd:          cmd,
		Port:         port,
		DataDir:      dataDir,
		RecordingDir: recordingDir,
		Ctx:          ctx,
		Cancel:       cancel,
		Seed:         seed,
	}, nil
}

// CleanupLlamaStackState performs graceful shutdown of the Llama Stack child process.
// When reusing an existing server (Cmd is nil), only seed result was stored — no process cleanup needed.
func CleanupLlamaStackState(
	state *LlamaStackState,
	errorLogger func(string, ...any),
	infoLogger func(string, ...any),
) {
	if state == nil {
		return
	}

	if state.Cmd == nil {
		infoLogger("Llama Stack was reused (no child process to clean up)")
		return
	}

	pid := state.Cmd.Process.Pid

	if err := syscall.Kill(-pid, syscall.SIGTERM); err != nil {
		errorLogger("Failed to send SIGTERM to Llama Stack process group (PID %d): %v", pid, err)
	} else {
		infoLogger("Sent SIGTERM to Llama Stack process group (PID %d)", pid)
	}

	done := make(chan error, 1)
	go func() {
		done <- state.Cmd.Wait()
	}()

	select {
	case <-done:
		infoLogger("Llama Stack process exited gracefully")
	case <-time.After(lsShutdownWait):
		errorLogger("Llama Stack did not exit within %v, sending SIGKILL", lsShutdownWait)
		if err := syscall.Kill(-pid, syscall.SIGKILL); err != nil {
			errorLogger("Failed to send SIGKILL to Llama Stack process group (PID %d): %v", pid, err)
		}
		select {
		case <-done:
		case <-time.After(10 * time.Second):
			errorLogger("Llama Stack process did not exit after SIGKILL within 10s, abandoning")
		}
	}

	state.Cancel()

	if state.DataDir != "" {
		if err := os.RemoveAll(state.DataDir); err != nil {
			errorLogger("Failed to remove Llama Stack data directory %s: %v", state.DataDir, err)
		} else {
			infoLogger("Removed Llama Stack data directory %s", state.DataDir)
		}
	}
}

func isLlamaStackHealthy(port int) bool {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/v1/models", port))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func waitForLlamaStackHealth(port int, logger *slog.Logger) error {
	deadline := time.Now().Add(lsHealthTimeout)
	for time.Now().Before(deadline) {
		if isLlamaStackHealthy(port) {
			return nil
		}
		logger.Debug("Waiting for Llama Stack health check...",
			slog.Duration("remaining", time.Until(deadline)),
		)
		time.Sleep(lsHealthPoll)
	}
	return fmt.Errorf("llama stack did not respond to health check within %v", lsHealthTimeout)
}
