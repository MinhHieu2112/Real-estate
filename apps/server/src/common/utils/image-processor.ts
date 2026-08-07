import sharp from 'sharp';

export async function processImage(
  files: Express.Multer.File[],
): Promise<Express.Multer.File[]> {
  return Promise.all(
    files.map(async (file) => {
      const buffer = await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .toFormat('jpeg', { quality: 80 })
        .toBuffer();

      return {
        ...file,
        buffer,
        mimetype: 'image/jpeg',
      };
    }),
  );
}
