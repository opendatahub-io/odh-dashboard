import * as React from 'react';
import { ImageInfo } from '~/types';
import { listImageStreams } from '~/api';
import { ImageStreamKind } from '~/k8sTypes';
import { mapImageStreamToImageInfo } from '~/utilities/imageStreamUtils';
import { POLL_INTERVAL } from '~/utilities/const';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';

export const useWatchImages = (
  namespace: string,
): {
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
      listImageStreams(namespace, 'jupyter')
        .then((data: ImageStreamKind[]) => {
          if (cancelled) {
            return;
          }
          setLoaded(true);
          setLoadError(undefined);
          setImages(data.map(mapImageStreamToImageInfo));
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
  }, [namespace]);

  const retImages = useDeepCompareMemoize<ImageInfo[]>(images);

  return { images: retImages, loaded, loadError };
};
