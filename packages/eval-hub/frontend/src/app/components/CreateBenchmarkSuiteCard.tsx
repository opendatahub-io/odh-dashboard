import * as React from 'react';
import { Bullseye, Button, Card, CardBody, Content, Title } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';

type CreateBenchmarkSuiteCardProps = {
  createSuiteRoute?: string;
  onCreateSuite?: () => void;
};

const CreateBenchmarkSuiteCard: React.FC<CreateBenchmarkSuiteCardProps> = ({
  createSuiteRoute,
  onCreateSuite = () => undefined,
}) => (
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
        Create your own suite
      </Title>
      <Content component="p" className="evalhub-create-suite-card__description">
        Build a reusable evaluation suite by selecting benchmarks, setting thresholds, and
        configuring pass criteria.
      </Content>
      {createSuiteRoute ? (
        <Button
          className="evalhub-create-suite-card__button"
          variant="secondary"
          component={(props) => <Link {...props} to={createSuiteRoute} />}
          data-testid="create-suite-button"
        >
          Create suite
        </Button>
      ) : (
        <Button
          className="evalhub-create-suite-card__button"
          variant="secondary"
          onClick={onCreateSuite}
          data-testid="create-suite-button"
        >
          Create suite
        </Button>
      )}
    </CardBody>
  </Card>
);

export default CreateBenchmarkSuiteCard;
