import {
  proxyCREATE,
  proxyDELETE,
  proxyENDPOINT,
  proxyFILE,
  proxyGET,
  proxyUPDATE,
} from '~/api/proxyUtils';

global.fetch = jest.fn();
const mockFetch = jest.mocked(global.fetch);
const host = 'test';
const path = '/test';
const textValue = '["key:value"]';
const data = { key: 'value' };

describe('proxyGET', () => {
  it('should make a proxy JSON call and parse the response', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(textValue),
    } as unknown as Response);

    const result = await proxyGET(host, path);
    expect(result).toStrictEqual(JSON.parse(textValue));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"GET","host":"test","queryParams":{}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });

  it('should make a proxy JSON call without parsing the response', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(textValue),
    } as unknown as Response);

    const result = await proxyGET(host, path, { dryRun: true }, { parseJSON: false });
    expect(result).toStrictEqual(textValue);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"GET","host":"test","queryParams":{"dryRun":true}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });

  it('should handle errors and rethrows', async () => {
    mockFetch.mockRejectedValue(new Error('error'));

    await expect(proxyGET(host, path)).rejects.toThrow('error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"GET","host":"test","queryParams":{}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });
});

describe('proxyCREATE', () => {
  it('should make a proxy JSON call to create with a given data', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(textValue),
    } as unknown as Response);

    const result = await proxyCREATE(host, path, data);
    expect(result).toStrictEqual(JSON.parse(textValue));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"POST","host":"test","queryParams":{},"data":{"key":"value"}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });
  it('should handle errors and rethrows', async () => {
    mockFetch.mockRejectedValue(new Error('error'));

    await expect(proxyCREATE(host, path, data)).rejects.toThrow('error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"POST","host":"test","queryParams":{},"data":{"key":"value"}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });
});

describe('proxyFILE', () => {
  const fileContents = 'test';
  it('should call callProxyJSON with file contents', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(textValue),
    } as unknown as Response);

    const result = await proxyFILE(host, path, fileContents);
    expect(result).toStrictEqual(JSON.parse(textValue));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"POST","host":"test","queryParams":{},"fileContents":"test"}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });

  it('should handle errors and rethrows', async () => {
    mockFetch.mockRejectedValue(new Error('error'));

    await expect(proxyFILE(host, path, fileContents)).rejects.toThrow('error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"POST","host":"test","queryParams":{},"fileContents":"test"}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });
});

describe('proxyENDPOINT', () => {
  it('calls callProxyJSON with correct arguments for POST method and no body data', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(textValue),
    } as unknown as Response);

    const result = await proxyENDPOINT(host, path);
    expect(result).toStrictEqual(JSON.parse(textValue));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"POST","host":"test","queryParams":{}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });

  it('should handle errors and rethrows', async () => {
    mockFetch.mockRejectedValue(new Error('error'));

    await expect(proxyENDPOINT(host, path)).rejects.toThrow('error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"POST","host":"test","queryParams":{}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });
});

describe('proxyUPDATE', () => {
  it('should call callProxyJSON with the updated data', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(textValue),
    } as unknown as Response);

    const result = await proxyUPDATE(host, path, data);
    expect(result).toStrictEqual(JSON.parse(textValue));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"PUT","host":"test","queryParams":{},"data":{"key":"value"}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });

  it('should handle errors and rethrows', async () => {
    mockFetch.mockRejectedValue(new Error('error'));

    await expect(proxyUPDATE(host, path, data)).rejects.toThrow('error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"PUT","host":"test","queryParams":{},"data":{"key":"value"}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });
});

describe('proxyDELETE', () => {
  it('should call callProxyJSON with DELETE method', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(textValue),
    } as unknown as Response);

    const result = await proxyDELETE(host, path, data);
    expect(result).toStrictEqual(JSON.parse(textValue));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"DELETE","host":"test","queryParams":{},"data":{"key":"value"}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });

  it('should handle errors and rethrows', async () => {
    mockFetch.mockRejectedValue(new Error('error'));

    await expect(proxyDELETE(host, path, data)).rejects.toThrow('error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/test', {
      body: '{"path":"/test","method":"DELETE","host":"test","queryParams":{},"data":{"key":"value"}}',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      method: 'POST',
    });
  });
});
