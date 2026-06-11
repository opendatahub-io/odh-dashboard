export const isNotFoundError = (error: Error | undefined): boolean => {
  if (!error) {
    return false;
  }

  const statusCode =
    'status_code' in error
      ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (error['status_code' as keyof Error] as unknown as number)
      : null;

  if (statusCode === 404) {
    return true;
  }

  const message = error.message.toLowerCase();
  return message.includes('not found') || message.includes('could not be found');
};
