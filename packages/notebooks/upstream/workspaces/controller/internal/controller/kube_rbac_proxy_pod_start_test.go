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

package controller

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	pkgtls "github.com/kubeflow/notebooks/workspaces/controller/pkg/tls"
)

func TestPinnedKubeRBACProxyStarts(t *testing.T) {
	cli, mountOpt := containerCLI(t)
	if _, err := exec.LookPath("openssl"); err != nil {
		t.Skip("openssl is required to mint the sidecar certificate")
	}
	if _, err := exec.LookPath("curl"); err != nil {
		t.Skip("curl is required to call the proxy health endpoint")
	}
	image := pinnedKubeRBACProxyImage(t)

	t.Run("intermediate fallback", func(t *testing.T) {
		settings, err := pkgtls.ResolveProxyTLS(context.Background(), emptyAPIReader(), false)
		if err != nil {
			t.Fatal(err)
		}
		args := renderProxyArgs(t, settings)
		if containsArgPrefix(args, "--tls-curve-preferences=") {
			t.Fatalf("fallback args include a curve flag: %v", args)
		}
		startPinnedProxy(t, cli, mountOpt, image, args)
	})

	t.Run("strict intermediate curve preferences", func(t *testing.T) {
		settings, err := pkgtls.ResolveProxyTLS(context.Background(), apiReaderWith(apiServerProfile(
			map[string]any{"type": "Intermediate"},
			"StrictAllComponents",
		)), false)
		if err != nil {
			t.Fatal(err)
		}
		args := renderProxyArgs(t, settings)
		if !containsArg(args, "--tls-curve-preferences=4588,29,23,24") {
			t.Fatalf("strict Intermediate args = %v", args)
		}
		startPinnedProxy(t, cli, mountOpt, image, args)
	})

	t.Run("tls 1.3 without a cipher flag", func(t *testing.T) {
		settings, err := pkgtls.ResolveProxyTLS(context.Background(), apiReaderWith(tls13NoGroupsAPIServer()), false)
		if err != nil {
			t.Fatal(err)
		}
		args := renderProxyArgs(t, settings)
		if containsArgPrefix(args, "--tls-cipher-suites=") || containsArgPrefix(args, "--tls-curve-preferences=") {
			t.Fatalf("TLS 1.3 pod-start args = %v", args)
		}
		startPinnedProxy(t, cli, mountOpt, image, args)
	})
}

func containerCLI(t *testing.T) (string, string) {
	t.Helper()
	if _, err := exec.LookPath("podman"); err == nil {
		return "podman", ":ro,Z"
	}
	if _, err := exec.LookPath("docker"); err == nil {
		return "docker", ":ro"
	}
	t.Skip("podman or docker is not available")
	return "", ""
}

func pinnedKubeRBACProxyImage(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	path := filepath.Join(filepath.Dir(file), "../../manifests/kustomize/overlays/gateway/params.env")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	const key = "KUBE_RBAC_PROXY_IMAGE="
	for line := range strings.SplitSeq(string(data), "\n") {
		image, ok := strings.CutPrefix(line, key)
		if !ok {
			continue
		}
		image = strings.TrimSpace(image)
		if image == "" {
			t.Fatalf("empty %s in %s", key, path)
		}
		return image
	}
	t.Fatalf("%s missing from %s", key, path)
	return ""
}

