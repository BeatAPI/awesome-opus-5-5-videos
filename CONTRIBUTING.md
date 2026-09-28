# Contributing

Submit a case through a GitHub issue or pull request. Please include:

1. The creator's original public post URL and handle.
2. Evidence that the work used Claude Opus 5.5, plus a prompt link if the creator published one.
3. The creative coding method and technology used, with a short original summary.
4. Whether the case is only source-listed, source-checked, or independently reproduced.
5. Explicit permission or a usable license for any prompt text, screenshots, or videos you want hosted in this repository.

Do not copy a third-party prompt or media merely because it is publicly viewable. A source link is welcome for review. Do not claim an output was reproduced without a run record and rights-cleared inputs.

Catalog entries are validated with `npm test`. Deduplicate by original post URL; a shared prompt can produce different creator works.

After editing `cases/catalog.json`, run `npm run gallery:sync` to update both README galleries, then run `npm test`.

For a correction or takedown, open an issue titled `Correction: <case id>` or `Takedown: <case id>`, or email `support@beatapi.io`. Include the case URL and your relationship to the work. Maintainers will review a credible rights claim promptly.
