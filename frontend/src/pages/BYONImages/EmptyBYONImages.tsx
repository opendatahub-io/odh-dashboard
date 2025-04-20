import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportBYONImageButton from './ImportBYONImageButton';

type EmptyBYONImagesProps = {
  refresh: () => void;
};

const EmptyBYONImages: React.FC<EmptyBYONImagesProps> = ({ refresh }) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      icon={PlusCircleIcon}
      titleText="No custom workbench images"
      variant={EmptyStateVariant.full}
      data-id="empty-empty-state"
    >
      <EmptyStateBody>To get started, import a custom workbench image.</EmptyStateBody>
      <EmptyStateFooter>
        <ImportBYONImageButton refresh={refresh} />
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default EmptyBYONImages;
