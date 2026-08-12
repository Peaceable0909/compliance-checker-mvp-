// GoogleWorkspaceProvider: optional archive-to-Drive step via an Apps Script
// web app. Disabled by default (GOOGLE_DRIVE_ARCHIVE_ENABLED = false), so it
// never blocks development and never runs without an explicit opt-in.
export const googleWorkspaceProvider = {
  name: "google-workspace",

  get enabled() {
    return Boolean(window.APP_CONFIG.GOOGLE_DRIVE_ARCHIVE_ENABLED && window.APP_CONFIG.APPS_SCRIPT_WEB_APP_URL);
  },

  async archiveDocument(/* { fileName, signedUrl, applicationId } */) {
    if (!this.enabled) {
      throw new Error(
        "Google Drive archiving is disabled. Set GOOGLE_DRIVE_ARCHIVE_ENABLED = true and " +
        "APPS_SCRIPT_WEB_APP_URL in assets/config.js to enable it."
      );
    }
    throw new Error("Apps Script archive call not implemented yet — placeholder interface only.");
  },
};

export function getGoogleWorkspaceProvider() {
  return googleWorkspaceProvider;
}
