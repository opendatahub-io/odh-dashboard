import * as React from 'react';
import { FormSection, Skeleton } from '@patternfly/react-core';
import {
  BuildStatus,
  ImageStreamAndVersion,
  ImageStreamSelectOptionObjectType,
  ImageVersionSelectOptionObjectType,
  SpawnerPageSectionID,
} from '../types';
import { ImageStreamKind } from '../../../../../k8sTypes';
import {
  getDefaultVersionForImageStream,
  getExistingVersionsForImageStream,
  getImageStreamSelectOptionObject,
  getImageVersionSelectOptionObject,
} from '../spawnerUtils';
import ImageStreamSelector from './ImageStreamSelector';
import ImageVersionSelector from './ImageVersionSelector';
import ImageStreamPopover from './ImageStreamPopover';

type ImageSelectorFieldProps = {
  selectedImage: ImageStreamAndVersion;
  setSelectedImage: (imageStream: ImageStreamAndVersion) => void;
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
  const [selectedImageStream, setSelectedImageStream] =
    React.useState<ImageStreamSelectOptionObjectType>();
  const [selectedImageVersion, setSelectedImageVersion] =
    React.useState<ImageVersionSelectOptionObjectType>();

  const imageStreamData = React.useMemo(
    () => ({
      buildStatuses,
      imageOptions: imageStreams.map((imageStream) =>
        getImageStreamSelectOptionObject(imageStream),
      ),
    }),
    [imageStreams, buildStatuses],
  );

  const imageVersionData = React.useMemo(() => {
    const imageStream = selectedImageStream?.imageStream;
    if (!imageStream) {
      return { buildStatuses, imageStream, versionOptions: [] };
    }
    const versions = getExistingVersionsForImageStream(imageStream);
    return {
      buildStatuses,
      imageStream,
      versionOptions: versions.map((version) =>
        getImageVersionSelectOptionObject(imageStream, version),
      ),
    };
  }, [selectedImageStream, buildStatuses]);

  const onImageStreamSelect = (selection: ImageStreamSelectOptionObjectType) => {
    setSelectedImageStream(selection);
  };

  const onImageVersionSelect = (selection: ImageVersionSelectOptionObjectType) => {
    setSelectedImageVersion(selection);
  };

  React.useEffect(() => {
    setSelectedImage({
      imageStream: selectedImageStream?.imageStream,
      imageVersion: selectedImageVersion?.imageVersion,
    });
  }, [selectedImageStream, selectedImageVersion, setSelectedImage]);

  React.useEffect(() => {
    if (selectedImageStream) {
      const version = getDefaultVersionForImageStream(
        selectedImageStream.imageStream,
        buildStatuses,
      );
      const selectedVersion = imageVersionData.versionOptions.find(
        (optionObject) => optionObject.imageVersion.name === version?.name,
      );
      setSelectedImageVersion(selectedVersion);
    }
  }, [selectedImageStream, buildStatuses, imageVersionData]);

  if (!loaded) {
    return <Skeleton />;
  }

  if (error) {
    return <>{error.message}</>;
  }

  return (
    <FormSection title="Notebook image" id={SpawnerPageSectionID.NOTEBOOK_IMAGE}>
      <ImageStreamSelector
        data={imageStreamData}
        onImageStreamSelect={onImageStreamSelect}
        selectedImageStream={selectedImageStream}
      />
      <ImageVersionSelector
        data={imageVersionData}
        onImageVersionSelect={onImageVersionSelect}
        selectedImageVersion={selectedImageVersion}
      />
      <ImageStreamPopover selectedImage={selectedImage} />
    </FormSection>
  );
};

export default ImageSelectorField;
