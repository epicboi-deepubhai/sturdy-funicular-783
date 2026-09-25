/log-session

Update `docs/prompt-history.md` with a new entry for this session:

```
## [YYYY-MM-DD HH:MM] <phase: spec | implementation | testing | review | fix>
- Goal: <one line, what I asked you to do>
- Files touched: <list>
- Link: .specstory/history/<matching-file>.md
```

Look at `.specstory/history/` for the most recent session file and use its actual filename/timestamp for the link. Do not summarize the full conversation — one line per entry, index-style. Append, never overwrite existing entries.