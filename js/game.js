// =====================================
// 政權之城 POLICITY — 前端遊戲頁（最終整合即時版）
// =====================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://qvuekjrwsqdobyzefnda.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dWVranJ3c3Fkb2J5emVmbmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMDIwNTYsImV4cCI6MjA3NTU3ODA1Nn0.7BIdtTS9cdH-u5FG83wcv7HgD8Ht8i5Amui9ThjROMU";

export const supabase = createClient(supabaseUrl, supabaseKey);

// =============================
// 🔐 登入狀態檢查
// =============================
async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

// =============================
// 🧾 玩家資料 + POL幣 + 所屬政黨（最終版）
// =============================
async function getProfile(updateOnly = false) {
  try {
    const session = await getSession();
    if (!session || !session.user) return;

    const user = session.user;
    const userId = user.id;
    const email = user.email;
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "未命名";

    // 查詢 profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, polcoin, party_id")
      .eq("id", userId)
      .maybeSingle();

    // 若沒有 → 自動建立
    if (!profile) {
      await supabase.from("profiles").insert([
        {
          id: userId,
          name,
          email,
          polcoin: 500,
          position: "member",
          reputation: 0,
        },
      ]);
      return await getProfile(true);
    }

    // 顯示基本資料
    document.getElementById("playerName").textContent = profile.name || name;
    document.getElementById("playerCoin").textContent = profile.polcoin ?? 0;

    // 查政黨名稱（若有）
    let partyName = "無黨籍";
    if (profile.party_id) {
      const { data: party } = await supabase
        .from("parties")
        .select("name")
        .eq("id", profile.party_id)
        .maybeSingle();
      if (party?.name) partyName = party.name;
    }

    // ✅ 同步更新所有有 #playerParty 的地方
    const partyEls = document.querySelectorAll("#playerParty");
    if (partyEls.length > 0) {
      partyEls.forEach((el) => (el.textContent = partyName));
    }
    

    // Google 頭像
    const avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      "https://i.imgur.com/8Km9tLL.png";
    document.querySelectorAll("#playerAvatar").forEach((img) => {
      img.src = avatarUrl;
    });
  } catch (err) {
    console.warn("⚠️ getProfile 錯誤：", err);
  }
}



// =============================
// 📰 公告管理
// =============================
async function loadNews(auto = false) {
  try {
    const session = await getSession();
    if (!session) return;

    const res = await fetch(
      "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/news",
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);
    const news = await res.json();
    if (!Array.isArray(news)) throw new Error("返回格式錯誤");

    const list = document.getElementById("newsList");
    if (!list) return;
    list.innerHTML = "";

    news.forEach((n) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <b>${n.title}</b>
            <span style="color:#ccc;">(${new Date(n.created_at).toLocaleString()})</span>
            <p>${n.content || ""}</p>
          </div>
        </div>
      `;
      list.appendChild(li);
    });
  } catch (err) {}
}

// =============================
// 🎯 任務載入
// =============================
async function loadMissions(auto = false) {
  try {
    const { data, error } = await supabase
      .from("missions")
      .select("title, description, reward")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list = document.getElementById("missionList");
    if (!list) return;
    list.innerHTML = "";
    data.forEach((m) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${m.title}</b> - ${m.description} (+${m.reward} POL幣)`;
      list.appendChild(li);
    });
  } catch (err) {}
}

