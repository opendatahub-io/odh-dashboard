import React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Tooltip,
} from '@patternfly/react-core';
import type { MenuToggleElement } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import { formatMetricName, formatMetricValue } from '~/app/utilities/utils';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalHeaderProps = {
  models: AutomlModel[];
  currentModelName: string;
  rank: number;
  rankMap: Record<string, number>;
  evalMetric: string;
  onSelectModel?: (modelName: string) => void;
  onDownload: () => void;
  onSaveNotebook?: () => void;
  onRegisterModel?: () => void;
  isDownloadDisabled?: boolean;
};

function getOptimizedMetric(
  model: AutomlModel,
  evalMetric: string,
): { name: string; value: number } | undefined {
  // Runtime guard: model.json from the BFF may omit metrics or test_data
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const metrics = model.metrics?.test_data;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!metrics || typeof metrics !== 'object') {
    return undefined;
  }

  // Case-insensitive metric lookup
  const metricKey = Object.keys(metrics).find(
    (key) => key.toLowerCase() === evalMetric.toLowerCase(),
  );

  if (!metricKey) {
    return undefined;
  }

  const numericMetricValue = metrics[metricKey];
  return {
    name: evalMetric,
    value: numericMetricValue,
  };
}

const AutomlModelDetailsModalHeader: React.FC<AutomlModelDetailsModalHeaderProps> = ({
  models,
  currentModelName,
  rank,
  rankMap,
  evalMetric,
  onSelectModel,
  onDownload,
  onSaveNotebook,
  onRegisterModel,
  isDownloadDisabled,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = React.useState(false);
  const model = models.find((m) => m.name === currentModelName);
  const sortedModels = React.useMemo(
    () => models.toSorted((a, b) => (rankMap[a.name] ?? 0) - (rankMap[b.name] ?? 0)),
    [models, rankMap],
  );
  const optimizedMetric = model ? getOptimizedMetric(model, evalMetric) : undefined;

  return (
    <div className="automl-model-details-header">
      <div className="automl-model-details-header-selector">
        <span className="automl-model-details-header-label">Model details</span>
        {models.length > 1 ? (
          <Dropdown
            isOpen={isDropdownOpen}
            onSelect={(_e, value) => {
              onSelectModel?.(String(value));
              setIsDropdownOpen(false);
            }}
            onOpenChange={setIsDropdownOpen}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                isExpanded={isDropdownOpen}
                data-testid="model-selector-dropdown"
              >
                {currentModelName}
              </MenuToggle>
            )}
          >
            <DropdownList>
              {sortedModels.map((m) => (
                <DropdownItem key={m.name} value={m.name}>
                  {m.name}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        ) : (
          <span className="automl-model-details-header-value">{currentModelName}</span>
        )}
      </div>
      <div className="automl-model-details-header-metrics">
        <div className="automl-model-details-header-item">
          <span className="automl-model-details-header-label">Rank</span>
          <span className="automl-model-details-header-value">{rank}</span>
        </div>
        {model && (
          <div className="automl-model-details-header-item">
            <span className="automl-model-details-header-label">
              {formatMetricName(evalMetric)} (Optimized)
            </span>
            <span className="automl-model-details-header-value">
              {optimizedMetric ? (
                formatMetricValue(optimizedMetric.value)
              ) : (
                <Tooltip
                  position="right"
                  content="Metric not available in this model's evaluation data"
                >
                  <span>N/A</span>
                </Tooltip>
              )}
            </span>
          </div>
        )}
      </div>
      <div className="automl-model-details-header-actions">
        <Button
          variant="secondary"
          icon={<DownloadIcon />}
          onClick={onDownload}
          isDisabled={isDownloadDisabled}
          data-testid="model-details-download"
        >
          Download
        </Button>
        {(onSaveNotebook || onRegisterModel) && (
          <Dropdown
            isOpen={isActionsDropdownOpen}
            onSelect={(_e, value) => {
              setIsActionsDropdownOpen(false);
              if (value === 'save-notebook') {
                onSaveNotebook?.();
              } else if (value === 'register-model') {
                onRegisterModel?.();
              }
            }}
            onOpenChange={setIsActionsDropdownOpen}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                variant="primary"
                onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                isExpanded={isActionsDropdownOpen}
                data-testid="model-details-actions-toggle"
              >
                Save as
              </MenuToggle>
            )}
          >
            <DropdownList>
              <DropdownItem
                key="save-notebook"
                value="save-notebook"
                isDisabled={!onSaveNotebook}
                data-testid="model-details-save-notebook"
              >
                Save as notebook
              </DropdownItem>
              <DropdownItem
                key="register-model"
                value="register-model"
                isDisabled={!onRegisterModel}
                data-testid="model-details-register-model"
              >
                Register model
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        )}
      </div>
    </div>
  );
};

export default AutomlModelDetailsModalHeader;
