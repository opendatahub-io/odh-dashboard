import * as React from 'react';
import { Flex, FlexItem, Radio } from '@patternfly/react-core';
import { ImageInfo, ImageTagInfo } from '../../../../types';
import {
  getDescriptionForTag,
  getImageTagVersion,
  getTagForImage,
  isImageTagBuildValid,
} from '../../../../utilities/imageUtils';
import ImageTagPopover from './ImageTagPopover';
import ImageVersions from './ImageVersions';
import { useAppContext } from '../../../../app/AppContext';

import '../../NotebookController.scss';

type ImageSelectorProps = {
  image: ImageInfo;
  selectedImage?: ImageInfo;
  selectedTag?: ImageTagInfo;
  handleSelection: (image: ImageInfo, tag: ImageTagInfo, checked: boolean) => void;
};

const ImageSelector: React.FC<ImageSelectorProps> = ({
  image,
  selectedImage,
  selectedTag,
  handleSelection,
}) => {
  const { buildStatuses } = useAppContext();
  const currentTag = getTagForImage(buildStatuses, image, selectedImage?.name, selectedTag?.name);
  const tags = image.tags || [];
  const getImagePopover = (image: ImageInfo) => {
    if (!image.description && !currentTag?.content?.dependencies?.length) {
      return null;
    }
    return <ImageTagPopover tag={currentTag} description={image.description} />;
  };

  const disabled = tags.every((tag) => !isImageTagBuildValid(buildStatuses, image, tag));

  return (
    <>
      <Radio
        id={image.name}
        data-id={image.name}
        name={image.display_name}
        className="odh-notebook-controller__notebook-image-option"
        isDisabled={disabled}
        label={
          <Flex spaceItems={{ default: 'spaceItemsXs' }}>
            <FlexItem>{image.display_name}</FlexItem>
            {tags.length > 1 ? (
              <FlexItem>
                {getImageTagVersion(buildStatuses, image, selectedImage?.name, selectedTag?.name)}
              </FlexItem>
            ) : null}
            <FlexItem>{getImagePopover(image)}</FlexItem>
          </Flex>
        }
        description={getDescriptionForTag(currentTag)}
        isChecked={image.name === selectedImage?.name}
        onChange={(checked: boolean) => {
          if (currentTag) {
            handleSelection(image, currentTag, checked);
          }
        }}
      />
      <ImageVersions
        image={image}
        tags={tags}
        selectedTag={image.name === selectedImage?.name ? selectedTag : undefined}
        onSelect={(tag, checked) => handleSelection(image, tag, checked)}
      />
    </>
  );
};

export default ImageSelector;
