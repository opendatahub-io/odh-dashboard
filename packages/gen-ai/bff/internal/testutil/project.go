package testutil

import (
	"os"
	"os/exec"
	"path/filepath"
)

// FindProjectRoot walks up from startDir to find the directory containing go.mod.
// Returns startDir if go.mod is not found.
func FindProjectRoot(startDir string) string {
	dir := startDir
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return startDir
		}
		dir = parent
	}
}

// ResolveUVBinary finds the uv binary by walking up to the project root (go.mod),
// then checking <projectRoot>/bin/uv. Falls back to PATH lookup.
func ResolveUVBinary() (string, error) {
	cwd, err := os.Getwd()
	if err == nil {
		projectRoot := FindProjectRoot(cwd)
		localUV := filepath.Join(projectRoot, "bin", "uv")
		if _, err := os.Stat(localUV); err == nil {
			return localUV, nil
		}
	}
	return exec.LookPath("uv")
}
