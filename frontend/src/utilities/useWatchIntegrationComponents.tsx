import * as React from 'react';
import { useAppSelector } from '~/redux/hooks';
import { OdhApplication } from '~/types';
import { getIntegrationAppEnablementStatus } from '~/services/integrationAppService';
import { POLL_INTERVAL } from './const';
import { isIntegrationApp } from './utils';

export const useWatchIntegrationComponents = (
  components: OdhApplication[],
): { checkedComponents: OdhApplication[]; isIntegrationComponentsChecked: boolean } => {
  const [isIntegrationComponentsChecked, setIsIntegrationComponentsChecked] = React.useState(false);
  const forceUpdate = useAppSelector((state) => state.forceComponentsUpdate);
  const initForce = React.useRef<number>(forceUpdate);
  const integrationComponents = React.useMemo(
    () => components.filter((component) => isIntegrationApp(component)),
    [components],
  );
  const [newComponents, setNewComponents] = React.useState<OdhApplication[]>([]);

  const updateComponentEnablementStatus = async (
    integrationComponentList: OdhApplication[],
    componentList: OdhApplication[],
  ): Promise<void> => {
    const updatePromises = integrationComponentList.map(async (component) => {
      if (component.spec.internalRoute) {
        const response = await getIntegrationAppEnablementStatus(component.spec.internalRoute);

        if (response.error) {
          setNewComponents(componentList);
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
      }
    });
    await Promise.all(updatePromises);
  };

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    if (integrationComponents.length === 0) {
      setIsIntegrationComponentsChecked(true);
    } else {
      const watchComponents = () => {
        updateComponentEnablementStatus(integrationComponents, components).then(() => {
          setIsIntegrationComponentsChecked(true);
          watchHandle = setTimeout(watchComponents, POLL_INTERVAL);
        });
      };
      watchComponents();
    }
    return () => {
      clearTimeout(watchHandle);
    };
  }, [components, integrationComponents]);

  React.useEffect(() => {
    if (initForce.current !== forceUpdate) {
      initForce.current = forceUpdate;
      if (integrationComponents.length === 0) {
        setIsIntegrationComponentsChecked(true);
      } else {
        updateComponentEnablementStatus(integrationComponents, components).then(() => {
          setIsIntegrationComponentsChecked(true);
        });
      }
    }
  }, [forceUpdate, components, integrationComponents]);

  return { checkedComponents: newComponents, isIntegrationComponentsChecked };
};
