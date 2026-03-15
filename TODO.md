# TODO

## Legacy CSV Cleanup

- Keep both CSV import paths for now:
  - legacy format: `activity,date,start,end,duration,tag`
  - current format: `activity,start_at,end_at,duration,tag,data_issue`
- In 1-2 iterations, measure whether any remaining workflows still depend on the legacy `date/start/end` export shape.
- After that, remove legacy CSV generation from the tracker if it still exists anywhere outside the main export path.
