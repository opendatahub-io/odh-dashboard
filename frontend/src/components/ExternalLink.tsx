import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
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
      const props : LinkTrackingEventProperties = {
        href: to,
        from: window.location.pathname,
      }
      fireTrackingEvent('ExternalLink Clicked',  props);
    }}
    icon={<ExternalLinkAltIcon />}
    iconPosition="right"
  >
    {text}
  </Button>
);

export default ExternalLink;
