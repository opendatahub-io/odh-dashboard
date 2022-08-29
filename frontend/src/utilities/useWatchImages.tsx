import * as React from 'react';
import { ImageInfo } from '../types';
import { POLL_INTERVAL } from './const';
import { fetchImages } from '../services/imagesService';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchImages = (): {
  images: ImageInfo[];
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [images, setImages] = React.useState<ImageInfo[]>([]);

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;
    const watchImages = () => {
      fetchImages()
        .then((data: ImageInfo[]) => {
          if (cancelled) {
            return;
          }
          setLoaded(true);
          setLoadError(undefined);
          setImages(data);
        })
        .catch((e) => {
          if (cancelled) {
            return;
          }
          setLoadError(e);
        });
      watchHandle = setTimeout(watchImages, POLL_INTERVAL);
    };
    watchImages();

    return () => {
      cancelled = true;
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when components are updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retImages = useDeepCompareMemoize<ImageInfo[]>(images);

  return { images: retImages, loaded, loadError };
};