// =============================
// 🏛️ 政黨系統（顯示所有政黨 + 標註我的政黨）
// =============================
async function loadPartyPage() {
  const session = await getSession();
  if (!session) return;
  try {
    const res = await fetch(
      "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/party",
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);
    const result = await res.json();
    const allParties = result.all || result || [];

    const { data: profile } = await supabase
      .from("profiles")
      .select("party_id")
      .eq("id", session.user.id)
      .maybeSingle();

    const myPartyId = profile?.party_id || null;
    const myParty =
      result.party || allParties.find((p) => p.id === myPartyId) || null;

    const myBox = document.getElementById("myPartyBox");
    const list = document.getElementById("partyList");

    // ✅ 顯示我的政黨（若有）
    if (myParty) {
      myBox.innerHTML = `
        <div class="party-card" style="display:flex;align-items:center;gap:15px;">
          ${
            myParty.logo_base64
              ? `<img src="${myParty.logo_base64}" width="60" height="60" style="border-radius:50%;border:2px solid ${myParty.color || 'gold'};">`
              : `<div style="width:60px;height:60px;border-radius:50%;background:${myParty.color || '#888'};"></div>`
          }
          <div style="flex:1;">
            <h4 style="color:${myParty.color || 'gold'};"><i class="fa fa-flag"></i> ${myParty.name}</h4>
            <p><i class="fa fa-user"></i> 主席：${myParty.leader?.name || myParty.leader_name || "未知"}</p>
            <p><i class="fa fa-money"></i> 資金：${myParty.capital ?? 0} POL幣</p>
            ${
              myParty.idea
                ? `<p><i class="fa fa-lightbulb-o"></i> ${myParty.idea}</p>`
                : ""
            }
            ${
              myParty.description
                ? `<p><i class="fa fa-info-circle"></i> ${myParty.description}</p>`
                : ""
            }
          </div>
        </div>
      `;
    } else {
      myBox.innerHTML = `<p style="color:#ccc;text-align:center;"><i class="fa fa-info-circle"></i> 尚未加入任何政黨。</p>`;
    }

    // ✅ 顯示所有政黨（包含自己政黨）
    list.innerHTML = allParties
      .map((p) => {
        const isMine = p.id === myPartyId;
        return `
          <div class="party-card" style="display:flex;align-items:center;gap:15px;border:${isMine ? '2px solid lime' : 'none'};">
            ${
              p.logo_base64
                ? `<img src="${p.logo_base64}" width="50" height="50" style="border-radius:50%;border:2px solid ${p.color || 'gold'};">`
                : `<div style="width:50px;height:50px;border-radius:50%;background:${p.color || '#888'};"></div>`
            }
            <div style="flex:1;">
              <h4 style="color:${p.color || 'gold'};">
                <i class="fa fa-flag"></i> ${p.name}
                ${isMine ? '<span style="color:lime;font-size:0.9em;">(我的政黨)</span>' : ""}
              </h4>
              <p><i class="fa fa-money"></i> ${p.capital ?? 0} POL幣</p>
              ${p.idea ? `<p><i class="fa fa-lightbulb-o"></i> ${p.idea}</p>` : ""}
            </div>
            ${
              isMine
                ? `<button class="btn gray" style="padding:5 10px; border:solid 2px black;border-radius:15px" disabled><i class="fa fa-check"></i> 已加入</button>`
                : `<button class="btn main join-btn" data-id="${p.id}">
                     <i class="fa fa-plus"></i> 加入
                   </button>`
            }
          </div>
        `;
      })
      .join("");

    // 綁定加入事件（不覆蓋已加入者）
    list.querySelectorAll(".join-btn").forEach((btn) => {
      btn.onclick = async () => {
        const party_id = btn.dataset.id;
        if (!confirm("確定要加入這個政黨？")) return;

        const joinRes = await fetch(
          "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/party",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "join", data: { party_id } }),
          }
        );

        const joinResult = await joinRes.json();
        if (joinResult.error) return alert("❌ " + joinResult.error);
        const p = joinResult.joined_party || {};
        alert(`✅ 已成功加入政黨「${p.name}」！`);

        await getProfile(true);
        await loadPartyPage();
      };
    });
  } catch (err) {
    console.error("❌ 政黨載入錯誤：", err);
  }
}




