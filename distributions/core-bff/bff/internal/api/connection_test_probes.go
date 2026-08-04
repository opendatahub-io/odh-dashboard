package api

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

const (
	maxURILength            = 2048    // most URIs are <2KB; prevents oversized URL abuse
	maxDockerConfigJSONSize = 65536   // docker configs are typically <10KB; 64KB allows embedded certs
	maxFieldValueLength     = 4096    // individual credential fields rarely exceed 4KB
	maxResponseBodyBytes    = 1 << 18 // 256KB: caps response body reads to prevent OOM
	maxBearerTokenLength    = 16384   // JWTs are typically <8KB; 16KB is conservative

	ociAcceptHeader = "application/vnd.oci.image.manifest.v1+json, " +
		"application/vnd.oci.image.index.v1+json, " +
		"application/vnd.docker.distribution.manifest.v2+json, " +
		"application/vnd.docker.distribution.manifest.list.v2+json"
)

func parseCIDRs(cidrs []string) []*net.IPNet {
	nets := make([]*net.IPNet, len(cidrs))
	for i, cidr := range cidrs {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			panic(fmt.Sprintf("invalid CIDR %q: %v", cidr, err))
		}
		nets[i] = network
	}
	return nets
}

// blockedCIDRs blocks cloud metadata and link-local addresses.
// Private networks (RFC 1918, loopback) are intentionally ALLOWED because
// users legitimately connect to in-cluster services (MinIO, internal
// registries). The probe uses user-provided credentials, not the BFF's
// service account, so it doesn't escalate privileges. Users can already
// reach the same services from their own pods.
var blockedCIDRs = parseCIDRs([]string{
	"169.254.0.0/16", // cloud metadata (AWS, Azure) — exposes BFF's SA creds
	"fd00:ec2::/32",  // AWS EC2 IMDSv2 IPv6 endpoint
	"fe80::/10",      // IPv6 link-local
})

var blockedHostnames = map[string]bool{
	"metadata.google.internal": true, // GCP metadata hostname
}

func isBlockedIP(ip net.IP) bool {
	for _, n := range blockedCIDRs {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

func validateHostNotBlocked(ctx context.Context, hostname string) error {
	host := hostname
	if h, _, err := net.SplitHostPort(hostname); err == nil {
		host = h
	}

	if blockedHostnames[strings.ToLower(host)] {
		return fmt.Errorf("connections to %s are not allowed", host)
	}

	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return fmt.Errorf("connections to cloud metadata addresses are not allowed")
		}
		return nil
	}

	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return fmt.Errorf("unable to resolve host %q — check the hostname and try again", host)
	}
	for _, ip := range ips {
		if isBlockedIP(ip.IP) {
			return fmt.Errorf("host %s resolves to a blocked address", host)
		}
	}
	return nil
}

func validateHTTPScheme(parsed *url.URL, fieldName string) error {
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("%s must use http or https scheme, got %q", fieldName, parsed.Scheme)
	}
	return nil
}

func validateHostPresent(parsed *url.URL, fieldName string) error {
	if parsed.Host == "" {
		return fmt.Errorf("%s must include a valid host", fieldName)
	}
	return nil
}

func newTLSHTTPClient(rootCAs *x509.CertPool, insecureSkipVerify bool) *http.Client {
	transport := &http.Transport{
		DialContext: safeDialContext(),
		TLSClientConfig: &tls.Config{
			RootCAs:            rootCAs,
			MinVersion:         tls.VersionTLS12,
			InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // G402: user-controlled dev flag
		},
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 2,
		MaxConnsPerHost:     2,
	}
	return &http.Client{
		Transport: transport,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

// safeDialContext resolves DNS, validates all resolved IPs against the
// blocklist, then dials directly by IP. This eliminates the TOCTOU gap
// between preflight DNS validation and the actual connection.
func safeDialContext() func(ctx context.Context, network, addr string) (net.Conn, error) {
	dialer := &net.Dialer{}
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, err
		}

		ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
		if err != nil {
			return nil, err
		}
		if len(ips) == 0 {
			return nil, fmt.Errorf("no addresses found for %s", host)
		}

		for _, ip := range ips {
			if isBlockedIP(ip.IP) {
				return nil, fmt.Errorf("connections to cloud metadata addresses are not allowed")
			}
		}

		var lastErr error
		for _, ip := range ips {
			conn, dialErr := dialer.DialContext(ctx, network, net.JoinHostPort(ip.IP.String(), port))
			if dialErr == nil {
				return conn, nil
			}
			lastErr = dialErr
		}
		return nil, lastErr
	}
}

