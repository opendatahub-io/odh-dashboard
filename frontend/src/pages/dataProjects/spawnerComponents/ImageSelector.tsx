import * as React from 'react';
import { Radio } from '@patternfly/react-core';
import { ImageType } from '../../../types';
import {
  getDescriptionForTag,
  getImageTagVersion,
  getTagForImage,
  isImageTagBuildValid,
} from '../../../utilities/imageUtils';
import ImageTagPopover from './ImageTagPopover';
import ImageVersions from './ImageVersions';

type ImageSelectorProps = {
  image: ImageType;
  selectedImage?: string;
  selectedTag?: string;
  handleSelection: (image: ImageType, tag: string, checked: boolean) => void;
};

const ImageSelector: React.FC<ImageSelectorProps> = ({
  image,
  selectedImage,
  selectedTag,
  handleSelection,
}) => {
  const currentTag = getTagForImage(image, selectedImage, selectedTag);
  const tags = image.tags || [];
  const getImagePopover = (image: ImageType) => {
    if (!image.description && !currentTag?.content?.dependencies?.length) {
      return null;
    }
    return <ImageTagPopover tag={currentTag} description={image.description || undefined} />;
  };

  const disabled = tags.every((tag) => !isImageTagBuildValid(tag));

  return (
    <>
      <Radio
        id={image.name}
        name={image.display_name}
        className="odh-data-projects__notebook-image-option"
        isDisabled={disabled}
        label={
          <span className="odh-data-projects__notebook-image-title">
            {image.display_name}
            {tags.length > 1 ? (
              <span className="odh-data-projects__notebook-image-title-version">
                {getImageTagVersion(image, selectedImage, selectedTag)}
              </span>
            ) : null}
            {getImagePopover(image)}
          </span>
        }
        description={getDescriptionForTag(currentTag)}
        isChecked={image.name === selectedImage}
        onChange={(checked: boolean) => handleSelection(image, currentTag?.name || '', checked)}
      />
      <ImageVersions
        image={image}
        selectedTag={image.name === selectedImage ? selectedTag : ''}
        onSelect={(tagName, checked) => handleSelection(image, tagName, checked)}
      />
    </>
  );
};

export default ImageSelector;
