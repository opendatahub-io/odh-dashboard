package s3

import (
	"context"
	"errors"
	"net"
	"strings"
	"testing"
	"time"

	corekubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

func TestValidateKey(t *testing.T) {
	tests := []struct {
		name    string
		key     string
		wantErr bool
	}{
		{"valid simple key", "data/file.csv", false},
		{"valid nested path", "models/v2/weights.bin", false},
		{"valid with dots in name", "archive.tar.gz", false},
		{"valid single segment", "file.txt", false},
		{"empty key", "", true},
		{"null byte", "data/\x00file.csv", true},
		{"path traversal bare", "..", true},
		{"path traversal prefix", "../etc/passwd", true},
		{"path traversal middle", "data/../secret/key", true},
		{"path traversal suffix", "data/..", true},
		{"double-dot in name is ok", "..hidden", false},
		{"triple-dot segment is ok", ".../file", false},
		{"control character SOH", "data/\x01file", true},
		{"control character BEL", "data/\x07file", true},
		{"tab is allowed", "data/\tfile.csv", false},
		{"newline rejected", "data/\nfile.csv", true},
		{"carriage return rejected", "data/\rfile.csv", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateKey(tt.key)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateKey(%q) error = %v, wantErr %v", tt.key, err, tt.wantErr)
			}
			if err != nil && !errors.Is(err, ErrInvalidKey) {
				t.Errorf("validateKey(%q) error should wrap ErrInvalidKey, got %v", tt.key, err)
			}
		})
	}
}

func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		hostname string
		want     bool
	}{
		{"minio.my-ns.svc.cluster.local", true},
		{"MINIO.MY-NS.SVC.CLUSTER.LOCAL", true},
		{"minio.my-ns.svc.cluster.local.", true},
		{"ds-pipeline.odh.svc.cluster.local", true},
		{"minio.my-ns.svc", true},
		{"MINIO.MY-NS.SVC", true},
		{"minio.my-ns.svc.", true},
		{"ds-pipeline.odh.svc", true},
		{"svc.cluster.local", false},         // missing service.namespace.svc shape
		{"minio.my-ns", false},               // bare service namespace name is ambiguous
		{"minio.svc", false},                 // service without namespace
		{"a.b.c.svc", false},                 // too many parts for the short form
		{"a.b.c.d.svc.cluster.local", false}, // 7 parts
		{".ns.svc.cluster.local", false},     // empty service
		{"svc.ns.notcluster.local", false},
		{"minio.my-ns.svc.cluster.remote", false},
		{"s3.amazonaws.com", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.hostname, func(t *testing.T) {
			if got := isInternalHost(tt.hostname); got != tt.want {
				t.Errorf("isInternalHost(%q) = %v, want %v", tt.hostname, got, tt.want)
			}
		})
	}
}

func TestValidateIPAddress(t *testing.T) {
	tests := []struct {
		name    string
		ip      string
		wantErr bool
	}{
		{"private 10.x", "10.0.0.1", false},
		{"private 172.x", "172.16.0.1", false},
		{"private 192.168.x", "192.168.1.1", false},
		{"public", "8.8.8.8", false},
		{"loopback", "127.0.0.1", true},
		{"loopback other", "127.0.0.2", true},
		{"link-local", "169.254.1.1", true},
		{"reserved this-network", "0.0.0.1", true},
		{"reserved future", "240.0.0.1", true},
		{"ipv6 loopback", "::1", true},
		{"ipv6 link-local", "fe80::1", true},
		{"ipv4 multicast", "224.0.0.1", true},
		{"ipv6 multicast", "ff02::1", true},
		{"ipv6 unspecified", "::", true},
		{"Alibaba Cloud metadata", "100.100.100.200", true},
		{"AWS IMDS IPv6 endpoint", "fd00:ec2::254", true},
		{"ipv6 public", "2001:db8::1", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ip := net.ParseIP(tt.ip)
			err := validateIPAddress(ip)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateIPAddress(%s) error = %v, wantErr %v", tt.ip, err, tt.wantErr)
			}
		})
	}
}