func drainAndClose(body io.ReadCloser) {
	_, _ = io.Copy(io.Discard, io.LimitReader(body, maxResponseBodyBytes))
	body.Close()
}

func timeoutResult() models.ConnectionTestResult {
	return models.ConnectionTestResult{
		Success: false,
		Error:   "CONNECTION_TIMEOUT",
		Message: "Connection timed out after 10 seconds",
	}
}

func failedResult(msg string) models.ConnectionTestResult {
	return models.ConnectionTestResult{
		Success: false,
		Error:   "CONNECTION_FAILED",
		Message: msg,
	}
}

func successResult(msg string) models.ConnectionTestResult {
	return models.ConnectionTestResult{
		Success: true,
		Message: msg,
	}
}

func classifyNetError(err error) string {
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return "DNS resolution failed: host not found"
	}
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		if opErr.Op == "dial" {
			return "Connection refused"
		}
	}
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		return classifyNetError(urlErr.Err)
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "Connection timed out"
	}
	return "Connection failed"
}

func validateFieldLength(name, value string, maxLen int) error {
	if len(value) > maxLen {
		return fmt.Errorf("field %s exceeds maximum length of %d", name, maxLen)
	}
	return nil
}

// --- S3 Probe ---

func probeS3(pc ProbeContext) models.ConnectionTestResult {
	endpoint := pc.FieldValues["AWS_S3_ENDPOINT"]
	bucket := pc.FieldValues["AWS_S3_BUCKET"]
	accessKey := pc.FieldValues["AWS_ACCESS_KEY_ID"]
	secretKey := pc.FieldValues["AWS_SECRET_ACCESS_KEY"]
	region := pc.FieldValues["AWS_DEFAULT_REGION"]

	if endpoint == "" {
		return failedResult("Missing required field: AWS_S3_ENDPOINT")
	}
	if accessKey == "" {
		return failedResult("Missing required field: AWS_ACCESS_KEY_ID")
	}
	if secretKey == "" {
		return failedResult("Missing required field: AWS_SECRET_ACCESS_KEY")
	}
	for _, f := range []struct{ name, value string }{
		{"AWS_S3_ENDPOINT", endpoint},
		{"AWS_S3_BUCKET", bucket},
		{"AWS_ACCESS_KEY_ID", accessKey},
		{"AWS_SECRET_ACCESS_KEY", secretKey},
		{"AWS_DEFAULT_REGION", region},
	} {
		if err := validateFieldLength(f.name, f.value, maxFieldValueLength); err != nil {
			return failedResult(err.Error())
		}
	}

	parsed, err := url.Parse(endpoint)
	if err != nil {
		return failedResult("Invalid S3 endpoint URL")
	}
	if err := validateHTTPScheme(parsed, "S3 endpoint"); err != nil {
		return failedResult(err.Error())
	}
	if err := validateHostPresent(parsed, "S3 endpoint"); err != nil {
		return failedResult(err.Error())
	}
	if parsed.Path != "" && parsed.Path != "/" {
		return failedResult("S3 endpoint must not include a path component")
	}
	if err := validateHostNotBlocked(pc.Ctx, parsed.Host); err != nil {
		return failedResult(err.Error())
	}

	if region == "" {
		region = "us-east-1"
	}

	httpClient := newTLSHTTPClient(pc.RootCAs, pc.InsecureSkipVerify)

	cfg, err := awsconfig.LoadDefaultConfig(pc.Ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		awsconfig.WithHTTPClient(httpClient),
		awsconfig.WithRetryMaxAttempts(1),
	)
	if err != nil {
		return failedResult("Failed to configure S3 client")
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = &endpoint
		o.UsePathStyle = true
	})

	if bucket != "" {
		_, err = client.HeadBucket(pc.Ctx, &s3.HeadBucketInput{Bucket: &bucket})
		if err != nil {
			if pc.Ctx.Err() != nil {
				return timeoutResult()
			}
			return classifyS3Error(err, bucket)
		}
		return successResult(fmt.Sprintf("Connection to bucket %q successful", bucket))
	}

	maxBuckets := int32(1)
	_, err = client.ListBuckets(pc.Ctx, &s3.ListBucketsInput{MaxBuckets: &maxBuckets})
	if err != nil {
		if pc.Ctx.Err() != nil {
			return timeoutResult()
		}
		return classifyS3Error(err, "")
	}
	return successResult("S3 endpoint is reachable and credentials are valid")
}

