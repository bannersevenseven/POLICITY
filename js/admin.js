// =====================================
// 政權之城 POLICITY 後台管理系統（最終穩定版）
// - 修正 leader_id 錯誤
// - 改用 "parties" 表名
// - 支援 Base64 黨徽
// =====================================

import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 🌐 自動建立頁面骨架
  document.body.innerHTML = `
    <div id="pageRoot" style="display:none;">
      <section id="loginSection" class="center">
        <h2><i class="fa fa-lock"></i> 管理員登入</h2>
        <button id="loginBtn" class="btn main"><i class="fa fa-google"></i> 使用 Google 登入</button>
      </section>

      <section id="dashboard" class="hidden">
        <header class="admin-header">
          <h2><i class="fa fa-shield"></i> 政權之城 POLICITY 後台管理</h2>
          <div>
            <span id="adminName"></span>
            <button id="logoutBtn" class="btn logout"><i class="fa fa-sign-out"></i> 登出</button>
          </div>
        </header>

        <nav class="admin-tabs">
        <button id="tabMissions" class="btn main"><i class="fa fa-bullseye"></i> 任務管理</button>
        <button id="tabParties" class="btn main"><i class="fa fa-flag"></i> 政黨管理</button>
        <button id="tabNews" class="btn main"><i class="fa fa-newspaper-o"></i> 公告管理</button>
        <button id="tabCoins" class="btn main"><i class="fa fa-money"></i> POL幣管理</button>
      </nav>
      

        <main id="contentArea" class="admin-content">
          <p>請選擇上方功能進行管理。</p>
        </main>
      </section>
    </div>
  `;

  const pageRoot = document.getElementById("pageRoot");
  const loginSection = document.getElementById("loginSection");
  const dashboard = document.getElementById("dashboard");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminName = document.getElementById("adminName");
  const contentArea = document.getElementById("contentArea");
  pageRoot.style.display = "block";

  // ---------------- 登入檢查 ----------------
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await verifyAdmin(session.user);

  // Google 登入
  loginBtn.onclick = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin.html` }
    });
  };

  // 登出
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    alert("您已登出。");
    location.reload();
  };

  // ---------------- 管理員驗證 ----------------
  async function verifyAdmin(user) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", user.email)
      .single();

    if (error || !data) {
      alert("⚠️ 您沒有管理員權限。");
      window.location.href = "game.html";
      await supabase.auth.signOut();
      location.reload();
      return;
    }

    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    adminName.textContent = user.user_metadata.full_name || user.email;
  }

  // ---------------- 後端呼叫 ----------------
  async function callEdge(type, action = "list", data = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      alert("請重新登入");
      return [];
    }
  
    // 對應 API URL
    let url = "";
    if (type === "parties") url = "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/party";
    else if (type === "missions") url = "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/missions";
    else if (type === "news") url = "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/news";
    else return [];
  
    // 根據 action 選擇正確的 HTTP method
    let method = "POST";
    if (action === "update") method = "PUT";
    else if (action === "delete") method = "DELETE";
    else if (action === "create") method = "POST";
    else if (action === "list") method = "GET";
  
    const res = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: method === "GET" ? null : JSON.stringify({ action, data })
    });
  
    if (!res.ok) {
      const msg = await res.text();
      alert("❌ 錯誤：" + msg);
      return [];
    }
  
    return res.json();
  }
  
  

  // ---------------- 功能切換 ----------------
  document.getElementById("tabMissions").onclick = () => renderMissions();
  document.getElementById("tabParties").onclick = async () => {
    await renderParties();
  };
    document.getElementById("tabNews").onclick = () => renderNews();
  document.getElementById("tabCoins").onclick = () => renderCoins();

  // ======================
// 🎯 任務管理（修正版）
// ======================
async function renderMissions() {
  contentArea.innerHTML = `
    <h3><i class="fa fa-bullseye"></i> 任務管理</h3>
    <div class="news-editor">
      <input id="newMissionTitle" placeholder="任務標題">
      <textarea id="newMissionDesc" placeholder="任務說明"></textarea>
      <input id="newMissionReward" type="number" placeholder="獎勵 POL幣" value="10">
      <div class="editor-actions">
        <button id="addMissionBtn" class="btn main"><i class="fa fa-plus"></i> 新增任務</button>
        <button id="refreshMission" class="btn logout"><i class="fa fa-refresh"></i> 重新整理</button>
      </div>
    </div>
    <ul id="missionList" class="news-list">載入中...</ul>
  `;

  const list = document.getElementById("missionList");

  // 🔹 取得任務資料
  const missions = await callEdge("missions", "list");
  if (!Array.isArray(missions) || missions.length === 0) {
    list.innerHTML = "<li>目前沒有任務。</li>";
  } else {
    list.innerHTML = missions
      .map(
        (m) => `
        <li>
          <b>${m.title}</b> (+${m.reward} POL幣)<br>
          <small>${m.description || ""}</small>
          <div class="item-actions">
            <button class="btn main editMission" data-id="${m.id}" data-title="${m.title}" data-desc="${m.description}" data-reward="${m.reward}">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn logout deleteMission" data-id="${m.id}">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </li>`
      )
      .join("");
  }

  // 🔹 新增任務
  document.getElementById("addMissionBtn").onclick = async () => {
    const title = document.getElementById("newMissionTitle").value.trim();
    const description = document.getElementById("newMissionDesc").value.trim();
    const reward = parseInt(document.getElementById("newMissionReward").value) || 0;
    if (!title) return alert("請輸入任務標題！");
    await callEdge("missions", "create", { title, description, reward });
    alert("任務新增成功！");
    await renderMissions();
  };

  // 🔹 重新整理
  document.getElementById("refreshMission").onclick = renderMissions;

  // 🔹 編輯任務
  document.querySelectorAll(".editMission").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const title = prompt("任務標題", btn.dataset.title);
      if (title === null) return;
      const description = prompt("任務內容", btn.dataset.desc);
      if (description === null) return;
      const reward = prompt("獎勵 POL幣", btn.dataset.reward);
      await callEdge("missions", "update", {
        id,
        title,
        description,
        reward: parseInt(reward) || 0,
      });
      alert("任務更新成功！");
      await renderMissions();
    };
  });

  // 🔹 刪除任務
  document.querySelectorAll(".deleteMission").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("確定要刪除此任務？")) return;
      await callEdge("missions", "delete", { id: btn.dataset.id });
      alert("任務已刪除！");
      await renderMissions();
    };
  });
}

  

  // ======================
