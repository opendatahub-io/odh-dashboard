# Schema-section output contract

The invoking dimension supplies `Output section` and whether findings are
included. Return only an object whose named section is exactly that schema
member. When `Include findings` is true, also return `findings` using the
findings contract; otherwise omit it.

For `product_ask`, return:

```json
{
  "product_ask": {
    "status": "none|aligned|mismatch-justified|mismatch-unjustified",
    "aligned": [],
    "mismatched": [],
    "justified_in_description": false,
    "needs_human": false
  },
  "findings": []
}
```
