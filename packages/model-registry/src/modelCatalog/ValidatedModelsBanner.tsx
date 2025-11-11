import React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '@odh-dashboard/internal/components/browserStorage/BrowserStorageContext';
import validatedModelsBannerImg from '@odh-dashboard/internal/images/validated-models-banner.svg';

const BANNER_STORAGE_KEY = 'odh.dashboard.modelCatalog.validatedModelsBanner.dismissed';

const ValidatedModelsBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useBrowserStorage<boolean>(BANNER_STORAGE_KEY, false);

  const handleDismiss = React.useCallback(() => {
    setIsDismissed(true);
  }, [setIsDismissed]);

  const handleExploreClick = React.useCallback(() => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('validated', 'true');
    window.history.pushState({}, '', currentUrl.toString());

    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, []);
  if (isDismissed) {
    return null;
  }

  return (
    <Card
      variant="secondary"
      data-testid="validated-models-banner"
      style={{ marginBottom: 'var(--pf-v6-global--spacer--md)', position: 'relative' }}
    >
      <Button
        variant="plain"
        aria-label="Dismiss banner"
        onClick={handleDismiss}
        icon={<TimesIcon />}
        data-testid="dismiss-banner-button"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 1,
        }}
      />

      <Flex
        direction={{ default: 'row' }}
        alignItems={{ default: 'alignItemsStretch' }}
        flexWrap={{ default: 'nowrap' }}
      >
        <Flex flex={{ default: 'flex_1' }} direction={{ default: 'column' }}>
          <CardHeader>
            <Title headingLevel="h3" size="lg">
              Validated models by Red Hat AI
            </Title>
          </CardHeader>
          <CardBody>
            <p>
              Validated models by Red Hat AI offer confidence, predictability, and flexibility when
              deploying third-party generative AI models across the Red Hat AI platform.
            </p>
          </CardBody>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={handleExploreClick}
              data-testid="explore-validated-models-button"
            >
              Explore Red Hat AI validated models
            </Button>
          </CardFooter>
        </Flex>

        <FlexItem alignSelf={{ default: 'alignSelfStretch' }} style={{ overflow: 'hidden' }}>
          <img
            src={validatedModelsBannerImg}
            alt="Red Hat AI validated models illustration"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '200px',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </FlexItem>
      </Flex>
    </Card>
  );
};

export default ValidatedModelsBanner;
