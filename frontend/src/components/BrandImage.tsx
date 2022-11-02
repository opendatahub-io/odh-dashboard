import * as React from 'react';
import classNames from 'classnames';
import { Brand, Skeleton } from '@patternfly/react-core';
import { RocketIcon } from '@patternfly/react-icons';

type BrandImageProps = {
  src: string;
  className?: string;
  alt: string;
};

const BrandImage: React.FC<BrandImageProps> = ({ src, className, ...props }) => {
  const [image, setImage] = React.useState<{ imgSrc: string; isValid: boolean }>({
    imgSrc: '',
    isValid: false,
  });

  React.useEffect(() => {
    let newSrc = src;
    const parser = new DOMParser();
    const parsed = parser.parseFromString(src, 'text/xml');
    if (parsed.getElementsByTagName('parsererror').length === 0) {
      newSrc = `data:image/svg+xml;base64,${btoa(src)}`;
    }
    setImage({ imgSrc: newSrc, isValid: !!src });
  }, [src]);

  if (!image.imgSrc) {
    return <Skeleton shape="square" width="40px" screenreaderText="Brand image loading" />;
  }

  const brandClasses = classNames('odh-card__header-brand', className, {
    'pf-c-brand': !image.isValid,
    'odh-card__header-fallback-img': !image.isValid,
  });

  if (!image.isValid) {
    return <RocketIcon className={brandClasses} {...props} />;
  }

  return (
    <Brand
      {...props}
      className={brandClasses}
      src={image.imgSrc}
      onError={() => setImage((prevImage) => ({ imgSrc: prevImage.imgSrc, isValid: false }))}
    />
  );
};

export default BrandImage;
