import * as React from 'react';
import { cloneDeep, remove } from 'lodash-es';
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

  const updateComponentEnablementStatus = (
    integrationComponentList: OdhApplication[],
    componentList: OdhApplication[],
  ) => {
    const newComponentsList = cloneDeep(componentList);

    integrationComponentList.forEach((component) => {
      if (component.spec.internalRoute) {
        getIntegrationAppEnablementStatus(component.spec.internalRoute).then((response) => {
          if (response.error) {
            // Show error on the application card if there is an error
            setNewComponents(newComponentsList);
          } else {
            newComponentsList[componentList.indexOf(component)].spec.isEnabled =
              response.isAppEnabled;
            setNewComponents(newComponentsList);
          }
        });
      }
    });
  };

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    if (integrationComponents.length === 0) {
      setIsIntegrationComponentsChecked(true);
    } else {
      const watchComponents = () => {
        updateComponentEnablementStatus(integrationComponents, components);
        setIsIntegrationComponentsChecked(true);
        watchHandle = setTimeout(watchComponents, POLL_INTERVAL);
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
        updateComponentEnablementStatus(integrationComponents, components);
        setIsIntegrationComponentsChecked(true);
      }
    }
  }, [forceUpdate, components, integrationComponents]);

  return { checkedComponents: newComponents, isIntegrationComponentsChecked };
};
