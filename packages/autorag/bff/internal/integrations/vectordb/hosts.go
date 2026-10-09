package vectordb

import (
	"context"
	"fmt"
	"net"
	"net/netip"
	"net/url"
	"strconv"
	"strings"
)

type vectorEndpoint struct {
	host      string
	port      string
	address   string
	inCluster bool
	loopback  bool
	useTLS    bool
}

// isClusterServiceHost accepts Kubernetes cluster-local DNS names. Hosts outside
// this suffix are treated as external endpoints.
func isClusterServiceHost(host string) bool {
	host = strings.TrimSuffix(strings.ToLower(host), ".")
	if !strings.HasSuffix(host, ".cluster.local") {
		return false
	}
	return host != "cluster.local"
}

func validateVectorHost(host string, allowLoopback bool) (inCluster, loopback bool, err error) {
	host = strings.TrimSuffix(strings.TrimSpace(host), ".")
	if host == "" || net.ParseIP(host) != nil {
		return false, false, fmt.Errorf("vector database host must be a DNS name, not a literal IP address")
	}
	if strings.EqualFold(host, "localhost") {
		if !allowLoopback {
			return false, false, fmt.Errorf("vector database localhost endpoints are only allowed in development mode")
		}
		return false, true, nil
	}
	inCluster = isClusterServiceHost(host)
	if strings.Contains(host, "..") {
		return false, false, fmt.Errorf("vector database host is not allowed")
	}
	return inCluster, false, nil
}

func parseMilvusEndpoint(raw string) (vectorEndpoint, error) {
	return parseMilvusEndpointWithLoopback(raw, false)
}

func parseMilvusEndpointWithLoopback(raw string, allowLoopback bool) (vectorEndpoint, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return vectorEndpoint{}, fmt.Errorf("milvus URI must use http or https with a host")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.Opaque != "" || (parsed.Path != "" && parsed.Path != "/") {
		return vectorEndpoint{}, fmt.Errorf("milvus URI contains unsupported credentials, query, fragment, or path")
	}
	host := parsed.Hostname()
	inCluster := false
	if allowLoopback && strings.EqualFold(host, "localhost") {
		port := parsed.Port()
		if parsed.Scheme != "http" || port == "" {
			return vectorEndpoint{}, fmt.Errorf("forwarded Milvus endpoint must use http")
		}
		portNumber, portErr := strconv.Atoi(port)
		if portErr != nil || portNumber < 1024 || portNumber > 65535 {
			return vectorEndpoint{}, fmt.Errorf("forwarded Milvus endpoint must use a valid ephemeral port")
		}
	} else {
		inCluster, loopback, err := validateVectorHost(host, allowLoopback)
		if err != nil {
			return vectorEndpoint{}, err
		}
		if !inCluster && !loopback && parsed.Scheme != "https" {
			return vectorEndpoint{}, fmt.Errorf("milvus external endpoints must use https")
		}
		port := parsed.Port()
		if port == "" {
			port = "19530"
		}
		if n, err := strconv.Atoi(port); err != nil || n < 1 || n > 65535 {
			return vectorEndpoint{}, fmt.Errorf("milvus URI contains an invalid port")
		}
		return vectorEndpoint{host: host, port: port, address: net.JoinHostPort(host, port), inCluster: inCluster, loopback: loopback, useTLS: parsed.Scheme == "https"}, nil
	}
	port := parsed.Port()
	if port == "" {
		port = "19530"
	}
	if n, err := strconv.Atoi(port); err != nil || n < 1 || n > 65535 {
		return vectorEndpoint{}, fmt.Errorf("milvus URI contains an invalid port")
	}
	return vectorEndpoint{host: host, port: port, address: net.JoinHostPort(host, port), inCluster: inCluster, loopback: strings.EqualFold(host, "localhost"), useTLS: parsed.Scheme == "https"}, nil
}

// ValidateMilvusEndpoint applies the normal caller-controlled endpoint policy.
func ValidateMilvusEndpoint(raw string) error {
	_, err := parseMilvusEndpoint(raw)
	return err
}

// ValidateForwardedMilvusEndpoint validates both sides of a dev port-forward.
// It returns no capability, so callers cannot mint a trusted endpoint for a
// later connection outside the forwarding-aware factory.
func ValidateForwardedMilvusEndpoint(original, forwarded string) error {
	originalEndpoint, err := parseMilvusEndpoint(original)
	if err != nil {
		return err
	}
	if !originalEndpoint.inCluster && !originalEndpoint.loopback {
		return fmt.Errorf("original Milvus endpoint is not an in-cluster service")
	}
	if _, err := parseMilvusEndpointWithLoopback(forwarded, true); err != nil {
		return err
	}
	return nil
}

func parsePgvectorEndpoint(host string, port int, sslMode string) (vectorEndpoint, error) {
	return parsePgvectorEndpointWithLoopback(host, port, sslMode, false)
}