// =============================
// 🔔 郵件中心（個人 / 政黨）
// =============================
async function loadMailPage() {
  const session = await getSession();
  if (!session) return;

  const mailSection = document.createElement("section");
  mailSection.className = "mail-section page";
  mailSection.innerHTML = `
    <h3><i class="fa fa-envelope"></i> 郵件中心</h3>
    <div class="mail-tabs">
      <button class="btn main active" id="tabPersonal"><i class="fa fa-user"></i> 個人郵件</button>
      <button class="btn main" id="tabParty"><i class="fa fa-flag"></i> 政黨郵件</button>
    </div>
    <div id="mailBox" style="margin-top:15px;">
      <p style="color:#ccc;">載入中...</p>
    </div>
  `;

  document.querySelector(".main-area").innerHTML = "";
  document.querySelector(".main-area").appendChild(mailSection);

  // 切換邏輯
  const mailBox = document.getElementById("mailBox");
  const btnPersonal = document.getElementById("tabPersonal");
  const btnParty = document.getElementById("tabParty");

  // 📨 載入個人郵件
  async function loadPersonalMail() {
    btnPersonal.classList.add("active");
    btnParty.classList.remove("active");
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error || !data.length)
      mailBox.innerHTML = "<p style='color:#ccc;'>目前沒有個人郵件。</p>";
    else {
      mailBox.innerHTML = data
        .map(
          (m) => `
          <div class="mail-item">
            <b>${m.title}</b>
            <p>${m.content}</p>
            <small>${new Date(m.created_at).toLocaleString()}</small>
          </div>`
        )
        .join("");
    }
  }

  // 🏛️ 載入政黨郵件
  async function loadPartyMail() {
    btnParty.classList.add("active");
    btnPersonal.classList.remove("active");

    // 查詢玩家是否有政黨
    const { data: profile } = await supabase
    .from("profiles")
    .select("party_id")
    .eq("id", session.user.id)
    .maybeSingle();
    const myPartyId = profile?.party_id || null;  

    if (!profile?.party_id)
      return (mailBox.innerHTML = `<p style="color:#888;"><i class="fa fa-lock"></i> 您尚未加入政黨，無法查看政黨郵件。</p>`);

    const { data, error } = await supabase
      .from("party_mails")
      .select("*")
      .eq("party_id", profile.party_id)
      .order("created_at", { ascending: false });

    if (error || !data.length)
      mailBox.innerHTML = "<p style='color:#ccc;'>目前沒有政黨郵件。</p>";
    else {
      mailBox.innerHTML = data
        .map(
          (m) => `
          <div class="mail-item">
            <b>${m.title}</b>
            <p>${m.content}</p>
            <small>${new Date(m.created_at).toLocaleString()}</small>
          </div>`
        )
        .join("");
    }
  }

  btnPersonal.onclick = loadPersonalMail;
  btnParty.onclick = loadPartyMail;

  await loadPersonalMail();
}

