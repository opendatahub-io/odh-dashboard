import * as React from 'react';
import { ImageStreamKind } from '../../../../k8sTypes';
import { getImageStreams } from '../../../../api';

const useImageStreams = (
  namespace?: string,
): [imageStreams: ImageStreamKind[], loaded: boolean, loadError: Error | undefined] => {
  const [imageStreams, setImageStreams] = React.useState<ImageStreamKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    if (namespace) {
      getImageStreams(namespace)
        .then((imageStreams) => {
          setImageStreams(imageStreams);
          setLoaded(true);
        })
        .catch((e) => {
          setLoadError(e);
          setLoaded(true);
        });
    }
  }, [namespace]);

  return [imageStreams, loaded, loadError];
};

export default useImageStreams;
