import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ImageTagInfo } from '~/types';
import { getNameVersionString } from '~/utilities/imageUtils';
import '~/pages/notebookController/NotebookController.scss';

type ImageTagPopoverProps = {
  tag?: ImageTagInfo;
  description?: string;
};

const ImageTagPopover: React.FC<ImageTagPopoverProps> = ({ tag, description }) => {
  const dependencies = tag?.content?.dependencies ?? [];
  if (!description && !dependencies.length) {
    return null;
  }
  return (
    <Popover
      removeFindDomNode
      showClose
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
        className="odh-notebook-controller__notebook-image-popover-help-icon"
        isInline
        variant="plain"
        aria-label="More info"
      >
        <OutlinedQuestionCircleIcon />
      </Button>
    </Popover>
  );
};

export default ImageTagPopover;
