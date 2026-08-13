// Runtime configuration for the static frontend.
// The anon/publishable key is safe to expose in browser code when RLS is enabled.
// Never place a Supabase service-role key in this file.
window.APP_CONFIG = {
  SUPABASE_URL: "https://xkqsecpsuynljckbnzsu.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcXNlY3BzdXlubGpja2JuenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NDcxNzEsImV4cCI6MjEwMjEyMzE3MX0.tQ7h2B59IQPGHHY3sCB590r05VfOKyJXvkm9_htL-zI",

  AI_PROVIDER: "local",
  OCR_FUNCTION_NAME: "gemini-ocr",
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
  QWEN_API_BASE_URL: "",
  QWEN_API_KEY: "",
  QWEN_MODEL: "",

  GOOGLE_DRIVE_ARCHIVE_ENABLED: false,
  APPS_SCRIPT_WEB_APP_URL: "",

  MAX_UPLOAD_SIZE_MB: 10,
  STORAGE_BUCKET: "application-documents",
};
