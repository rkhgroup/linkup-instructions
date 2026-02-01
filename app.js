// app.js (module)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

let currentLang = 'ru';
let locks = [];
let currentLock = null;

const translations = {
  "search-label": { ru: "Найти свою модель замка:", kz: "Құлып моделін іздеу:" },
  "instruction-title": { ru: "Инструкция:", kz: "Нұсқаулық:" },
  "pdf-ru": { ru: "Русский PDF", kz: "Орысша PDF" },
  "pdf-kz": { ru: "Қазақша PDF", kz: "Қазақша PDF" }
};

// ✅ твой Firebase config (тот же)
const firebaseConfig = {
  apiKey: "AIzaSyAL-CkU7rfpKrAMUWcOPo_dESRYrjMeW4A",
  authDomain: "linkup-instructions.firebaseapp.com",
  projectId: "linkup-instructions",
  storageBucket: "linkup-instructions.firebasestorage.app",
  messagingSenderId: "690601143430",
  appId: "1:690601143430:web:74d0a08b01dc2e4fce7507",
  measurementId: "G-0KY2H78TD6"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// Перевод надписей
function applyTranslations() {
  for (const [id, value] of Object.entries(translations)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value[currentLang];
  }
}

// ✅ Загрузка замков из Firestore
async function loadLocks() {
  const snap = await getDocs(collection(db, "locks"));
  const data = snap.docs.map(d => d.data());

  // На всякий случай сортируем по name.ru
  data.sort((a, b) => {
    const an = (a?.name?.ru || a?.id || "").toLowerCase();
    const bn = (b?.name?.ru || b?.id || "").toLowerCase();
    return an.localeCompare(bn);
  });

  return data;
}

// Загрузка данных замков и настройка поиска
async function init() {
  locks = await loadLocks();
  applyTranslations(); // только переводы, без отображения замка

  const searchInput = document.getElementById('search');
  const suggestionsEl = document.getElementById('search-suggestions');

  searchInput.addEventListener('input', e => {
    const value = e.target.value.toLowerCase();
    suggestionsEl.innerHTML = '';

    if (!value) {
      suggestionsEl.style.display = 'none';
      return;
    }

    const matches = locks.filter(lock => {
      const ru = lock?.name?.ru?.toLowerCase?.() || "";
      const kz = lock?.name?.kz?.toLowerCase?.() || "";
      const id = (lock?.id || "").toLowerCase();
      return ru.includes(value) || kz.includes(value) || id.includes(value);
    });

    if (matches.length === 0) {
      suggestionsEl.style.display = 'none';
      return;
    }

    matches.forEach(lock => {
      const li = document.createElement('li');
      li.textContent = lock.name?.[currentLang] || lock.id;

      li.onclick = () => {
        currentLock = lock;

        // Скрываем стартовый экран
        document.getElementById('start-screen').style.display = 'none';

        // Показываем остальную часть интерфейса
        document.querySelector('.search-wrapper').style.display = 'block';
        document.querySelector('.lock-header').style.display = 'flex';
        document.querySelector('.lang-switch').style.display = 'flex';
        document.getElementById('lock-video').style.display = 'block';
        document.getElementById('instruction-title').style.display = 'block';
        document.getElementById('instructions-list').style.display = 'block';

        renderLock();
        searchInput.value = '';
        suggestionsEl.innerHTML = '';
        suggestionsEl.style.display = 'none';
      };

      suggestionsEl.appendChild(li);
    });

    suggestionsEl.style.display = 'block';
  });

  document.addEventListener('click', e => {
    if (!suggestionsEl.contains(e.target) && e.target !== searchInput) {
      suggestionsEl.innerHTML = '';
      suggestionsEl.style.display = 'none';
    }
  });
}

// Отображение выбранного замка
function renderLock() {
  if (!currentLock) return;

  document.getElementById('lock-name').innerText =
    currentLock.name?.[currentLang] || currentLock.id;

  const applicationEl = document.getElementById('lock-application');
  applicationEl.innerText = currentLock.application?.[currentLang] || '';

  document.getElementById('lock-img').src = `./images/${currentLock.image || ""}`;
  document.getElementById('lock-video').src = currentLock.video || "";

  const list = document.getElementById('instructions-list');
  list.innerHTML = '';

  const items = currentLock.instructions?.[currentLang] || [];
  items.forEach(item => {
    const li = document.createElement('li');
    li.classList.add('collapsible-item');

    const titleDiv = document.createElement('div');
    titleDiv.className = 'item-title';
    titleDiv.innerText = item.title || "";

    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    const hint = item.hint || "";
    const steps = hint.split(/[-–—→]+|\./).map(s => s.trim()).filter(s => s.length > 0);

    if (steps.length > 1) {
      const ol = document.createElement('ol');
      steps.forEach(step => {
        const liStep = document.createElement('li');
        liStep.textContent = step;
        ol.appendChild(liStep);
      });
      contentDiv.appendChild(ol);
    } else {
      contentDiv.textContent = hint;
    }

    titleDiv.onclick = () => {
      li.classList.toggle('expanded');
    };

    li.appendChild(titleDiv);
    li.appendChild(contentDiv);
    list.appendChild(li);
  });
}

// После загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lang-ru').onclick = () => {
    currentLang = 'ru';
    document.getElementById('lang-ru').classList.add('active');
    document.getElementById('lang-kz').classList.remove('active');
    applyTranslations();
    if (currentLock) renderLock();
  };

  document.getElementById('lang-kz').onclick = () => {
    currentLang = 'kz';
    document.getElementById('lang-kz').classList.add('active');
    document.getElementById('lang-ru').classList.remove('active');
    applyTranslations();
    if (currentLock) renderLock();
  };

  // Проверка токена и fingerprint (оставляем как было)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    document.body.innerHTML = '<h2 style="text-align:center;">🚫 Нет токена доступа</h2>';
    return;
  }

  FingerprintJS.load().then(fp => {
    fp.get().then(result => {
      const fingerprint = result.visitorId;

      fetch("https://us-central1-linkup-instructions.cloudfunctions.net/verifyAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fingerprint })
      })
      .then(res => res.json())
      .then(data => {
        if (data.access === "granted") {
          init(); // доступ разрешён
        } else {
          document.body.innerHTML = '<h2 style="text-align:center;">🚫 Доступ запрещён</h2>';
        }
      })
      .catch(err => {
        console.error(err);
        document.body.innerHTML = '<h2 style="text-align:center;">⚠️ Ошибка сервера</h2>';
      });
    });
  });
});
