package maas

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMaaSOriginFromURL(t *testing.T) {
	tests := []struct {
		name    string
		rawURL  string
		want    MaaSOrigin
		wantErr string
	}{
		{name: "default HTTPS port", rawURL: "https://MaaS.APPS.Example.com/maas-api", want: MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}},
		{name: "explicit port", rawURL: "https://maas.apps.example.com:8443/maas-api", want: MaaSOrigin{Host: "maas.apps.example.com", Port: "8443"}},
		{name: "HTTP rejected", rawURL: "http://maas.apps.example.com/maas-api", wantErr: "HTTPS"},
		{name: "IP literal rejected", rawURL: "https://10.0.0.1/maas-api", wantErr: "hostname"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parsed, err := url.Parse(tt.rawURL)
			require.NoError(t, err)
			got, originErr := MaaSOriginFromURL(parsed)
			if tt.wantErr != "" {
				require.Error(t, originErr)
				assert.Contains(t, originErr.Error(), tt.wantErr)
				return
			}
			require.NoError(t, originErr)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMaaSOriginEqual(t *testing.T) {
	assert.True(t, (MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}).Equal(MaaSOrigin{Host: "MAAS.APPS.EXAMPLE.COM", Port: "443"}))
	assert.False(t, (MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}).Equal(MaaSOrigin{Host: "maas.apps.example.com", Port: "8443"}))
}