// =============================
// 🔔 政權之城 POLICITY 通知系統
// - 含個人/政黨分頁切換
// - 寬度自動限制不超過 main
// - 不遮鈴鐺，最高層浮動
// =============================
document.addEventListener("DOMContentLoaded", async () => {
  const topBar = document.querySelector(".topbar");
  const main = document.querySelector("main") || document.querySelector("#contentArea");
  if (!topBar) return;

  // ========================
  // 🛎️ 建立鈴鐺按鈕與紅圈
  // ========================
  if (!topBar.querySelector("#mailBell")) {
    const bellWrapper = document.createElement("div");
    bellWrapper.style.position = "relative";
    bellWrapper.style.display = "inline-block";

    const bell = document.createElement("button");
    bell.id = "mailBell";
    bell.className = "btn main";
    bell.innerHTML = `<i class="fa fa-bell"></i>`;
    bell.style.marginLeft = "10px";

    // 紅圈數字提示
    const badge = document.createElement("div");
    badge.id = "notifBadge";
    Object.assign(badge.style, {
      position: "absolute",
      top: "-6px",
      right: "-4px",
      background: "red",
      color: "white",
      fontSize: "11px",
      borderRadius: "50%",
      width: "18px",
      height: "18px",
      display: "none",
      justifyContent: "center",
      alignItems: "center",
      fontWeight: "bold",
    });

    bellWrapper.appendChild(bell);
    bellWrapper.appendChild(badge);
    topBar.appendChild(bellWrapper);
  }

  // ========================
  // 📩 建立通知彈出面板
  // ========================
  const popup = document.createElement("div");
  popup.id = "notifPopup";
  Object.assign(popup.style, {
    position: "absolute",
    top: "55px", // 下移避免遮鈴鐺
    right: "10px",
    background: "rgba(25,25,25,0.96)",
    border: "1px solid gold",
    borderRadius: "12px",
    boxShadow: "0 0 20px rgba(0,0,0,0.6)",
    height: "200px",
    overflowY: "auto",
    display: "none",
    zIndex: "999999",
    color: "white",
    fontFamily: "微軟正黑體",
    transition: "opacity 0.2s ease",
  });
  document.body.appendChild(popup);

  const bell = document.getElementById("mailBell");
  const badge = document.getElementById("notifBadge");

  // ========================
  // 🔽 顯示 / 隱藏彈窗
  // ========================
  bell.onclick = async (e) => {
    e.stopPropagation();
    if (popup.style.display === "block") {
      popup.style.display = "none";
      return;
    }

    // 設定寬度不超過 main
    const mainWidth = main?.offsetWidth || 800;
    popup.style.width = `${Math.min(mainWidth - 40, 330)}px`;
    popup.style.display = "block";
    popup.style.opacity = "1";

    await loadNotifications(popup, badge);
  };

  // 點擊空白處關閉
  document.addEventListener("click", (e) => {
    if (!popup.contains(e.target) && e.target !== bell) {
      popup.style.display = "none";
    }
  });

  // ========================
  // 📜 載入通知內容
  // ========================
  async function loadNotifications(container, badgeEl) {
    const session = await supabase.auth.getSession();
    const user = session?.data?.session?.user;
    if (!user) {
      container.innerHTML = `<p style="text-align:center;margin-top:60px;color:#ccc;">請先登入</p>`;
      badgeEl.style.display = "none";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("party_id")
      .eq("id", user.id)
      .maybeSingle();
    const partyId = profile?.party_id || null;

    // 同時查詢個人與政黨通知
    const [personal, party] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      partyId
        ? supabase
            .from("party_mails")
            .select("*")
            .eq("party_id", partyId)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
    ]);

    const personalList = personal?.data || [];
    const partyList = party?.data || [];

    // 更新紅圈
    const total = personalList.length + partyList.length;
    if (total > 0) {
      badgeEl.textContent = total > 9 ? "9+" : total;
      badgeEl.style.display = "flex";
    } else {
      badgeEl.style.display = "none";
    }

    // 沒通知時
    if (!total) {
      container.innerHTML = `<p style="text-align:center;margin-top:70px;color:#aaa;">目前沒有任何通知</p>`;
      return;
    }

    // ========================
    // 📂 上方選單 + 關閉按鈕
    // ========================
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:1px solid #444;">
        <div style="display:flex;gap:10px;">
          <button id="tabPersonal" class="btn main" style="background:gold;color:black;border:none;padding:4px 10px;border-radius:6px;">個人</button>
          <button id="tabParty" class="btn main" style="background:#333;color:white;border:none;padding:4px 10px;border-radius:6px;">政黨</button>
        </div>
        <i id="closePopup" class="fa fa-times" style="cursor:pointer;color:#ccc;font-size:14px;"></i>
      </div>
      <div id="notifList" style="max-height:160px;overflow-y:auto;padding:5px 10px;"></div>
    `;

    const tabPersonal = container.querySelector("#tabPersonal");
    const tabParty = container.querySelector("#tabParty");
    const listEl = container.querySelector("#notifList");

    // 顯示清單
    const renderList = (type) => {
      const items = type === "personal" ? personalList : partyList;
      if (!items.length) {
        listEl.innerHTML = `<p style="color:#888;text-align:center;margin-top:40px;">沒有${type === "personal" ? "個人" : "政黨"}通知</p>`;
        return;
      }

      listEl.innerHTML = items
        .map(
          (m) => `
          <div style="border-bottom:1px solid #444;padding:5px 0;">
            <b style="color:${type === "personal" ? "gold" : "deepskyblue"};">${m.title}</b>
            <p style="color:#ddd;margin:2px 0;">${m.content}</p>
            <small style="color:#777;">${new Date(
              m.created_at
            ).toLocaleString()}</small>
          </div>`
        )
        .join("");
    };

    renderList("personal"); // 初始顯示個人通知

    // 切換按鈕
    tabPersonal.onclick = () => {
      tabPersonal.style.background = "gold";
      tabPersonal.style.color = "black";
      tabParty.style.background = "#333";
      tabParty.style.color = "white";
      renderList("personal");
    };

    tabParty.onclick = () => {
      tabParty.style.background = "deepskyblue";
      tabParty.style.color = "black";
      tabPersonal.style.background = "#333";
      tabPersonal.style.color = "white";
      renderList("party");
    };

    // 關閉按鈕
    container.querySelector("#closePopup").onclick = () => {
      container.style.display = "none";
    };
  }
});



// =============================
// 🏆 排行榜
// =============================
async function loadRanking() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("name, polcoin")
      .order("polcoin", { ascending: false })
      .limit(20);
    if (error) throw error;
    const list = document.getElementById("rankingList");
    if (!list) return;
    list.innerHTML = "";
    data.forEach((p, i) => {
      const li = document.createElement("li");
      li.textContent = `#${i + 1} ${p.name} — ${p.polcoin} POL幣`;
      list.appendChild(li);
    });
  } catch (err) {}
}
// =============================
// ⚔️ 對戰模式整合版
// =============================
window.loadFightPage = loadFightPage;

