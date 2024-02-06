import * as React from 'react';
import { ChartDonut } from '@patternfly/react-charts';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDisplayName } from '~/pages/projects/utils';

const CPUMetricCard: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const projectUtilized = 10;
  const totalUtilized = 90;
  const requested = 93;

  return (
    <div className="odh-project-overview__project-metrics--card">
      <h3>CPU</h3>
      <div className="odh-project-overview__project-metrics--chart-area">
        <div className="odh-project-overview__project-metrics--chart">
          <ChartDonut
            ariaDesc="CPU Utilization"
            ariaTitle="CPU Utilization"
            constrainToVisibleArea
            data={[
              {
                x: `Utilized by ${currentProject.metadata.name}`,
                y: projectUtilized,
                fill: '#06c',
              },
              { x: 'Total utilized quota', y: totalUtilized - projectUtilized, fill: '#6a6e73' },
              { x: 'Unused', y: 100 - totalUtilized, fill: '#d2d2d2' },
            ]}
            width={275}
            height={225}
            labels={({ datum }) => `${datum.x}: ${datum.y}`}
            name="project-components"
            padding={{ bottom: 20, left: 0, right: 0, top: 20 }}
            style={{ data: { fill: ({ datum }) => datum.fill } }}
            title="8 cores"
            subTitle="total quota"
          />
        </div>
        <div className="odh-project-overview__project-metrics--legend">
          <div className="odh-project-overview__project-metrics--legend-item">
            <div
              className="odh-project-overview__project-metrics--legend-item--color"
              style={{ background: '#06c' }}
            />
            <span>
              Utilized by <b>{displayName}</b>: {projectUtilized}
            </span>
          </div>
          <div className="odh-project-overview__project-metrics--legend-item">
            <div
              className="odh-project-overview__project-metrics--legend-item--color"
              style={{ background: '#6a6e73' }}
            />
            Total utilized quota: {totalUtilized}
          </div>
          <div className="odh-project-overview__project-metrics--legend-item">
            <div
              className="odh-project-overview__project-metrics--legend-item--color"
              style={{ background: '#d2d2d2' }}
            />
            Unused: {100 - totalUtilized}
          </div>
          <div className="odh-project-overview__project-metrics--legend-item">
            <div
              className="odh-project-overview__project-metrics--legend-item--color"
              style={{ background: '#009596' }}
            />
            Requested: {requested}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CPUMetricCard;
