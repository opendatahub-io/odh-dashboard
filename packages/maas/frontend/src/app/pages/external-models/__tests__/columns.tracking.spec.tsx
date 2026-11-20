import { createExternalModelsColumns } from '~/app/pages/external-models/columns';

const noop = jest.fn();

describe('createExternalModelsColumns tracking', () => {
  it('forwards the provider-references header popover to the injected tracker', () => {
    const trackEvent = jest.fn();
    const columns = createExternalModelsColumns(trackEvent);

    const providerRefsColumn = columns.find((column) => column.field === 'providerRefs');
    providerRefsColumn?.info?.popoverProps?.onShow?.(new MouseEvent('show'));

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('External Models Info Popover Viewed', {
      infoTarget: 'column-external-provider',
      location: 'table-header',
    });
  });

  it('forwards the status header popover to the injected tracker', () => {
    const trackEvent = jest.fn();
    const columns = createExternalModelsColumns(trackEvent);

    const phaseColumn = columns.find((column) => column.field === 'phase');
    phaseColumn?.info?.popoverProps?.onShow?.(new MouseEvent('show'));

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('External Models Info Popover Viewed', {
      infoTarget: 'column-status',
      location: 'table-header',
    });
  });

  it('uses the current callback when the tracker is replaced', () => {
    const first = jest.fn();
    const replacement = jest.fn();
    const firstColumns = createExternalModelsColumns(first);
    firstColumns
      .find((column) => column.field === 'providerRefs')
      ?.info?.popoverProps?.onShow?.(new MouseEvent('show'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();

    const replacementColumns = createExternalModelsColumns(replacement);
    replacementColumns
      .find((column) => column.field === 'providerRefs')
      ?.info?.popoverProps?.onShow?.(new MouseEvent('show'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledTimes(1);
  });

  it('preserves the column labels, fields, and count for row rendering', () => {
    const columns = createExternalModelsColumns(noop);
    expect(columns.map((column) => column.field)).toEqual([
      'expand',
      'model',
      'providerRefs',
      'phase',
    ]);
    expect(columns.map((column) => column.label)).toEqual([
      '',
      'Model',
      'Provider references',
      'Status',
    ]);
  });
});
