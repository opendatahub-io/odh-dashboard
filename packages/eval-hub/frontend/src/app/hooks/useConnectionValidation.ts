import * as React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { verifyConnection } from '~/app/api/k8s';
import {
  EVAL_HUB_EVENTS,
  type ExternalConnectionTestedProperties,
} from '~/app/tracking/evalhubTrackingConstants';
import { getUserFriendlyConnectionError } from '~/app/utils/validationUtils';
import type { ConnectionValidationState, SourceMode, VerifyConnectionRequest } from '~/app/types';

type UseConnectionValidationParams = {
  namespace: string | undefined;
  sourceMode: SourceMode;
  endpointUrl: string;
  apiKeySecretRef: string;
  datasetUrl: string;
  accessToken: string;
  modelName: string;
  agentName: string;
};

type UseConnectionValidationResult = {
  connectionValidation: ConnectionValidationState;
  setConnectionValidation: React.Dispatch<React.SetStateAction<ConnectionValidationState>>;
  handleVerifyConnection: () => Promise<void>;
};

export const useConnectionValidation = ({
  namespace,
  sourceMode,
  endpointUrl,
  apiKeySecretRef,
  datasetUrl,
  accessToken,
  modelName,
  agentName,
}: UseConnectionValidationParams): UseConnectionValidationResult => {
  const [connectionValidation, setConnectionValidation] = React.useState<ConnectionValidationState>(
    { status: 'idle' },
  );
  const verifyAbortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setConnectionValidation({ status: 'idle' });
  }, [endpointUrl, apiKeySecretRef, datasetUrl, accessToken, modelName, agentName]);

  const handleVerifyConnection = React.useCallback(async () => {
    if (!namespace) {
      return;
    }

    verifyAbortRef.current?.abort();
    const controller = new AbortController();
    verifyAbortRef.current = controller;

    setConnectionValidation({ status: 'validating' });

    const baseUrl = sourceMode === 'prerecorded' ? datasetUrl.trim() : endpointUrl.trim();
    const modelId =
      sourceMode === 'model' ? modelName.trim() : sourceMode === 'agent' ? agentName.trim() : '';

    try {
      /* eslint-disable camelcase */
      const secretFields: Pick<VerifyConnectionRequest, 'secret_name' | 'secret_value'> = {};
      if (sourceMode === 'prerecorded') {
        const token = accessToken.trim();
        if (token) {
          secretFields.secret_value = token;
        }
      } else {
        const name = apiKeySecretRef.trim();
        if (name) {
          secretFields.secret_name = name;
        }
      }

      const request: VerifyConnectionRequest = {
        source_type: sourceMode,
        base_url: baseUrl,
        ...secretFields,
        ...(modelId ? { model_id: modelId } : {}),
      };
      /* eslint-enable camelcase */
      await verifyConnection('', namespace, request)({ signal: controller.signal });

      if (!controller.signal.aborted) {
        setConnectionValidation({
          status: 'success',
          message: 'Connection established successfully.',
        });

        const successProps: ExternalConnectionTestedProperties = {
          outcome: 'success',
          endpointType: sourceMode,
        };
        fireMiscTrackingEvent(EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED, successProps);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      let errorCode: string | undefined;
      if (err && typeof err === 'object' && 'error' in err) {
        const inner = (err as Record<string, unknown>).error; // eslint-disable-line @typescript-eslint/consistent-type-assertions
        if (inner && typeof inner === 'object' && 'code' in inner) {
          errorCode = String((inner as Record<string, unknown>).code); // eslint-disable-line @typescript-eslint/consistent-type-assertions
        }
      }
      const errorMessage = getUserFriendlyConnectionError(errorCode, sourceMode);
      setConnectionValidation({
        status: 'error',
        message: errorMessage,
        errorCode,
      });

      const errorProps: ExternalConnectionTestedProperties = {
        outcome: 'error',
        endpointType: sourceMode,
        error: errorMessage,
      };
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED, errorProps);
    }
  }, [
    namespace,
    sourceMode,
    endpointUrl,
    apiKeySecretRef,
    datasetUrl,
    accessToken,
    modelName,
    agentName,
  ]);

  React.useEffect(
    () => () => {
      verifyAbortRef.current?.abort();
    },
    [],
  );

  return { connectionValidation, setConnectionValidation, handleVerifyConnection };
};
