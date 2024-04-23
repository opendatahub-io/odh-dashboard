import * as React from 'react';
import { Gallery, Skeleton } from '@patternfly/react-core';

const ResourcesLoading: React.FC = () => (
  <Gallery hasGutter minWidths={{ default: '330px' }} maxWidths={{ default: '330px' }}>
    <Skeleton style={{ height: 385 }} />
    <Skeleton style={{ height: 385 }} />
    <Skeleton style={{ height: 385 }} />
  </Gallery>
);

export default ResourcesLoading;
