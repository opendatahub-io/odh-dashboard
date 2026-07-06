/**
 * Masks sensitive information in command strings and error messages.
 * This function provides consistent masking across all test logs, command outputs,
 * and error messages to prevent credential leakage in CI logs.
 *
 * @param text - The text string to mask (commands, stderr, stdout, error messages)
 * @returns The masked text string with sensitive information replaced by ***
 */
export function maskSensitiveInfo(text: string): string {
  let masked = text;

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

  return masked;
}
