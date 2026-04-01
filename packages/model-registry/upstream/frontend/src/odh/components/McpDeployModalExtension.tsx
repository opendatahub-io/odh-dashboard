import React from 'react';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isMcpServerDeployModalExtension } from '~/odh/extension-points';
import McpDeployModal from '~/odh/components/McpDeployModal';

type McpDeployModalExtensionProps = {
  render: (
    buttonState: { enabled: boolean; loading?: boolean; tooltip?: string },
    onOpenModal: () => void,
    isModalAvailable: boolean,
  ) => React.ReactNode;
};

const McpDeployModalExtension: React.FC<McpDeployModalExtensionProps> = ({ render }) => {
  const [extensions, extensionsLoaded] = useResolvedExtensions(isMcpServerDeployModalExtension);

  const [deployAvailable, setDeployAvailable] = React.useState<{
    available: boolean;
    loaded: boolean;
  }>({ available: false, loaded: false });

  const [openModal, setOpenModal] = React.useState(false);

  const onOpenModal = React.useCallback(() => {
    setOpenModal(true);
  }, []);

  const isModalAvailable = React.useMemo(
    () => extensionsLoaded && extensions.length > 0,
    [extensionsLoaded, extensions],
  );

  const buttonState = React.useMemo(() => {
    if (!deployAvailable.loaded) {
      return { enabled: false, loading: true, tooltip: 'Checking MCP server availability...' };
    }
    if (!deployAvailable.available) {
      return {
        enabled: false,
        loading: false,
        tooltip: 'MCP server CRD is not available on this cluster',
      };
    }
    return { enabled: true, loading: false };
  }, [deployAvailable]);

  return (
    <>
      {extensions.map((extension) =>
        extension.properties.useIsDeployAvailable ? (
          <HookNotify
            key={extension.uid}
            useHook={extension.properties.useIsDeployAvailable}
            onNotify={(value) => {
              if (value) {
                setDeployAvailable(value);
              }
            }}
          />
        ) : null,
      )}
      {render(buttonState, onOpenModal, isModalAvailable)}
      {isModalAvailable && (
        <McpDeployModal isOpen={openModal} onClose={() => setOpenModal(false)} />
      )}
    </>
  );
};

export default McpDeployModalExtension;
