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
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

const (
	envTestK8sVersion  = "1.31.0"
	contractTestUser   = "dev-user@example.com"
	defaultImageCRDDir = "/crds"
)

// Environment wraps envtest for contract-test and local mock Kubernetes access.
type Environment struct {
	env *envtest.Environment
}

// Start boots a local Kubernetes API server with Workspace CRDs and cluster-admin access
// for the default ODH contract-test user.
func Start(logger *slog.Logger) (*rest.Config, *Environment, error) {
	binaryAssetsDir := resolveBinaryAssetsDir()
	crdDir := resolveCRDDirectory()

	testEnv := &envtest.Environment{
		CRDDirectoryPaths:     []string{crdDir},
		ErrorIfCRDPathMissing: true,
		BinaryAssetsDirectory: binaryAssetsDir,
	}

	cfg, err := testEnv.Start()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to start envtest: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		_ = testEnv.Stop()
		return nil, nil, fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}

	if err := grantClusterAdmin(context.Background(), clientset, contractTestUser); err != nil {
		_ = testEnv.Stop()
		return nil, nil, err
	}

	if logger != nil {
		logger.Info("started envtest Kubernetes API for contract tests",
			slog.String("assets", binaryAssetsDir),
			slog.String("crdDir", crdDir),
		)
	}

	return cfg, &Environment{env: testEnv}, nil
}

// Stop tears down the envtest control plane.
func (e *Environment) Stop() error {
	if e == nil || e.env == nil {
		return nil
	}
	return e.env.Stop()
}

func resolveBinaryAssetsDir() string {
	if dir := os.Getenv("KUBEBUILDER_ASSETS"); dir != "" {
		return dir
	}
	if dir := os.Getenv("ENVTEST_ASSETS"); dir != "" {
		return dir
	}
	return filepath.Join("bin", "k8s", fmt.Sprintf("%s-%s-%s", envTestK8sVersion, runtime.GOOS, runtime.GOARCH))
}

func grantClusterAdmin(ctx context.Context, clientset kubernetes.Interface, username string) error {
	_, err := clientset.RbacV1().ClusterRoleBindings().Create(ctx, &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("contract-test-cluster-admin-%s", sanitizeName(username)),
		},
		Subjects: []rbacv1.Subject{
			{
				Kind: "User",
				Name: username,
			},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     "cluster-admin",
		},
	}, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create cluster-admin binding for contract test user: %w", err)
	}
	return nil
}

func resolveCRDDirectory() string {
	if dir := os.Getenv("WORKSPACES_CRD_DIR"); dir != "" {
		return dir
	}
	if _, err := os.Stat(defaultImageCRDDir); err == nil {
		return defaultImageCRDDir
	}
	return filepath.Join("..", "controller", "manifests", "kustomize", "base", "crd")
}

func sanitizeName(value string) string {
	replacer := func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= 'A' && r <= 'Z':
			return r
		case r >= '0' && r <= '9':
			return r
		default:
			return '-'
		}
	}
	out := make([]rune, 0, len(value))
	for _, r := range value {
		out = append(out, replacer(r))
	}
	return strings.Trim(strings.ToLower(string(out)), "-")
}
