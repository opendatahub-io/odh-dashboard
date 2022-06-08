import * as React from 'react';
import { Radio } from '@patternfly/react-core';
import { ImageStream, ImageStreamStatusTag, ImageStreamTag } from '../../types';
import {
  getImageStreamDisplayName,
  getImageStreamTagVersion,
  getTagDependencies,
  getTagDescription,
  getTagForImageStream,
  getTagsByStatusTags,
} from '../../utilities/imageUtils';
import ImageStreamTagPopover from './ImageStreamTagPopover';
import ImageStreamVersions from './ImageStreamVersions';
import { ANNOTATION_NOTEBOOK_IMAGE_DESC } from '../../utilities/const';

type ImageStreamSelectorProps = {
  imageStream: ImageStream;
  selectedImage?: ImageStream;
  selectedTag?: ImageStreamTag;
  handleSelection: (image: ImageStream, tag: ImageStreamTag, checked: boolean) => void;
};

const ImageStreamSelector: React.FC<ImageStreamSelectorProps> = ({
  imageStream,
  selectedImage,
  selectedTag,
  handleSelection,
}) => {
  let disabled = true;
  const currentTag = getTagForImageStream(
    imageStream,
    selectedImage?.metadata.name,
    selectedTag?.name,
  );
  const statusTags: ImageStreamStatusTag[] | undefined = imageStream.status?.tags;
  const name = imageStream.metadata.name;
  const displayName = getImageStreamDisplayName(imageStream);
  const tags = getTagsByStatusTags(imageStream, statusTags ?? []);
  if (tags.length > 0) {
    disabled = false;
  }
  const getImagePopover = (imageStream: ImageStream) => {
    const description = imageStream.metadata.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_DESC];
    if (!description && !getTagDependencies(currentTag).length) {
      return null;
    }
    return <ImageStreamTagPopover tag={currentTag!} description={description} />;
  };

  // temporarily set all to enabled because we haven't implement the image tag build status api
  // const disabled = tags.every((tag) => !isImageTagBuildValid(tag));

  return (
    <>
      <Radio
        id={name}
        name={displayName || name}
        className="odh-data-projects__notebook-image-option"
        isDisabled={disabled}
        label={
          <span className="odh-data-projects__notebook-image-title">
            {displayName}
            {tags.length > 1 ? (
              <span className="odh-data-projects__notebook-image-title-version">
                {getImageStreamTagVersion(
                  imageStream,
                  selectedImage?.metadata.name,
                  selectedTag?.name,
                )}
              </span>
            ) : null}
            {getImagePopover(imageStream)}
          </span>
        }
        description={getTagDescription(currentTag)}
        isChecked={name === selectedImage?.metadata.name}
        onChange={(checked: boolean) => {
          if (currentTag) {
            handleSelection(imageStream, currentTag, checked);
          }
        }}
      />
      <ImageStreamVersions
        imageStream={imageStream}
        tags={tags}
        selectedTag={name === selectedImage?.metadata.name ? selectedTag : undefined}
        onSelect={(tag, checked) => handleSelection(imageStream, tag, checked)}
      />
    </>
  );
};

export default ImageStreamSelector;
