import * as React from 'react';
import ProjectSelector from '#~/concepts/projects/ProjectSelector';
import SettingSection from '#~/components/SettingSection';
import { getDashboardMainContainer } from '#~/utilities/utils';

type GlobalProjectSettingsProps = {
  selectedNamespace: string;
  setSelectedNamespace: (ns: string) => void;
};

const GlobalProjectSettings: React.FC<GlobalProjectSettingsProps> = ({
  selectedNamespace,
  setSelectedNamespace,
}) => (
  <SettingSection
    title="Global project"
    testId="global-project-settings"
    description="Select a project to store and share prompts globally."
  >
    <ProjectSelector
      onSelection={setSelectedNamespace}
      namespace={selectedNamespace}
      clearLabel="None"
      invalidDropdownPlaceholder="Select a project"
      placeholder="Select a project"
      appendTo={getDashboardMainContainer}
    />
  </SettingSection>
);

export default GlobalProjectSettings;
