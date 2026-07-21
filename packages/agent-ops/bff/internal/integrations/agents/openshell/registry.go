package openshell

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"

	v1 "github.com/rhuss/openshell-sdk-go/openshell/v1"
)

type GatewayEntry struct {
	Name      string
	Namespace string
	Endpoint  string
	IsGlobal  bool
	client    v1.ClientInterface
}

type GatewayRegistry struct {
	mu       sync.RWMutex
	gateways map[string]*GatewayEntry
	logger   *slog.Logger
}

func NewGatewayRegistry(logger *slog.Logger) *GatewayRegistry {
	return &GatewayRegistry{
		gateways: make(map[string]*GatewayEntry),
		logger:   logger,
	}
}

func (r *GatewayRegistry) Register(name, namespace, endpoint string, isGlobal bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if existing, ok := r.gateways[name]; ok {
		if existing.Endpoint == endpoint {
			return
		}
		r.logger.Info("Re-registering gateway with new endpoint",
			slog.String("name", name),
			slog.String("old", existing.Endpoint),
			slog.String("new", endpoint))
	}

	r.gateways[name] = &GatewayEntry{
		Name:      name,
		Namespace: namespace,
		Endpoint:  endpoint,
		IsGlobal:  isGlobal,
	}
	r.logger.Info("Registered gateway", slog.String("name", name), slog.String("endpoint", endpoint))
}

func (r *GatewayRegistry) Unregister(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.gateways, name)
	r.logger.Info("Unregistered gateway", slog.String("name", name))
}

func (r *GatewayRegistry) GetClient(_ context.Context, name string) (v1.ClientInterface, error) {
	r.mu.RLock()
	entry, ok := r.gateways[name]
	if !ok {
		r.mu.RUnlock()
		return nil, fmt.Errorf("gateway %q not registered", name)
	}
	if entry.client != nil {
		r.mu.RUnlock()
		return entry.client, nil
	}
	r.mu.RUnlock()

	r.mu.Lock()
	defer r.mu.Unlock()

	if entry.client != nil {
		return entry.client, nil
	}

	client, err := createSDKClient(entry.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to create SDK client for gateway %q: %w", name, err)
	}
	entry.client = client
	r.logger.Info("Created SDK client for gateway", slog.String("name", name), slog.String("endpoint", entry.Endpoint))
	return client, nil
}

func (r *GatewayRegistry) List() []*GatewayEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()

	entries := make([]*GatewayEntry, 0, len(r.gateways))
	for _, e := range r.gateways {
		entries = append(entries, e)
	}
	return entries
}

func (r *GatewayRegistry) Get(name string) (*GatewayEntry, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	e, ok := r.gateways[name]
	return e, ok
}

func createSDKClient(endpoint string) (v1.ClientInterface, error) {
	addr := endpoint
	var tlsCfg *v1.TLSConfig
	if strings.HasPrefix(addr, "http://") {
		addr = strings.TrimPrefix(addr, "http://")
		tlsCfg = &v1.TLSConfig{Insecure: true}
	} else if strings.HasPrefix(addr, "https://") {
		addr = strings.TrimPrefix(addr, "https://")
	}

	insecure := tlsCfg != nil && tlsCfg.Insecure
	return v1.NewClient(v1.Config{
		Address: addr,
		Auth:    NewContextAuthProvider(insecure),
		TLS:     tlsCfg,
	})
}
