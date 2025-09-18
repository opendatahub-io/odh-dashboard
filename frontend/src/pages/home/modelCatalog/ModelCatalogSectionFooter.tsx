import * as React from 'react';
import { Content, Flex, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';

const ModelCatalogSectionFooter: React.FC<{
  shownModelCount: number;
  totalModelCount: number;
}> = ({ shownModelCount, totalModelCount }) => (
  <Flex
    gap={{ default: 'gapMd' }}
    alignItems={{ default: 'alignItemsCenter' }}
    data-testid="model-catalog-footer"
  >
    <FlexItem>
      {shownModelCount ? (
        <Content component="small">
          {shownModelCount < totalModelCount
            ? `${shownModelCount} of ${totalModelCount} models`
            : 'Showing all models'}
        </Content>
      ) : null}
    </FlexItem>
    <FlexItem>
      <Link data-testid="goto-model-catalog-link" to="/ai-hub/catalog">
        Go to <b>AI hub catalog</b>
      </Link>
    </FlexItem>
  </Flex>
);

export default ModelCatalogSectionFooter;
