import React from 'react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';
import { CHAT_PLAYGROUND } from '~/odh/extensions';

const useChatPlaygroundEnabled = (): boolean => {
  const pluginStore = usePluginStore();
  const [isEnabled, setIsEnabled] = React.useState(false);

  React.useEffect(() => {
    const flags = pluginStore.getFeatureFlags();
    const enabled = flags[CHAT_PLAYGROUND] === true;
    setIsEnabled(enabled);
  }, [pluginStore]);

  return isEnabled;
};

export default useChatPlaygroundEnabled;
