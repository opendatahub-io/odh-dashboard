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

package server

import (
	"strings"
	"testing"
)

func TestNewServerRejectsPartialTLSConfig(t *testing.T) {
	tests := []struct {
		name     string
		certFile string
		keyFile  string
	}{
		{name: "cert only", certFile: "/tls/tls.crt", keyFile: ""},
		{name: "key only", certFile: "", keyFile: "/tls/tls.key"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewServer(nil, nil, tt.certFile, tt.keyFile)
			if err == nil {
				t.Fatal("expected error for partial TLS config, got nil")
			}
			if !strings.Contains(err.Error(), "must be provided together") {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}