func TestValidateResolvedIPs(t *testing.T) {
	tests := []struct {
		name           string
		ips            []net.IPAddr
		requirePrivate bool
		wantErr        bool
		wantErrContain string
	}{
		{
			name:           "private address accepted for private-only endpoint",
			ips:            []net.IPAddr{{IP: net.ParseIP("10.0.0.1")}},
			requirePrivate: true,
		},
		{
			name:           "shared address accepted for private-only endpoint",
			ips:            []net.IPAddr{{IP: net.ParseIP("100.64.0.1")}},
			requirePrivate: true,
		},
		{
			name:           "Alibaba Cloud metadata address rejected",
			ips:            []net.IPAddr{{IP: net.ParseIP("100.100.100.200")}},
			requirePrivate: false,
			wantErr:        true,
			wantErrContain: "Alibaba Cloud metadata service",
		},
		{
			name:           "AWS IMDS IPv6 endpoint rejected",
			ips:            []net.IPAddr{{IP: net.ParseIP("fd00:ec2::254")}},
			requirePrivate: false,
			wantErr:        true,
			wantErrContain: "AWS IMDS IPv6 endpoint",
		},
		{
			name:           "public address accepted for general endpoint",
			ips:            []net.IPAddr{{IP: net.ParseIP("8.8.8.8")}},
			requirePrivate: false,
		},
		{
			name:           "public address rejected for private-only endpoint",
			ips:            []net.IPAddr{{IP: net.ParseIP("8.8.8.8")}},
			requirePrivate: true,
			wantErr:        true,
		},
		{
			name: "public address after private address rejected for private-only endpoint",
			ips: []net.IPAddr{
				{IP: net.ParseIP("10.0.0.1")},
				{IP: net.ParseIP("8.8.8.8")},
			},
			requirePrivate: true,
			wantErr:        true,
		},
		{
			name: "blocked address after private address rejected for general endpoint",
			ips: []net.IPAddr{
				{IP: net.ParseIP("10.0.0.1")},
				{IP: net.ParseIP("127.0.0.1")},
			},
			requirePrivate: false,
			wantErr:        true,
		},
		{
			name:           "blocked address rejected for general endpoint",
			ips:            []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}},
			requirePrivate: false,
			wantErr:        true,
		},
		{
			name:           "empty resolution rejected",
			requirePrivate: false,
			wantErr:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateResolvedIPs("minio.ns.svc", tt.ips, tt.requirePrivate, false)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateResolvedIPs() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErrContain != "" && (err == nil || !strings.Contains(err.Error(), tt.wantErrContain)) {
				t.Errorf("validateResolvedIPs() error = %v, want substring %q", err, tt.wantErrContain)
			}
		})
	}
}

