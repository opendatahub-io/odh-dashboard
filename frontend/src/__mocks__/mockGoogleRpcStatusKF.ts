import { GoogleRpcStatusKF } from '#~/concepts/pipelines/kfTypes';

type MockGoogleRpcStatusKF = { message?: string };

export const mockSuccessGoogleRpcStatus = ({
  message = '',
}: MockGoogleRpcStatusKF): GoogleRpcStatusKF => ({
  code: 0,
  message,
  details: [],
});

export const mockCancelledGoogleRpcStatus = ({
  message = '',
}: MockGoogleRpcStatusKF): GoogleRpcStatusKF => ({
  code: 1,
  message,
  details: [],
});
