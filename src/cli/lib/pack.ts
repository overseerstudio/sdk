/** @format */

import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';

import tar from 'tar-fs';

export async function packPlugin(
  pluginDir: string,
  assets: string[],
  outPath: string,
): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    const pack = tar.pack(pluginDir, { entries: assets });
    const gzip = zlib.createGzip({ level: 9 });
    const output = fs.createWriteStream(outPath);
    output.on('finish', () => resolve());
    output.on('error', reject);
    pack.on('error', reject);
    gzip.on('error', reject);
    pack.pipe(gzip).pipe(output);
  });
  return computeFileHash(outPath);
}

export function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk: Buffer | string) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