// 🏛️ 政黨管理 (Base64 + 所有政黨)
// ======================
async function renderParties() {
  const parties = await callEdge("parties", "list");

  contentArea.innerHTML = `
  <h3><i class="fa fa-flag"></i> 政黨管理</h3>
  <div class="news-editor">
    <p>政黨名稱</p>
    <input id="newPartyName" placeholder="政黨名稱">
    <p>黨徽顏色</p>
    <input id="newPartyColor" type="color" value="#FFD700" title="黨徽顏色">
    <p>政黨細項</p>
    <input id="newPartyCapital" type="number" placeholder="資本額 (POL幣)">
    <textarea id="newPartyIdea" placeholder="政黨理念"></textarea>
    <textarea id="newPartyDesc" placeholder="政黨簡介"></textarea>
  
    <p>上傳黨徽</p>
    <input id="newPartyLogo" type="file" accept="image/*">
  
    <div class="editor-actions">
      <button id="addPartyBtn" class="btn main"><i class="fa fa-plus"></i> 新增政黨</button>
      <button id="refreshParty" class="btn logout"><i class="fa fa-refresh"></i> 重新整理</button>
    </div>
  </div>
  <div id="createPartyRules" class="party-rules">
  <h3><i class="fa fa-info-circle"></i> 創黨規則</h3>
  <ul>
    <li>創黨需消耗 <b>100 POL 幣</b></li>
    <li>創黨人自動成為黨主席</li>
    <li>每位玩家同時只能擁有一個政黨</li>
    <li>政黨名稱必填，顏色必選</li>
  </ul>
</div>

  <ul id="partyList" class="news-list">載入中...</ul>
  
  `;

  const list = document.getElementById("partyList");

  // 🔹 新增政黨
  document.getElementById("addPartyBtn").onclick = async () => {
    const name = document.getElementById("newPartyName").value.trim();
    const color = document.getElementById("newPartyColor").value;
    const idea = document.getElementById("newPartyIdea").value.trim();
    const description = document.getElementById("newPartyDesc").value.trim();
    const logoFile = document.getElementById("newPartyLogo").files[0];
  
    let logo_base64 = null;
    if (logoFile) {
      const reader = new FileReader();
      logo_base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(logoFile);
      });
    }
  
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return alert("請先登入");
  
    const res = await fetch(
      "https://qvuekjrwsqdobyzefnda.supabase.co/functions/v1/party",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          data: { name, color, idea, description, logo_base64 }, // ✅ 移除 leader_id
        }),
      }
    );
    
  
    const result = await res.json();
    if (!res.ok) alert("❌ 新增失敗：" + result.error);
    else alert("✅ 政黨建立成功！");
    document.getElementById("newPartyName").value = "";
