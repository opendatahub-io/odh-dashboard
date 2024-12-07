import * as React from 'react';
import { Brand, Skeleton } from '@patternfly/react-core';
import { RocketIcon } from '@patternfly/react-icons';

type BrandImageProps = {
  src: string;
  alt: string;
};

const BrandImage: React.FC<BrandImageProps> = ({ src, ...props }) => {
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

  if (!image.isValid) {
    return <RocketIcon height={40} width={40} {...props} />;
  }

  return (
    <Brand
      {...props}
      className="odh-brand"
      heights={{ default: '40px' }}
      widths={{ default: '100%' }}
      onError={() => setImage((prevImage) => ({ imgSrc: prevImage.imgSrc, isValid: false }))}
    >
      <source srcSet={image.imgSrc} />
    </Brand>
  );
};

export default BrandImage;
