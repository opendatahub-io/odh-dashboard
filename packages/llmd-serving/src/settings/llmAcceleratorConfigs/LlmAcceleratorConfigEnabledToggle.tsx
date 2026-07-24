import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import {
  isUnsupportedUnaccepted,
  UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION,
} from '@odh-dashboard/model-serving/concepts/versions';
import UnsupportedStatusAcceptanceModal from '@odh-dashboard/model-serving/components/UnsupportedStatusAcceptanceModal';
import type { UnsupportedStatusDismissAction } from '@odh-dashboard/model-serving/components/UnsupportedStatusAcceptanceModal';
import {
  fireRiskAccepted,
  fireRiskDismissed,
  getResourceVersions,
} from '@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking';
import type { LLMInferenceServiceConfigKind } from '../../types';
import { DISABLED_ANNOTATION } from '../../const';
import { isConfigEnabled } from '../../utils';
import { patchLLMInferenceServiceConfig } from '../../api/LLMInferenceServiceConfigs';

type LlmAcceleratorConfigEnabledToggleProps = {
  config: LLMInferenceServiceConfigKind;
};

const LlmAcceleratorConfigEnabledToggle: React.FC<LlmAcceleratorConfigEnabledToggleProps> = ({
  config,
}) => {
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
          'Error updating accelerator configuration',
          e instanceof Error ? e.message : 'Unknown error',
        );
        return false;
      } finally {
        setIsToggling(false);
      }
    },
    [config, notification],
  );

  const handleToggle = React.useCallback(() => {
    if (effectiveEnabled) {
      patchConfigAnnotations({ [DISABLED_ANNOTATION]: 'true' });
    } else if (unsupportedUnaccepted) {
      setShowAcceptanceModal(true);
    } else {
      patchConfigAnnotations({ [DISABLED_ANNOTATION]: 'false' });
    }
  }, [effectiveEnabled, unsupportedUnaccepted, patchConfigAnnotations]);

  const handleAccept = React.useCallback(async () => {
    setShowAcceptanceModal(false);
    const success = await patchConfigAnnotations({
      [UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION]: 'true',
      [DISABLED_ANNOTATION]: 'false',
    });
    if (success) {
      fireRiskAccepted({
        runtimeResourceType: 'llm-accelerator-config',
        resourceId: config.metadata.name,
        resourceName: getDisplayNameFromK8sResource(config),
        ...getResourceVersions(config),
        outcome: 'submit',
        success: true,
      });
    }
  }, [config, patchConfigAnnotations]);

  return (
    <>
      <Switch
        id={`llm-accelerator-config-enabled-toggle-${configName}`}
        aria-label={`${configName}-enabled-toggle`}
        data-testid={`llm-accelerator-config-enabled-toggle-${configName}`}
        isChecked={effectiveEnabled}
        isDisabled={isToggling}
        onChange={handleToggle}
      />
      {showAcceptanceModal ? (
        <UnsupportedStatusAcceptanceModal
          resourceTypeLabel="accelerator configuration"
          onAccept={handleAccept}
          onClose={(dismissAction: UnsupportedStatusDismissAction) => {
            setShowAcceptanceModal(false);
            fireRiskDismissed({
              runtimeResourceType: 'llm-accelerator-config',
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

export default LlmAcceleratorConfigEnabledToggle;