func classifyS3Error(err error, bucket string) models.ConnectionTestResult {
	var apiErr smithy.APIError
	if errors.As(err, &apiErr) {
		switch apiErr.ErrorCode() {
		case "NotFound", "NoSuchBucket":
			return failedResult(fmt.Sprintf("Bucket not found: %s", bucket))
		case "Forbidden", "AccessDenied":
			if bucket == "" {
				return failedResult("Access denied: credentials are valid but lack permission to list buckets; provide AWS_S3_BUCKET to test bucket access directly")
			}
			return failedResult(fmt.Sprintf("Access denied for bucket %q: check credentials and bucket permissions", bucket))
		case "InvalidAccessKeyId", "SignatureDoesNotMatch":
			return failedResult("Authentication failed: invalid access key or secret")
		default:
			return failedResult(fmt.Sprintf("S3 error: %s", apiErr.ErrorCode()))
		}
	}
	return failedResult(classifyNetError(err))
}

// --- URI Probe ---

func probeURI(pc ProbeContext) models.ConnectionTestResult {
	uri := pc.FieldValues["URI"]
	if uri == "" {
		return failedResult("Missing required field: URI")
	}
	if err := validateFieldLength("URI", uri, maxURILength); err != nil {
		return failedResult(err.Error())
	}

	parsed, err := url.Parse(uri)
	if err != nil {
		return failedResult("Invalid URI")
	}
	if err := validateHTTPScheme(parsed, "URI"); err != nil {
		return failedResult(err.Error())
	}
	if err := validateHostPresent(parsed, "URI"); err != nil {
		return failedResult(err.Error())
	}
	if err := validateHostNotBlocked(pc.Ctx, parsed.Host); err != nil {
		return failedResult(err.Error())
	}

	httpClient := newTLSHTTPClient(pc.RootCAs, pc.InsecureSkipVerify)

	req, err := http.NewRequestWithContext(pc.Ctx, http.MethodHead, uri, nil)
	if err != nil {
		return failedResult("Failed to create probe request")
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		if pc.Ctx.Err() != nil {
			return timeoutResult()
		}
		return failedResult(classifyNetError(err))
	}
	defer drainAndClose(resp.Body)

	displayURI := fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)

	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		return successResult(fmt.Sprintf("URI %s is reachable (HTTP %d)", displayURI, resp.StatusCode))
	}

	return failedResult(fmt.Sprintf("URI %s returned HTTP %d", displayURI, resp.StatusCode))
}

// --- OCI Probe ---

type dockerConfig struct {
	Auths map[string]dockerAuth `json:"auths"`
}

type dockerAuth struct {
	Auth string `json:"auth"`
}

type ociRef struct {
	host string
	repo string
	tag  string
}

