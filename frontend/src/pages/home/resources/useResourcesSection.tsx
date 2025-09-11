import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
  Stack,
  StackItem,
  ContentVariants,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import OdhDocCard from '#~/components/OdhDocCard';
import ScrolledGallery from '#~/concepts/design/ScrolledGallery';
import CollapsibleSection from '#~/concepts/design/CollapsibleSection';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { useSpecifiedResources } from './useSpecifiedResources';

const includedCards = [
  { name: 'create-jupyter-notebook', kind: 'OdhQuickStart' },
  { name: 'rhoai-tutorial-fraud', kind: 'OdhDocument' },
  { name: 'rhoai-documentation', kind: 'OdhDocument' },
  { name: 'watson-x-use-case', kind: 'OdhDocument' },
  { name: 'openvino-inference-notebook', kind: 'OdhQuickStart' },
];

export const useResourcesSection = (): React.ReactNode => {
  const navigate = useNavigate();
  const { docs, loaded, loadError } = useSpecifiedResources(includedCards);
  const [resourcesOpen, setResourcesOpen] = useBrowserStorage<boolean>(
    'odh.home.learning-resources.open',
    true,
    true,
    false,
  );

  if (!loadError && (!loaded || docs.length === 0)) {
    return null;
  }

  return (
    <PageSection
      variant="secondary"
      hasBodyWrapper={false}
      data-testid="landing-page-learning-resources"
    >
      <CollapsibleSection
        title="Get oriented with learning resources"
        titleVariant={ContentVariants.h1}
        open={resourcesOpen}
        setOpen={setResourcesOpen}
      >
        <Stack hasGutter>
          {loadError ? (
            <EmptyState
              headingLevel="h3"
              icon={ExclamationCircleIcon}
              titleText="Error loading learning resources"
              variant={EmptyStateVariant.lg}
              data-id="error-empty-state"
            >
              <EmptyStateBody>{loadError.message}</EmptyStateBody>
            </EmptyState>
          ) : (
            <ScrolledGallery count={docs.length} childWidth="330px">
              {docs.map((doc) => (
                <OdhDocCard
                  data-testid={`resource-card-${doc.metadata.name}`}
                  key={`${doc.metadata.name}`}
                  odhDoc={doc}
                  showFavorite={false}
                />
              ))}
            </ScrolledGallery>
          )}

          <StackItem>
            <Button
              data-testid="goto-learning-resources-link"
              // Should not use component="a" due to no href
              isInline
              variant="link"
              onClick={() => navigate('/resources')}
            >
              Go to <b>Learning resources</b>
            </Button>
          </StackItem>
        </Stack>
      </CollapsibleSection>
    </PageSection>
  );
};
