package api

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
	"k8s.io/apimachinery/pkg/util/validation"
)

const (
	modelServingPathPrefix     = "/api/service/model-serving"
	modelServingGatewaysPath   = modelServingPathPrefix + "/api/v1/gateways"
	modelServingSamplesPath    = modelServingPathPrefix + "/api/v1/samples/llm-d"
	defaultModelServingHostFmt = "https://model-serving-api.%s.svc.cluster.local:443"
)

func (app *App) initModelServingProxy() error {
	if app.config.MockK8Client {
		app.modelServingProxy = app.modelServingOperationsOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == modelServingSamplesPath {
				w.Header().Set(constants.HeaderContentType, constants.ContentTypeYAML)
				w.Write([]byte("apiVersion: serving.kserve.io/v1alpha2\nkind: LLMInferenceServiceConfig\nmetadata:\n  name: sample-config\nspec: {}\n")) //nolint:errcheck // mock-only handler
				return
			}
			w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"gateways":[{"name":"shared-gateway","namespace":"gateway-system","listener":"https","status":"Ready","displayName":"Shared gateway","description":"External model traffic"}]}`)) //nolint:errcheck // mock-only handler
		}))
		return nil
	}

	host := app.config.ModelServingServiceHost
	if host == "" {
		host = fmt.Sprintf(defaultModelServingHostFmt, app.config.Namespace)
	}

	targetURL, err := url.Parse(host)
	if err != nil {
		return fmt.Errorf("failed to parse model-serving host URL: %w", err)
	}

	allowHTTP := app.config.DevMode || app.config.MockK8Client
	insecureSkipVerify := app.config.InsecureSkipVerify && (app.config.DevMode || app.config.MockK8Client)

	rp, err := proxy.NewReverseProxy(proxy.ProxyConfig{
		TargetURL:          targetURL,
		RootCAs:            app.rootCAs,
		InsecureSkipVerify: insecureSkipVerify,
		AllowHTTP:          allowHTTP,
		PathRewriteFn: func(r *http.Request) string {
			if r.URL.Path == modelServingSamplesPath {
				return "/api/v1/samples/llm-d"
			}
			return "/api/v1/gateways"
		},
		AuthHeaderFn: func(r *http.Request) string {
			identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				// Unreachable: InjectRequestIdentity middleware on serviceMux returns 401
				// before requests reach this handler. Defensive fallback omits the header.
				return ""
			}
			return k8s.BearerTokenPrefix + identity.ResolveToken(app.devFallbackToken)
		},
		StripHeaders:       proxy.SensitiveIngressHeaders(app.config.AuthTokenHeader),
		ModifyResponse:     ssrf.NewRedirectValidator(app.logger),
		SSRFValidateTarget: true,
		SSRFAllowedHosts:   []string{targetURL.Hostname()},
		Logger:             app.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create model-serving proxy: %w", err)
	}

	app.modelServingProxy = app.modelServingOperationsOnly(rp)
	return nil
}

// Keep public operations fixed even when the upstream service adds other APIs.
func (app *App) modelServingOperationsOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.EscapedPath()
		if path != modelServingGatewaysPath && path != modelServingSamplesPath {
			app.notFoundResponse(w, r)
			return
		}
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			app.methodNotAllowedResponse(w, r)
			return
		}
		query, err := url.ParseQuery(r.URL.RawQuery)
		validQuery := len(query) == 1 && len(query["namespace"]) == 1 && len(validation.IsDNS1123Label(query.Get("namespace"))) == 0
		errorMessage := "a valid project namespace is required"
		if path == modelServingSamplesPath {
			validQuery = validLLMdSampleQuery(query)
			errorMessage = "a valid sample type and matching topology are required"
		}
		if err != nil || !validQuery {
			app.badRequestResponse(w, r, fmt.Errorf("%s", errorMessage))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func validLLMdSampleQuery(query url.Values) bool {
	if len(query["type"]) != 1 {
		return false
	}
	topology := query.Get("type")
	if topology == "router" {
		if len(query) != 2 || len(query["topology"]) != 1 {
			return false
		}
		topology = query.Get("topology")
	} else if len(query) != 1 {
		return false
	}
	switch topology {
	case "workload-single-node", "workload-multi-node-data-parallel", "workload-single-node-pd", "workload-multi-node-data-parallel-pd":
		return true
	default:
		return false
	}
}
