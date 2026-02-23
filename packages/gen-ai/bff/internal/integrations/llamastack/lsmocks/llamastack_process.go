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
	defaultLlamaStackVersion = "0.5.1"
	lsHealthTimeout          = 90 * time.Second
	lsHealthPoll             = 2 * time.Second
	lsShutdownWait           = 5 * time.Second
	defaultTestID            = "bff/testdata/llamastack-recordings/test.py::record"
)

func llamaStackVersion() string {
	if v := os.Getenv("TEST_LLAMA_STACK_VERSION"); v != "" {
		return v
	}
	return defaultLlamaStackVersion
}

func llamaStackTestID() string {
	if v := os.Getenv("LLAMA_STACK_TEST_ID"); v != "" {
		return v
	}
	return defaultTestID
}

// LlamaStackState tracks the Llama Stack child process, enabling targeted cleanup
// when the BFF shuts down — preventing orphaned servers.
type LlamaStackState struct {
	Cmd          *exec.Cmd
	Port         int
	DataDir      string
	RecordingDir string
	Ctx          context.Context
	Cancel       context.CancelFunc
}

// SetupLlamaStack starts a local Llama Stack server as a child process in replay mode.
// If Llama Stack is already running on the target port, it reuses that instance.
// The caller is responsible for calling CleanupLlamaStackState on shutdown.
func SetupLlamaStack(logger *slog.Logger) (*LlamaStackState, error) {
	port := testutil.GetTestLlamaStackPort()
	version := llamaStackVersion()

	if isLlamaStackHealthy(port) {
		logger.Warn("Llama Stack already running on port — reusing existing instance. "+
			"Its database may contain stale data from previous dev sessions, which can cause test failures. "+
			fmt.Sprintf("Stop the external process (lsof -t -i :%d | xargs kill) and re-run for a clean state.", port),
			slog.Int("port", port))
		llamaStackURL := fmt.Sprintf("http://127.0.0.1:%d", port)
		if err := SeedData(llamaStackURL, llamaStackTestID(), logger); err != nil {
			return nil, fmt.Errorf("failed to seed already-running Llama Stack: %w", err)
		}
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

	// Find the project root (where go.mod is) to locate config and recordings
	projectRoot := findProjectRoot(cwd)

	dataDir := filepath.Join(projectRoot, ".llamastack-test")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create Llama Stack data directory: %w", err)
	}

	recordingDir := filepath.Join(projectRoot, "testdata", "llamastack-recordings")
	configPath := filepath.Join(projectRoot, "llama-stack-run-config.yaml")

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

	if err := cmd.Start(); err != nil {
		cancel()
		return nil, fmt.Errorf("failed to start Llama Stack: %w", err)
	}

	logger.Info("Llama Stack process started, waiting for health check...",
		slog.Int("pid", cmd.Process.Pid),
		slog.Int("port", port),
		slog.String("mode", inferenceMode),
	)

	if err := waitForLlamaStackHealth(port, logger); err != nil {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		cancel()
		return nil, fmt.Errorf("llama stack failed to become healthy: %w", err)
	}

	llamaStackURL := fmt.Sprintf("http://127.0.0.1:%d", port)
	os.Setenv("LLAMA_STACK_TEST_ID", llamaStackTestID())

	// Override the BFF's default embedding model to use the Gemini model available on the test server.
	// Gemini provider prefixes model IDs with "gemini/" in the routing table.
	if os.Getenv("DEFAULT_EMBEDDING_MODEL") == "" {
		os.Setenv("DEFAULT_EMBEDDING_MODEL", testutil.GetTestLlamaStackEmbeddingModel())
	}
	if os.Getenv("DEFAULT_EMBEDDING_DIMENSION") == "" {
		os.Setenv("DEFAULT_EMBEDDING_DIMENSION", "3072")
	}

	logger.Info("Llama Stack server started",
		slog.Int("port", port),
		slog.String("data_dir", dataDir),
		slog.String("recording_dir", recordingDir),
	)

	if err := SeedData(llamaStackURL, llamaStackTestID(), logger); err != nil {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		cancel()
		return nil, fmt.Errorf("failed to seed Llama Stack: %w", err)
	}

	return &LlamaStackState{
		Cmd:          cmd,
		Port:         port,
		DataDir:      dataDir,
		RecordingDir: recordingDir,
		Ctx:          ctx,
		Cancel:       cancel,
	}, nil
}

// CleanupLlamaStackState performs graceful shutdown of the Llama Stack child process.
func CleanupLlamaStackState(
	state *LlamaStackState,
	errorLogger func(string, ...any),
	infoLogger func(string, ...any),
) {
	if state == nil {
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
		<-done
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

// findProjectRoot walks up from cwd to find the directory containing go.mod
func findProjectRoot(cwd string) string {
	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return cwd
		}
		dir = parent
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
