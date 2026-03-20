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
import type { ModelArtifact } from '~/app/types';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalHeaderProps = {
  models: ModelArtifact[];
  selectedIndex: number;
  onSelectModel: (index: number) => void;
  onDownload: () => void;
};

function getOptimizedMetric(model: ModelArtifact): { name: string; value: number } | undefined {
  const evalMetric = model.context.model_config.eval_metric;
  if (typeof evalMetric !== 'string') {
    return undefined;
  }
  const metrics = model.context.metrics.test_data;
  if (!(evalMetric in metrics)) {
    return undefined;
  }
  return { name: evalMetric, value: Math.abs(metrics[evalMetric]) };
}

/** Format metric keys from snake_case to Title Case. */
export function formatMetricName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const AutomlModelDetailsModalHeader: React.FC<AutomlModelDetailsModalHeaderProps> = ({
  models,
  selectedIndex,
  onSelectModel,
  onDownload,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const model = models[selectedIndex];
  const optimizedMetric = getOptimizedMetric(model);
  const rank = selectedIndex + 1;

  return (
    <div className="automl-model-details-header">
      <div className="automl-model-details-header-selector">
        <span className="automl-model-details-header-label">Model details</span>
        {models.length > 1 ? (
          <Dropdown
            isOpen={isDropdownOpen}
            onSelect={(_e, value) => {
              onSelectModel(Number(value));
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
                {model.display_name}
              </MenuToggle>
            )}
          >
            <DropdownList>
              {models.map((m, i) => (
                <DropdownItem key={m.display_name} value={i}>
                  #{i + 1} {m.display_name}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        ) : (
          <span className="automl-model-details-header-value">{model.display_name}</span>
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
