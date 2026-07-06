export type APIState<T> = {
  /** If API will successfully call */
  apiAvailable: boolean;
  /** The available API functions */
  api: T;
};
