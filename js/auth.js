import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // 已登入 → 前往遊戲頁
    window.location.href = "game.html";
  }

  document.getElementById("loginBtn").addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  });
});
