import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireLinkTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

type ExternalLinkProps = {
  text: string;
  to: string;
  testId?: string;
};

const ExternalLink: React.FC<ExternalLinkProps> = ({ text, to, testId }) => (
  <Button
    variant="link"
    data-testid={testId}
    isInline
    component="a"
    href={to}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => {
      fireLinkTrackingEvent('ExternalLink Clicked', { href: to, from: window.location.pathname });
    }}
    icon={<ExternalLinkAltIcon />}
    iconPosition="end"
  >
    {text}
  </Button>
);

export default ExternalLink;
