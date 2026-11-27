import * as React from 'react';
import {
  Stack,
  StackItem,
  Switch,
  Content,
  ContentVariants,
  Card,
  CardBody,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ChartBarIcon } from '@patternfly/react-icons';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  MODEL_CATALOG_EVENTS,
  ModelCatalogPerformanceViewToggledProperties,
} from '~/app/pages/modelCatalog/tracking';
import './ModelPerformanceViewToggleCard.scss';

const ModelPerformanceViewToggleCard: React.FC = () => {
  const { performanceViewEnabled, setPerformanceViewEnabled, filterOptionsLoaded } =
    React.useContext(ModelCatalogContext);
  const { trackSimpleEvent } = useUserInteraction();

  const handlePerformanceViewChange = (_event: unknown, checked: boolean) => {
    setPerformanceViewEnabled(checked);
    const properties: ModelCatalogPerformanceViewToggledProperties = { isEnabled: checked };
    trackSimpleEvent(MODEL_CATALOG_EVENTS.PERFORMANCE_VIEW_TOGGLED, properties);
  };

  return (
    <Card style={{ minWidth: '280px' }}>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsXs' }}
            >
              <FlexItem>
                <ChartBarIcon color="var(--pf-t--global--icon--color--status--info--default)" />
              </FlexItem>
              <FlexItem>
                <Switch
                  id="model-performance-view-toggle"
                  label="Model performance view"
                  isChecked={performanceViewEnabled}
                  isReversed
                  isDisabled={!filterOptionsLoaded}
                  onChange={handlePerformanceViewChange}
                  data-testid="model-performance-view-toggle"
                  className="model-performance-switch"
                />
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <Content component={ContentVariants.small}>
              Enable performance filters, display model benchmark data, and exclude unvalidated
              models.
            </Content>
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default ModelPerformanceViewToggleCard;
