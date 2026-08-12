import { supabase, configured } from "./supabase-client.js";

export async function getSession() {
  if (!configured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Redirects to index.html if there is no session. Call at the top of any
// page that requires a signed-in user. Returns the session on success.
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // No DB trigger creates the profile row automatically, so do it here.
  // RLS policy "profiles own row" allows a user to insert their own id.
  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      display_name: displayName || email.split("@")[0],
      role: "reviewer",
    });
  }
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

export function wireTopbar(userEmail) {
  const who = document.querySelector("[data-who]");
  if (who) who.textContent = userEmail || "";
  const signOutBtn = document.querySelector("[data-signout]");
  if (signOutBtn) signOutBtn.addEventListener("click", signOut);
}
