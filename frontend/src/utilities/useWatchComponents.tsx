import * as React from 'react';
import { useAppSelector } from '#~/redux/hooks';
import { fetchComponents } from '#~/services/componentsServices';
import { OdhApplication } from '#~/types';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchComponents = (
  installed: boolean,
): { components: OdhApplication[]; loaded: boolean; loadError: Error | undefined } => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [components, setComponents] = React.useState<OdhApplication[]>([]);
  const forceUpdate = useAppSelector((state) => state.forceComponentsUpdate);
  const initForce = React.useRef<number>(forceUpdate);

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    const watchComponents = () => {
      fetchComponents(installed)
        .then((updatedComponents: OdhApplication[]) => {
          setLoaded(true);
          setLoadError(undefined);
          setComponents(updatedComponents);
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(watchComponents, POLL_INTERVAL);
    };
    watchComponents();

    return () => {
      clearTimeout(watchHandle);
    };
  }, [installed]);

  React.useEffect(() => {
    if (initForce.current !== forceUpdate) {
      initForce.current = forceUpdate;
      fetchComponents(installed)
        .then((updatedComponents: OdhApplication[]) => {
          setLoaded(true);
          setLoadError(undefined);
          setComponents(updatedComponents);
        })
        .catch((e) => {
          setLoadError(e);
        });
    }
  }, [forceUpdate, installed]);

  const retComponents = useDeepCompareMemoize(components);

  return { components: retComponents, loaded, loadError };
};
