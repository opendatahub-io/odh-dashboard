import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { ImageTagInfo } from '#~/types';
import { getNameVersionString } from '#~/utilities/imageUtils';
import '#~/pages/notebookController/NotebookController.scss';

type ImageTagPopoverProps = {
  tag?: ImageTagInfo;
  description?: string;
};

const ImageTagPopover: React.FC<ImageTagPopoverProps> = ({ tag, description }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const dependencies = tag?.content.dependencies ?? [];
  if (!description && !dependencies.length) {
    return null;
  }
  return (
    <Popover
      showClose
      isVisible={isVisible}
      shouldOpen={() => setIsVisible(true)}
      shouldClose={() => setIsVisible(false)}
      bodyContent={
        <>
          <p className="odh-notebook-controller__notebook-image-popover-title">{description}</p>
          {dependencies.length > 0 ? (
            <>
              <p className="odh-notebook-controller__notebook-image-popover-package-title">
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
      <Button
        icon={<HelpIcon />}
        hasNoPadding
        aria-label="More info for notebook image"
        variant="plain"
      />
    </Popover>
  );
};

export default ImageTagPopover;
