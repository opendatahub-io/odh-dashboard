import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
  Stack,
  TextVariants,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { OdhDocument } from '~/types';
import OdhDocCard from '~/components/OdhDocCard';
import ScrolledGallery from '~/concepts/design/ScrolledGallery';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import { useBrowserStorage } from '~/components/browserStorage';
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
    'odh.home.resources.open',
    true,
    true,
    false,
  );

  if (!loadError && (!loaded || docs.length === 0)) {
    return null;
  }

  return (
    <PageSection data-testid="landing-page-resources">
      <CollapsibleSection
        title="Get oriented with learning resources"
        titleVariant={TextVariants.h1}
        open={resourcesOpen}
        setOpen={setResourcesOpen}
      >
        <Stack hasGutter>
          {loadError ? (
            <EmptyState variant={EmptyStateVariant.lg} data-id="error-empty-state">
              <EmptyStateHeader
                titleText="Error loading resources"
                icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
                headingLevel="h3"
              />
              <EmptyStateBody>{loadError.message}</EmptyStateBody>
            </EmptyState>
          ) : (
            <ScrolledGallery count={docs.length} childWidth="330px">
              {docs.map((doc) => (
                <OdhDocCard
                  data-testid={`resource-card-${doc.metadata.name}`}
                  key={`${doc.metadata.name}`}
                  odhDoc={doc as unknown as OdhDocument}
                  showFavorite={false}
                  style={{
                    border: '1px solid var(--pf-v5-global--BorderColor--100)',
                    borderRadius: 16,
                  }}
                />
              ))}
            </ScrolledGallery>
          )}
          <Button variant="link" isInline onClick={() => navigate('/resources')}>
            <Button
              data-testid="goto-resources-link"
              component="a"
              isInline
              variant="link"
              onClick={() => navigate('/resources')}
            >
              Go to <b>Resources</b>
            </Button>
          </Button>
        </Stack>
      </CollapsibleSection>
    </PageSection>
  );
};
