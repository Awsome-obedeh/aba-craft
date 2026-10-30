import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/import-home-photos.mjs <photo-directory>');
const destination = fileURLToPath(new URL('../public/images/home/photography/', import.meta.url));
const photos = {
  hero: 'martin-yOCIkYb1L5g-unsplash.jpg',
  handbag: 'genesis-warner-FskOHt3xuig-unsplash.jpg',
  backpack: 'wiser-by-the-mile-SwWCo1k92M4-unsplash.jpg',
  travel: 'jed-owen-PpzBE1hWeGI-unsplash.jpg',
  accessories: 'logan-weaver-lgnwvr-WPokfelaBfE-unsplash.jpg',
  collection: 'muneeb-malhotra-eCSEAlw85zc-unsplash.jpg',
  crossbody: 'solace-leather-4NVpQDko9vA-unsplash.jpg',
  commuter: 'aren-nagulyan-vlRNbZ0v_ao-unsplash.jpg',
  satchel: 'derick-mckinney-kIfPF4dDrF4-unsplash.jpg',
  wallet: 'marcin-kempa-cjUxiJoVzc0-unsplash.jpg',
  detail: 'omar-al-ghosson-g0zYSJRY8n4-unsplash.jpg',
  discover: 'tomasz-anusiewicz-e7OSGgUD3iM-unsplash.jpg',
  checkout: 'mostafa-mahmoudi-J4DnKxz_3sA-unsplash.jpg',
};
await Promise.all(Object.values(photos).map(file => access(path.join(source, file))));
await mkdir(destination, { recursive: true });
const manifest = [];
for (const [name, file] of Object.entries(photos)) {
  const output = `${name}.webp`;
  const info = await sharp(path.join(source, file)).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(destination, output));
  manifest.push({ file: output, source: file, width: info.width, height: info.height, bytes: info.size });
}
await writeFile(path.join(destination, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Imported ${manifest.length} photos (${Math.round(manifest.reduce((sum, item) => sum + item.bytes, 0) / 1024)} KB).`);