async function loadFightPage() {
  const container = document.getElementById("modeSelect");
  const modes = ["poker", "debate", "monopoly", "election", "conquest"];
  container.innerHTML = modes
    .map(
      (m) => `
        <div class="mode-card">
          <h4>${m.toUpperCase()}</h4>
          <p>點擊開始遊戲</p>
          <button onclick="startServerGame('${m}')">開始遊戲</button>
        </div>`
    )
    .join("");
}

async function startServerGame(mode = "poker") {
  showGameLoader("載入對戰模式...", "images/logo.png"); // 🟡 加這行

  const session = await supabase.auth.getSession();
  const user = session?.data?.session?.user;
  if (!user) {
    hideGameLoader();
    return alert("請先登入");
  }

  const { event } = await callEdge("start_fight", { user_id: user.id, mode });
  hideGameLoader();

  if (!event) return alert("無法開始遊戲");
  openFullscreenGame(event.id, mode, user.id);
}


async function openFullscreenGame(event_id, mode, user_id) {
  console.log("🎯 啟動對戰畫面", { event_id, mode, user_id });

  const canvas = document.getElementById("fightCanvas");
  const ctx = canvas.getContext("2d");

  // 切換顯示區域
  document.getElementById("modeSelect")?.classList.add("hidden");
  document.getElementById("gameArea")?.classList.remove("hidden");

  // 全螢幕進入
  if (canvas.requestFullscreen) await canvas.requestFullscreen();

  // 防止玩家在遊戲中意外關閉頁面
  window.onbeforeunload = (e) => {
    e.preventDefault();
    e.returnValue = "確定要離開遊戲嗎？進度將不會保存。";
  };

  // 🔄 每 1 秒輪詢一次後端遊戲狀態
  const loop = setInterval(async () => {
    try {
      const result = await callEdge("get_state", { event_id });
      const state = result?.state;

      if (!state) {
        drawError(ctx, "⚠️ 無法取得遊戲狀態 (401)");
        return;
      }

      // 繪製畫面
      drawGameCanvas(ctx, state, user_id);

      // ✅ 若遊戲已結束
      if (state.status === "finished") {
        clearInterval(loop);
        window.onbeforeunload = null;
        if (document.fullscreenElement) await document.exitFullscreen();
        alert("🎉 對戰結束！");
        showGameLoader("返回主頁...", "images/logo.png"); // 🟡 新增這行
        setTimeout(() => {
          location.reload();
        }, 1000);
      }
      
    } catch (err) {
      console.error("❌ get_state 錯誤：", err);
      drawError(ctx, "❌ 連線錯誤，請檢查網路。");
    }
  }, 5000);
}

