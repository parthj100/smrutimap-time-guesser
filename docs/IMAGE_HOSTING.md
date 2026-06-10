# Image hosting: findings and migration plan

## Correction to the original audit
The game images are **not** served from Google Drive. The `convertGoogleDriveUrl`
helper in `src/utils/gameUtils.ts` exists but matches **0 of the 197** rows in
`game_images`. The stored URLs are direct hotlinks to third-party hosts.

## Current inventory (197 images)
| Host | Count | Risk | Notes |
|------|------:|------|-------|
| `www.baps.org` | 140 | Low | Official institutional site; stable, but hotlinked (no control; could block hotlinking or reorganize paths) |
| `i.ibb.co` (ImgBB) | 46 | Medium | Free image host; these are the in-game screenshots. Could be pruned by the host or lost |
| `pramukhswami.org` | 7 | Low | Official institutional site |
| `i.pinimg.com` (Pinterest) | 2 | **High** | Pinterest actively rotates URLs and blocks hotlinking |
| `pbs.twimg.com` (Twitter) | 1 | **High** | Twitter/X breaks media hotlinks frequently |
| `foik.blob.core.windows.net` (Azure) | 1 | Medium | Unknown ownership |

All 197 hosts returned 2xx when checked on 2026-06-10 (browser UA + referer),
so nothing is broken **today**. One URL has a cosmetic double slash
(`www.baps.org//Data/...`) but still resolves.

## Why migrate at all
Hotlinking means: no control over availability, no CDN guarantees, no caching
policy, referer/hotlink-blocking risk (especially the 4 high-risk links), and no
graceful fallback today beyond a generic Unsplash placeholder. Moving to Supabase
Storage gives a stable URL namespace, CDN delivery, and the ability to add real
fallbacks. It also makes the responsive-srcset path usable (currently only
Unsplash URLs get srcset; Storage transforms could too on a paid plan).

It is **not urgent** — everything resolves today and the app is dormant — so this
is a deliberate, greenlit migration, not a hotfix.

## Migration plan (reversible)
A ready-to-run script lives at `scripts/migrate-images-to-storage.mjs`.

It is **idempotent** and **reversible**:
1. Reads every `game_images` row.
2. Skips rows already pointing at Supabase Storage (safe to re-run).
3. Downloads each image (browser UA + referer) and uploads it to a public
   `game-images` bucket at `{id}.{ext}` (creating the bucket if missing).
4. Writes `scripts/image-url-backup.csv` (`id,old_url,new_url`) **before** any DB
   update, so a rollback is a CSV-driven `UPDATE` away.
5. Updates `game_images.image_url` to the Storage public URL.
6. Prints a per-host success/failure summary; failed downloads keep their
   original URL untouched so the game never points at a missing file.

### Running it
Requires the **service role** key (storage upload + table update; not in the repo):
```bash
export VITE_SUPABASE_URL="https://rhxbadjyjjjrjpvfhpap.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<from Supabase dashboard → Settings → API>"
node scripts/migrate-images-to-storage.mjs           # dry run: lists what it would do
node scripts/migrate-images-to-storage.mjs --commit  # performs the migration
```

### Rollback
```bash
node scripts/migrate-images-to-storage.mjs --rollback   # restores from image-url-backup.csv
```

### Suggested order
Start with the 4 high-risk links (Pinterest/Twitter) and the 46 ImgBB
screenshots — the ones most likely to vanish — then the institutional 147.
The script handles all of them in one pass; the priority only matters if you want
to do it incrementally.

## After migrating
- The `game-images` bucket should be public-read only (no listing) — the script
  sets this.
- `convertGoogleDriveUrl` can be retired from the fetch path once you confirm no
  Drive URLs are ever submitted via the photo-submission flow.
