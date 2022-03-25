import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ImageStreamTag } from '../../../types';
import { getNameVersionString, getTagDependencies } from '../../../utilities/imageUtils';

type ImageStreamTagPopoverProps = {
  tag: ImageStreamTag;
  description?: string;
};

const ImageStreamTagPopover: React.FC<ImageStreamTagPopoverProps> = ({ tag, description }) => {
  const dependencies = getTagDependencies(tag) ?? [];
  if (!description && !dependencies.length) {
    return null;
  }
  return (
    <Popover
      className="odh-data-projects__notebook-image-popover"
      showClose
      bodyContent={
        <>
          <p className="odh-data-projects__notebook-image-popover-title">{description}</p>
          {dependencies.length > 0 ? (
            <>
              <p className="odh-data-projects__notebook-image-popover-package-title">
                Packages included:
              </p>
              {dependencies.map((dependency) => (
                <p key={dependency.name}>{getNameVersionString(dependency)}</p>
              ))}
            </>
          ) : null}
        </>
      }
    >
      <OutlinedQuestionCircleIcon />
    </Popover>
  );
};

export default ImageStreamTagPopover;
