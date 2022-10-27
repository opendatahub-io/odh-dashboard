import * as React from 'react';
import { Alert, Skeleton } from '@patternfly/react-core';
import { ImageStreamKind } from '../../../../../k8sTypes';
import {
  getDefaultVersionForImageStream,
  getExistingVersionsForImageStream,
} from '../spawnerUtils';
import ImageStreamSelector from './ImageStreamSelector';
import ImageVersionSelector from './ImageVersionSelector';
import ImageStreamPopover from './ImageStreamPopover';
import { ImageStreamAndVersion } from '../../../../../types';
import useImageStreams from '../useImageStreams';
import { useDashboardNamespace } from '../../../../../redux/selectors';
import useBuildStatuses from '../useBuildStatuses';

type ImageSelectorFieldProps = {
  selectedImage: ImageStreamAndVersion;
  setSelectedImage: React.Dispatch<React.SetStateAction<ImageStreamAndVersion>>;
};

const ImageSelectorField: React.FC<ImageSelectorFieldProps> = ({
  selectedImage,
  setSelectedImage,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const buildStatuses = useBuildStatuses(dashboardNamespace);
  const [imageStreams, loaded, error] = useImageStreams(dashboardNamespace);

  const imageVersionData = React.useMemo(() => {
    const imageStream = selectedImage.imageStream;
    if (!imageStream) {
      return { buildStatuses, imageStream, imageVersions: [] };
    }
    return {
      buildStatuses,
      imageStream,
      imageVersions: getExistingVersionsForImageStream(imageStream),
    };
  }, [selectedImage.imageStream, buildStatuses]);

  const onImageStreamSelect = (newImageStream: ImageStreamKind) => {
    const version = getDefaultVersionForImageStream(newImageStream, buildStatuses);
    const versions = getExistingVersionsForImageStream(newImageStream);
    const initialVersion = versions.find((v) => v.name === version?.name);

    return setSelectedImage({
      imageStream: newImageStream,
      imageVersion: initialVersion,
    });
  };

  if (!loaded) {
    return <Skeleton />;
  }

  return (
    <>
      {error ? (
        <Alert title="Image loading error" variant="danger">
          {error.message}
        </Alert>
      ) : (
        <>
          <ImageStreamSelector
            imageStreams={imageStreams}
            buildStatuses={buildStatuses}
            onImageStreamSelect={onImageStreamSelect}
            selectedImageStream={selectedImage.imageStream}
          />
          <ImageVersionSelector
            data={imageVersionData}
            setSelectedImageVersion={(selection) =>
              setSelectedImage((oldSelectedImage) => ({
                ...oldSelectedImage,
                imageVersion: selection,
              }))
            }
            selectedImageVersion={selectedImage.imageVersion}
          />
          <ImageStreamPopover selectedImage={selectedImage} />
        </>
      )}
    </>
  );
};

export default ImageSelectorField;
