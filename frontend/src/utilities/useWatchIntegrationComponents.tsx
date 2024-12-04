import * as React from 'react';
import { useAppSelector } from '~/redux/hooks';
import { IntegrationAppStatus, OdhApplication, OdhIntegrationApplication } from '~/types';
import { getIntegrationAppEnablementStatus } from '~/services/integrationAppService';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import { POLL_INTERVAL } from './const';
import { isIntegrationApp } from './utils';

export const useWatchIntegrationComponents = (
  components?: OdhApplication[],
): { checkedComponents: OdhApplication[]; isIntegrationComponentsChecked: boolean } => {
  const [isIntegrationComponentsChecked, setIsIntegrationComponentsChecked] = React.useState(false);
  const forceUpdate = useAppSelector((state) => state.forceComponentsUpdate);
  const initForce = React.useRef<number>(forceUpdate);
  const integrationComponents = React.useMemo(
    () => components?.filter(isIntegrationApp),
    [components],
  );
  const [newComponents, setNewComponents] = React.useState<OdhApplication[]>([]);

  const updateComponentEnablementStatus = async (
    integrationComponentList: OdhIntegrationApplication[],
    componentList: OdhApplication[],
  ): Promise<void> => {
    const updatePromises = integrationComponentList.map(async (component) => {
      const response = await getIntegrationAppEnablementStatus(component.spec.internalRoute).catch(
        (e) =>
          ({
            isInstalled: false,
            isEnabled: false,
            canInstall: false,
            error: e.message ?? e.error, // might be an error from the server, might be an error in the network call itself
          } satisfies IntegrationAppStatus),
      );

      if (response.error) {
        // TODO: Show the error somehow
        setNewComponents(
          componentList.filter((app) => app.metadata.name !== component.metadata.name),
        );
      } else {
        const updatedComponents = componentList
          .filter(
            (app) => !(app.metadata.name === component.metadata.name && !response.isInstalled),
          )
          .map((app) =>
            app.metadata.name === component.metadata.name
              ? {
                  ...app,
                  spec: {
                    ...app.spec,
                    isEnabled: response.isEnabled,
                  },
                }
              : app,
          );
        setNewComponents(updatedComponents);
      }
    });
    await allSettledPromises(updatePromises);
  };

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    if (integrationComponents && components) {
      if (integrationComponents.length === 0) {
        setIsIntegrationComponentsChecked(true);
        setNewComponents(components);
      } else {
        const watchComponents = () => {
          updateComponentEnablementStatus(integrationComponents, components).then(() => {
            setIsIntegrationComponentsChecked(true);
            watchHandle = setTimeout(watchComponents, POLL_INTERVAL);
          });
        };
        watchComponents();
      }
    }
    return () => {
      clearTimeout(watchHandle);
    };
  }, [components, integrationComponents]);

  React.useEffect(() => {
    if (initForce.current !== forceUpdate) {
      initForce.current = forceUpdate;
      if (integrationComponents && components) {
        if (integrationComponents.length === 0) {
          setIsIntegrationComponentsChecked(true);
          setNewComponents(components);
        } else {
          updateComponentEnablementStatus(integrationComponents, components).then(() => {
            setIsIntegrationComponentsChecked(true);
          });
        }
      }
    }
  }, [forceUpdate, components, integrationComponents]);

  return { checkedComponents: newComponents, isIntegrationComponentsChecked };
};
