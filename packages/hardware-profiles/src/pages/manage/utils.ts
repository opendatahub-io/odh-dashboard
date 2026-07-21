const K8S_RESOURCE_PATTERN = /hardwareprofiles\.\S+/gi;

export const humanizeHardwareProfileError = (message: string): string => {
  if (/already exists/i.test(message)) {
    const nameMatch = message.match(/"([^"]+)"/);
    const name = nameMatch?.[1];
    return name
      ? `A hardware profile with the name "${name}" already exists. Please use a different name.`
      : 'A hardware profile with this name already exists. Please use a different name.';
  }

  return message.replace(K8S_RESOURCE_PATTERN, 'hardware profile');
};
