/**
 * Mock empty responses for various API endpoints
 */

export type EmptyListResponse = {
  data: unknown[];
};

export const mockEmptyList = (): EmptyListResponse => ({
  data: [],
});

export type StatusResponse = {
  data: {
    phase: string;
  };
};

export const mockStatus = (phase = 'NotReady'): StatusResponse => ({
  data: {
    phase,
  },
});
