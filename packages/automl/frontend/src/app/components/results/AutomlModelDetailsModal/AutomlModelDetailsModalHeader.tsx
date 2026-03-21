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
import type { MockAutomlModel } from '~/app/mocks/mockAutomlResultsContext';
import { formatMetricName, toNumericMetric } from '~/app/utilities/utils';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalHeaderProps = {
  models: MockAutomlModel[];
  currentModelName: string;
  rank: number;
  onSelectModel?: (modelName: string) => void;
  onDownload: () => void;
};

function getOptimizedMetric(model: MockAutomlModel): { name: string; value: number } | undefined {
  const evalMetric = model.model_config.eval_metric;
  const metrics = model.metrics.test_data;
  if (!(evalMetric in metrics)) {
    return undefined;
  }
  return { name: evalMetric, value: Math.abs(toNumericMetric(metrics[evalMetric])) };
}

const AutomlModelDetailsModalHeader: React.FC<AutomlModelDetailsModalHeaderProps> = ({
  models,
  currentModelName,
  rank,
  onSelectModel,
  onDownload,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const model = models.find((m) => m.display_name === currentModelName);
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
              {models.map((m, i) => (
                <DropdownItem key={m.display_name} value={m.display_name}>
                  #{i + 1} {m.display_name}
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
        {optimizedMetric && (
          <div className="automl-model-details-header-item">
            <span className="automl-model-details-header-label">
              {formatMetricName(optimizedMetric.name)} (Optimized)
            </span>
            <span className="automl-model-details-header-value">
              {optimizedMetric.value.toFixed(3)}
            </span>
          </div>
        )}
      </div>
      <div className="automl-model-details-header-actions">
        <Button
          variant="secondary"
          icon={<DownloadIcon />}
          onClick={onDownload}
          data-testid="model-details-download"
        >
          Download
        </Button>
        <Tooltip content="Coming soon">
          <Button variant="primary" isDisabled data-testid="model-details-save-as">
            Save as
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default AutomlModelDetailsModalHeader;
