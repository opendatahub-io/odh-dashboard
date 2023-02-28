import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

type ExternalLinkProps = {
  text: string;
  to: string;
};

const ExternalLink: React.FC<ExternalLinkProps> = ({ text, to }) => (
  <Button
    variant="link"
    isInline
    onClick={() => window.open(to)}
    icon={<ExternalLinkAltIcon />}
    iconPosition="right"
  >
    {text}
  </Button>
);

export default ExternalLink;
