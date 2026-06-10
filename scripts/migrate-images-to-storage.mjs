#!/usr/bin/env node
/**
 * Migrate game_images from third-party hotlinks to Supabase Storage.
 *
 * Idempotent and reversible. See docs/IMAGE_HOSTING.md.
 *
 *   node scripts/migrate-images-to-storage.mjs            # dry run (no changes)
 *   node scripts/migrate-images-to-storage.mjs --commit   # do the migration
 *   node scripts/migrate-images-to-storage.mjs --rollback # restore from backup CSV
 *
 * Requires env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUCKET = 'game-images';
const BACKUP_CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), 'image-url-backup.csv');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMMIT = process.argv.includes('--commit');
const ROLLBACK = process.argv.includes('--rollback');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const extFromUrl = (url, contentType) => {
  const fromType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[contentType];
  if (fromType) return fromType;
  const m = url.split('?')[0].match(/\.([a-zA-Z0-9]{3,4})$/);
  return (m ? m[1] : 'jpg').toLowerCase();
};

const isStorageUrl = (url) => url.includes(`/storage/v1/object/public/${BUCKET}/`);

async function rollback() {
  if (!fs.existsSync(BACKUP_CSV)) {
    console.error(`No backup at ${BACKUP_CSV}; nothing to roll back.`);
    process.exit(1);
  }
  const rows = fs.readFileSync(BACKUP_CSV, 'utf8').trim().split('\n').slice(1);
  console.log(`Rolling back ${rows.length} rows from backup...`);
  let restored = 0;
  for (const line of rows) {
    const [id, oldUrl] = line.split('\t');
    if (!id || !oldUrl) continue;
    if (COMMIT) {
      const { error } = await supabase.from('game_images').update({ image_url: oldUrl }).eq('id', id);
      if (error) { console.error(`  ${id}: ${error.message}`); continue; }
    }
    restored++;
  }
  console.log(COMMIT ? `Restored ${restored} rows.` : `[dry run] Would restore ${restored} rows (add --commit).`);
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  if (!COMMIT) { console.log(`[dry run] Would create public bucket "${BUCKET}".`); return; }
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(`Created public bucket "${BUCKET}".`);
}

async function migrate() {
  await ensureBucket();

  const { data: images, error } = await supabase.from('game_images').select('id, image_url');
  if (error) throw error;

  const todo = images.filter((img) => img.image_url && !isStorageUrl(img.image_url));
  console.log(`${images.length} images total; ${images.length - todo.length} already migrated; ${todo.length} to process.`);
  if (!COMMIT) console.log('(dry run — pass --commit to perform downloads, uploads, and DB updates)\n');

  const backup = ['id\told_url\tnew_url'];
  const stats = { ok: 0, failed: 0, byHost: {} };

  for (const img of todo) {
    const host = (() => { try { return new URL(img.image_url).host; } catch { return 'invalid'; } })();
    stats.byHost[host] = stats.byHost[host] || { ok: 0, failed: 0 };
    try {
      const res = await fetch(img.image_url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://smrutimap.onrender.com/' },
      });
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) throw new Error(`not an image (${contentType})`);
      const buf = Buffer.from(await res.arrayBuffer());
      const objectPath = `${img.id}.${extFromUrl(img.image_url, contentType)}`;
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;

      if (COMMIT) {
        const up = await supabase.storage.from(BUCKET).upload(objectPath, buf, { contentType, upsert: true });
        if (up.error) throw new Error(`upload: ${up.error.message}`);
        // Record backup BEFORE mutating the row.
        backup.push(`${img.id}\t${img.image_url}\t${publicUrl}`);
        fs.writeFileSync(BACKUP_CSV, backup.join('\n'));
        const upd = await supabase.from('game_images').update({ image_url: publicUrl }).eq('id', img.id);
        if (upd.error) throw new Error(`db update: ${upd.error.message}`);
      } else {
        backup.push(`${img.id}\t${img.image_url}\t${publicUrl}`);
      }

      stats.ok++; stats.byHost[host].ok++;
      process.stdout.write('.');
    } catch (err) {
      stats.failed++; stats.byHost[host].failed++;
      console.error(`\n  FAIL ${img.id} (${host}): ${err.message} — left untouched`);
    }
  }

  console.log(`\n\nDone. ${stats.ok} ok, ${stats.failed} failed.`);
  for (const [host, s] of Object.entries(stats.byHost)) {
    console.log(`  ${host}: ${s.ok} ok${s.failed ? `, ${s.failed} failed` : ''}`);
  }
  if (COMMIT) console.log(`\nBackup written to ${BACKUP_CSV} (use --rollback to revert).`);
  else console.log('\nNo changes made. Re-run with --commit to perform the migration.');
}

(ROLLBACK ? rollback() : migrate()).catch((e) => { console.error(e); process.exit(1); });
