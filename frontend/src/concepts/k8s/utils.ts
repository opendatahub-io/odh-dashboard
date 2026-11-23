const K8S_LABEL_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;
const K8S_LABEL_VALUE_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?)?$/;
const K8S_DNS_SUBDOMAIN_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

export const isValidK8sLabelKeyValue = (key: string, value: string): boolean => {
  if (value.length > 63 || !K8S_LABEL_VALUE_REGEX.test(value)) {
    return false;
  }
  const parts = key.split('/');
  if (parts.length > 2) {
    return false;
  }
  if (parts.length === 2) {
    const [prefix, name] = parts;
    const isPrefixValid =
      prefix.length <= 253 &&
      K8S_DNS_SUBDOMAIN_REGEX.test(prefix) &&
      prefix.split('.').every((segment) => segment.length > 0 && segment.length <= 63);
    return isPrefixValid && name.length > 0 && name.length <= 63 && K8S_LABEL_NAME_REGEX.test(name);
  }
  const name = parts[0];
  return name.length > 0 && name.length <= 63 && K8S_LABEL_NAME_REGEX.test(name);
};
