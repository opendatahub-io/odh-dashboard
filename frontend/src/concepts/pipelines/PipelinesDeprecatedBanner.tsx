import * as React from 'react';
import { Banner, Bullseye, Button } from '@patternfly/react-core';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const DOCS_LINK =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_ai_self-managed/2.7/html/release_notes/support-removals_relnotes';

/**
 * @deprecated Remove in v2
 * Short lived, for the remaining of v1.
 */
const PipelinesDeprecatedBanner: React.FC = () => {
  const { status } = useIsAreaAvailable(SupportedArea.DS_PIPELINES);

  if (!status) {
    return null;
  }

  return (
    <Banner variant="blue">
      <Bullseye>
        <div>
          An upcoming update to pipelines may result in limited data accessibility.{' '}
          <Button component="a" variant="link" isInline href={DOCS_LINK} target="_blank">
            Learn more
          </Button>
        </div>
      </Bullseye>
    </Banner>
  );
};

export default PipelinesDeprecatedBanner;
