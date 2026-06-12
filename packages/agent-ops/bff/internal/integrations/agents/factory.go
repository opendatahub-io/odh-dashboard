package agents

import "context"

// unavailableFactory is used until the Kubernetes-backed agent client is implemented.
type unavailableFactory struct{}

// NewUnavailableFactory returns a ClientFactory that reports agent data as unavailable.
func NewUnavailableFactory() ClientFactory {
	return &unavailableFactory{}
}

func (f *unavailableFactory) GetClient(ctx context.Context) (Client, error) {
	_ = ctx
	return nil, &UnavailableError{Message: "kubernetes agent client is not implemented"}
}