func parseOCIRef(raw string) ociRef {
	raw = strings.TrimPrefix(raw, "oci://")
	raw = strings.TrimRight(raw, "/")
	parts := strings.SplitN(raw, "/", 2)
	if len(parts) == 1 {
		return ociRef{host: parts[0]}
	}
	host := parts[0]
	repoTag := parts[1]

	repo := repoTag
	tag := ""
	if idx := strings.LastIndex(repoTag, ":"); idx != -1 {
		repo = repoTag[:idx]
		tag = repoTag[idx+1:]
	}
	return ociRef{host: host, repo: repo, tag: tag}
}

func probeOCI(pc ProbeContext) models.ConnectionTestResult {
	raw := pc.FieldValues["OCI_HOST"]
	authJSON := pc.FieldValues[".dockerconfigjson"]

	if raw == "" && authJSON == "" {
		return failedResult("Provide a registry host, a pull secret, or both to test the connection")
	}

	if authJSON != "" {
		if err := validateFieldLength(".dockerconfigjson", authJSON, maxDockerConfigJSONSize); err != nil {
			return failedResult(err.Error())
		}
	}

	// If no host provided, extract the host from the dockerconfigjson.
	// Requires exactly one registry — ambiguous if multiple.
	if raw == "" && authJSON != "" {
		if host, ok := singleDockerConfigHost(authJSON); ok {
			raw = host
		} else {
			return failedResult("Provide a registry host — the pull secret contains zero or multiple registries")
		}
	}

	if err := validateFieldLength("OCI_HOST", raw, maxFieldValueLength); err != nil {
		return failedResult(err.Error())
	}
	if strings.ContainsAny(raw, "@#?") {
		return failedResult("Invalid OCI host: must not contain @, #, or ? characters")
	}

	ref := parseOCIRef(raw)

	if ref.host == "" {
		return failedResult("OCI_HOST must include a valid registry hostname")
	}
	if _, port, err := net.SplitHostPort(ref.host); err == nil {
		if _, portErr := strconv.Atoi(port); portErr != nil {
			return failedResult(fmt.Sprintf("Invalid OCI host %q: port must be numeric — use host:port/repo:tag format", ref.host))
		}
	} else if strings.Contains(ref.host, ":") && !strings.Contains(ref.host, "[") {
		return failedResult(fmt.Sprintf("Invalid OCI host %q: port must be numeric — use host:port/repo:tag format", ref.host))
	}
	if err := validateHostNotBlocked(pc.Ctx, ref.host); err != nil {
		return failedResult(err.Error())
	}

	displayTag := ref.tag
	var probeURL string
	if ref.repo != "" {
		if displayTag == "" {
			displayTag = "latest"
		}
		probeURL = fmt.Sprintf("https://%s/v2/%s/manifests/%s", ref.host, ref.repo, displayTag)
	} else {
		probeURL = fmt.Sprintf("https://%s/v2/", ref.host)
	}

	httpClient := newTLSHTTPClient(pc.RootCAs, pc.InsecureSkipVerify)

	var basicAuth string
	if authJSON != "" {
		if header, ok := extractOCIAuth(authJSON, ref.host, ref.repo); ok {
			basicAuth = header
		}
	}

	req, err := http.NewRequestWithContext(pc.Ctx, http.MethodHead, probeURL, nil)
	if err != nil {
		return failedResult("Failed to create probe request")
	}
	req.Header.Set("Accept", ociAcceptHeader)
	if basicAuth != "" {
		req.Header.Set("Authorization", basicAuth)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		if pc.Ctx.Err() != nil {
			return timeoutResult()
		}
		return failedResult(fmt.Sprintf("Registry unreachable at %s: %s", ref.host, classifyNetError(err)))
	}
	statusCode := resp.StatusCode
	challenge := resp.Header.Get("Www-Authenticate")
	drainAndClose(resp.Body)

	// If registry returns 401 with a Www-Authenticate Bearer challenge and we have
	// credentials, perform the Docker registry token exchange flow. This matches
	// what kubelet/CRI-O do when pulling images with imagePullSecrets.
	if statusCode == http.StatusUnauthorized && basicAuth != "" && strings.HasPrefix(challenge, "Bearer ") {
		if token, ok := fetchBearerToken(pc.Ctx, httpClient, challenge, basicAuth); ok {
			retryReq, retryErr := http.NewRequestWithContext(pc.Ctx, http.MethodHead, probeURL, nil)
			if retryErr == nil {
				retryReq.Header.Set("Accept", ociAcceptHeader)
				retryReq.Header.Set("Authorization", "Bearer "+token)
				retryResp, retryDoErr := httpClient.Do(retryReq)
				if retryDoErr != nil {
					if pc.Ctx.Err() != nil {
						return timeoutResult()
					}
					return failedResult(fmt.Sprintf("Registry unreachable at %s after token exchange: %s", ref.host, classifyNetError(retryDoErr)))
				}
				statusCode = retryResp.StatusCode
				drainAndClose(retryResp.Body)
			}
		}
	}

	return classifyOCIResponse(statusCode, ref, displayTag)
}