func TestValidateAndNormalizeEndpoint(t *testing.T) {
	provider := &awsClientProvider{cfg: ClientConfig{AllowUnresolvableEndpoint: true}}

	t.Run("valid https external", func(t *testing.T) {
		got, err := provider.validateAndNormalizeEndpoint("https://s3.amazonaws.com")
		if err != nil {
			t.Fatal(err)
		}
		if got != "https://s3.amazonaws.com" {
			t.Errorf("got %q", got)
		}
	})

	t.Run("http allowed for in-cluster", func(t *testing.T) {
		got, err := provider.validateAndNormalizeEndpoint("http://minio.ns.svc.cluster.local:9000")
		if err != nil {
			t.Fatal(err)
		}
		if got != "http://minio.ns.svc.cluster.local:9000" {
			t.Errorf("got %q", got)
		}
	})

	t.Run("http allowed for short in-cluster service name", func(t *testing.T) {
		got, err := provider.validateAndNormalizeEndpoint("http://minio.ns.svc:9000")
		if err != nil {
			t.Fatal(err)
		}
		if got != "http://minio.ns.svc:9000" {
			t.Errorf("got %q", got)
		}
	})

	t.Run("http rejected for external", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("http://s3.amazonaws.com")
		if err == nil {
			t.Error("expected error for external http")
		}
	})

	t.Run("http rejected for ambiguous bare service name", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("http://minio.ns:9000")
		if err == nil {
			t.Error("expected error for ambiguous bare service name")
		}
	})

	t.Run("empty endpoint", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("")
		if err == nil {
			t.Error("expected error for empty")
		}
	})

	t.Run("no hostname", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://")
		if err == nil {
			t.Error("expected error for missing hostname")
		}
	})

	t.Run("unsupported scheme", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("ftp://s3.example.com")
		if err == nil {
			t.Error("expected error for ftp scheme")
		}
	})

	t.Run("loopback IP blocked", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://127.0.0.1:9000")
		if err == nil {
			t.Error("expected error for loopback IP")
		}
	})

	t.Run("link-local IP blocked", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://169.254.1.1:9000")
		if err == nil {
			t.Error("expected error for link-local IP")
		}
	})

	t.Run("private IP allowed", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://10.0.0.1:9000")
		if err != nil {
			t.Errorf("private IP should be allowed: %v", err)
		}
	})

	t.Run("hostname endpoint accepted for dial-time validation", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://nonexistent.invalid:443")
		if err != nil {
			t.Errorf("hostname endpoints should pass URL validation (DNS checked at dial time): %v", err)
		}
	})

	t.Run("path rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com/some-path")
		if err == nil {
			t.Error("expected error for endpoint with path")
		}
	})

	t.Run("query string rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com?x=y")
		if err == nil {
			t.Error("expected error for endpoint with query string")
		}
	})

	t.Run("fragment rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com#frag")
		if err == nil {
			t.Error("expected error for endpoint with fragment")
		}
	})

	t.Run("credentials rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://user:pass@s3.example.com")
		if err == nil {
			t.Error("expected error for endpoint with credentials")
		}
	})

	t.Run("trailing slash allowed", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com/")
		if err != nil {
			t.Errorf("trailing slash should be allowed: %v", err)
		}
	})
}

