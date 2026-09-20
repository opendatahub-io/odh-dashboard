import * as React from 'react';
import ProjectSelector from '#~/concepts/projects/ProjectSelector';
import SettingSection from '#~/components/SettingSection';
import { getDashboardMainContainer } from '#~/utilities/utils';
import GlobalProjectWarningModal from './GlobalProjectWarningModal';

type GlobalProjectSettingsProps = {
  selectedNamespace: string;
  setSelectedNamespace: (ns: string) => void;
};

const GlobalProjectSettings: React.FC<GlobalProjectSettingsProps> = ({
  selectedNamespace,
  setSelectedNamespace,
}) => {
  const [pendingNamespace, setPendingNamespace] = React.useState<string | null>(null);

  const warningVariant =
    pendingNamespace === null ? null : pendingNamespace === '' ? 'clear' : 'switch';

  const handleSelection = (ns: string) => {
    if (!selectedNamespace || ns === selectedNamespace) {
      setSelectedNamespace(ns);
      return;
    }
    setPendingNamespace(ns);
  };

  const handleConfirm = () => {
    if (pendingNamespace !== null) {
      setSelectedNamespace(pendingNamespace);
      setPendingNamespace(null);
    }
  };

  const handleCancel = () => {
    setPendingNamespace(null);
  };

  return (
    <SettingSection
      title="Global project"
      testId="global-project-settings"
      description="Select a project to store and share prompts globally."
    >
      <ProjectSelector
        onSelection={handleSelection}
        namespace={selectedNamespace}
        clearLabel="Clear selection"
        invalidDropdownPlaceholder="Select a project"
        placeholder="Select a project"
        appendTo={getDashboardMainContainer}
      />
      {warningVariant !== null && (
        <GlobalProjectWarningModal
          variant={warningVariant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </SettingSection>
  );
};

export default GlobalProjectSettings;
