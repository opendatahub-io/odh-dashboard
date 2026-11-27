import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import OverviewToolbar from '~/app/pages/maas-governance/overview/OverviewToolbar';
import { ModelOverviewItem } from '~/app/types/subscriptions';
import { initialOverviewFilterData } from '~/app/pages/maas-governance/overview/const';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

const modelRow = (namespace: string, displayName: string): ModelOverviewItem => ({
  id: 'granite-3-8b-instruct',
  namespace,
  modelDetails: { displayName },
  subscriptions: [],
  authPolicies: [],
});

const renderToolbar = (rows: ModelOverviewItem[]) =>
  render(
    <TrackingProvider trackEvent={jest.fn()}>
      <MemoryRouter>
        <OverviewToolbar
          filterData={initialOverviewFilterData}
          onFilterUpdate={jest.fn()}
          rows={rows}
        />
      </MemoryRouter>
    </TrackingProvider>,
  );

const selectModelFilter = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByTestId('overview-table-toolbar-dropdown'));
  await user.click(
    within(screen.getByTestId('overview-table-toolbar-option-modelName')).getByRole('menuitem'),
  );
  const combobox = within(screen.getByTestId('overview-table-toolbar')).getByRole('combobox');
  await user.click(combobox);
  return combobox;
};

describe('OverviewToolbar', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should collapse same-name models registered in multiple projects into one option', async () => {
    renderToolbar([modelRow('project-a', 'Granite A'), modelRow('project-b', 'Granite B')]);

    await selectModelFilter(user);

    const options = await screen.findAllByRole('option');
    const modelOptions = options.filter((o) => /granite/i.test(o.textContent));
    expect(modelOptions).toHaveLength(1);
    // The first registered label wins for the combined option
    expect(modelOptions[0]).toHaveTextContent('Granite A');
  });

  it('should select the model by resource name through the real typeahead', async () => {
    const onFilterUpdate = jest.fn();
    render(
      <TrackingProvider trackEvent={jest.fn()}>
        <MemoryRouter>
          <OverviewToolbar
            filterData={initialOverviewFilterData}
            onFilterUpdate={onFilterUpdate}
            rows={[modelRow('project-a', 'Granite A'), modelRow('project-b', 'Granite B')]}
          />
        </MemoryRouter>
      </TrackingProvider>,
    );

    await selectModelFilter(user);
    await user.click(await screen.findByRole('option', { name: /granite a/i }));

    expect(onFilterUpdate).toHaveBeenCalledWith('modelName', {
      value: 'granite-3-8b-instruct',
      label: 'Granite A',
    });
  });
});
