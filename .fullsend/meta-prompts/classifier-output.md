# Classifier output contract

The invoking dimension id is supplied as `Output id`. Return only:

```json
{
  "classifier": {
    "id": "<Output id>",
    "status": "completed|unavailable",
    "summary": "<short result>",
    "classifications": [
      { "subject": "<check or failure name>", "classification": "<label>", "reason": "<evidence>" }
    ]
  }
}
```

Classifications are advisory structured data. Do not emit findings unless the
canonical skill explicitly owns a concrete code defect.
