/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package testenv

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

func TestSanitizeName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		in, want string
	}{
		{"dev-user@example.com", "dev-user-example-com"},
		{"Dev-User@Example.COM", "dev-user-example-com"},
		{"-leading-and-trailing-", "leading-and-trailing"},
	}
	for _, tt := range tests {
		if got := sanitizeName(tt.in); got != tt.want {
			t.Errorf("sanitizeName(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestResolveCRDDirectory(t *testing.T) {
	t.Setenv("WORKSPACES_CRD_DIR", "")
	if got := resolveCRDDirectory(); got == "" {
		t.Fatal("resolveCRDDirectory() returned empty path")
	}

	customDir := t.TempDir()
	t.Setenv("WORKSPACES_CRD_DIR", customDir)
	if got := resolveCRDDirectory(); got != customDir {
		t.Errorf("resolveCRDDirectory() = %q, want %q", got, customDir)
	}
}

func TestVerifyBinaryAssetsDir(t *testing.T) {
	t.Parallel()

	t.Run("missing directory", func(t *testing.T) {
		t.Parallel()
		if err := verifyBinaryAssetsDir(filepath.Join(t.TempDir(), "does-not-exist")); err == nil {
			t.Fatal("verifyBinaryAssetsDir() = nil error, want error for missing directory")
		}
	})

	t.Run("directory missing binaries", func(t *testing.T) {
		t.Parallel()
		if err := verifyBinaryAssetsDir(t.TempDir()); err == nil {
			t.Fatal("verifyBinaryAssetsDir() = nil error, want error for empty directory")
		}
	})

	t.Run("directory with all binaries", func(t *testing.T) {
		t.Parallel()
		dir := t.TempDir()
		for _, bin := range requiredEnvtestBinaries {
			if err := os.WriteFile(filepath.Join(dir, bin), []byte{}, 0o755); err != nil {
				t.Fatalf("failed to create fake binary %q: %v", bin, err)
			}
		}
		if err := verifyBinaryAssetsDir(dir); err != nil {
			t.Errorf("verifyBinaryAssetsDir() = %v, want nil", err)
		}
	})
}

// thisPackageDir returns the absolute directory containing this test file,
// so path resolution below doesn't depend on the process's working
// directory (which for `go test` is this package's directory, but callers
// like `go run ./cmd` from workspaces/backend rely on relative paths that
// don't resolve the same way here).
func thisPackageDir(t *testing.T) string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed to resolve test file path")
	}
	return filepath.Dir(file)
}

// TestStart exercises the real envtest bootstrap this package exists for:
// booting a control plane with the Workspace CRDs and granting cluster-admin
// to the ODH contract-test user. It requires the envtest control-plane
// binaries (`make envtest`, or `make test` which provisions them
// automatically) and is skipped if they, or the controller CRDs, aren't
// found — the same requirement api/suite_test.go has for its own,
// independently-maintained envtest bootstrap (see the package doc comment
// in testenv.go for why the two aren't shared).
func TestStart(t *testing.T) {
	backendDir := filepath.Join(thisPackageDir(t), "..", "..", "..", "..")

	if os.Getenv("KUBEBUILDER_ASSETS") == "" && os.Getenv("ENVTEST_ASSETS") == "" {
		assetsDir := filepath.Join(backendDir, "bin", "k8s",
			fmt.Sprintf("%s-%s-%s", envTestK8sVersion, runtime.GOOS, runtime.GOARCH))
		if _, err := os.Stat(assetsDir); err != nil {
			t.Skipf("envtest binary assets not found at %q; run 'make envtest' first: %v", assetsDir, err)
		}
		t.Setenv("KUBEBUILDER_ASSETS", assetsDir)
	}

	if os.Getenv("WORKSPACES_CRD_DIR") == "" {
		crdDir := filepath.Join(backendDir, "..", "controller", "manifests", "kustomize", "base", "crd")
		if _, err := os.Stat(crdDir); err != nil {
			t.Skipf("controller CRDs not found at %q: %v", crdDir, err)
		}
		t.Setenv("WORKSPACES_CRD_DIR", crdDir)
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg, env, err := Start(logger)
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	t.Cleanup(func() {
		if stopErr := env.Stop(); stopErr != nil {
			t.Errorf("Environment.Stop() error = %v", stopErr)
		}
	})
	if cfg == nil {
		t.Fatal("Start() returned a nil *rest.Config")
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		t.Fatalf("failed to build clientset from Start() config: %v", err)
	}

	crbName := "contract-test-cluster-admin-" + sanitizeName(contractTestUser)
	crb, err := clientset.RbacV1().ClusterRoleBindings().Get(context.Background(), crbName, metav1.GetOptions{})
	if err != nil {
		t.Fatalf("expected ClusterRoleBinding %q to exist: %v", crbName, err)
	}
	if got, want := crb.RoleRef.Name, "cluster-admin"; got != want {
		t.Errorf("ClusterRoleBinding %q RoleRef.Name = %q, want %q", crbName, got, want)
	}
	if len(crb.Subjects) != 1 || crb.Subjects[0].Name != contractTestUser {
		t.Errorf("ClusterRoleBinding %q Subjects = %+v, want a single subject named %q",
			crbName, crb.Subjects, contractTestUser)
	}
}
