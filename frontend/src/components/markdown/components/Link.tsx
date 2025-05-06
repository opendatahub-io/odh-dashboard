import React from 'react';
import { Button } from '@patternfly/react-core';

type LinkProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
};

const Link: React.FC<LinkProps> = ({ children, href = '#', className }) => (
  <Button
    variant="link"
    className={className}
    isInline
    onClick={() => href !== '#' && window.open(href, '_blank')}
  >
    {children}
  </Button>
);

export default Link;
