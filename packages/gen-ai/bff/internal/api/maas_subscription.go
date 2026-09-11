package api

import (
	"encoding/json"
	"errors"
	"strings"
)

const maxMaaSSubscriptionLength = 512

func validateMaaSSubscription(subscription string) error {
	if len(subscription) > maxMaaSSubscriptionLength {
		return errors.New("X-MaaS-Subscription header exceeds maximum length")
	}
	if strings.Contains(subscription, "|") {
		return errors.New("X-MaaS-Subscription header contains prohibited character")
	}
	return nil
}

// maasTokenCacheKey encodes model and subscription as distinct fields, avoiding
// collisions from values that contain a shared delimiter.
func maasTokenCacheKey(modelID, subscription string) string {
	key, _ := json.Marshal([2]string{modelID, subscription})
	return string(key)
}
