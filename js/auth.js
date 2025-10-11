import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ 嘗試取得目前 Session（包含 OAuth 回傳 token）
  const { data: { session } } = await supabase.auth.getSession();

  // ✅ 檢查網址是否帶 token（登入回傳階段）
  const hash = window.location.hash;
  if (hash.includes("access_token")) {
    // 清理網址中的 token (不留在網址)
    window.history.replaceState({}, document.title, window.location.pathname);
    console.log("🟢 偵測到登入成功，建立 session 中...");

    // 等 SDK 初始化完再取使用者資訊
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log("✅ 登入成功：", user.email);
      window.location.href = "game.html";
      return;
    }
  }

  // ✅ 若已登入（session 已存在）
  if (session?.user) {
    console.log("✅ 已登入，用戶：", session.user.email);
    window.location.href = "game.html";
    return;
  }

  // ✅ 尚未登入 → 點擊登入按鈕時執行登入
  document.getElementById("loginBtn").addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://bannersevenseven.github.io/POLICITY/index.html"
      }
    });
    
    

    if (error) {
      console.error("登入錯誤：", error.message);
      alert("登入發生錯誤，請稍後再試。");
    }
  });
});
