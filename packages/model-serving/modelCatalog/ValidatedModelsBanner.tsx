import React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import validatedModelsBannerImg from '@odh-dashboard/internal/images/validated-models-banner.svg';

const BANNER_STORAGE_KEY = 'odh.dashboard.modelCatalog.validatedModelsBanner.dismissed';

const ValidatedModelsBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = React.useState(() => {
    try {
      return localStorage.getItem(BANNER_STORAGE_KEY) === 'true';
    } catch (e) {
      // If localStorage is not available, don't show the banner
      return true;
    }
  });

  const handleDismiss = React.useCallback(() => {
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, 'true');
      setIsDismissed(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save banner dismissal state:', e);
    }
  }, []);

  const handleExploreClick = React.useCallback(() => {
    window.location.href = '/ai-hub/catalog';
  }, []);

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <Card variant="secondary" data-testid="validated-models-banner">
      <Flex
        direction={{ default: 'row' }}
        alignItems={{ default: 'alignItemsStretch' }}
        flexWrap={{ default: 'nowrap' }}
        style={{ minHeight: '200px' }}
      >
        {/* Left side: Content */}
        <Flex flex={{ default: 'flex_1' }} direction={{ default: 'column' }}>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                  <FlexItem flex={{ default: 'flex_1' }}>
                    <Title headingLevel="h3" size="lg">
                      Validated models by Red Hat AI
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="plain"
                      aria-label="Dismiss banner"
                      onClick={handleDismiss}
                      icon={<TimesIcon />}
                      data-testid="dismiss-banner-button"
                    />
                  </FlexItem>
                </Flex>
              </StackItem>
              <StackItem>
                <p>
                  Validated models by Red Hat AI offer confidence, predictability, and flexibility
                  when deploying third-party generative AI models across the Red Hat AI platform.
                </p>
              </StackItem>
            </Stack>
          </CardBody>
          <CardFooter>
            <Button
              variant="link"
              isInline
              onClick={handleExploreClick}
              data-testid="explore-validated-models-button"
            >
              Explore Red Hat AI validated models
            </Button>
          </CardFooter>
        </Flex>

        {/* Right side: Banner image */}
        <FlexItem
          alignSelf={{ default: 'alignSelfStretch' }}
          style={{
            minWidth: '300px',
            maxWidth: '400px',
            backgroundImage: `url(${validatedModelsBannerImg})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center right',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </Flex>
    </Card>
  );
};

export default ValidatedModelsBanner;

