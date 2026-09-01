const REDACTED = '***';

const AWS_ENV_ASSIGNMENT =
  /((?:--env=)?AWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN))=('[^']*'|"[^"]*"|\S+)/gi;

const FROM_LITERAL_SECRET =
  /(--from-literal=[A-Za-z0-9_]*(?:KEY|SECRET|PASSWORD|TOKEN|PASSWD)[A-Za-z0-9_]*)=('[^']*'|"[^"]*"|\S+)/gi;

const AWS_ACCESS_KEY_ID_PATTERN = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;

const CYPRESS_USER_ENV_KEYS = [
  'HTPASSWD_CLUSTER_ADMIN_USER',
  'LDAP_CLUSTER_ADMIN_USER',
  'LDAP_CONTRIBUTOR_USER',
  'LDAP_CONTRIBUTOR_GROUP',
  'TEST_USER',
] as const;

const CYPRESS_STRING_SECRET_KEYS = [
  'NGC_API_KEY',
  'GEMINI_API_KEY',
  'OGX_API_KEY',
  'OCI_SECRET_VALUE',
] as const;

const toBase64 = (value: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }
  if (typeof btoa === 'function') {
    return btoa(value);
  }
  return '';
};

const redactLiteral = (text: string, value: string | undefined): string => {
  if (!value || value.length < 4) {
    return text;
  }
  return text.split(value).join(REDACTED);
};

const collectKnownSecretValues = (): string[] => {
  const values: string[] = [];

  try {
    if (typeof Cypress === 'undefined') {
      return values;
    }

    const aws = Cypress.env('AWS_PIPELINES') as
      | { AWS_ACCESS_KEY_ID?: string; AWS_SECRET_ACCESS_KEY?: string }
      | undefined;
    if (aws?.AWS_ACCESS_KEY_ID) {
      values.push(aws.AWS_ACCESS_KEY_ID);
    }
    if (aws?.AWS_SECRET_ACCESS_KEY) {
      values.push(aws.AWS_SECRET_ACCESS_KEY);
    }

    for (const key of CYPRESS_USER_ENV_KEYS) {
      const user = Cypress.env(key) as { PASSWORD?: string } | undefined;
      if (user?.PASSWORD) {
        values.push(user.PASSWORD);
      }
    }

    for (const key of CYPRESS_STRING_SECRET_KEYS) {
      const secret = Cypress.env(key) as string | undefined;
      if (secret) {
        values.push(secret);
      }
    }
  } catch {
    // Cypress.env is unavailable outside the browser test runtime.
  }

  return values.filter((value) => value.length >= 4);
};

/**
 * Masks sensitive information in command strings and error messages.
 * This function provides consistent masking across all test logs, command outputs,
 * and error messages to prevent credential leakage in CI logs.
 *
 * @param text - The text string to mask (commands, stderr, stdout, error messages)
 * @returns The masked text string with sensitive information replaced by ***
 */
export function maskSensitiveInfo(text: string): string {
  if (!text) {
    return text;
  }

  let masked = text;

  masked = masked.replace(AWS_ACCESS_KEY_ID_PATTERN, REDACTED);
  masked = masked.replace(AWS_ENV_ASSIGNMENT, `$1=${REDACTED}`);
  masked = masked.replace(FROM_LITERAL_SECRET, `$1=${REDACTED}`);

  // Mask usernames in oc login commands
  // Pattern: -u "username" or -u 'username' or -u username
  masked = masked.replace(/-u\s+(['"]?)([^\s'"]+)\1/g, '-u $1***$1');

  // Mask passwords in oc login commands
  // Pattern: -p "password" or -p 'password' or -p password
  masked = masked.replace(/-p\s+(['"]?)([^\s'"]+)\1/g, '-p $1***$1');

  // Mask ClusterRoleBinding names containing usernames
  masked = masked.replace(/cypress-test-[a-zA-Z0-9-]+(-cluster-admin)?/g, 'cypress-test-***$1');

  // Mask usernames in oc adm policy add-role-to-user commands
  masked = masked.replace(/(add-role-to-user\s+\w+\s+)[^\s]+(\s+-n)/g, '$1***$2');

  // Mask usernames in oc get user commands
  masked = masked.replace(/(oc get user\s+)[^\s]+(\s+-o)/g, '$1***$2');

  // Mask project names containing test identifiers
  masked = masked.replace(/cypress-[a-z-]+-(?:test-)?project-\d+/g, 'cypress-test-***');

  // Mask usernames in OpenShift server error messages
  // Pattern: User "username" or User 'username'
  masked = masked.replace(/User\s+(['"])([^'"]+)\1/g, 'User $1***$1');

  for (const secret of collectKnownSecretValues()) {
    masked = redactLiteral(masked, secret);
    masked = redactLiteral(masked, toBase64(secret));
  }

  return masked;
}
