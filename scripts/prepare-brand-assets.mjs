import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('public/images/brand', { recursive: true });
for (const [name, source] of [
  ['dark', 'C:/Users/OBED/Downloads/1-removebg-preview.png'],
  ['white', 'C:/Users/OBED/Downloads/2-removebg-preview.png'],
]) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 10) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  await sharp(source).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(280, 260, { fit: 'contain', background: '#00000000' }).png()
    .toFile(`public/images/brand/logo-${name}.png`);
}
const icon = await sharp('public/images/brand/logo-dark.png')
  .resize(224, 224, { fit: 'contain', background: '#faf7f2' })
  .flatten({ background: '#faf7f2' })
  .extend({ top: 16, bottom: 16, left: 16, right: 16, background: '#faf7f2' }).png().toBuffer();
await writeFile('src/app/icon.png', icon);
await sharp(icon).resize(180, 180).toFile('src/app/apple-icon.png');
const sizes = [16, 32, 48, 256];
const frames = await Promise.all(sizes.map(size => sharp(icon).resize(size, size).ensureAlpha().png({ palette: false }).toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const position = 6 + 16 * index;
  header[position] = sizes[index] % 256; header[position + 1] = sizes[index] % 256;
  header.writeUInt16LE(1, position + 4); header.writeUInt16LE(32, position + 6);
  header.writeUInt32LE(frame.length, position + 8); header.writeUInt32LE(offset, position + 12);
  offset += frame.length;
});
await writeFile('src/app/favicon.ico', Buffer.concat([header, ...frames]));
console.log('Prepared both supplied logos and browser/app icons.');
