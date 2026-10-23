import * as React from 'react';
import { Button, Card, CardBody, Content, Title } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { trackEvalHubEvent, type EvalHubCollectionSurface } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

type CreateBenchmarkSuiteCardProps = {
  createSuiteRoute?: string;
  createSuiteRouteState?: unknown;
  trackingSurface?: EvalHubCollectionSurface;
  onCreateSuite?: () => void;
};

const CreateBenchmarkSuiteCard: React.FC<CreateBenchmarkSuiteCardProps> = ({
  createSuiteRoute,
  createSuiteRouteState,
  trackingSurface = 'collection_gallery',
  onCreateSuite = () => undefined,
}) => (
  <Card
    className="evalhub-create-suite-card"
    isFullHeight
    variant="secondary"
    data-testid="create-suite-card"
  >
    <CardBody className="evalhub-create-suite-card__body">
      {/* Not Bullseye: its height: 100% is reapplied by the duplicate PatternFly styles
          the federated page loads (separate host/remote copies), stretching this fixed-size badge */}
      <div
        className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-justify-content-center evalhub-create-suite-card__icon"
        aria-hidden="true"
      >
        <PlusIcon />
      </div>
      <Title headingLevel="h3" size="md" className="evalhub-create-suite-card__title">
        Create your own collection
      </Title>
      <Content component="p" className="evalhub-create-suite-card__description">
        Build a reusable collection by selecting benchmarks, setting thresholds, and configuring
        pass criteria.
      </Content>
      {createSuiteRoute ? (
        <Button
          className="evalhub-create-suite-card__button"
          variant="secondary"
          component={(props) => (
            <Link {...props} to={createSuiteRoute} state={createSuiteRouteState} />
          )}
          onClick={() =>
            trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED, {
              surface: trackingSurface,
            })
          }
          data-testid="create-suite-button"
        >
          Create collection
        </Button>
      ) : (
        <Button
          className="evalhub-create-suite-card__button"
          variant="secondary"
          onClick={() => {
            trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED, {
              surface: trackingSurface,
            });
            onCreateSuite();
          }}
          data-testid="create-suite-button"
        >
          Create collection
        </Button>
      )}
    </CardBody>
  </Card>
);

export default CreateBenchmarkSuiteCard;
