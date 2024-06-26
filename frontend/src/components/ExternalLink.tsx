import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
import { LinkTrackingEventProperties } from '~/concepts/analyticsTracking/trackingProperties';

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
      fireTrackingEvent('ExternalLink Clicked', {
        href: to,
        from: window.location.pathname,
      } as LinkTrackingEventProperties);
    }}
    icon={<ExternalLinkAltIcon />}
    iconPosition="right"
  >
    {text}
  </Button>
);

export default ExternalLink;
