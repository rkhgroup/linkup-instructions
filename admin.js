// ⚠️ БАЗОВАЯ "защита": логин/пароль видны в коде.
// Подходит только если "свои знают ссылку" и вам не нужна реальная безопасность.

const ADMIN_LOGIN = "admin";   // <- поменяй
const ADMIN_PASS  = "Service2026L";   // <- поменяй

document.getElementById("btn").onclick = () => {
  const l = document.getElementById("login").value.trim();
  const p = document.getElementById("pass").value;
  const err = document.getElementById("err");

  if (l === ADMIN_LOGIN && p === ADMIN_PASS) {
    localStorage.setItem("linkup_admin_ok", "1");
    location.href = "panel.html";
  } else {
    err.textContent = "Неверный логин или пароль";
  }
};
