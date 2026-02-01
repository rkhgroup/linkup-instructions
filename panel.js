// panel.js (module)

// 1) Базовая "защита" — проверяем, что прошли login if/else
if (localStorage.getItem("linkup_admin_ok") !== "1") {
  location.href = "admin.html";
}

// logout
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("linkup_admin_ok");
  location.href = "admin.html";
};

// 2) Firebase SDK (Firestore) — загрузим динамически после того, как ты вставишь config
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const cfgTextarea = document.getElementById("fbConfig");
const cfgStatus = document.getElementById("cfgStatus");
const appBox = document.getElementById("app");

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

function val(id){ return document.getElementById(id).value.trim(); }
function setVal(id, v){ document.getElementById(id).value = v ?? ""; }

function safeJsonArray(text, label) {
  if (!text) return [];
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { throw new Error(`Ошибка JSON в "${label}": ${e.message}`); }
  if (!Array.isArray(parsed)) throw new Error(`"${label}" должен быть массивом`);
  return parsed;
}

// config storage
const CFG_KEY = "linkup_firebase_config";

function getSavedConfig() {
  const raw = localStorage.getItem(CFG_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function setSavedConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

let db = null;

async function bootWithConfig(cfg) {
  const fbApp = initializeApp(cfg);
  db = getFirestore(fbApp);
  appBox.style.display = "block";
  await loadList();
}

async function loadList() {
  listEl.textContent = "Загрузка...";
  const snap = await getDocs(collection(db, "locks"));
  const items = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
    .sort((a,b) => (a.docId||"").localeCompare(b.docId||""));

  if (!items.length) {
    listEl.innerHTML = "<div class='muted'>Пока пусто.</div>";
    return;
  }

  listEl.innerHTML = items.map(x => `
    <div class="item">
      <div><b class="mono">${x.docId}</b> — ${x?.name?.ru ?? ""}</div>
      <div class="muted">${x?.application?.ru ?? ""}</div>
      <div class="row" style="margin-top:10px">
        <button data-edit="${x.docId}" class="ghost">Редактировать</button>
        <button data-del="${x.docId}" class="danger">Удалить</button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("[data-edit]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-edit");
      const snap = await getDoc(doc(db, "locks", id));
      if (!snap.exists()) return;
      const lock = snap.data();

      setVal("id", id);
      setVal("nameRu", lock?.name?.ru);
      setVal("nameKz", lock?.name?.kz);
      setVal("appRu", lock?.application?.ru);
      setVal("appKz", lock?.application?.kz);
      setVal("image", lock?.image);
      setVal("video", lock?.video);
      setVal("pdfRu", lock?.pdf?.ru);
      setVal("pdfKz", lock?.pdf?.kz);
      setVal("instrRu", JSON.stringify(lock?.instructions?.ru ?? [], null, 2));
      setVal("instrKz", JSON.stringify(lock?.instructions?.kz ?? [], null, 2));

      statusEl.textContent = `Загружено: ${id}`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });

  listEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm(`Удалить "${id}"?`)) return;
      await deleteDoc(doc(db, "locks", id));
      statusEl.textContent = `Удалено: ${id}`;
      await loadList();
    };
  });
}

function clearForm() {
  ["id","nameRu","nameKz","appRu","appKz","image","video","pdfRu","pdfKz","instrRu","instrKz"]
    .forEach(k => setVal(k, ""));
  statusEl.textContent = "";
}

document.getElementById("clear").onclick = clearForm;

document.getElementById("save").onclick = async () => {
  try {
    statusEl.textContent = "Сохранение...";
    const id = val("id");
    if (!id) throw new Error("Поле id обязательно");

    const payload = {
      id,
      name: { ru: val("nameRu"), kz: val("nameKz") },
      application: { ru: val("appRu"), kz: val("appKz") },
      image: val("image"),
      video: val("video"),
      instructions: {
        ru: safeJsonArray(val("instrRu"), "Инструкции RU"),
        kz: safeJsonArray(val("instrKz"), "Инструкции KZ"),
      },
      pdf: { ru: val("pdfRu"), kz: val("pdfKz") }
    };

    // pdf опционально
    if (!payload.pdf.ru && !payload.pdf.kz) delete payload.pdf;

    await setDoc(doc(db, "locks", id), payload, { merge: true });

    statusEl.textContent = `Сохранено: ${id}`;
    await loadList();
  } catch (e) {
    statusEl.textContent = `Ошибка: ${e.message}`;
  }
};

// config save
document.getElementById("saveConfig").onclick = async () => {
  try {
    cfgStatus.textContent = "Проверяю config...";
    const cfg = JSON.parse(cfgTextarea.value);
    if (!cfg.projectId) throw new Error("В config должен быть projectId");
    setSavedConfig(cfg);
    cfgStatus.textContent = "Config сохранён. Загружаю панель...";
    await bootWithConfig(cfg);
    cfgStatus.textContent = "Готово ✅";
  } catch (e) {
    cfgStatus.textContent = `Ошибка: ${e.message}`;
  }
};

// автоподхват config если уже сохраняли
const saved = getSavedConfig();
if (saved) {
  cfgTextarea.value = JSON.stringify(saved, null, 2);
  bootWithConfig(saved).catch(err => {
    cfgStatus.textContent = `Не удалось загрузить Firestore: ${err.message}`;
  });
} else {
  cfgStatus.textContent = "Вставь Firebase config и нажми “Сохранить config”.";
}