func classifyOCIResponse(statusCode int, ref ociRef, displayTag string) models.ConnectionTestResult {
	switch statusCode {
	case http.StatusOK:
		if ref.repo != "" {
			return successResult(fmt.Sprintf("OCI image %s:%s is accessible at %s", ref.repo, displayTag, ref.host))
		}
		return successResult(fmt.Sprintf("OCI registry at %s is reachable and authenticated", ref.host))
	case http.StatusUnauthorized, http.StatusForbidden:
		if ref.repo != "" {
			return failedResult(fmt.Sprintf("Access denied for %s:%s at %s (HTTP %d)", ref.repo, displayTag, ref.host, statusCode))
		}
		return failedResult(fmt.Sprintf("Authentication failed for registry %s (HTTP %d)", ref.host, statusCode))
	case http.StatusNotFound:
		if ref.repo != "" {
			return failedResult(fmt.Sprintf("Image not found: %s/%s:%s", ref.host, ref.repo, displayTag))
		}
		return failedResult(fmt.Sprintf("Registry %s returned HTTP %d", ref.host, statusCode))
	default:
		return failedResult(fmt.Sprintf("Registry %s returned HTTP %d", ref.host, statusCode))
	}
}

// fetchBearerToken implements the Docker registry v2 token exchange.
// It parses a Www-Authenticate: Bearer challenge, requests a token from the
// auth service using Basic credentials, and returns the access token.
// The realm URL is validated against SSRF rules since it comes from the
// registry response (attacker-controlled).
func fetchBearerToken(ctx context.Context, client *http.Client, challenge, basicAuth string) (string, bool) {
	if !strings.HasPrefix(challenge, "Bearer ") {
		return "", false
	}

	params := parseBearerChallenge(challenge[len("Bearer "):])
	realm := params["realm"]
	if realm == "" {
		return "", false
	}

	parsed, err := url.Parse(realm)
	if err != nil {
		return "", false
	}
	if parsed.Scheme != "https" {
		return "", false
	}
	if err := validateHostNotBlocked(ctx, parsed.Host); err != nil {
		return "", false
	}

	tokenURL := realm
	sep := "?"
	if strings.Contains(realm, "?") {
		sep = "&"
	}
	if svc := params["service"]; svc != "" {
		tokenURL += sep + "service=" + url.QueryEscape(svc)
		sep = "&"
	}
	if scope := params["scope"]; scope != "" {
		tokenURL += sep + "scope=" + url.QueryEscape(scope)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tokenURL, nil)
	if err != nil {
		return "", false
	}
	req.Header.Set("Authorization", basicAuth)

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			drainAndClose(resp.Body)
		}
		return "", false
	}

	var tokenResp struct {
		Token       string `json:"token"`
		AccessToken string `json:"access_token"`
	}
	decodeErr := json.NewDecoder(io.LimitReader(resp.Body, maxResponseBodyBytes)).Decode(&tokenResp)
	drainAndClose(resp.Body)
	if decodeErr != nil {
		return "", false
	}

	token := tokenResp.Token
	if token == "" {
		token = tokenResp.AccessToken
	}
	if token == "" || len(token) > maxBearerTokenLength {
		return "", false
	}
	return token, true
}