document.getElementById("newPartyIdea").value = "";
document.getElementById("newPartyDesc").value = "";
document.getElementById("newPartyLogo").value = "";

    await renderParties();
  };
  

  document.getElementById("refreshParty").onclick = renderParties;

  // 🔹 顯示政黨清單
  const partyArray = Array.isArray(parties) ? parties : (parties.all || []);
  if (!partyArray.length) {
    list.innerHTML = "<li>目前沒有政黨。</li>";
    return;
  }

  list.innerHTML = partyArray
    .map(
      (p) => `
      <li class="party-card">
        <div style="display:flex;align-items:center;gap:10px;">
          ${
            p.logo_base64
              ? `<img src="${p.logo_base64}" width="50" height="50" style="border-radius:50%;border:2px solid ${
                  p.color || "#FFD700"
                };">`
              : ""
          }
          <div style="color:white">
            <h3>${p.name}</h3>
            <p style="color:${p.color};">● ${p.color}</p>
            <p><b>資本額：</b>${p.capital || 0} POL 幣</p>
            ${p.idea ? `<p><b>理念：</b>${p.idea}</p>` : ""}
            ${p.description ? `<p><b>簡介：</b>${p.description}</p>` : ""}
            <p><b>支持率：</b>${p.support_rate || 0}%</p>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn main editParty" data-id="${p.id}" data-name="${p.name}" data-color="${p.color}" data-capital="${p.capital || 0}" data-idea="${p.idea || ""}" data-desc="${p.description || ""}">
            <i class="fa fa-edit"></i>
          </button>
          <button class="btn logout deleteParty" data-id="${p.id}">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </li>`
    )
    .join("");

  // 🔹 刪除政黨
  document.querySelectorAll(".deleteParty").forEach((btn) => {
    btn.onclick = async () => {
      if (confirm("確定刪除此政黨？")) {
        await callEdge("parties", "delete", { id: btn.dataset.id });
        await renderParties();
      }
    };
  });

  // 🔹 編輯政黨（含主席選擇）
document.querySelectorAll(".editParty").forEach((btn) => {
  btn.onclick = async () => {
    const data = {
      id: btn.dataset.id,
      name: btn.dataset.name || "",
      color: btn.dataset.color || "#FFD700",
      capital: btn.dataset.capital || 0,
      idea: btn.dataset.idea || "",
      description: btn.dataset.desc || "",
      leader_id: btn.dataset.leader || "",
    };

    // 🟢 先抓出該政黨成員列表
    const { data: members, error: memberErr } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("party_id", data.id)
      .order("created_at", { ascending: true });

    if (memberErr) {
      alert("❌ 無法載入黨員名單");
      return;
    }

    // 建立彈窗
    const popup = document.createElement("div");
    popup.className = "party-edit-popup";
    popup.innerHTML = `
      <div class="popup-content" style="
        background:#222;
        padding:25px;
        border-radius:15px;
        width:420px;
        color:white;
        box-shadow:0 0 15px rgba(0,0,0,0.5);
        font-family:'微軟正黑體';
      ">
        <h3 style="text-align:center;color:gold;">
          <i class="fa fa-edit"></i> 編輯政黨資料
        </h3>
        <div style="margin-top:10px;">
          <label>政黨名稱：</label>
          <input id="editName" value="${data.name}" style="width:100%;padding:8px;margin-top:5px;border-radius:5px;border:none;">
        </div>
        <div style="margin-top:10px;">
          <label>顏色代碼：</label>
          <input id="editColor" type="color" value="${data.color}" style="width:100%;padding:5px;margin-top:5px;border-radius:5px;border:none;">
        </div>
        <div style="margin-top:10px;">
          <label>資金（POL幣）：</label>
          <input id="editCapital" type="number" value="${data.capital}" style="width:100%;padding:8px;margin-top:5px;border-radius:5px;border:none;">
        </div>
        <div style="margin-top:10px;">
          <label>政黨理念：</label>
          <textarea id="editIdea" style="width:100%;height:60px;padding:8px;margin-top:5px;border-radius:5px;border:none;">${data.idea}</textarea>
        </div>
        <div style="margin-top:10px;">
          <label>政黨簡介：</label>
          <textarea id="editDesc" style="width:100%;height:60px;padding:8px;margin-top:5px;border-radius:5px;border:none;">${data.description}</textarea>
        </div>

        <div style="margin-top:10px;">
          <label>主席：</label>
          <select id="editLeader" style="width:100%;padding:8px;margin-top:5px;border-radius:5px;border:none;background:#333;color:white;">
            <option value="">（選擇主席）</option>
            ${members
              .map(
                (m) => `
              <option value="${m.id}" ${m.id === data.leader_id ? "selected" : ""}>
                ${m.name || m.email}
              </option>
            `
              )
              .join("")}
          </select>
        </div>

        <div style="text-align:center;margin-top:15px;">
          <button id="saveEditParty" class="btn main" style="margin-right:10px;background:gold;color:black;border:none;padding:8px 16px;border-radius:8px;">
            <i class="fa fa-save"></i> 儲存
          </button>
          <button id="cancelEditParty" class="btn" style="background:#666;color:white;border:none;padding:8px 16px;border-radius:8px;">
            <i class="fa fa-times"></i> 取消
          </button>
        </div>
      </div>
    `;
    Object.assign(popup.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.75)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    });

    document.body.appendChild(popup);

    // ❌ 取消
    document.getElementById("cancelEditParty").onclick = () => popup.remove();

    // 💾 儲存
    document.getElementById("saveEditParty").onclick = async () => {
      const name = document.getElementById("editName").value.trim();
      const color = document.getElementById("editColor").value.trim();
      const capital = parseInt(document.getElementById("editCapital").value) || 0;
      const idea = document.getElementById("editIdea").value.trim();
      const description = document.getElementById("editDesc").value.trim();
      const leader_id = document.getElementById("editLeader").value;

      if (!name) {
        alert("❌ 請輸入政黨名稱");
        return;
      }

      // 🔄 呼叫 Edge 更新 API
      const result = await callEdge("parties", "update", {
        id: data.id,
        name,
        color,
        capital,
        idea,
        description,
        leader_id,
      });

      // ✅ 顯示成功彈窗
      popup.innerHTML = `
        <div class="popup-content" style="
          background:#222;padding:30px;border-radius:15px;width:380px;color:white;text-align:center;
        ">
          <h3 style="color:gold;"><i class="fa fa-check-circle"></i> 修改成功！</h3>
          <p>政黨 <b>${name}</b> 資料已更新。</p>
          <button id="closeEditSuccess" class="btn main" style="background:gold;color:black;padding:8px 16px;border:none;border-radius:8px;">
            <i class="fa fa-arrow-right"></i> 返回
          </button>
        </div>
      `;
      document.getElementById("closeEditSuccess").onclick = async () => {
        popup.remove();
        await renderParties(); // 重新載入政黨列表
      };
    };
  };
});

}


// ======================
// 📰 公告管理（完全可用版）
// ======================
async function renderNews() {
  const newsList = await callEdge("news", "list");
  contentArea.innerHTML = `
    <h3><i class="fa fa-newspaper-o"></i> 公告管理</h3>
    <div class="news-editor">
      <input type="text" id="newsTitle" placeholder="公告標題">
      <textarea id="newsContent" placeholder="公告內容"></textarea>
      <div class="editor-actions">
        <button id="submitNews" class="btn main"><i class="fa fa-check"></i> 發佈公告</button>
        <button id="refreshNews" class="btn logout"><i class="fa fa-refresh"></i> 重新整理</button>
      </div>
    </div>
    <ul id="newsList" class="news-list"></ul>
  `;

  const list = document.getElementById("newsList");

  // 🧾 顯示公告
  if (!Array.isArray(newsList) || newsList.length === 0) {
    list.innerHTML = "<li>目前沒有公告。</li>";
  } else {
    list.innerHTML = newsList
      .map(
        (n) => `
        <li>
          <b>${n.title}</b> <span style="color:white;">(${new Date(
            n.created_at
          ).toLocaleString()})</span>
          <p>${n.content}</p>
          <div class="item-actions">
            <button class="btn main editNews" data-id="${n.id}" data-title="${encodeURIComponent(
          n.title
        )}" data-content="${encodeURIComponent(
          n.content
        )}"><i class="fa fa-edit"></i></button>
            <button class="btn logout deleteNews" data-id="${n.id}">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </li>
      `
      )
      .join("");
  }

  // 🟢 發佈公告
  document.getElementById("submitNews").onclick = async () => {
    const title = document.getElementById("newsTitle").value.trim();
    const content = document.getElementById("newsContent").value.trim();
    if (!title || !content) return alert("請輸入公告標題與內容！");
    const result = await callEdge("news", "create", { title, content });
    alert(result.message || "公告已發佈");
    await renderNews();
  };

  // 🌀 重新整理
  document.getElementById("refreshNews").onclick = renderNews;

  // 📝 編輯公告
  document.querySelectorAll(".editNews").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const oldTitle = decodeURIComponent(btn.dataset.title);
      const oldContent = decodeURIComponent(btn.dataset.content);

      const newTitle = prompt("請輸入新公告標題：", oldTitle);
      if (newTitle === null) return;
      const newContent = prompt("請輸入新公告內容：", oldContent);
      if (newContent === null) return;

      const result = await callEdge("news", "update", {
        id,
        title: newTitle,
        content: newContent,
      });

      alert(result.message || "公告已更新");
      await renderNews();
    };
  });

  // ❌ 刪除公告
  document.querySelectorAll(".deleteNews").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!confirm("確定要刪除此公告？")) return;
      const result = await callEdge("news", "delete", { id });
      if (result.error) {
        alert("刪除失敗：" + result.error);
      } else {
        alert(result.message || "已刪除公告");
        await renderNews();
      }
    };
  });
}
}

);
// ======================
// 💰 POL幣管理（正式可用版）
// ======================
async function renderCoins() {
  contentArea.innerHTML = `
    <h3><i class="fa fa-money"></i> POL幣管理</h3>
    <div class="coin-controls" style="margin-bottom:15px;">
      <label>選擇玩家：</label>
      <select id="userSelect" style="margin-right:10px;"></select>
      <label>操作類型：</label>
      <select id="actionSelect" style="margin-right:10px;">
        <option value="add">增加 POL幣</option>
        <option value="remove">減少 POL幣</option>
        <option value="reset">歸零</option>
      </select>
      <input id="coinValue" type="number" placeholder="輸入數量" style="width:120px;margin-right:10px;">
      <button id="applyCoinBtn" class="btn main"><i class="fa fa-check"></i> 執行操作</button>
      <button id="refreshUsers" class="btn logout"><i class="fa fa-refresh"></i> 重新整理</button>
    </div>

    <h4 style="margin-top:20px;">目前所有玩家</h4>
    <table border="1" style="width:100%;color:white;text-align:center;border-collapse:collapse;">
      <thead>
        <tr style="background:#333;">
          <th>名稱</th>
          <th>Email</th>
          <th>POL幣</th>
        </tr>
      </thead>
      <tbody id="userList">
        <tr><td colspan="3">載入中...</td></tr>
      </tbody>
    </table>
  `;

  const userSelect = document.getElementById("userSelect");
  const userList = document.getElementById("userList");
  const refreshBtn = document.getElementById("refreshUsers");
  const applyBtn = document.getElementById("applyCoinBtn");

  // 🟢 載入所有玩家
  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, polcoin")
      .order("polcoin", { ascending: false });

    if (error) {
      userList.innerHTML = `<tr><td colspan="3" style="color:red;">讀取失敗：${error.message}</td></tr>`;
      return;
    }

    // 填入下拉選單
    userSelect.innerHTML = data
      .map((u) => `<option value="${u.id}">${u.name || "未命名"} (${u.email})</option>`)
      .join("");

    // 更新表格
    userList.innerHTML = data
      .map(
        (u) => `
        <tr>
          <td>${u.name || "未命名"}</td>
          <td>${u.email || "-"}</td>
          <td>${u.polcoin ?? 0}</td>
        </tr>
      `
      )
      .join("");
  }

  await loadUsers();

  // 🔁 重新整理
  refreshBtn.onclick = loadUsers;

  // 💰 執行操作
  applyBtn.onclick = async () => {
    const userId = userSelect.value;
    const action = document.getElementById("actionSelect").value;
    const value = parseInt(document.getElementById("coinValue").value) || 0;

    if (!userId) return alert("請選擇玩家！");
    if (action !== "reset" && value <= 0) return alert("請輸入有效的數值！");

    // 取得目前 POL 幣
    const { data: player } = await supabase
      .from("profiles")
      .select("polcoin")
      .eq("id", userId)
      .maybeSingle();

    if (!player) return alert("找不到玩家資料。");

    let newCoin = player.polcoin || 0;
    if (action === "add") newCoin += value;
    else if (action === "remove") newCoin -= value;
    else if (action === "reset") newCoin = 0;
    if (newCoin < 0) newCoin = 0;

    const { error } = await supabase
      .from("profiles")
      .update({ polcoin: newCoin })
      .eq("id", userId);

    if (error) alert("操作失敗：" + error.message);
    else {
      alert(`✅ 操作成功，目前 POL幣：${newCoin}`);
      await loadUsers();
    }
  };
}
