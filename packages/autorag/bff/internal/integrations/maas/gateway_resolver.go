package maas

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

const (
	defaultMaaSBFFServiceName  = "odh-dashboard-maas-ui"
	defaultMaaSBFFServicePort  = 8243
	defaultMaaSBFFPathPrefix   = "/api/v1"
	defaultMaaSBFFAuthHeader   = "x-forwarded-access-token"
	gatewayHostCacheTTL        = 5 * time.Minute
	gatewayHostFailureCacheTTL = 15 * time.Second
	maxGatewayURLResponseBytes = 64 << 10
)

var ErrMaaSGatewayDiscovery = errors.New("MaaS gateway discovery failed")

type GatewayHostResolver interface {
	Resolve(context.Context) (MaaSOrigin, error)
}

type GatewayResolverConfig struct {
	ServiceName     string
	ServicePort     int
	Namespace       string
	PathPrefix      string
	TLSEnabled      bool
	AuthTokenHeader string
	AuthTokenPrefix string
	RootCAs         *x509.CertPool
	HTTPClient      *http.Client
}

type HTTPGatewayHostResolver struct {
	client          *http.Client
	baseURL         string
	authTokenHeader string
	authTokenPrefix string
}

func NewHTTPGatewayHostResolver(cfg GatewayResolverConfig) *HTTPGatewayHostResolver {
	serviceName := cfg.ServiceName
	if serviceName == "" {
		serviceName = defaultMaaSBFFServiceName
	}
	servicePort := cfg.ServicePort
	if servicePort == 0 {
		servicePort = defaultMaaSBFFServicePort
	}
	namespace := cfg.Namespace
	if namespace == "" {
		namespace = "opendatahub"
	}
	pathPrefix := strings.TrimSuffix(cfg.PathPrefix, "/")
	if pathPrefix == "" {
		pathPrefix = defaultMaaSBFFPathPrefix
	}
	scheme := "http"
	if cfg.TLSEnabled {
		scheme = "https"
	}

	baseURL := (&url.URL{
		Scheme: scheme,
		Host:   net.JoinHostPort(fmt.Sprintf("%s.%s.svc.cluster.local", serviceName, namespace), strconv.Itoa(servicePort)),
		Path:   pathPrefix,
	}).String()

	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12, RootCAs: cfg.RootCAs},
			},
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}
	}
	authHeader := cfg.AuthTokenHeader
	if authHeader == "" {
		authHeader = defaultMaaSBFFAuthHeader
	}

	return &HTTPGatewayHostResolver{
		client:          client,
		baseURL:         baseURL,
		authTokenHeader: authHeader,
		authTokenPrefix: cfg.AuthTokenPrefix,
	}
}

func (r *HTTPGatewayHostResolver) Resolve(ctx context.Context) (MaaSOrigin, error) {
	// The request target is the fixed, installation-configured in-cluster MaaS
	// BFF service. Its authenticated gateway-url response is the installation
	// trust source; the user-provided MaaS Secret is never used to discover or
	// expand this origin. GATEWAY_DOMAIN is the Dashboard host and is not a
	// valid constraint for the separate MaaS Route hostname.
	identity, err := corek8s.IdentityFromContext(ctx)
	if err != nil || identity.Token == "" {
		return MaaSOrigin{}, fmt.Errorf("%w: authenticated user token is unavailable", ErrMaaSGatewayDiscovery)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.baseURL+"/gateway-url", nil)
	if err != nil {
		return MaaSOrigin{}, fmt.Errorf("%w: create request: %v", ErrMaaSGatewayDiscovery, err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set(r.authTokenHeader, r.authTokenPrefix+identity.Token)

	resp, err := r.client.Do(req)
	if err != nil {
		return MaaSOrigin{}, fmt.Errorf("%w: request MaaS BFF: %v", ErrMaaSGatewayDiscovery, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxGatewayURLResponseBytes))
	if err != nil {
		return MaaSOrigin{}, fmt.Errorf("%w: read MaaS BFF response: %v", ErrMaaSGatewayDiscovery, err)
	}
	if resp.StatusCode != http.StatusOK {
		return MaaSOrigin{}, fmt.Errorf("%w: MaaS BFF returned HTTP %d", ErrMaaSGatewayDiscovery, resp.StatusCode)
	}

	var envelope struct {
		Data struct {
			URL string `json:"url"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return MaaSOrigin{}, fmt.Errorf("%w: decode MaaS BFF response: %v", ErrMaaSGatewayDiscovery, err)
	}

	parsed, err := url.Parse(strings.TrimSpace(envelope.Data.URL))
	if err != nil || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.Opaque != "" {
		return MaaSOrigin{}, fmt.Errorf("%w: MaaS BFF returned an invalid gateway URL", ErrMaaSGatewayDiscovery)
	}
	if parsed.Scheme != "https" || strings.TrimSuffix(parsed.Path, "/") != "/maas-api" {
		return MaaSOrigin{}, fmt.Errorf("%w: MaaS BFF returned an unsupported gateway URL", ErrMaaSGatewayDiscovery)
	}

	origin, err := MaaSOriginFromURL(parsed)
	if err != nil {
		return MaaSOrigin{}, fmt.Errorf("%w: %v", ErrMaaSGatewayDiscovery, err)
	}
	return origin, nil
}

type CachedGatewayHostResolver struct {
	resolver GatewayHostResolver
	ttl      time.Duration
	now      func() time.Time

	mu        sync.Mutex
	refreshMu sync.Mutex
	origin    MaaSOrigin
	expiresAt time.Time
	lastErr   error
	errUntil  time.Time
}

func NewCachedGatewayHostResolver(resolver GatewayHostResolver) *CachedGatewayHostResolver {
	return &CachedGatewayHostResolver{resolver: resolver, ttl: gatewayHostCacheTTL, now: time.Now}
}

func (r *CachedGatewayHostResolver) Resolve(ctx context.Context) (MaaSOrigin, error) {
	now := r.now()
	r.mu.Lock()
	if r.origin.Host != "" && now.Before(r.expiresAt) {
		origin := r.origin
		r.mu.Unlock()
		return origin, nil
	}
	if r.lastErr != nil && now.Before(r.errUntil) {
		err := r.lastErr
		r.mu.Unlock()
		return MaaSOrigin{}, err
	}
	r.mu.Unlock()

	// Serialize refreshes so an expired cache does not create a request burst.
	r.refreshMu.Lock()
	defer r.refreshMu.Unlock()

	now = r.now()
	r.mu.Lock()
	if r.origin.Host != "" && now.Before(r.expiresAt) {
		origin := r.origin
		r.mu.Unlock()
		return origin, nil
	}
	if r.lastErr != nil && now.Before(r.errUntil) {
		err := r.lastErr
		r.mu.Unlock()
		return MaaSOrigin{}, err
	}
	r.mu.Unlock()

	if r.resolver == nil {
		return MaaSOrigin{}, fmt.Errorf("%w: resolver is not configured", ErrMaaSGatewayDiscovery)
	}
	origin, err := r.resolver.Resolve(ctx)
	if err != nil {
		r.mu.Lock()
		r.lastErr = err
		r.errUntil = r.now().Add(gatewayHostFailureCacheTTL)
		r.mu.Unlock()
		return MaaSOrigin{}, err
	}

	r.mu.Lock()
	r.origin = origin
	r.expiresAt = r.now().Add(r.ttl)
	r.lastErr = nil
	r.errUntil = time.Time{}
	r.mu.Unlock()
	return origin, nil
}
