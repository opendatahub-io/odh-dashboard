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
            ? `Showing ${shownModelCount} of all models`
            : 'Showing all models'}
        </Content>
      ) : null}
    </FlexItem>
    <FlexItem>
      <Link data-testid="goto-model-catalog-link" to="/modelCatalog">
        Go to <b>Model catalog</b>
      </Link>
    </FlexItem>
  </Flex>
);

export default ModelCatalogSectionFooter;
