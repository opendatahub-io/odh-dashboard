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
  const [isSrcValid, setIsSrcValid] = React.useState<boolean>(true);

  const brandClasses = classNames('odh-card__header-brand', className, {
    'pf-c-brand': !isSrcValid,
    'odh-card__header-fallback-img': !isSrcValid,
  });

  React.useEffect(() => {
    setIsSrcValid(!!src);
  }, [src]);

  return isSrcValid ? (
    <Brand {...props} className={brandClasses} src={src} onError={() => setIsSrcValid(false)} />
  ) : (
    <RocketIcon className={brandClasses} {...props} />
  );
};

export default BrandImage;
