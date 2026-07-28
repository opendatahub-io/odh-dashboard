import * as React from 'react';
import { useNotification } from '~/app/hooks/useNotification';
import { WorkspaceCapabilities } from '~/app/hooks/useWorkspaceCapabilities';

const STORAGE_PREFIX = 'gen-ai:onboarding';

const useCapabilityOnboarding = (
  capabilities: WorkspaceCapabilities,
  namespaceName: string | undefined,
): void => {
  const notification = useNotification();
  const prevRef = React.useRef<{ vision: boolean; asr: boolean }>({
    vision: false,
    asr: false,
  });

  React.useEffect(() => {
    prevRef.current = { vision: false, asr: false };
  }, [namespaceName]);

  React.useEffect(() => {
    if (!capabilities.capabilitiesReady || capabilities.capabilitiesError || !namespaceName) {
      return;
    }

    const visionKey = `${STORAGE_PREFIX}:vision:${namespaceName}`;
    const asrKey = `${STORAGE_PREFIX}:asr:${namespaceName}`;

    if (
      capabilities.hasVisionModel &&
      !prevRef.current.vision &&
      !localStorage.getItem(visionKey)
    ) {
      localStorage.setItem(visionKey, '1');
      notification.info(
        'Vision model available',
        'A model with vision capabilities is now available. You can upload images in the playground.',
      );
    }

    if (capabilities.hasASRModel && !prevRef.current.asr && !localStorage.getItem(asrKey)) {
      localStorage.setItem(asrKey, '1');
      notification.info(
        'ASR model available',
        'A model with audio transcription capabilities is now available. You can upload audio files in the playground.',
      );
    }

    prevRef.current = {
      vision: capabilities.hasVisionModel,
      asr: capabilities.hasASRModel,
    };
  }, [capabilities, namespaceName, notification]);
};

export default useCapabilityOnboarding;
