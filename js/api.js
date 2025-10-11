// ✅ js/api.js
import { supabase } from "./supabase-config.js";

// 🔹 取得任務列表
export async function getMissions() {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ 取得任務失敗：", error.message);
    return [];
  }
  return data || [];
}

// 🔹 取得公告列表
export async function getNews() {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ 取得公告失敗：", error.message);
    return [];
  }
  return data || [];
}

// 🔹 取得玩家資料（保留）
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("❌ 取得玩家資料失敗：", error.message);
    return null;
  }
  return data;
}
