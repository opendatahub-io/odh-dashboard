import * as React from 'react';
import { Button, Content, Flex, FlexItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';

type ModelCatalogSectionFooterProps = {
  shownModelCount: number;
  totalModelCount: number;
};

const ModelCatalogSectionFooter: React.FC<ModelCatalogSectionFooterProps> = ({
  shownModelCount,
  totalModelCount,
}) => {
  const navigate = useNavigate();

  return (
    <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        {shownModelCount ? (
          <Content>
            <Content component="small">
              {shownModelCount < totalModelCount
                ? `Showing ${shownModelCount} of all models`
                : 'Showing all models'}
            </Content>
          </Content>
        ) : null}
      </FlexItem>
      <FlexItem>
        <Button
          data-testid="goto-model-catalog-link"
          variant="link"
          isInline
          onClick={() => navigate('/modelCatalog')}
        >
          Go to <b>Model catalog</b>
        </Button>
      </FlexItem>
    </Flex>
  );
};

export default ModelCatalogSectionFooter;
