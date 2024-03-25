import * as React from 'react';
import { Button, Gallery, GalleryProps } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import { TimesIcon } from '@patternfly/react-icons';

type DividedGalleryProps = Omit<GalleryProps, 'minWidths' | 'maxWidths'> & {
  minSize: string;
  itemCount: number;
  showClose?: boolean;
  onClose?: () => void;
};

import './DividedGallery.scss';

const DividedGallery: React.FC<DividedGalleryProps> = ({
  minSize,
  itemCount,
  showClose,
  onClose,
  children,
  className,
  ...rest
}) => (
  <div className={css('odh-divided-gallery', className)} {...rest}>
    <Gallery
      minWidths={{ default: minSize, md: minSize }}
      maxWidths={{ default: '100%', md: `${100 / itemCount}%` }}
    >
      <div className="odh-divided-gallery__border" />
      {children}
      {showClose ? (
        <div className="odh-divided-gallery__close">
          <Button aria-label="close" isInline variant="plain" onClick={onClose}>
            <TimesIcon />
          </Button>
        </div>
      ) : null}
    </Gallery>
  </div>
);

export default DividedGallery;
