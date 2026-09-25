type APIResponse<T> = {
  data: T;
};

const isAPIResponse = <T>(value: unknown): value is APIResponse<T> =>
  typeof value === 'object' && value !== null && 'data' in value;

/** Fetches a same-origin API resource that uses the common `{ data }` response envelope. */
export const getAPIResource = async <T>(
  hostPath: string,
  path: string,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${hostPath}${path}`, options);
  if (!response.ok) {
    throw Object.assign(new Error(`Unable to load resource (${response.status})`), {
      status: response.status,
    });
  }

  const body: unknown = await response.json();
  if (!isAPIResponse<T>(body)) {
    throw new Error('Invalid response format');
  }
  return body.data;
};
