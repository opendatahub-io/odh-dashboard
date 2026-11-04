describe('Workload search debounce behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should cancel pending search tracking when filters are cleared', () => {
    const searchCallback = jest.fn();
    const timeout = window.setTimeout(() => searchCallback('model'), 500);

    window.clearTimeout(timeout);
    jest.advanceTimersByTime(500);

    expect(searchCallback).not.toHaveBeenCalled();
  });
});
