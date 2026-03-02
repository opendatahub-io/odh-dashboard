import React from 'react';

type StepContentToggleProps = {
  contentView: React.ReactNode;
  yamlView: React.ReactNode;
  viewMode: 'form' | 'yaml-preview' | 'yaml-edit';
};

export const StepContentToggle: React.FC<StepContentToggleProps> = ({
  contentView,
  yamlView,
  viewMode,
}) => {
  return <>{viewMode === 'yaml-preview' || viewMode === 'yaml-edit' ? yamlView : contentView}</>;
};
