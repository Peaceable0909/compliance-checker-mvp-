// StorageProvider: uploads/reads private application documents. Backed by
// Supabase Storage today; swapping to another object store later only means
// writing a new file that implements this same shape.
import { supabase } from "../supabase-client.js";

const bucket = window.APP_CONFIG.STORAGE_BUCKET || "application-documents";

export const supabaseStorageProvider = {
  name: "supabase",

  // Path convention matches the RLS policy in the migration:
  // storage.foldername(name)[1] must equal auth.uid()::text
  buildPath(userId, applicationId, documentTypeSlug, fileName) {
    const safeName = fileName.replace(/[^\w.\-]+/g, "_");
    return `${userId}/${applicationId}/${documentTypeSlug}/${Date.now()}-${safeName}`;
  },

  async upload(path, file) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw error;
    return path;
  },

  async getSignedUrl(path, expiresInSeconds = 300) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async remove(path) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};

export function getStorageProvider() {
  // Only one implementation today; kept as a function so a future provider
  // (e.g. S3-compatible) can be selected the same way AI providers are.
  return supabaseStorageProvider;
}
