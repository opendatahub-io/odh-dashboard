//go:build !mockk8s

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

package main

import (
	"errors"
	"log/slog"

	"k8s.io/client-go/rest"
)

func startMockK8s(_ *slog.Logger) (*rest.Config, func() error, error) {
	return nil, nil, errors.New("mock Kubernetes support is not compiled into this binary; rebuild with -tags mockk8s")
}