function drawPokerGame(ctx, state) {
  ctx.clearRect(0, 0, 800, 450);
  ctx.fillStyle = "#003300";
  ctx.fillRect(0, 0, 800, 450);

  // 桌面
  ctx.fillStyle = "gold";
  ctx.font = "20px 微軟正黑體";
  ctx.fillText("政客撲克桌 - 模式：" + state.mode, 20, 30);
  ctx.fillText("回合：" + (state.effect.turn || "preflop"), 20, 60);

  // BOT 行動
  if (state.effect.lastBotAction) {
    ctx.fillStyle = "white";
    ctx.fillText("AI 政敵行動：" + state.effect.lastBotAction, 20, 100);
  }

  // 公共牌
  if (state.effect.community?.length) {
    ctx.fillText("公共牌：" + state.effect.community.join(" "), 20, 140);
  }

  // 分數
  if (state.effect.scores) {
    ctx.fillText(
      "分數：" + JSON.stringify(state.effect.scores),
      20,
      180
    );
  }
}


function drawState(ctx, state) {
  if (!state) {
    ctx.clearRect(0, 0, 800, 450);
    ctx.fillStyle = "red";
    ctx.font = "20px 微軟正黑體";
    ctx.fillText("❌ 無法取得遊戲狀態 (401)", 200, 220);
    return;
  }
  ctx.clearRect(0, 0, 800, 450);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 800, 450);
  ctx.fillStyle = "gold";
  ctx.font = "24px 微軟正黑體";
  ctx.fillText(`模式：${state.mode}`, 50, 50);
  ctx.fillText(`狀態：${state.status}`, 50, 80);
  if (state.effect?.scores)
    ctx.fillText(`得分：${JSON.stringify(state.effect.scores)}`, 50, 120);
}




// =============================
// 🎮 簡易 Canvas 遊戲範例
// =============================
function renderGameCanvas(mode) {
  const canvas = document.getElementById("fightCanvas");
  const ctx = canvas.getContext("2d");
  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景閃爍特效
    const color = `hsl(${(t % 360)}, 70%, 50%)`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.font = "48px '微軟正黑體'";
    ctx.textAlign = "center";
    ctx.fillText("模式：" + mode, canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = "24px '微軟正黑體'";
    ctx.fillText("遊戲進行中...", canvas.width / 2, canvas.height / 2 + 20);

    t += 1;
    requestAnimationFrame(draw);
  }

  draw();
}


async function createFight(mode) {
  const session = await supabase.auth.getSession();
const token = session?.data?.session?.access_token;

const res = await fetch(
  "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/events?action=get_state",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dWVranJ3c3Fkb2J5emVmbmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMDIwNTYsImV4cCI6MjA3NTU3ODA1Nn0.7BIdtTS9cdH-u5FG83wcv7HgD8Ht8i5Amui9ThjROMU",

    },
    body: JSON.stringify({ event_id }),
  }
);


  const result = await res.json();
  if (result.error) return alert("❌ " + result.error);
  alert(`✅ 已建立 ${mode} 對戰活動`);
}


