import * as React from 'react';
import { ImageInfo } from '#~/types';
import { fetchImages } from '#~/services/imagesService';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchImages = (): {
  images: ImageInfo[];
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [images, setImages] = React.useState<ImageInfo[]>([]);

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
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
      clearTimeout(watchHandle);
    };
  }, []);

  const retImages = useDeepCompareMemoize<ImageInfo[]>(images);

  return { images: retImages, loaded, loadError };
};