func parseBearerChallenge(challenge string) map[string]string {
	params := make(map[string]string)
	for _, part := range strings.Split(challenge, ",") {
		part = strings.TrimSpace(part)
		eq := strings.IndexByte(part, '=')
		if eq < 0 {
			continue
		}
		key := strings.TrimSpace(part[:eq])
		val := strings.TrimSpace(part[eq+1:])
		val = strings.Trim(val, "\"")
		params[key] = val
	}
	return params
}

// extractOCIAuth looks up credentials for a registry host in a dockerconfigjson.
// Lookup order (most specific → least specific):
//  1. host/full/repo/path (path-based match, e.g. "quay.io/org/repo")
//  2. host/partial/path   (path prefix walk, e.g. "quay.io/org")
//  3. host                (bare hostname, e.g. "quay.io")
//
// For each candidate, also tries https:// and https://host/v1/ URL-form variants
// since docker login generates URL-form keys.
func extractOCIAuth(dockerconfigjson, host, repo string) (string, bool) {
	var cfg dockerConfig
	if err := json.Unmarshal([]byte(dockerconfigjson), &cfg); err != nil {
		return "", false
	}

	var candidates []string

	if repo != "" {
		parts := strings.Split(repo, "/")
		for i := len(parts); i > 0; i-- {
			prefix := host + "/" + strings.Join(parts[:i], "/")
			candidates = append(candidates, prefix, "https://"+prefix)
		}
	}

	candidates = append(candidates,
		host,
		"https://"+host,
		"https://"+host+"/v1/",
		"https://"+host+"/v2/",
	)

	for _, candidate := range candidates {
		auth, ok := cfg.Auths[candidate]
		if ok && auth.Auth != "" {
			return decodeDockerAuth(auth.Auth)
		}
	}
	return "", false
}

func singleDockerConfigHost(dockerconfigjson string) (string, bool) {
	var cfg dockerConfig
	if err := json.Unmarshal([]byte(dockerconfigjson), &cfg); err != nil {
		return "", false
	}
	hosts := make(map[string]bool)
	for key := range cfg.Auths {
		host := key
		host = strings.TrimPrefix(host, "https://")
		host = strings.TrimPrefix(host, "http://")
		host = strings.TrimRight(host, "/")
		if idx := strings.Index(host, "/"); idx != -1 {
			host = host[:idx]
		}
		if host != "" {
			hosts[host] = true
		}
	}
	if len(hosts) != 1 {
		return "", false
	}
	for host := range hosts {
		return host, true
	}
	return "", false
}

func decodeDockerAuth(authB64 string) (string, bool) {
	decoded, err := base64.StdEncoding.DecodeString(authB64)
	if err != nil {
		decoded, err = base64.RawStdEncoding.DecodeString(authB64)
		if err != nil {
			return "", false
		}
	}
	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 || parts[0] == "" {
		return "", false
	}
	return "Basic " + authB64, true
}

// --- Mock Probes ---

func mockProbeS3(pc ProbeContext) models.ConnectionTestResult {
	bucket := pc.FieldValues["AWS_S3_BUCKET"]
	if bucket == "" {
		bucket = "mock-bucket"
	}
	return successResult(fmt.Sprintf("Mock: S3 connection to bucket %q successful", bucket))
}

func mockProbeURI(pc ProbeContext) models.ConnectionTestResult {
	uri := pc.FieldValues["URI"]
	if uri == "" {
		uri = "http://mock-uri"
	}
	return successResult(fmt.Sprintf("Mock: URI %s is reachable", uri))
}

func mockProbeOCI(pc ProbeContext) models.ConnectionTestResult {
	host := pc.FieldValues["OCI_HOST"]
	if host == "" {
		host = "mock-registry"
	}
	return successResult(fmt.Sprintf("Mock: OCI registry at %s is reachable", host))
}
