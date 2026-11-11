import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import {
  isUnsupportedUnaccepted,
  UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION,
} from '@odh-dashboard/model-serving/concepts/versions';
import {
  UnsupportedStatusAcceptanceModal,
  type UnsupportedStatusDismissAction,
} from '@odh-dashboard/model-serving/shared/components';
import {
  fireRiskAccepted,
  fireRiskDismissed,
  getResourceVersions,
} from '@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking';
import { useNotification } from '@odh-dashboard/ui-core';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import type { LLMInferenceServiceConfigKind } from '../../types';
import { DISABLED_ANNOTATION } from '../../const';
import { isConfigEnabled } from '../../utils';
import { patchLLMInferenceServiceConfig } from '../../api/LLMInferenceServiceConfigs';
import { fireLlmInferenceServiceConfigEnablementChanged } from '../../tracking/llmdTrackingConstants';

type LlmInferenceServiceConfigEnabledToggleProps = {
  config: LLMInferenceServiceConfigKind;
};

const LlmInferenceServiceConfigEnabledToggle: React.FC<
  LlmInferenceServiceConfigEnabledToggleProps
> = ({ config }) => {
  const trackEvent = useTrackEvent();
  const notification = useNotification();
  const [isToggling, setIsToggling] = React.useState(false);
  const [showAcceptanceModal, setShowAcceptanceModal] = React.useState(false);

  const configName = config.metadata.name;
  const unsupportedUnaccepted = isUnsupportedUnaccepted(config);
  const effectiveEnabled = unsupportedUnaccepted ? false : isConfigEnabled(config);

  const patchConfigAnnotations = React.useCallback(
    async (annotationUpdates: Record<string, string>): Promise<boolean> => {
      setIsToggling(true);
      const updatedConfig: LLMInferenceServiceConfigKind = {
        ...config,
        metadata: {
          ...config.metadata,
          annotations: {
            ...config.metadata.annotations,
            ...annotationUpdates,
          },
        },
      };

      try {
        await patchLLMInferenceServiceConfig(config, updatedConfig);
        return true;
      } catch (e) {
        notification.error(
          'Error updating inference service configuration',
          e instanceof Error ? e.message : 'Unknown error',
        );
        return false;
      } finally {
        setIsToggling(false);
      }
    },
    [config, notification],
  );

  const handleToggle = React.useCallback(async () => {
    // The actual resulting state: the intended state on success, unchanged (reverted) on failure.
    if (effectiveEnabled) {
      const success = await patchConfigAnnotations({ [DISABLED_ANNOTATION]: 'true' });
      fireLlmInferenceServiceConfigEnablementChanged(trackEvent, {
        outcome: TrackingOutcome.submit,
        success,
        enabled: success ? false : effectiveEnabled,
      });
    } else if (unsupportedUnaccepted) {
      setShowAcceptanceModal(true);
    } else {
      const success = await patchConfigAnnotations({ [DISABLED_ANNOTATION]: 'false' });
      fireLlmInferenceServiceConfigEnablementChanged(trackEvent, {
        outcome: TrackingOutcome.submit,
        success,
        enabled: success ? true : effectiveEnabled,
      });
    }
  }, [effectiveEnabled, unsupportedUnaccepted, patchConfigAnnotations, trackEvent]);

  const handleAccept = React.useCallback(async () => {
    setShowAcceptanceModal(false);
    const success = await patchConfigAnnotations({
      [UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION]: 'true',
      [DISABLED_ANNOTATION]: 'false',
    });
    fireLlmInferenceServiceConfigEnablementChanged(trackEvent, {
      outcome: TrackingOutcome.submit,
      success,
      // Accept enables from a disabled state; on failure it stays disabled.
      enabled: success,
    });
    if (success) {
      fireRiskAccepted(trackEvent, {
        runtimeResourceType: 'llm-inference-service-config',
        resourceId: config.metadata.name,
        resourceName: getDisplayNameFromK8sResource(config),
        ...getResourceVersions(config),
        outcome: 'submit',
        success: true,
      });
    }
  }, [config, patchConfigAnnotations, trackEvent]);

  return (
    <>
      <Switch
        id={`llm-inference-service-config-enabled-toggle-${configName}`}
        aria-label={`${configName}-enabled-toggle`}
        data-testid={`llm-inference-service-config-enabled-toggle-${configName}`}
        isChecked={effectiveEnabled}
        isDisabled={isToggling}
        onChange={handleToggle}
      />
      {showAcceptanceModal ? (
        <UnsupportedStatusAcceptanceModal
          resourceTypeLabel="inference service configuration"
          onAccept={handleAccept}
          onClose={(dismissAction: UnsupportedStatusDismissAction) => {
            setShowAcceptanceModal(false);
            fireRiskDismissed(trackEvent, {
              runtimeResourceType: 'llm-inference-service-config',
              resourceId: config.metadata.name,
              resourceName: getDisplayNameFromK8sResource(config),
              ...getResourceVersions(config),
              dismissAction,
              outcome: 'cancel',
            });
          }}
        />
      ) : null}
    </>
  );
};

export default LlmInferenceServiceConfigEnabledToggle;
