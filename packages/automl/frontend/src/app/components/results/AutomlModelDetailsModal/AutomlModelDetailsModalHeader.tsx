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
// TODO: Replace MockAutomlModel with AutomlModel from AutomlResultsContext when integrating
import type { MockAutomlModel } from '~/app/mocks/mockAutomlResultsContext';
import { formatMetricName, toNumericMetric, isErrorMetric } from '~/app/utilities/utils';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalHeaderProps = {
  models: MockAutomlModel[];
  currentModelName: string;
  rank: number;
  rankMap: Record<string, number>;
  onSelectModel?: (modelName: string) => void;
  onDownload: () => void;
  onSaveNotebook: () => void;
  isDownloadDisabled?: boolean;
};

function getOptimizedMetric(model: MockAutomlModel): { name: string; value: number } | undefined {
  const evalMetric = model.model_config.eval_metric;
  const metrics = model.metrics.test_data ?? {};
  if (!(evalMetric in metrics)) {
    return undefined;
  }
  const numericMetricValue = toNumericMetric(metrics[evalMetric]);
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
  onSelectModel,
  onDownload,
  onSaveNotebook,
  isDownloadDisabled,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const model = models.find((m) => m.display_name === currentModelName);
  const sortedModels = React.useMemo(
    () =>
      models.toSorted((a, b) => (rankMap[a.display_name] ?? 0) - (rankMap[b.display_name] ?? 0)),
    [models, rankMap],
  );
  const optimizedMetric = model ? getOptimizedMetric(model) : undefined;

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
                <DropdownItem key={m.display_name} value={m.display_name}>
                  {m.display_name}
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
              {formatMetricName(model.model_config.eval_metric)} (Optimized)
            </span>
            <span className="automl-model-details-header-value">
              {optimizedMetric ? (
                optimizedMetric.value.toFixed(3)
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
        <Button
          variant="primary"
          onClick={onSaveNotebook}
          data-testid="model-details-save-notebook"
        >
          Save as notebook
        </Button>
      </div>
    </div>
  );
};

export default AutomlModelDetailsModalHeader;
