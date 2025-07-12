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

// Проверка доступа через FingerprintJS
//FingerprintJS.load().then(fp => {
//  fp.get().then(result => {
//    const visitorId = result.visitorId;
//
//    fetch('/api/verify-access', {
//      method: 'POST',
//      headers: { 'Content-Type': 'application/json' },
//      body: JSON.stringify({ fingerprint: visitorId }),
//      credentials: 'include'
//    })
//      .then(res => res.json())
//      .then(data => {
//        if (!data.allowed) {
//          document.body.innerHTML = '<h2 style="text-align:center; padding:40px;">🚫 Доступ запрещён</h2>';
//        } else {
//          init();
//        }
//      });
//  });
//});

// Загружаем данные всех замков
async function init() {
  const res = await fetch('data/locks.json')  
  locks = await res.json();
  currentLock = locks[0];
  renderLock();

  applyTranslations();

  // Поиск
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

// При клике вне списка — скрываем подсказки
document.addEventListener('click', e => {
  if (!suggestionsEl.contains(e.target) && e.target !== searchInput) {
    suggestionsEl.innerHTML = '';
    suggestionsEl.style.display = 'none';
  }
});


  // Переключение языка
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
}

// Отображение информации о замке
function renderLock() {
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
    const li = document.createElement('li');
    li.textContent = step;
    ol.appendChild(li);
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

    li.querySelector('.item-title').onclick = () => {
      li.classList.toggle('expanded');
    };
    list.appendChild(li);
  });

  document.getElementById('pdf-ru').onclick = () => {
    window.open(currentLock.pdf.ru, '_blank');
  };

  document.getElementById('pdf-kz').onclick = () => {
    window.open(currentLock.pdf.kz, '_blank');
  };
}
