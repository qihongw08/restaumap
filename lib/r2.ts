import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
/** Base URL for public read access (e.g. https://pub-xxx.r2.dev or custom domain). No trailing slash. */
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

function getR2Client(): S3Client {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY",
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function getExtension(mime: string): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

/**
 * Upload a single file to R2. Returns the public URL.
 * Object key: groupId (if applicable) / userId / restaurantId / randomUUID.ext
 */
export async function uploadToR2(
  file: {
    buffer: Buffer;
    mimetype: string;
    originalFilename?: string;
  },
  options: {
    userId: string;
    restaurantId: string;
    groupId?: string | null;
  },
): Promise<string> {
  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    throw new Error("R2_BUCKET_NAME and R2_PUBLIC_URL must be set");
  }
  if (!options.userId || !options.restaurantId) {
    throw new Error("userId and restaurantId are required");
  }
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    throw new Error(
      `Invalid type: ${file.mimetype}. Allowed: image/jpeg, image/png, image/webp, image/gif`,
    );
  }
  if (file.buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`File too large (max ${MAX_SIZE_BYTES / 1024 / 1024} MB)`);
  }
  const ext = getExtension(file.mimetype);
  const uuid = crypto.randomUUID();
  const pathSegments = options.groupId
    ? [options.groupId, options.userId, options.restaurantId, `${uuid}${ext}`]
    : [options.userId, options.restaurantId, `${uuid}${ext}`];
  const key = pathSegments.join("/");
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

/**
 * Generate a presigned PUT URL for direct client-to-R2 upload.
 * Returns { uploadUrl, publicUrl, key }.
 */
export async function presignUploadUrl(
  mimetype: string,
  sizeBytes: number,
  options: {
    userId: string;
    restaurantId: string;
    groupId?: string | null;
  },
  expiresIn = 300,
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    throw new Error("R2_BUCKET_NAME and R2_PUBLIC_URL must be set");
  }
  if (!ALLOWED_TYPES.has(mimetype)) {
    throw new Error(
      `Invalid type: ${mimetype}. Allowed: image/jpeg, image/png, image/webp, image/gif`,
    );
  }
  const ext = getExtension(mimetype);
  const uuid = crypto.randomUUID();
  const pathSegments = options.groupId
    ? [options.groupId, options.userId, options.restaurantId, `${uuid}${ext}`]
    : [options.userId, options.restaurantId, `${uuid}${ext}`];
  const key = pathSegments.join("/");
  const client = getR2Client();
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: mimetype,
      ContentLength: sizeBytes,
    }),
    { expiresIn, signableHeaders: new Set(["content-length"]) },
  );
  return { uploadUrl, publicUrl: `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`, key };
}
