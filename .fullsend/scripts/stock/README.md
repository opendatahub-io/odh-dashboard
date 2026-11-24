# Stock Fullsend files

Unmodified copies of files from [fullsend-ai/agents](https://github.com/fullsend-ai/agents)
at commit `ea29de9bb8b1729b04c0597b48a5c7aae62deb71` (tag `v0.57.1`), the same
commit `harness/review.yaml` names as its `base:`.

| File | Source in `agents` | sha256 |
|---|---|---|
| `pre-review.sh` | `scripts/pre-review.sh`, byte for byte | `b033d3c236440aaecead7c36528a5c5de5e5a5f26509d01e49b841bd69758ef5` |
| `review-categories.json` | the finding `category` enum of `schemas/review-result.schema.json` | `bb7da642233190ebc9ca5a68f8472a6a5c4990afcc6943a511ba1b081c15dc9e` |

`../pre-review.sh` runs `pre-review.sh` as a child process before the host
adapters, because a harness has one `pre_script` and ours replaces the base's.
`../validate-dimensions.sh` reads `review-categories.json`.

**Never edit these files.** `../pre-review.sh` refuses to run when one does not
match `SHA256SUMS`, and `../pre-review.sh --self-test` checks the same. Local
behaviour belongs in `../pre-review.sh`.

## Upgrading

With a checkout of `fullsend-ai/agents` at the new tag in `$AGENTS`, from this
directory:

```bash
cp -p "$AGENTS/scripts/pre-review.sh" pre-review.sh && jq '."$defs".finding.properties.category.enum' "$AGENTS/schemas/review-result.schema.json" > review-categories.json && shasum -a 256 pre-review.sh review-categories.json > SHA256SUMS
```

Then update the commit, tag and checksums above, and run
`../pre-review.sh --self-test`. It fails if the new script no longer reports a
skip through `FULLSEND_PRESCRIPT_OUTPUT`, or rejects a reviewer category that
`dimensions.json` lists. Read the upstream diff as well: the wrapper relies on
the stock script deriving `REPO` and `PR_NUMBER` from `PR_URL` and on it
exiting 0 without a skip signal when there is no `REVIEW_TOKEN`.
