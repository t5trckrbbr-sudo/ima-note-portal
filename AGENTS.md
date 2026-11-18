# IMA portal maintenance

Live Site: https://ima-outlook-2027.mcr8jq7mcg.chatgpt.site

Read `AI_HANDOFF.md` for product scope. In GitHub the executable app lives in `site/`; in the Sites source repository it is the root. Resolve paths accordingly.

When the user requests a Q&A update or answer review in chat, follow `REVIEW_WORKFLOW.md`: collect every current public question, answer new questions and re-check existing answers, record evidence and uncertainties, then validate and publish. Do not mark untouched answers reviewed or silently skip unresolved questions. A code-only update does not itself request a new financial review.

Preserve existing `.openai/hosting.json`, D1 user questions, answers and revision history. Research review runs are append-only source records; never impersonate a user's author key or reset live data. Keep collected public snapshots and unfinished drafts under ignored `.local/`.

Keep the `리스크점검` tab focused on selected risks. Pension subjects belong in Q&A. Do not restore the removed `guide-venture-cross-rule` question; sourcing and capital-efficiency discussion belongs to `guide-sizing-growth`.

Run `npm run check`, `npm test`, and `npm run build` in the app directory before publishing. For a research review, also verify the reviewed snapshot against live inputs immediately before deployment. Preserve public access and anonymous community posting.

Samsung 2027 funding uses the same fixed assumption as Meritz: year-end 4 trillion KRW and average 2 trillion KRW. The current total forecast is 89 trillion. Do not restore Samsung presets, custom funding inputs, or an unallocated-zero baseline. This is a user assumption, not Samsung official guidance.

The opportunity-cost calculator always includes the existing balance mandate increase: new funding × 20% + existing balance × 10 percentage points. Do not restore the existing-balance checkbox or make this inclusion optional.
