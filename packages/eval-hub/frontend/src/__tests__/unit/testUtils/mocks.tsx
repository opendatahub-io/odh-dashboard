/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react';

export const mockApplicationsPageModule = () => ({
  __esModule: true,
  default: ({
    title,
    description,
    headerContent,
    empty,
    emptyStatePage,
    children,
  }: {
    title: React.ReactNode;
    description: string;
    headerContent?: React.ReactNode;
    empty?: boolean;
    emptyStatePage?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid="applications-page">
      <div data-testid="page-title">{title}</div>
      <div data-testid="page-description">{description}</div>
      {headerContent && <div data-testid="header-content">{headerContent}</div>}
      {empty && emptyStatePage ? <div data-testid="empty-state">{emptyStatePage}</div> : children}
    </div>
  ),
});

export const mockProjectSelectorModule = () => ({
  __esModule: true,
  default: ({ namespace }: { namespace: string }) => (
    <div data-testid="project-selector">{namespace}</div>
  ),
});

export const mockProjectIconWithSizeModule = () => ({
  ProjectIconWithSize: () => <span data-testid="project-icon" />,
});

export const mockIconSizeModule = () => ({
  IconSize: { LG: 'lg' },
});
