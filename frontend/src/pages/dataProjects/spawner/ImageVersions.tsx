import * as React from 'react';
import { ExpandableSection, Label, Radio } from '@patternfly/react-core';
import { StarIcon } from '@patternfly/react-icons';
import { ImageType } from '../../../types';
import ImageTagPopover from './ImageTagPopover';
import {
  compareTagVersions,
  getDescriptionForTag,
  getVersion,
  isImageTagBuildValid,
} from '../../../utilities/imageUtils';

type ImageVersionsProps = {
  image: ImageType;
  selectedTag?: string;
  onSelect: (tagName: string, selected: boolean) => void;
};

const ImageVersions: React.FC<ImageVersionsProps> = ({ image, selectedTag, onSelect }) => {
  const [isExpanded, setExpanded] = React.useState<boolean>(false);
  const onToggle = (isOpen: boolean) => {
    setExpanded(isOpen);
  };
  if (!image.tags || image.tags.length < 2) {
    return null;
  }

  return (
    <ExpandableSection
      toggleText="Versions"
      onToggle={onToggle}
      isExpanded={isExpanded}
      className="odh-data-projects__notebook-image-tags"
    >
      {image.tags.sort(compareTagVersions).map((tag) => {
        const disabled = !isImageTagBuildValid(tag);
        return (
          <Radio
            key={`${image.name}:${tag.name}`}
            id={`${image.name}:${tag.name}`}
            name={`${image.name}:${tag.name}`}
            className="odh-data-projects__notebook-image-option"
            isDisabled={disabled}
            label={
              <span className="odh-data-projects__notebook-image-title">
                Version{` ${getVersion(tag.name)}`}
                <ImageTagPopover tag={tag} />
                {tag.recommended ? (
                  <Label color="blue" icon={<StarIcon />}>
                    Recommended
                  </Label>
                ) : null}
              </span>
            }
            description={getDescriptionForTag(tag)}
            isChecked={tag.name === selectedTag}
            onChange={(checked: boolean) => onSelect(tag.name, checked)}
          />
        );
      })}
    </ExpandableSection>
  );
};

export default ImageVersions;
