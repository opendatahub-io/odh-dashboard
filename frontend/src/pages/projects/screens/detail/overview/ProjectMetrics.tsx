import * as React from 'react';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import CPUMetricCard from '~/pages/projects/screens/detail/overview/CPUMetricCard';
import MemoryMetricCard from '~/pages/projects/screens/detail/overview/MemoryMetricCard';

const ProjectMetrics: React.FC = () => (
  <div className="odh-project-overview__project-metrics">
    <div className="odh-project-overview__project-metrics--title-area">
      <div className="odh-project-overview__project-metrics--title-icon">
        <img src={projectIcon} alt="projects" />
      </div>
      <h4>Projects</h4>
    </div>
    <div className="odh-project-overview__project-metrics--cards">
      <CPUMetricCard />
      <MemoryMetricCard />
    </div>
  </div>
);

export default ProjectMetrics;
