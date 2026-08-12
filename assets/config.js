// Environment-last configuration.
//
// Fill these in yourself before the site works against real data. Nothing in
// this repo commits real credentials. SUPABASE_ANON_KEY is safe to expose in
// client code (it is the public/anon key, not the service role key) as long
// as Row Level Security stays enabled on every table, which the migration
// already does.
//
// AI provider keys stay blank on purpose (see docs/PLAN.md, section 16 in the
// original brief: "Do not block development"). With AI_PROVIDER left as
// "local", the site runs the deterministic compliance engine only and never
// calls Gemini or Qwen, so no key is required to use the app end to end.
window.APP_CONFIG = {
  SUPABASE_URL: "",           // e.g. "https://xkqsecpsuynljckbnzsu.supabase.co"
  SUPABASE_ANON_KEY: "",      // Project Settings -> API -> anon public key

  AI_PROVIDER: "local",       // "local" | "gemini" | "qwen"  (gemini/qwen are stubs until keys are added)
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
