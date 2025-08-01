import React from 'react';
import {
  Card,
  CardTitle,
  CardBody,
  CardFooter,
  Button,
  Gallery,
  GalleryItem,
  Bullseye,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { SectionType } from '@odh-dashboard/internal/concepts/design/utils';
import OverviewCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/components/OverviewCard';
import type { ModelServingPlatform } from '../concepts/useProjectServingPlatform';

// Shared card component for platform selection -
export const PlatformSelectionCard: React.FC<{
  platform: ModelServingPlatform;
  onSelect: () => void;
  loading?: boolean;
  useOverviewCard?: boolean;
}> = ({ platform, onSelect, loading, useOverviewCard }) => {
  if (useOverviewCard) {
    return (
      <OverviewCard
        objectType={platform.properties.enableCardText.objectType}
        sectionType={SectionType.serving}
        title={platform.properties.enableCardText.title}
        data-testid={`${platform.properties.id}-platform-card`}
      >
        <CardBody>{platform.properties.enableCardText.description}</CardBody>
        <CardFooter>
          <Button
            isLoading={loading}
            isDisabled={loading}
            variant="secondary"
            onClick={onSelect}
            data-testid={`${platform.properties.id}-select-button`}
          >
            {platform.properties.enableCardText.selectText}
          </Button>
        </CardFooter>
      </OverviewCard>
    );
  }
  return (
    <Card
      style={{
        height: '100%',
        border: '1px solid var(--pf-t--global--border--color--default)',
        borderRadius: 16,
      }}
      data-testid={`${platform.properties.id}-platform-card`}
    >
      <CardTitle>
        <Content component={ContentVariants.h2}>{platform.properties.enableCardText.title}</Content>
      </CardTitle>
      <CardBody>{platform.properties.enableCardText.description}</CardBody>
      <CardFooter>
        <Bullseye>
          <Button
            isLoading={loading}
            isDisabled={loading}
            variant="secondary"
            onClick={onSelect}
            data-testid={`${platform.properties.id}-select-button`}
          >
            {platform.properties.enableCardText.selectText}
          </Button>
        </Bullseye>
      </CardFooter>
    </Card>
  );
};

// Shared gallery component for platform selection -
export const PlatformSelectionGallery: React.FC<{
  platforms: ModelServingPlatform[];
  onSelect: (platform: ModelServingPlatform) => void;
  loadingPlatformId?: string | null;
  useOverviewCard?: boolean;
  galleryProps?: React.ComponentProps<typeof Gallery>;
}> = ({ platforms, onSelect, loadingPlatformId, useOverviewCard, galleryProps }) => (
  <Gallery hasGutter {...galleryProps}>
    {platforms.map((p) => (
      <GalleryItem key={p.properties.id}>
        <PlatformSelectionCard
          platform={p}
          onSelect={() => onSelect(p)}
          loading={loadingPlatformId === p.properties.id}
          useOverviewCard={useOverviewCard}
        />
      </GalleryItem>
    ))}
  </Gallery>
);
