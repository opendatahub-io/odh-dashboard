import * as React from 'react';
import { Button, Card, CardBody, Content, Title, Tooltip } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { trackEvalHubEvent, type EvalHubCollectionSurface } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

type CreateBenchmarkSuiteCardProps = {
  createSuiteRoute?: string;
  createSuiteRouteState?: unknown;
  trackingSurface?: EvalHubCollectionSurface;
  onCreateSuite?: () => void;
  /** Opens the import dialog; when omitted the Import button is not rendered. */
  onImport?: () => void;
  importDisabled?: boolean;
};

const CreateBenchmarkSuiteCard: React.FC<CreateBenchmarkSuiteCardProps> = ({
  createSuiteRoute,
  createSuiteRouteState,
  trackingSurface = 'collection_gallery',
  onCreateSuite = () => undefined,
  onImport,
  importDisabled = false,
}) => (
  <Card className="evalhub-create-suite-card" isFullHeight data-testid="create-suite-card">
    <CardBody className="evalhub-create-suite-card__body">
      {/* Not Bullseye: its height: 100% is reapplied by the duplicate PatternFly styles
          the federated page loads (separate host/remote copies), stretching this fixed-size badge */}
      <div
        className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-justify-content-center evalhub-create-suite-card__icon"
        aria-hidden="true"
      >
        <PlusIcon />
      </div>
      <Title headingLevel="h3" size="xl" className="evalhub-create-suite-card__title">
        Create your own collection
      </Title>
      <Content component="p" className="evalhub-create-suite-card__description">
        Build a reusable collection by selecting benchmarks, setting thresholds, and configuring
        pass criteria.
      </Content>
      <div className="evalhub-create-suite-card__actions">
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
        {onImport ? (
          importDisabled ? (
            <Tooltip
              content="You do not have permission to create collections in this project"
              position="top"
            >
              {/* Span wrapper: hover events do not fire on a disabled button. */}
              <span>
                <Button
                  className="evalhub-create-suite-card__button"
                  variant="tertiary"
                  isDisabled
                  data-testid="import-collection-button"
                >
                  Import
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              className="evalhub-create-suite-card__button"
              variant="tertiary"
              onClick={onImport}
              data-testid="import-collection-button"
            >
              Import
            </Button>
          )
        ) : null}
      </div>
    </CardBody>
  </Card>
);

export default CreateBenchmarkSuiteCard;
