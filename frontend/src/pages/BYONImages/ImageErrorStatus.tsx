import * as React from 'react';
import { Icon, Tooltip } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { BYONImage } from '#~/types';

type ImageErrorStatusProps = {
  image: BYONImage;
};

const ImageErrorStatus: React.FC<ImageErrorStatusProps> = ({ image }) => {
  if (!image.error) {
    return null;
  }
  return (
    <Tooltip role="none" content={image.error}>
      <Icon role="button" aria-label="error icon" status="danger" isInline tabIndex={0}>
        <ExclamationCircleIcon />
      </Icon>
    </Tooltip>
  );
};

export default ImageErrorStatus;
