// This is the example to create backend testing cases
/**
import { build } from "../utils/testHelper";

describe('Backend testing', () => {
  const app = build();
  test('some api', async () => {
    const res = await app.inject({
      url: '/api/{api-name}'
    })
    expect(res.json()).toEqual({ key: value });
  });
})
*/