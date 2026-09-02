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

package config

const (
	// DefaultAuthTokenHeader is the header used to extract the token when AuthMethod is
	// "user_token", unless overridden.
	DefaultAuthTokenHeader = "Authorization"
	// DefaultAuthTokenPrefix is the prefix stripped from AuthTokenHeader's value when AuthMethod
	// is "user_token", unless overridden.
	DefaultAuthTokenPrefix = "Bearer "
)

type EnvConfig struct {
	Port int

	ClientQPS   float64
	ClientBurst int

	DisableAuth bool

	// AuthMethod selects how the request identity is resolved:
	//   - "internal": trust the UserIdHeader/GroupsHeader request headers (Kubeflow-style deployments)
	//   - "user_token": resolve identity via TokenReview, using a token extracted from
	//     AuthTokenHeader (stripping AuthTokenPrefix, if set) (RHOAI/ODH deployments)
	AuthMethod string

	// AuthTokenHeader and AuthTokenPrefix configure token extraction when AuthMethod is
	// "user_token". See NewBearerTokenAuthenticator.
	AuthTokenHeader string
	AuthTokenPrefix string

	UserIdHeader string
	UserIdPrefix string
	GroupsHeader string

	ProxyUrlPrefix string

	SwaggerEnabled  bool
	SwaggerHost     string
	SwaggerBasePath string
	SwaggerScheme   string
	// StaticAssetsDir is the directory containing frontend static assets
	StaticAssetsDir string
}
