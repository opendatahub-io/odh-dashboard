import * as React from 'react';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { renderHook } from '#~/__tests__/unit/testUtils/hooks';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { NotebookControllerContextProps } from '#~/pages/notebookController/notebookControllerContextTypes';
import { getRoute } from '#~/services/routeService';
import { Notebook, Route } from '#~/types';
import { useNotebookRedirectLink, usernameTranslate } from '#~/utilities/notebookControllerUtils';

const validUnameRegex = new RegExp('^[a-z]{1}[a-z0-9-]{1,62}$');

describe('usernameTranslate', () => {
  it('escaped chars by encodeURIComponent', () => {
    const uname = usernameTranslate('test: ;,/?:@&=+$');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-3a-20-3b-2c-2f-3f-3a-40-26-3d-2b-24`);
  });

  it('non-escaped chars by encodeURIComponent', () => {
    const uname = usernameTranslate("test: -_.!~*'()");
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-3a-20-2d-5f-2e-21-7f-2a-27-28-29`);
  });

  it('no spec chars', () => {
    const uname = usernameTranslate(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    );
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789');
  });

  it('realistic uname 1', () => {
    const uname = usernameTranslate('test.user@odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-2euser-40odh-2eio`);
  });

  it('realistic uname 2', () => {
    const uname = usernameTranslate('xlogintest');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`xlogintest`);
  });

  it('realistic uname 3', () => {
    const uname = usernameTranslate('kube:admin');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`kube-3aadmin`);
  });

  it('realistic uname 4', () => {
    const uname = usernameTranslate('random-user');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`random-2duser`);
  });

  it('realistic uname 5', () => {
    const uname = usernameTranslate('random_user');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`random-5fuser`);
  });

  it('hashtags', () => {
    const uname = usernameTranslate('test#user##@odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-23user-23-23-40odh-2eio');
  });

  it('parentheses', () => {
    const uname = usernameTranslate('test(us()er)test');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-28us-28-29er-29test');
  });

  it('exclamation mark', () => {
    const uname = usernameTranslate('Cr!t!cal@test.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('cr-21t-21cal-40test-2eio');
  });

  it('question mark', () => {
    const uname = usernameTranslate('test?user?@odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-3fuser-3f-40odh-2eio`);
  });

  it('commas', () => {
    const uname = usernameTranslate('test,user,odh,io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-2cuser-2codh-2cio');
  });

  it('apostrophes', () => {
    const uname = usernameTranslate('te`"st\'user\'odh"io`');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('te-60-22st-27user-27odh-22io-60');
  });

  it('currency signs', () => {
    const uname = usernameTranslate('test¥u$€r');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-c2-a5u-24-e2-82-acr');
  });

  it('hyphen underscore tilde', () => {
    const uname = usernameTranslate('test-user_odh~io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-2duser-5fodh-7fio');
  });

  it('percentage', () => {
    const uname = usernameTranslate('test%user%odh%io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-25user-25odh-25io');
  });

  it('stars, colons and dots', () => {
    const uname = usernameTranslate('te:st.*us:er*odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('te-3ast-2e-2aus-3aer-2aodh-2eio');
  });
});

jest.mock('#~/pages/notebookController/useNamespaces', () => () => ({
  notebookNamespace: 'test-project',
  dashboardNamespace: 'opendatahub',
}));

jest.mock('#~/services/routeService', () => ({
  getRoute: jest.fn(),
}));

const getRouteMock = getRoute as jest.Mock;

describe('useNotebookRedirectLink', () => {
  it('should return successful with current notebook link', async () => {
    const renderResult = renderHook(() => useNotebookRedirectLink(), {
      wrapper: ({ children }) => (
        <NotebookControllerContext.Provider
          value={
            {
              currentUserNotebook: mockNotebookK8sResource({}) as Notebook,
              currentUserNotebookLink: 'test-link',
            } as NotebookControllerContextProps
          }
        >
          {children}
        </NotebookControllerContext.Provider>
      ),
    });

    expect(await renderResult.result.current()).toBe('test-link');
  });

  it('should return successful without notebook link but with notebook', async () => {
    const mockNotebook = mockNotebookK8sResource({});
    const renderResult = renderHook(() => useNotebookRedirectLink(), {
      wrapper: ({ children }) => (
        <NotebookControllerContext.Provider
          value={
            {
              currentUserNotebook: mockNotebook,
              currentUserNotebookLink: '',
            } as NotebookControllerContextProps
          }
        >
          {children}
        </NotebookControllerContext.Provider>
      ),
    });

    getRouteMock.mockReturnValue(Promise.resolve({ spec: { host: 'test-host' } } as Route));

    expect(await renderResult.result.current()).toBe(
      `https://test-host/notebook/${mockNotebook.metadata.namespace}/${mockNotebook.metadata.name}`,
    );

    expect(getRouteMock).toHaveBeenCalledWith(
      mockNotebook.metadata.namespace,
      mockNotebook.metadata.name,
    );
  });
});
