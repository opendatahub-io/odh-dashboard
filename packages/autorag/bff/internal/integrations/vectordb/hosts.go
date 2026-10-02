package vectordb

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
)

type vectorEndpoint struct {
	host      string
	port      string
	address   string
	inCluster bool
	useTLS    bool
}

// isClusterServiceHost deliberately accepts only the fully-qualified Service
// form. Broad cluster.local suffix checks can be bypassed with arbitrary hosts.
func isClusterServiceHost(host string) bool {
	labels := strings.Split(strings.ToLower(host), ".")
	if len(labels) != 5 || labels[2] != "svc" || labels[3] != "cluster" || labels[4] != "local" {
		return false
	}
	for _, label := range []string{labels[0], labels[1]} {
		if label == "" || len(label) > 63 {
			return false
		}
		for i, r := range label {
			if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '-' {
				return false
			}
			if (i == 0 || i == len(label)-1) && r == '-' {
				return false
			}
		}
	}
	return true
}

func validateVectorHost(host string) (bool, error) {
	if host == "" || net.ParseIP(host) != nil {
		return false, fmt.Errorf("vector database host must be a DNS name, not a literal IP address")
	}
	inCluster := isClusterServiceHost(host)
	if strings.EqualFold(host, "localhost") || strings.Contains(host, "..") {
		return false, fmt.Errorf("vector database host is not allowed")
	}
	return inCluster, nil
}

func parseMilvusEndpoint(raw string) (vectorEndpoint, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return vectorEndpoint{}, fmt.Errorf("milvus URI must use http or https with a host")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.Opaque != "" || (parsed.Path != "" && parsed.Path != "/") {
		return vectorEndpoint{}, fmt.Errorf("milvus URI contains unsupported credentials, query, fragment, or path")
	}
	host := parsed.Hostname()
	inCluster, err := validateVectorHost(host)
	if err != nil {
		return vectorEndpoint{}, err
	}
	if !inCluster && parsed.Scheme != "https" {
		return vectorEndpoint{}, fmt.Errorf("milvus external endpoints must use https")
	}
	port := parsed.Port()
	if port == "" {
		port = "19530"
	}
	if n, err := strconv.Atoi(port); err != nil || n < 1 || n > 65535 {
		return vectorEndpoint{}, fmt.Errorf("milvus URI contains an invalid port")
	}
	return vectorEndpoint{host: host, port: port, address: net.JoinHostPort(host, port), inCluster: inCluster, useTLS: parsed.Scheme == "https"}, nil
}

func parsePgvectorEndpoint(host string, port int, sslMode string) (vectorEndpoint, error) {
	host = strings.TrimSpace(host)
	inCluster, err := validateVectorHost(host)
	if err != nil {
		return vectorEndpoint{}, err
	}
	if port < 1 || port > 65535 {
		return vectorEndpoint{}, fmt.Errorf("pgvector port must be between 1 and 65535")
	}
	useTLS := sslMode == "require" || sslMode == "verify-ca" || sslMode == "verify-full"
	if !inCluster && !useTLS {
		return vectorEndpoint{}, fmt.Errorf("pgvector external endpoints must use TLS")
	}
	return vectorEndpoint{host: host, port: strconv.Itoa(port), address: net.JoinHostPort(host, strconv.Itoa(port)), inCluster: inCluster, useTLS: useTLS}, nil
}

func isBlockedVectorIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() || ip.IsMulticast()
}

// vectorSafeDialContext resolves once and dials only the validated addresses,
// preventing DNS rebinding between validation and connection establishment.
func vectorSafeDialContext(baseDialContext func(context.Context, string, string) (net.Conn, error), lookupIP func(context.Context, string) ([]net.IP, error), allowClusterService bool) func(context.Context, string, string) (net.Conn, error) {
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
			if !clusterHost && isBlockedVectorIP(ip) {
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