func startPinnedProxy(t *testing.T, cli string, mountOpt string, image string, args []string) {
	t.Helper()
	root := t.TempDir()
	if err := os.Chmod(root, 0o755); err != nil {
		t.Fatal(err)
	}
	configDir := filepath.Join(root, "config")
	certDir := filepath.Join(root, "certs")
	kubeDir := filepath.Join(root, "kube")
	for _, dir := range []string{configDir, certDir, kubeDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	config := []byte(`authorization:
  resourceAttributes:
    verb: get
    resource: workspaces
    apiGroup: kubeflow.org
    name: example
    namespace: workspaces
`)
	kubeconfig := []byte(`apiVersion: v1
kind: Config
clusters:
- name: test
  cluster:
    server: https://127.0.0.1:6443
    insecure-skip-tls-verify: true
users:
- name: test
  user:
    token: dummy
contexts:
- name: test
  context:
    cluster: test
    user: test
current-context: test
`)
	if err := os.WriteFile(filepath.Join(configDir, "config-file.yaml"), config, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(kubeDir, "config"), kubeconfig, 0o644); err != nil {
		t.Fatal(err)
	}
	certCtx, cancelCert := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelCert()
	openssl := exec.CommandContext(certCtx, "openssl", "req", "-x509", "-newkey", "rsa:2048",
		"-keyout", filepath.Join(certDir, "tls.key"),
		"-out", filepath.Join(certDir, "tls.crt"),
		"-days", "1", "-nodes", "-subj", "/CN=localhost")
	if out, err := openssl.CombinedOutput(); err != nil {
		t.Fatalf("openssl: %v\n%s", err, out)
	}
	if err := os.Chmod(filepath.Join(certDir, "tls.key"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(filepath.Join(certDir, "tls.crt"), 0o644); err != nil {
		t.Fatal(err)
	}

	name := fmt.Sprintf("krp%x", time.Now().UnixNano())
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = exec.CommandContext(ctx, cli, "rm", "-f", name).Run()
	})

	runArgs := make([]string, 0, 12+len(args)+1)
	runArgs = append(runArgs,
		"run", "-d", "--name", name,
		"-p", "127.0.0.1::8444",
		"-v", configDir+":/etc/kube-rbac-proxy"+mountOpt,
		"-v", certDir+":/etc/tls/private"+mountOpt,
		"-v", kubeDir+":/kube"+mountOpt,
		image,
	)
	runArgs = append(runArgs, args...)
	runArgs = append(runArgs, "--kubeconfig=/kube/config")

	runCtx, cancelRun := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancelRun()
	run := exec.CommandContext(runCtx, cli, runArgs...)
	if out, err := run.CombinedOutput(); err != nil {
		t.Fatalf("%s run: %v\n%s", cli, err, out)
	}

	deadline := time.Now().Add(30 * time.Second)
	var last string
	seenRunning := false
	for time.Now().Before(deadline) {
		if !containerIsRunning(cli, name) {
			if seenRunning {
				t.Fatalf("container exited\n%s", containerLogs(cli, name))
			}
		} else {
			seenRunning = true
		}
		port := publishedPort(cli, name)
		if port != "" {
			ok, body := healthz(port)
			last = body
			if ok {
				logs := containerLogs(cli, name)
				if !strings.Contains(logs, "Listening securely on 0.0.0.0:8443") {
					t.Fatalf("kube-rbac-proxy did not listen\n%s", logs)
				}
				return
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatalf("healthz was not ok (%q)\n%s", last, containerLogs(cli, name))
}

func containerIsRunning(cli string, name string) bool {
	out, err := exec.Command(cli, "inspect", "-f", "{{.State.Running}}", name).Output()
	return err == nil && strings.TrimSpace(string(out)) == "true"
}

func containerLogs(cli string, name string) string {
	out, _ := exec.Command(cli, "logs", name).CombinedOutput()
	return string(out)
}

func publishedPort(cli string, name string) string {
	out, err := exec.Command(cli, "port", name, "8444/tcp").Output()
	if err != nil {
		return ""
	}
	line := strings.TrimSpace(string(bytes.Split(out, []byte("\n"))[0]))
	if line == "" {
		return ""
	}
	colon := strings.LastIndex(line, ":")
	if colon < 0 || colon == len(line)-1 {
		return ""
	}
	return line[colon+1:]
}

func healthz(port string) (bool, string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "curl", "-fsS", "-k", "--max-time", "2", "https://127.0.0.1:"+port+"/healthz")
	out, err := cmd.CombinedOutput()
	body := strings.TrimSpace(string(out))
	return err == nil && body == "ok", body
}
