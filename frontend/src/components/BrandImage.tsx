import * as React from 'react';
import classNames from 'classnames';
import { Brand } from '@patternfly/react-core';
import { RocketIcon } from '@patternfly/react-icons';

type BrandImageProps = {
  src: string;
  className?: string;
  alt: string;
};

const BrandImage: React.FC<BrandImageProps> = ({ src, className, ...props }) => {
  const [image, setImage] = React.useState<{ imgSrc: string; isValid: boolean }>({
    imgSrc: '',
    isValid: true,
  });

  const brandClasses = classNames('odh-card__header-brand', className, {
    'pf-c-brand': !image.isValid,
    'odh-card__header-fallback-img': !image.isValid,
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

  return image.isValid ? (
    <Brand
      {...props}
      className={brandClasses}
      src={image.imgSrc}
      onError={() => setImage((prevImage) => ({ imgSrc: prevImage.imgSrc, isValid: false }))}
    />
  ) : (
    <RocketIcon className={brandClasses} {...props} />
  );
};

export default BrandImage;
