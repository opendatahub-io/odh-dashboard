package constants

// Label applied to Secrets created or managed through the MaaS BFF for external providers.
const IPPManagedSecretLabelKey = "inference.llm-d.ai/ipp-managed"

// IPPManagedSecretLabelValue is the expected value for IPPManagedSecretLabelKey.
const IPPManagedSecretLabelValue = "true"

// SecretAPIKeyDataKey is the data key used in provider credential Secrets.
const SecretAPIKeyDataKey = "api-key"
