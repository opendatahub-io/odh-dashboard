/** Matches BFF deploy_validation.go C_IDENTIFIER env var names. */
export const ENV_VAR_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const SERVICE_PORT_PROTOCOLS = ['TCP', 'UDP', 'SCTP'] as const;

export const MIN_SERVICE_PORT = 1;
export const MAX_SERVICE_PORT = 65535;
/** Kubernetes service port names must be valid IANA_SVC_NAME values (max 15 chars). */
export const MAX_IANA_SVC_NAME_LENGTH = 15;
