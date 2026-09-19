import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

const s3 = new S3Client({ region: config.region });

export const isStorageEnabled = (): boolean => Boolean(config.s3Bucket);

/** URL the browser can PUT a file to directly (valid for 5 minutes). */
export function presignUpload(key: string, contentType: string): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: config.s3Bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
}

/** Short-lived URL to read a private object; /assets/* redirects here so stored URLs never expire. */
export function presignDownload(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }), { expiresIn: 3600 });
}
