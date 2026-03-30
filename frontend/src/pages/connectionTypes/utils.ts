export const translateConnectionTypeError = (message: string): string => {
  if (message.includes('already exists') && message.includes('configmaps')) {
    return 'A connection type with this name already exists. Please choose a different name.';
  }
  if (message.includes('configmaps')) {
    return message.replace(/configmaps/gi, 'connection type');
  }
  return message;
};
