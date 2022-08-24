import * as React from 'react';
import { ExpandableSection, Label, Radio } from '@patternfly/react-core';
import { StarIcon } from '@patternfly/react-icons';
import { ImageInfo, ImageTagInfo } from '../../../../types';
import ImageTagPopover from './ImageTagPopover';
import {
  compareTagVersions,
  getDescriptionForTag,
  getVersion,
  isImageTagBuildValid,
} from '../../../../utilities/imageUtils';
import AppContext from 'app/AppContext';

import '../../NotebookController.scss';

type ImageVersionsProps = {
  image: ImageInfo;
  tags: ImageTagInfo[];
  selectedTag?: ImageTagInfo;
  onSelect: (tag: ImageTagInfo, selected: boolean) => void;
};

const ImageVersions: React.FC<ImageVersionsProps> = ({ image, tags, selectedTag, onSelect }) => {
  const { buildStatuses } = React.useContext(AppContext);
  const [isExpanded, setExpanded] = React.useState<boolean>(false);
  if (!image.tags || image.tags.length < 2) {
    return null;
  }
  const onToggle = (isOpen: boolean) => {
    setExpanded(isOpen);
  };

  return (
    <ExpandableSection
      toggleText="Versions"
      onToggle={onToggle}
      isExpanded={isExpanded}
      className="odh-notebook-controller__notebook-image-tags"
    >
      {[...tags].sort(compareTagVersions).map((tag: ImageTagInfo) => {
        const disabled = !isImageTagBuildValid(buildStatuses, image, tag);
        return (
          <Radio
            key={`${image.name}:${tag.name}`}
            id={`${image.name}:${tag.name}`}
            name={`${image.name}:${tag.name}`}
            className="odh-notebook-controller__notebook-image-option"
            isDisabled={disabled}
            label={
              <span className="odh-notebook-controller__notebook-image-title">
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
            isChecked={tag.name === selectedTag?.name}
            onChange={(checked: boolean) => onSelect(tag, checked)}
          />
        );
      })}
    </ExpandableSection>
  );
};

export default ImageVersions;
