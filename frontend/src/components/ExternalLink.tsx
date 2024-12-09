import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireLinkTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';

type ExternalLinkProps = {
  text: string;
  to: string;
};

const ExternalLink: React.FC<ExternalLinkProps> = ({ text, to }) => (
  <Button
    variant="link"
    isInline
    onClick={() => {
      window.open(to);
      fireLinkTrackingEvent('ExternalLink Clicked', { href: to, from: window.location.pathname });
    }}
    icon={<ExternalLinkAltIcon />}
    iconPosition="end"
  >
    {text}
  </Button>
);

export default ExternalLink;
