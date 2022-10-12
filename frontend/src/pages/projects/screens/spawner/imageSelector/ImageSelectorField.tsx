import * as React from 'react';
import { Alert, FormSection, Skeleton } from '@patternfly/react-core';
import { BuildStatus, SpawnerPageSectionID } from '../types';
import { ImageStreamKind } from '../../../../../k8sTypes';
import {
  getDefaultVersionForImageStream,
  getExistingVersionsForImageStream,
} from '../spawnerUtils';
import ImageStreamSelector from './ImageStreamSelector';
import ImageVersionSelector from './ImageVersionSelector';
import ImageStreamPopover from './ImageStreamPopover';
import { ImageStreamAndVersion } from '../../../../../types';

type ImageSelectorFieldProps = {
  selectedImage: ImageStreamAndVersion;
  setSelectedImage: React.Dispatch<React.SetStateAction<ImageStreamAndVersion>>;
  imageStreams: ImageStreamKind[];
  loaded: boolean;
  error?: Error;
  buildStatuses: BuildStatus[];
};

const ImageSelectorField: React.FC<ImageSelectorFieldProps> = ({
  selectedImage,
  setSelectedImage,
  imageStreams,
  loaded,
  error,
  buildStatuses,
}) => {
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

  const onImageStreamSelect = React.useCallback(
    (selection: ImageStreamKind) =>
      setSelectedImage((oldSelectedImage) => ({
        ...oldSelectedImage,
        imageStream: selection,
      })),
    [setSelectedImage],
  );

  React.useEffect(() => {
    const imageStream = selectedImage.imageStream;
    if (imageStream) {
      const version = getDefaultVersionForImageStream(imageStream, buildStatuses);
      const versions = getExistingVersionsForImageStream(imageStream);
      const selectedVersion = versions.find((v) => v.name === version?.name);
      setSelectedImage((oldSelectedImage) => ({
        ...oldSelectedImage,
        imageVersion: selectedVersion,
      }));
    }
  }, [selectedImage.imageStream, buildStatuses, imageVersionData, setSelectedImage]);

  if (!loaded) {
    return <Skeleton />;
  }

  return (
    <FormSection title="Notebook image" id={SpawnerPageSectionID.NOTEBOOK_IMAGE}>
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
    </FormSection>
  );
};

export default ImageSelectorField;