func parsePgvectorEndpointWithLoopback(host string, port int, sslMode string, allowLoopback bool) (vectorEndpoint, error) {
	host = strings.TrimSpace(host)
	inCluster, loopback, err := validateVectorHost(host, allowLoopback)
	if err != nil {
		return vectorEndpoint{}, err
	}
	if port < 1 || port > 65535 {
		return vectorEndpoint{}, fmt.Errorf("pgvector port must be between 1 and 65535")
	}
	if !inCluster && !loopback && sslMode == "require" {
		return vectorEndpoint{}, fmt.Errorf("pgvector external endpoints must use verify-ca or verify-full")
	}
	useTLS := sslMode == "require" || sslMode == "verify-ca" || sslMode == "verify-full"
	if !inCluster && !loopback && !useTLS {
		return vectorEndpoint{}, fmt.Errorf("pgvector external endpoints must use TLS")
	}
	return vectorEndpoint{host: host, port: strconv.Itoa(port), address: net.JoinHostPort(host, strconv.Itoa(port)), inCluster: inCluster, loopback: loopback, useTLS: useTLS}, nil
}

var blockedVectorPrefixes = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("10.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"),
	netip.MustParsePrefix("127.0.0.0/8"),
	netip.MustParsePrefix("169.254.0.0/16"),
	netip.MustParsePrefix("172.16.0.0/12"),
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("192.0.2.0/24"),
	netip.MustParsePrefix("192.88.99.0/24"),
	netip.MustParsePrefix("192.168.0.0/16"),
	netip.MustParsePrefix("198.18.0.0/15"),
	netip.MustParsePrefix("198.51.100.0/24"),
	netip.MustParsePrefix("203.0.113.0/24"),
	netip.MustParsePrefix("224.0.0.0/4"),
	netip.MustParsePrefix("240.0.0.0/4"),
	netip.MustParsePrefix("::/128"),
	netip.MustParsePrefix("::1/128"),
	netip.MustParsePrefix("64:ff9b::/96"),
	netip.MustParsePrefix("64:ff9b:1::/48"),
	netip.MustParsePrefix("fc00::/7"),
	netip.MustParsePrefix("fe80::/10"),
	netip.MustParsePrefix("100::/64"),
	netip.MustParsePrefix("2001::/32"),
	netip.MustParsePrefix("2001:2::/48"),
	netip.MustParsePrefix("2001:3::/32"),
	netip.MustParsePrefix("2001:4:112::/48"),
	netip.MustParsePrefix("2001:10::/28"),
	netip.MustParsePrefix("2001:20::/28"),
	netip.MustParsePrefix("2001:db8::/32"),
	netip.MustParsePrefix("3fff::/20"),
	netip.MustParsePrefix("ff00::/8"),
}

func isBlockedVectorIP(ip net.IP) bool {
	var address netip.Addr
	if ipv4 := ip.To4(); ipv4 != nil {
		var bytes [4]byte
		copy(bytes[:], ipv4)
		address = netip.AddrFrom4(bytes)
	} else {
		var ok bool
		address, ok = netip.AddrFromSlice(ip)
		if !ok {
			return true
		}
	}
	for _, prefix := range blockedVectorPrefixes {
		if prefix.Contains(address) {
			return true
		}
	}
	return false
}

// isNAT64Address reports whether the address is in a NAT64 well-known
// translation range. A NAT64 gateway translates these addresses to IPv4
// destinations the BFF would otherwise refuse to dial, such as the cloud
// metadata endpoint, so they are rejected even for cluster-local hosts.
func isNAT64Address(ip net.IP) bool {
	if ip.To4() != nil {
		return false
	}
	address, ok := netip.AddrFromSlice(ip)
	if !ok {
		return false
	}
	for _, prefix := range []netip.Prefix{
		netip.MustParsePrefix("64:ff9b::/96"),
		netip.MustParsePrefix("64:ff9b:1::/48"),
	} {
		if prefix.Contains(address) {
			return true
		}
	}
	return false
}

// vectorSafeDialContext resolves once and dials only the validated addresses,
// preventing DNS rebinding between validation and connection establishment.
func vectorSafeDialContext(baseDialContext func(context.Context, string, string) (net.Conn, error), lookupIP func(context.Context, string) ([]net.IP, error), allowClusterService, allowLoopback bool) func(context.Context, string, string) (net.Conn, error) {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("invalid vector database address")
		}
		if ip := net.ParseIP(host); ip != nil {
			return nil, fmt.Errorf("vector database literal IP addresses are not allowed")
		}
		clusterHost := allowClusterService && isClusterServiceHost(host)
		ips, err := lookupIP(ctx, host)
		if err != nil {
			return nil, fmt.Errorf("vector database host cannot be resolved")
		}
		if len(ips) == 0 {
			return nil, fmt.Errorf("vector database host resolved to no addresses")
		}
		var lastErr error
		for _, ip := range ips {
			loopbackAllowed := allowLoopback && ip.IsLoopback()
			alwaysBlocked := ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
				ip.IsMulticast() || ip.IsUnspecified() || isNAT64Address(ip)
			if alwaysBlocked && !loopbackAllowed {
				return nil, fmt.Errorf("vector database host resolved to a blocked address")
			}
			if !clusterHost && isBlockedVectorIP(ip) && !loopbackAllowed {
				return nil, fmt.Errorf("vector database host resolved to a blocked address")
			}
			conn, dialErr := baseDialContext(ctx, network, net.JoinHostPort(ip.String(), port))
			if dialErr == nil {
				return conn, nil
			}
			lastErr = dialErr
		}
		return nil, lastErr
	}
}
