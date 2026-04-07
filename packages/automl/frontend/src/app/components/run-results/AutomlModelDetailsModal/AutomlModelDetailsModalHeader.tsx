import React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Tooltip,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import { formatMetricName, formatMetricValue, isErrorMetric } from '~/app/utilities/utils';
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
    value: isErrorMetric(evalMetric) ? Math.abs(numericMetricValue) : numericMetricValue,
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
  isDownloadDisabled,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
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
        {onSaveNotebook && (
          <Button
            variant="primary"
            onClick={onSaveNotebook}
            data-testid="model-details-save-notebook"
          >
            Save as notebook
          </Button>
        )}
      </div>
    </div>
  );
};

export default AutomlModelDetailsModalHeader;
