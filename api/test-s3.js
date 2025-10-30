import 'dotenv/config';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

(async () => {
  console.log('🌍 Region from env:', process.env.AWS_REGION);
  console.log('🧾 AccessKey:', process.env.AWS_ACCESS_KEY_ID?.slice(0,5));

  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });

  const res = await s3.send(new ListBucketsCommand({}));
  console.log('✅ Buckets:', res.Buckets.map(b => b.Name));
})();
