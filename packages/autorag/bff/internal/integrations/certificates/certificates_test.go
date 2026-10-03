package certificates

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSystemCertPoolWithPEMRejectsMalformedPEM(t *testing.T) {
	pool, err := SystemCertPoolWithPEM([]byte("not a certificate"), "TEST_SERVER_CERT")

	assert.Nil(t, pool)
	assert.EqualError(t, err, "failed to parse TEST_SERVER_CERT")
}
