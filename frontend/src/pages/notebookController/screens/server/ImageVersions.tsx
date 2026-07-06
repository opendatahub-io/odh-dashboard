import * as React from 'react';
import { ExpandableSection, Flex, FlexItem, Label, Radio } from '@patternfly/react-core';
import { StarIcon } from '@patternfly/react-icons';
import { ImageInfo, ImageTagInfo } from '#~/types';
import {
  compareTagVersions,
  getDescriptionForTag,
  getVersion,
  isImageTagBuildValid,
} from '#~/utilities/imageUtils';
import { useAppContext } from '#~/app/AppContext';
import ImageTagPopover from './ImageTagPopover';

import '#~/pages/notebookController/NotebookController.scss';

type ImageVersionsProps = {
  image: ImageInfo;
  tags: ImageTagInfo[];
  selectedTag?: ImageTagInfo;
  onSelect: (tag: ImageTagInfo, selected: boolean) => void;
};

const ImageVersions: React.FC<ImageVersionsProps> = ({ image, tags, selectedTag, onSelect }) => {
  const { buildStatuses } = useAppContext();
  const [isExpanded, setExpanded] = React.useState(false);
  if (image.tags.length < 2) {
    return null;
  }
  const onToggle = (isOpen: boolean) => {
    setExpanded(isOpen);
  };

  return (
    <ExpandableSection
      toggleText="Versions"
      onToggle={(e, isOpen: boolean) => onToggle(isOpen)}
      isExpanded={isExpanded}
      className="odh-notebook-controller__notebook-image-tags"
    >
      {tags.toSorted(compareTagVersions).map((tag: ImageTagInfo) => {
        const disabled = !isImageTagBuildValid(buildStatuses, image, tag);
        return (
          <Radio
            key={`${image.name}:${tag.name}`}
            id={`${image.name}:${tag.name}`}
            data-id={`${image.name}:${tag.name}`}
            name={`${image.name}:${tag.name}`}
            className="odh-notebook-controller__notebook-image-option"
            isDisabled={disabled}
            label={
              <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                <FlexItem>Version{` ${getVersion(tag.name)}`}</FlexItem>
                <FlexItem>
                  <ImageTagPopover tag={tag} />
                </FlexItem>
                {tag.recommended ? (
                  <FlexItem>
                    <Label color="blue" icon={<StarIcon />}>
                      Latest
                    </Label>
                  </FlexItem>
                ) : null}
              </Flex>
            }
            description={getDescriptionForTag(tag)}
            isChecked={tag.name === selectedTag?.name}
            onChange={(e, checked: boolean) => onSelect(tag, checked)}
            data-testid={`radio ${image.name}-${tag.name}`}
          />
        );
      })}
    </ExpandableSection>
  );
};

export default ImageVersions;
