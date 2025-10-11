import "./supabase-config.js";
import "./auth.js";
import "./party.js";
import "./mission.js";
import "./media.js";
import "./election.js";
import "./card.js";
import "./event.js";
import "./admin.js";

document.querySelectorAll("#navbar button[data-page]").forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(page).classList.add("active");
  });
});
