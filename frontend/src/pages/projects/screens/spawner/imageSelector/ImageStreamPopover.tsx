import * as React from 'react';
import { Button, Popover, Title } from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import {
  getImageStreamDescription,
  getImageVersionDependencies,
  getNameVersionString,
} from '../spawnerUtils';
import { ImageStreamAndVersion } from '../../../../../types';

type ImageStreamPopoverProps = {
  selectedImage: ImageStreamAndVersion;
};

const ImageStreamPopover: React.FC<ImageStreamPopoverProps> = ({ selectedImage }) => {
  const { imageStream, imageVersion } = selectedImage;

  if (!imageStream || !imageVersion) {
    return null;
  }

  const description = getImageStreamDescription(imageStream);
  const dependencies = getImageVersionDependencies(imageVersion, false);

  if (!description && dependencies.length === 0) {
    return null;
  }

  return (
    // have to use <span> here to make sure the Button is inline, maybe it's an PF bug
    <span>
      <Popover
        headerContent={description}
        bodyContent={
          dependencies.length !== 0 && (
            <>
              <Title headingLevel="h6">Packages included:</Title>
              {dependencies.map((dep) => {
                const depString = getNameVersionString(dep);
                return <p key={depString}>{depString}</p>;
              })}
            </>
          )
        }
        position="right"
      >
        <Button isInline variant="link" icon={<QuestionCircleIcon />}>
          View package information
        </Button>
      </Popover>
    </span>
  );
};

export default ImageStreamPopover;
