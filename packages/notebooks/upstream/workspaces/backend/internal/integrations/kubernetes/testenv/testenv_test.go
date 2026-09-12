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

import "testing"

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
