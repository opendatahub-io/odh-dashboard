import * as React from 'react';
import { ImageStreamKind, ImageStreamSpecTagType, NotebookKind } from '../../../../../k8sTypes';
import useNamespaces from '../../../../notebookController/useNamespaces';
import useImageStreams from '../../spawner/useImageStreams';
import { NotebookContainer } from '../../../../../types';

const useNotebookImageData = (
  notebook?: NotebookKind,
): [
  data: { imageStream: ImageStreamKind; imageVersion: ImageStreamSpecTagType } | null,
  loaded: boolean,
] => {
  const { dashboardNamespace } = useNamespaces();
  const [images, loaded] = useImageStreams(dashboardNamespace);

  return React.useMemo(() => {
    if (!notebook) {
      return [null, false];
    }

    if (!loaded) {
      return [null, false];
    }

    const container: NotebookContainer | undefined = notebook.spec.template.spec.containers.find(
      (container) => container.name === notebook.metadata.name,
    );
    const imageTag = container?.image.split('/').at(-1)?.split(':');

    if (!imageTag || imageTag.length < 2 || !container) {
      return [null, true];
    }

    const [imageName, versionName] = imageTag;
    const imageStream = images.find((image) => image.metadata.name === imageName);

    if (!imageStream) {
      return [null, true];
    }

    const versions = imageStream.spec.tags || [];
    const imageVersion = versions.find((version) => version.name === versionName);

    if (!imageVersion) {
      return [null, true];
    }

    return [{ imageStream, imageVersion }, loaded];
  }, [images, loaded, notebook]);
};

export default useNotebookImageData;