// =============================
// 🧭 分頁切換
// =============================
function initPageSwitch() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const pages = document.querySelectorAll(".page");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.page;
      pages.forEach((p) => p.classList.add("hidden"));
      navBtns.forEach((b) => b.classList.remove("active"));
      const targetPage = document.getElementById(`${target}Section`);
      if (targetPage) targetPage.classList.remove("hidden");
      btn.classList.add("active");
      if (target === "party") loadPartyPage();
      if (target === "ranking") loadRanking();
      if (target === "fight") loadFightPage();
    });
  });
}

// =============================
// 🚪 登出
// =============================
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});


// =============================
// 🔁 自動即時刷新（無Realtime）
// =============================
function startAutoRefresh() {
  setInterval(() => getProfile(true), 5000);
  setInterval(() => loadNews(true), 10000);
  setInterval(() => loadMissions(true), 15000);
  setInterval(() => loadPartyPage(true), 20000);
}
// =====================================
// 🚀 Supercell 風格載入畫面（全系統整合）
// =====================================

window.showGameLoader = function (message = "政權之城 POLICITY", logoPath = "images/logo.png") {
  // 避免重複建立
  if (document.getElementById("gameLoader")) return;

  const loader = document.createElement("div");
  loader.id = "gameLoader";
  Object.assign(loader.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "black",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    zIndex: 999999,
    transition: "opacity 0.8s ease",
  });

  const logo = document.createElement("img");
  logo.src = logoPath;
  Object.assign(logo.style, {
    width: "220px",
    opacity: 0,
    transform: "scale(0.7)",
    transition: "opacity 1s ease, transform 0.8s ease",
    filter: "drop-shadow(0 0 20px gold)"
  });

  const text = document.createElement("div");
  text.textContent = message;
  Object.assign(text.style, {
    color: "white",
    fontFamily: "微軟正黑體",
    fontSize: "40px",
    marginTop: "25px",
    opacity: 0,
    transition: "opacity 0.8s ease"
  });

  loader.appendChild(logo);
  loader.appendChild(text);
  document.body.appendChild(loader);

  // LOGO 動畫進場
  setTimeout(() => {
    logo.style.opacity = 1;
    logo.style.transform = "scale(1)";
  }, 100);

  // 文字淡入
  setTimeout(() => {
    text.style.opacity = 1;
  }, 600);
};

// ✅ 關閉載入畫面
window.hideGameLoader = function () {
  const loader = document.getElementById("gameLoader");
  if (!loader) return;
  loader.style.opacity = 0;
  setTimeout(() => loader.remove(), 900);
};

// ✅ 頁面初次載入顯示
showGameLoader("政權之城 POLICITY", "images/logo.png");

window.addEventListener("load", () => {
  setTimeout(hideGameLoader, 3500);
});


// =============================
// 🚀 初始化
// =============================
document.addEventListener("DOMContentLoaded", async () => {
  await getProfile();
  await loadNews();
  await loadMissions();
  await loadPartyPage();
  await loadRanking();
  initPageSwitch();
  startAutoRefresh();
});

