import * as amplitude from '@amplitude/analytics-browser';

let amplitudeInitialized = false;

export const initAmplitude = (props: {
  amplitudeApiKey: string;
  enabled: boolean;
  userId?: string;
}): void => {
  const { amplitudeApiKey, enabled, userId } = props;
  if (!enabled || !amplitudeApiKey || amplitudeInitialized) {
    return;
  }
  amplitude.init(amplitudeApiKey, {
    autocapture: {
      elementInteractions: true,
    },
  });
  if (userId) {
    amplitude.setUserId(userId);
  }
  amplitudeInitialized = true;
};
