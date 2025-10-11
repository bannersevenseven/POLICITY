import { supabase } from "./supabase-config.js";

// ✅ 修正：先處理從 Supabase OAuth 回傳的 #callback
if (window.location.hash.startsWith("#callback")) {
  // 把 #callback 替換成 Supabase token hash 形式
  const newUrl =
    window.location.origin +
    "/POLICITY/index.html" +
    window.location.hash.replace("#callback", "");
  window.location.replace(newUrl);
}

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // ⚠️ 關鍵：強制導回完整 POLICITY 路徑
        redirectTo: "https://bannersevenseven.github.io/POLICITY/#callback"
      }
    });

    if (error) {
      console.error("登入錯誤：", error.message);
      alert("登入發生錯誤，請稍後再試。");
    }
  });
});