// ✅ 讓 HTML onclick 能呼叫這些函式
window.loadFightPage = loadFightPage;
window.startServerGame = startServerGame;
async function callEdge(action, body = {}) {
  const session = await supabase.auth.getSession();
  const token = session?.data?.session?.access_token;

  if (!token) {
    console.warn("❌ 無法取得登入 Token");
    alert("請先登入再進行遊戲！");
    return {};
  }

  const res = await fetch(
    `https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/events?action=${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dWVranJ3c3Fkb2J5emVmbmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMDIwNTYsImV4cCI6MjA3NTU3ODA1Nn0.7BIdtTS9cdH-u5FG83wcv7HgD8Ht8i5Amui9ThjROMU"
      },
      body: JSON.stringify(body),
    }
  );

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`❌ ${action} 錯誤:`, res.status, result);
    if (res.status === 401) {
      alert("登入已失效，請重新登入");
      await supabase.auth.signOut();
      window.location.href = "index.html";
    }
  }

  return result;
  // =============================================
// 🎨 對戰畫面繪製核心
// =============================================
function drawGameCanvas(ctx, state, user_id) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 背景
  ctx.fillStyle = "#003300";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 標題列
  ctx.fillStyle = "gold";
  ctx.font = "22px 微軟正黑體";
  ctx.fillText(`模式：${state.mode?.toUpperCase() || "未知"}`, 30, 40);
  ctx.fillText(`狀態：${state.status || "未知"}`, 30, 70);

  // 玩家資料
  const players = state.effect?.players || [];
  const scores = state.effect?.scores || {};
  const community = state.effect?.community || [];
  const pot = state.effect?.pot ?? 0;

  let y = 120;
  ctx.font = "18px 微軟正黑體";
  for (const p of players) {
    const isBot = p.startsWith("bot-");
    ctx.fillStyle = isBot ? "deepskyblue" : "white";
    const label = isBot ? "🤖 政敵AI" : "🧑 玩家";
    ctx.fillText(`${label} (${p.slice(0, 6)}): ${scores[p] ?? 0} POL`, 50, y);
    y += 30;
  }

  // 公共牌
  if (community.length) {
    ctx.fillStyle = "yellow";
    ctx.fillText("公共牌：" + community.join(" "), 50, y + 10);
    y += 30;
  }

  // 底池
  ctx.fillStyle = "orange";
  ctx.fillText(`底池：${pot} POL幣`, 50, y + 30);

  // BOT 行動顯示
  const botAction = state.effect?.actions
    ? Object.entries(state.effect.actions).find(([k]) => k.startsWith("bot-"))
    : null;
  if (botAction) {
    ctx.fillStyle = "aqua";
    ctx.fillText(`AI 政敵行動：${botAction[1]}`, 50, y + 60);
  }

  // 倒數時間
  if (state.effect?.time) {
    ctx.fillStyle = "lightgray";
    ctx.fillText(`剩餘時間：${state.effect.time}s`, 50, y + 90);
  }
}

// =============================================
// ❌ 錯誤畫面顯示
// =============================================
function drawError(ctx, message) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "red";
  ctx.font = "22px 微軟正黑體";
  ctx.fillText(message, 120, ctx.canvas.height / 2);
}

}

// 👇 強制讓函式成為全域可存取
// =============================================
// ✅ 確保全域可用 (for onclick / interval / server callbacks)
// =============================================
window.drawGameCanvas = function (ctx, state, user_id) {
  if (!ctx || !state) return;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 背景
  ctx.fillStyle = "#003300";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 標題
  ctx.fillStyle = "gold";
  ctx.font = "22px 微軟正黑體";
  ctx.fillText(`模式：${state.mode?.toUpperCase() || "未知"}`, 30, 40);
  ctx.fillText(`狀態：${state.status || "未知"}`, 30, 70);

  // 玩家分數
  const scores = state.effect?.scores || {};
  let y = 120;
  ctx.fillStyle = "white";
  ctx.font = "18px 微軟正黑體";
  for (const uid in scores) {
    const score = scores[uid];
    const label = uid === user_id ? "你" : "AI 政敵";
    ctx.fillText(`${label} 分數：${score}`, 50, y);
    y += 30;
  }

  // 時間倒數
  if (state.effect?.time) {
    ctx.fillStyle = "lightgray";
    ctx.fillText(`剩餘時間：${state.effect.time}s`, 50, y + 20);
  }
};

window.drawError = function (ctx, message) {
  if (!ctx) return;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "red";
  ctx.font = "22px 微軟正黑體";
  ctx.fillText(message, 120, ctx.canvas.height / 2);
};

// ⛔ 同時掛全域給其他遊戲函式
window.startServerGame = startServerGame;
window.openFullscreenGame = openFullscreenGame;

