import React from 'react';
import { Banner } from '@patternfly/react-core/dist/esm/components/Banner';
import { Flex, FlexItem } from '@patternfly/react-core/dist/esm/layouts/Flex';
import { ExclamationTriangleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import { SHOW_PRE_GA_BANNER } from '~/shared/utilities/const';

const PreGABanner: React.FC = () => {
  // Hide banner if flag is disabled
  if (!SHOW_PRE_GA_BANNER) {
    return null;
  }

  // Example link - TODO: replace with redirect URL
  const placeholderLink = 'https://kubeflow.org';

  return (
    <Banner
      status="warning"
      isSticky
      screenReaderText="Warning: This is a pre-GA product."
      data-testid="pre-ga-warning-banner"
    >
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <ExclamationTriangleIcon
            // TODO: Remove when https://github.com/opendatahub-io/mod-arch-library/issues/99
            className="pf-v6-u-text-color-inverse"
          />
        </FlexItem>
        <FlexItem
          // TODO: Remove when https://github.com/opendatahub-io/mod-arch-library/issues/99 is completed
          className="pf-v6-u-text-color-inverse"
        >
          This is a pre-GA product.{' '}
          <a
            // TODO: Remove when https://github.com/opendatahub-io/mod-arch-library/issues/99 is completed
            className="pf-v6-u-text-color-inverse"
            href={placeholderLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </FlexItem>
      </Flex>
    </Banner>
  );
};

export default PreGABanner;
