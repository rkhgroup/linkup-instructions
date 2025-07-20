let currentLang = 'ru';
let locks = [];
let currentLock = null;

const translations = {
  "search-label": { ru: "Найти свою модель замка:", kz: "Құлып моделін іздеу:" },
  "instruction-title": { ru: "Инструкция:", kz: "Нұсқаулық:" },
  "pdf-ru": { ru: "Русский PDF", kz: "Орысша PDF" },
  "pdf-kz": { ru: "Қазақша PDF", kz: "Қазақша PDF" }
};

// Перевод надписей
function applyTranslations() {
  for (const [id, value] of Object.entries(translations)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value[currentLang];
  }
}

// Загружаем данные всех замков
async function init() {
  const res = await fetch(`./data/locks.json`);
  locks = await res.json();
  currentLock = locks[0];
  renderLock();
  applyTranslations();

  const searchInput = document.getElementById('search');
  const suggestionsEl = document.getElementById('search-suggestions');

  searchInput.addEventListener('input', e => {
    const value = e.target.value.toLowerCase();
    suggestionsEl.innerHTML = '';

    if (!value) {
      suggestionsEl.style.display = 'none';
      return;
    }

    const matches = locks.filter(lock =>
      lock.name.ru.toLowerCase().includes(value) || lock.name.kz.toLowerCase().includes(value)
    );

    if (matches.length === 0) {
      suggestionsEl.style.display = 'none';
      return;
    }

    matches.forEach(lock => {
      const li = document.createElement('li');
      li.textContent = lock.name[currentLang];
      li.onclick = () => {
        currentLock = lock;
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

// Отображение информации о замке
function renderLock() {
  // Скрываем стартовый экран и показываем остальные элементы
  document.getElementById('start-screen').style.display = 'none';
  document.querySelector('.search-wrapper').style.display = 'block';
  document.querySelector('.lock-header').style.display = 'flex';
  document.querySelector('.lang-switch').style.display = 'flex';
  document.getElementById('lock-video').style.display = 'block';
  document.getElementById('instruction-title').style.display = 'block';
  document.getElementById('instructions-list').style.display = 'block';

  document.getElementById('lock-name').innerText = currentLock.name[currentLang];
  const applicationEl = document.getElementById('lock-application');
  applicationEl.innerText = currentLock.application?.[currentLang] || '';
  document.getElementById('lock-img').src = `./images/${currentLock.image}`;
  document.getElementById('lock-video').src = currentLock.video;

  const list = document.getElementById('instructions-list');
  list.innerHTML = '';
  currentLock.instructions[currentLang].forEach(item => {
    const li = document.createElement('li');
    li.classList.add('collapsible-item');

    const titleDiv = document.createElement('div');
    titleDiv.className = 'item-title';
    titleDiv.innerText = item.title;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    const steps = item.hint.split(/[-–—→]+|\./).map(s => s.trim()).filter(s => s.length > 0);

    if (steps.length > 1) {
      const ol = document.createElement('ol');
      ol.style.paddingLeft = '0px';
      steps.forEach(step => {
        const liStep = document.createElement('li');
        liStep.textContent = step;
        ol.appendChild(liStep);
      });
      contentDiv.appendChild(ol);
    } else {
      contentDiv.textContent = item.hint;
    }

    titleDiv.onclick = () => {
      li.classList.toggle('expanded');
    };

    li.appendChild(titleDiv);
    li.appendChild(contentDiv);
    list.appendChild(li);
  });
}


// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lang-ru').onclick = () => {
    currentLang = 'ru';
    document.getElementById('lang-ru').classList.add('active');
    document.getElementById('lang-kz').classList.remove('active');
    renderLock();
    applyTranslations();
  };

  document.getElementById('lang-kz').onclick = () => {
    currentLang = 'kz';
    document.getElementById('lang-kz').classList.add('active');
    document.getElementById('lang-ru').classList.remove('active');
    renderLock();
    applyTranslations();
  };

  // Проверка токена и fingerprint
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
