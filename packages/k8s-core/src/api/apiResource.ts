type APIResponse<T> = {
  data: T;
};

type DataValidator<T> = (value: unknown) => value is T;

const hasData = (value: object): value is { data: unknown } => Object.hasOwn(value, 'data');

const isAPIResponse = <T>(value: unknown, isData: DataValidator<T>): value is APIResponse<T> =>
  typeof value === 'object' && value !== null && hasData(value) && isData(value.data);

/** Fetches a same-origin API resource that uses the common `{ data }` response envelope. */
export const getAPIResource = async <T>(
  hostPath: string,
  path: string,
  isData: DataValidator<T>,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${hostPath}${path}`, options);
  if (!response.ok) {
    throw Object.assign(new Error(`Unable to load resource (${response.status})`), {
      status: response.status,
    });
  }

  const body: unknown = await response.json();
  if (!isAPIResponse(body, isData)) {
    throw new Error('Invalid response format');
  }
  return body.data;
};
