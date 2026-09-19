import { z } from "zod";
import type { Handler } from "../router.js";
import { presignDownload, presignUpload, isStorageEnabled } from "../services/s3.js";
import { requireAccount } from "../utils/auth.js";
import { badRequest, HttpError, json, redirect, parseBody } from "../utils/http.js";
import { newId } from "../utils/ids.js";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const PresignInput = z.object({
  kind: z.enum(["avatar", "project"]),
  contentType: z.enum(Object.keys(EXTENSIONS) as [string, ...string[]]),
});

function requireStorage(): void {
  if (!isStorageEnabled()) throw new HttpError(503, "File uploads are not configured (S3_BUCKET is empty)");
}

/**
 * POST /uploads/presign - returns a URL the browser PUTs the file to, plus a
 * stable assetPath (served by GET /assets/...) to save on the profile/project.
 */
export const presign: Handler = async (req) => {
  requireStorage();
  // Profile photos are uploaded while creating a profile, so only an account is needed.
  const account = await requireAccount(req);
  const { kind, contentType } = parseBody(req.event, PresignInput);
  const key = `${kind}s/${account.sub}/${newId("f")}.${EXTENSIONS[contentType]}`;
  const uploadUrl = await presignUpload(key, contentType);
  return json(200, { uploadUrl, key, assetPath: `/assets/${key}`, method: "PUT", headers: { "Content-Type": contentType } });
};

/** GET /assets/{key} - redirects to a short-lived signed S3 URL (the bucket stays private). */
export const getAsset: Handler = async (req) => {
  requireStorage();
  const key = req.params.rest ?? "";
  if (!/^(avatars|projects)\/[\w-]+\/[\w-]+\.(png|jpg|webp|gif)$/.test(key)) throw badRequest("Invalid asset path");
  return redirect(await presignDownload(key));
};
