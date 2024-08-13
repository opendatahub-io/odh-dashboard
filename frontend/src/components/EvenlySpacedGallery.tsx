import * as React from 'react';
import { Gallery, GalleryProps } from '@patternfly/react-core';

type EvenlySpacedGalleryProps = Omit<GalleryProps, 'minWidths' | 'maxWidths'> & {
  minSize?: string;
  itemCount: number;
};

const EvenlySpacedGallery: React.FC<EvenlySpacedGalleryProps> = ({
  minSize,
  itemCount,
  hasGutter,
  children,
  ...rest
}) => {
  const galleryWidths = `calc(${100 / itemCount}%${
    hasGutter ? ` - (1rem * ${itemCount - 1} / ${itemCount})` : ''
  })`;

  return (
    <Gallery
      hasGutter={hasGutter}
      minWidths={{ default: minSize || galleryWidths }}
      maxWidths={{ default: galleryWidths }}
      {...rest}
    >
      {children}
    </Gallery>
  );
};

export default EvenlySpacedGallery;
