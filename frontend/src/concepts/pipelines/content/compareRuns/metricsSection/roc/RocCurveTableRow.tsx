import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { ChartLegend } from '@patternfly/react-charts/victory';
import { CheckboxTd } from '#~/components/table';
import { RocCurveChartColorScale } from '#~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import {
  getFullArtifactPathLabel,
  getLinkedArtifactId,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { FullArtifactPathsAndConfig } from './types';

type RocCurveTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  fullArtifactPathAndConfig: FullArtifactPathsAndConfig;
};

const RocCurveTableRow: React.FC<RocCurveTableRowProps> = ({
  isChecked,
  onToggleCheck,
  fullArtifactPathAndConfig: { fullArtifactPath, config },
}) => (
  <Tr>
    <CheckboxTd
      id={getLinkedArtifactId(fullArtifactPath.linkedArtifact)}
      isChecked={isChecked}
      onToggle={onToggleCheck}
    />
    <Td dataLabel="Execution name > Artifact name">{getFullArtifactPathLabel(fullArtifactPath)}</Td>
    <Td dataLabel="Run name">{fullArtifactPath.run.display_name}</Td>
    <Td dataLabel="Curve legend">
      <ChartLegend
        responsive={false}
        height={20}
        width={20}
        data={[
          {
            name: '',
            symbol: {
              type: 'square',
              fill: RocCurveChartColorScale[config.index % RocCurveChartColorScale.length],
            },
          },
        ]}
      />
    </Td>
  </Tr>
);

export default RocCurveTableRow;
