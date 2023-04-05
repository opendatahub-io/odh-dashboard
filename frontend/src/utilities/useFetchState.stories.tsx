import React, { useCallback } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { Icon, Spinner } from '@patternfly/react-core';
import { CloseIcon } from '@patternfly/react-icons';
import useFetchState from './useFetchState';

type TestComponentProps<T> = {
  defaultState: T;
  response: T;
  refreshRate?: number;
  responseFailed: boolean;
  responseError?: Error;
  responseDelay: number;
  fetchCallbackPromise: () => Promise<T>;
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const TestComponent = <T extends unknown>({
  defaultState,
  response,
  refreshRate,
  responseFailed = false,
  responseError,
  responseDelay = 0,
  fetchCallbackPromise,
}: TestComponentProps<T>) => {
  // pick func to use and apply delay
  const callback = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, responseDelay));

    if (fetchCallbackPromise) {
      return fetchCallbackPromise();
    }

    if (responseFailed) {
      throw responseError;
    }
    return Promise.resolve(response);
  }, [fetchCallbackPromise, responseDelay, responseError, response, responseFailed]);
  // hook to test
  const [result, loaded, loadError, refresh] = useFetchState(callback, defaultState, refreshRate);

  return (
    <div>
      <div>
        <span>
          <b>result: </b>
          {loadError ? (
            <Icon isInline size="md">
              <CloseIcon color="red" />
            </Icon>
          ) : !loaded ? (
            <Spinner isInline size="sm" />
          ) : (
            <span style={{ color: 'green' }}>{String(result)}</span>
          )}
        </span>
      </div>
      <div>
        <b>loaded: </b>
        {loaded ? 'TRUE' : 'FALSE'}
      </div>
      <div>
        <p>
          <b>error</b>
        </p>
        <div style={{ marginLeft: 8 }}>
          <div>
            <b>name: </b>
            {loadError?.name}
          </div>
          <div>
            <b>message: </b>
            {loadError?.message}
          </div>
          <div>
            <b>stack: </b>
            {loadError?.stack}
          </div>
        </div>
      </div>
      <button onClick={refresh}>refresh</button>
    </div>
  );
};

export default {
  title: 'useFetchState',
  component: TestComponent,
} as ComponentMeta<typeof TestComponent>;

const Template: ComponentStory<typeof TestComponent> = (args) => <TestComponent {...args} />;

export const Default = Template.bind({});
Default.args = {
  defaultState: 'default-test-state',
  response: 'success-test-state',
  responseDelay: 0,
  responseFailed: false,
  refreshRate: 0,
  responseError: {
    name: 'error-test-state',
    message: 'An unknown error occurred',
    stack: undefined,
  },
};

export const Resolved = Template.bind({});
Resolved.args = {
  defaultState: 'default-test-state',
  response: 'success-test-state',
  responseFailed: false,
  responseError: {
    name: 'error-test-state',
    message: 'test error message',
  },
};
Resolved.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // test that values from api are be displayed correctly
  expect(
    await canvas.findByText('success-test-state', undefined, { timeout: 5000 }),
  ).toBeInTheDocument();

  expect(canvas.queryByText('error-test-state')).not.toBeInTheDocument();
};

export const Rejected = Template.bind({});
Rejected.args = {
  defaultState: 'default-test-state',
  response: 'success-test-state',
  responseFailed: true,
  responseError: {
    name: 'error-test-state',
    message: 'test error message',
  },
};
Rejected.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // test that values from api are be displayed correctly
  expect(
    await canvas.findByText('error-test-state', undefined, { timeout: 5000 }),
  ).toBeInTheDocument();

  expect(canvas.queryByText('success-test-state')).not.toBeInTheDocument();
};

export const Refresh = Template.bind({});
Refresh.args = {
  refreshRate: 100,
};
Refresh.decorators = [
  (Story, context) => {
    const [counter, setCounter] = React.useState(0);
    const call = React.useCallback(() => {
      setCounter((c) => c + 1);
      return 'Counting';
    }, [setCounter]);
    return (
      <div>
        <b>call count: </b>
        <span data-testid="call-count">{counter}</span>
        <Story
          args={{
            ...context.args,
            fetchCallbackPromise: call,
          }}
        />
      </div>
    );
  },
];
Refresh.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // test that values from api are be displayed correctly
  expect(await canvas.findByText('Counting', undefined, { timeout: 5000 })).toBeInTheDocument();

  // refresh every 0.1 seconds, expect call count to be above 5 after 1 second
  await new Promise((r) => setTimeout(r, 1000));
  expect(Number(canvas.getByTestId('call-count').innerText)).toBeGreaterThan(5);
};

export const RefreshButton = Template.bind({});
// reuse refresh decorator
RefreshButton.decorators = Refresh.decorators;
RefreshButton.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // test that values from api are be displayed correctly
  expect(await canvas.findByText('Counting', undefined, { timeout: 5000 })).toBeInTheDocument();

  const refreshButton = canvas.getByText('refresh', { selector: 'button' });

  //refresh 5 times
  userEvent.click(refreshButton);
  userEvent.click(refreshButton);
  userEvent.click(refreshButton);
  userEvent.click(refreshButton);
  userEvent.click(refreshButton);

  // wait to settle
  await new Promise((r) => setTimeout(r, 1000));

  // expect to be called once initially + 1 more time for each refresh done (5 refreshes)
  expect(Number(canvas.getByTestId('call-count').innerText)).toBe(6);
};
