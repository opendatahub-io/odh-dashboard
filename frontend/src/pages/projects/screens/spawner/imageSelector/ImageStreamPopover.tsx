import * as React from 'react';
import { Button, Popover, Stack, StackItem } from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import {
  getImageStreamDescription,
  getImageVersionDependencies,
} from '#~/pages/projects/screens/spawner/spawnerUtils';
import { ImageStreamAndVersion } from '#~/types';
import NotebookImagePackageDetails from '#~/pages/projects/notebook/NotebookImagePackageDetails';

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
        headerContent="Package information"
        bodyContent={
          <Stack hasGutter>
            <StackItem>{description}</StackItem>
            {dependencies.length !== 0 && (
              <StackItem>
                <NotebookImagePackageDetails
                  title="Packages included"
                  dependencies={dependencies}
                />
              </StackItem>
            )}
          </Stack>
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
