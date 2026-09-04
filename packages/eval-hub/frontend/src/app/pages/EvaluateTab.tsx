import * as React from 'react';
import {
  Bullseye,
  Button,
  Card,
  CardBody,
  Content,
  Gallery,
  GalleryItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';

const EvaluateTab: React.FC = () => (
  <Stack
    className="evalhub-evaluations-tab-content evalhub-evaluate-tab"
    data-testid="evaluate-tab-content"
  >
    <StackItem>
      <Title headingLevel="h2" size="lg">
        My benchmark suites
      </Title>
    </StackItem>
    <StackItem>
      <Gallery hasGutter minWidths={{ default: '300px' }} maxWidths={{ default: '400px' }}>
        <GalleryItem>
          <Card
            className="evalhub-create-suite-card"
            isFullHeight
            variant="secondary"
            data-testid="create-suite-card"
          >
            <CardBody className="evalhub-create-suite-card__body">
              <Bullseye className="evalhub-create-suite-card__icon" aria-hidden="true">
                <PlusIcon />
              </Bullseye>
              <Title headingLevel="h3" size="md" className="evalhub-create-suite-card__title">
                Create from scratch
              </Title>
              <Content component="p" className="evalhub-create-suite-card__description">
                Start with a blank suite and choose your own benchmarks, thresholds, and pass
                criteria.
              </Content>
              <Button variant="secondary" onClick={() => null} data-testid="create-suite-button">
                Create suite
              </Button>
            </CardBody>
          </Card>
        </GalleryItem>
      </Gallery>
    </StackItem>
  </Stack>
);

export default EvaluateTab;