func TestSSRFSafeDialContext(t *testing.T) {
	dial := ssrfSafeDialContext(&net.Dialer{Timeout: 2 * time.Second}, false, false)

	t.Run("unresolvable hostname rejected", func(t *testing.T) {
		_, err := dial(context.Background(), "tcp", "nonexistent.invalid:443")
		if err == nil {
			t.Error("expected error for unresolvable hostname")
		}
		if !strings.Contains(err.Error(), "cannot be resolved") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("unresolvable hostname allowed when configured", func(t *testing.T) {
		dialAllowUnresolved := ssrfSafeDialContext(&net.Dialer{Timeout: 2 * time.Second}, true, false)
		_, err := dialAllowUnresolved(context.Background(), "tcp", "nonexistent.invalid:443")
		// Will fail to connect, but should NOT fail on "cannot be resolved"
		if err != nil && strings.Contains(err.Error(), "cannot be resolved") {
			t.Errorf("should allow unresolved hostname: %v", err)
		}
	})

	t.Run("private-only endpoint rejects unresolvable hostname", func(t *testing.T) {
		dialPrivateOnly := ssrfSafeDialContext(&net.Dialer{Timeout: 2 * time.Second}, true, true)
		_, err := dialPrivateOnly(context.Background(), "tcp", "nonexistent.invalid:443")
		if err == nil {
			t.Error("expected error for unresolvable private-only endpoint")
		}
		if !strings.Contains(err.Error(), "cannot be resolved") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("private-only endpoint rejects public IP literal", func(t *testing.T) {
		dialPrivateOnly := ssrfSafeDialContext(&net.Dialer{Timeout: 2 * time.Second}, true, true)
		_, err := dialPrivateOnly(context.Background(), "tcp", "8.8.8.8:443")
		if err == nil {
			t.Error("expected error for public IP literal")
		}
		if !strings.Contains(err.Error(), "non-private IP") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("loopback IP rejected at dial time", func(t *testing.T) {
		_, err := dial(context.Background(), "tcp", "localhost:443")
		if err == nil {
			t.Error("expected error for localhost (resolves to loopback)")
		}
		if !strings.Contains(err.Error(), "blocked") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("IP literal passes through to base dialer", func(t *testing.T) {
		_, err := dial(context.Background(), "tcp", "192.0.2.1:443")
		if err == nil {
			t.Error("expected dial error for unreachable IP")
		}
		if strings.Contains(err.Error(), "blocked") {
			t.Errorf("permitted IP literal should reach the base dialer: %v", err)
		}
	})
}

type blockingIPResolver struct{}

func (blockingIPResolver) LookupIPAddr(ctx context.Context, _ string) ([]net.IPAddr, error) {
	<-ctx.Done()
	return nil, ctx.Err()
}

type loopbackIPResolver struct{}

func (loopbackIPResolver) LookupIPAddr(context.Context, string) ([]net.IPAddr, error) {
	return []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}}, nil
}

type staticIPResolver struct {
	ips      []net.IPAddr
	deadline *time.Time
}

func (r staticIPResolver) LookupIPAddr(ctx context.Context, _ string) ([]net.IPAddr, error) {
	if deadline, ok := ctx.Deadline(); ok && r.deadline != nil {
		*r.deadline = deadline
	}
	return r.ips, nil
}

type delayedPrivateIPResolver struct {
	delay    time.Duration
	deadline *time.Time
}

func (r delayedPrivateIPResolver) LookupIPAddr(ctx context.Context, _ string) ([]net.IPAddr, error) {
	if deadline, ok := ctx.Deadline(); ok && r.deadline != nil {
		*r.deadline = deadline
	}
	timer := time.NewTimer(r.delay)
	defer timer.Stop()
	select {
	case <-timer.C:
		return []net.IPAddr{{IP: net.ParseIP("10.0.0.1")}}, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func TestSSRFSafeDialContextBoundsDNSAndDialTime(t *testing.T) {
	dial := ssrfSafeDialContextWithResolver(
		&net.Dialer{Timeout: time.Second},
		false,
		false,
		blockingIPResolver{},
		10*time.Millisecond,
	)

	_, err := dial(context.Background(), "tcp", "service.namespace.svc:9000")
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("error = %v, want context deadline exceeded", err)
	}
}

func TestSSRFSafeDialContextPreservesRemainingBudgetAfterDNS(t *testing.T) {
	var resolverDeadline, dialDeadline time.Time
	dialStarted := false
	dial := ssrfSafeDialContextWithResolverAndDialer(
		false,
		true,
		delayedPrivateIPResolver{delay: 5 * time.Millisecond, deadline: &resolverDeadline},
		func(ctx context.Context, _, _ string) (net.Conn, error) {
			dialStarted = true
			dialDeadline, _ = ctx.Deadline()
			<-ctx.Done()
			return nil, ctx.Err()
		},
		20*time.Millisecond,
	)

	_, err := dial(context.Background(), "tcp", "service.namespace.svc:9000")
	if !dialStarted {
		t.Fatal("dialer was not reached after DNS resolution")
	}
	if resolverDeadline.IsZero() || !dialDeadline.Equal(resolverDeadline) {
		t.Fatalf("dial deadline = %v, resolver deadline = %v; timeout was reset after DNS", dialDeadline, resolverDeadline)
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("error = %v, want context deadline exceeded", err)
	}
}

func TestSSRFSafeDialContextTriesLaterAddressWithinSharedBudget(t *testing.T) {
	var attempts []string
	var deadlines []time.Time
	var overallDeadline time.Time
	dial := ssrfSafeDialContextWithResolverAndDialer(
		false,
		true,
		staticIPResolver{
			ips: []net.IPAddr{
				{IP: net.ParseIP("10.0.0.1")},
				{IP: net.ParseIP("10.0.0.2")},
			},
			deadline: &overallDeadline,
		},
		func(ctx context.Context, _, address string) (net.Conn, error) {
			attempts = append(attempts, address)
			deadline, ok := ctx.Deadline()
			if !ok {
				t.Fatal("dial attempt did not receive a deadline")
			}
			deadlines = append(deadlines, deadline)
			if len(attempts) == 1 {
				<-ctx.Done()
				return nil, ctx.Err()
			}
			return nil, nil
		},
		40*time.Millisecond,
	)

	_, err := dial(context.Background(), "tcp", "service.namespace.svc:9000")
	if err != nil {
		t.Fatalf("dial() error = %v, want later address to succeed", err)
	}
	if len(attempts) != 2 {
		t.Fatalf("dial attempts = %d, want 2", len(attempts))
	}
	if attempts[0] != "10.0.0.1:9000" || attempts[1] != "10.0.0.2:9000" {
		t.Fatalf("dial attempts = %v, want validated addresses in order", attempts)
	}
	if !deadlines[0].Before(deadlines[1]) {
		t.Fatalf("first deadline = %v, final deadline = %v; first attempt consumed the full shared budget", deadlines[0], deadlines[1])
	}
	if overallDeadline.IsZero() || !deadlines[1].Equal(overallDeadline) {
		t.Fatalf("final deadline = %v, overall deadline = %v; final attempt exceeded or reset the shared budget", deadlines[1], overallDeadline)
	}
}

func TestSSRFSafeDialContextStopsAfterCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	attempts := 0
	dial := ssrfSafeDialContextWithResolverAndDialer(
		false,
		true,
		staticIPResolver{ips: []net.IPAddr{
			{IP: net.ParseIP("10.0.0.1")},
			{IP: net.ParseIP("10.0.0.2")},
		}},
		func(context.Context, string, string) (net.Conn, error) {
			attempts++
			cancel()
			return nil, context.Canceled
		},
		40*time.Millisecond,
	)

	_, err := dial(ctx, "tcp", "service.namespace.svc:9000")
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("dial() error = %v, want context canceled", err)
	}
	if attempts != 1 {
		t.Fatalf("dial attempts = %d, want cancellation to stop fallback", attempts)
	}
}

func TestSSRFSafeDialContextAllowsTrustedPortForwardLoopback(t *testing.T) {
	dialStarted := false
	dial := ssrfSafeDialContextWithResolverAndDialer(
		false,
		true,
		loopbackIPResolver{},
		func(context.Context, string, string) (net.Conn, error) {
			dialStarted = true
			return nil, errors.New("port-forward dial attempted")
		},
		10*time.Millisecond,
	)

	ctx := corekubernetes.WithTrustedPortForwardEndpoint(context.Background(), "localhost:9000")
	_, err := dial(ctx, "tcp", "localhost:9000")
	if !dialStarted {
		t.Fatal("trusted port-forward loopback did not reach the base dialer")
	}
	if err == nil || !strings.Contains(err.Error(), "port-forward dial attempted") {
		t.Fatalf("error = %v, want the base dialer error", err)
	}
}

func TestSSRFSafeDialContextRejectsMismatchedTrustedPortForward(t *testing.T) {
	dialStarted := false
	dial := ssrfSafeDialContextWithResolverAndDialer(
		false,
		true,
		loopbackIPResolver{},
		func(context.Context, string, string) (net.Conn, error) {
			dialStarted = true
			return nil, nil
		},
		10*time.Millisecond,
	)

	ctx := corekubernetes.WithTrustedPortForwardEndpoint(context.Background(), "localhost:9001")
	_, err := dial(ctx, "tcp", "localhost:9000")
	if dialStarted {
		t.Fatal("mismatched trusted port-forward marker reached the base dialer")
	}
	if err == nil || !strings.Contains(err.Error(), "blocked") {
		t.Fatalf("error = %v, want loopback rejection", err)
	}
}

func TestValidateResolvedIPsRejectsNonLoopbackTrustedPortForwardTarget(t *testing.T) {
	err := validateResolvedIPs("localhost", []net.IPAddr{{IP: net.ParseIP("8.8.8.8")}}, false, true)
	if err == nil || !strings.Contains(err.Error(), "non-loopback") {
		t.Fatalf("error = %v, want non-loopback trusted localhost rejection", err)
	}
}
