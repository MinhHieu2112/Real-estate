import sharp from 'sharp';
import { Upload } from '@aws-sdk/lib-storage';
import pLimit from 'p-limit';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

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

export async function uploadFileToS3(
  files: Express.Multer.File[],
  managerCognitoId: string,
  propertyId: number,
): Promise<string[]> {
  if (!files || files.length === 0) return [];

  // Nén tất cả ảnh qua Sharp trước khi upload
  const optimizedFiles = await processImage(files);

  // Giới hạn số lần tải lên ảnh
  const limit = pLimit(10);

  // Upload song song lên S3
  const uploadPromises = optimizedFiles.map((file) =>
    limit(async () => {
      const fileExtension = file.mimetype === 'image/jpeg' ? 'jpg' : '';
      const cleanFileName = file.originalname.replace(/\.[^/.]+$/, '');
      const key = `properties/${managerCognitoId}/${propertyId}/${cleanFileName}.${fileExtension}`;

      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const uploadResult = await new Upload({
        client: s3Client,
        params: uploadParams,
      }).done();

      if (!uploadResult.Location) {
        throw new Error('Failed to upload file to S3');
      }

      return uploadResult.Location;
    }),
  );
  return Promise.all(uploadPromises);
}
