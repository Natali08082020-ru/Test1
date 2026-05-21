const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const TELEGRAM_USER = "natali08082020";
const TELEGRAM_URL = `https://t.me/${TELEGRAM_USER}`;

function telegramMessageUrl(text) {
  return `${TELEGRAM_URL}?text=${encodeURIComponent(text)}`;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const ORDER_TRACKS = [
  { file: "order-01.mp3", title: "С днём рождения, доченька", meta: "Песня на заказ · день рождения" },
  { file: "order-02.mp3", title: "С днём рождения, мама", meta: "Песня на заказ · день рождения" },
  { file: "order-03.mp3", title: "С днём рождения, папа", meta: "Песня на заказ · день рождения" },
  { file: "order-04.mp3", title: "С днём рождения, брат!", meta: "Песня на заказ · день рождения" },
  { file: "order-05.mp3", title: "Мужчины Руси (Rock)", meta: "Песня на заказ · rock" },
];

function assetUrl(path) {
  const base = document.querySelector("base")?.href || `${location.origin}/`;
  return new URL(path.replace(/^\.\//, ""), base).href;
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  return ok ? Promise.resolve() : Promise.reject();
}

function renderOrderTracks() {
  const list = document.getElementById("track-list");
  if (!list) return;

  const bars = "<span></span>".repeat(10);

  list.innerHTML = ORDER_TRACKS.map((track, i) => {
    const num = String(i + 1).padStart(2, "0");
    const src = assetUrl(`audio/${track.file}`);
    return `
      <li class="track-item reveal" data-track>
        <div class="track-info">
          <span class="track-num">${num}</span>
          <div>
            <h3 class="track-title">${track.title}</h3>
            <p class="track-meta">${track.meta}</p>
          </div>
        </div>
        <div class="track-player">
          <div class="track-bars" aria-hidden="true">${bars}</div>
          <audio src="${src}" preload="metadata"></audio>
          <button type="button" class="track-play" aria-label="Воспроизвести">
            <span class="icon-play">▶</span>
            <span class="icon-pause">❚❚</span>
          </button>
        </div>
      </li>
    `;
  }).join("");

  list.querySelectorAll(".reveal").forEach((el) => {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      observer.observe(el);
    } else {
      el.classList.add("is-visible");
    }
  });

  initAudioPlayers();
}

renderOrderTracks();

const navBackdrop = document.getElementById("nav-backdrop");

function setMenuOpen(open) {
  mobileMenu?.classList.toggle("is-open", open);
  menuBtn?.classList.toggle("is-open", open);
  navBackdrop?.toggleAttribute("hidden", !open);
  menuBtn?.setAttribute("aria-expanded", String(open));
  mobileMenu?.setAttribute("aria-hidden", String(!open));
}

if (menuBtn && mobileMenu) {
  menuBtn.addEventListener("click", () => {
    setMenuOpen(!mobileMenu.classList.contains("is-open"));
  });

  navBackdrop?.addEventListener("click", () => setMenuOpen(false));

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });
}

const revealEls = document.querySelectorAll(".reveal");
if (revealEls.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

const heroVinyl = document.getElementById("hero-vinyl");
let currentAudio = null;
let currentTrackItem = null;

function stopCurrent() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (currentTrackItem) {
    currentTrackItem.classList.remove("is-playing");
    const btn = currentTrackItem.querySelector(".track-play");
    if (btn) btn.setAttribute("aria-label", "Воспроизвести");
  }
  if (heroVinyl) heroVinyl.classList.remove("is-playing");
  currentAudio = null;
  currentTrackItem = null;
}

function initAudioPlayers() {
  document.querySelectorAll("[data-track]").forEach((item) => {
    const audio = item.querySelector("audio");
    const btn = item.querySelector(".track-play");
    if (!audio || !btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
      if (currentAudio === audio && !audio.paused) {
        stopCurrent();
        return;
      }

      stopCurrent();
      currentAudio = audio;
      currentTrackItem = item;
      item.classList.add("is-playing");
      btn.setAttribute("aria-label", "Пауза");
      if (heroVinyl) heroVinyl.classList.add("is-playing");

      audio.play().catch(() => {
        stopCurrent();
      });
    });

    audio.addEventListener("ended", stopCurrent);
  });
}

const form = document.getElementById("feedback-form");
const formStatus = document.getElementById("form-status");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get("name") || "").toString().trim();
    const contact = (data.get("contact") || "").toString().trim();
    const message = (data.get("message") || "").toString().trim();

    if (!name || !contact || !message) {
      if (formStatus) {
        formStatus.textContent = "Заполните все поля.";
        formStatus.classList.add("is-error");
      }
      return;
    }

    const text = [
      "MalSu — сообщение с сайта",
      "",
      `Имя: ${name}`,
      `Контакт: ${contact}`,
      "",
      message,
    ].join("\n");

    const tgUrl = telegramMessageUrl(text);

    try {
      await copyText(text);
    } catch {
      /* запасной вариант — текст в URL */
    }

    if (isMobileDevice()) {
      location.href = tgUrl;
    } else {
      const opened = window.open(tgUrl, "_blank");
      if (!opened) location.href = tgUrl;
    }

    if (formStatus) {
      formStatus.textContent =
        "Откроется Telegram с вашим текстом. Проверьте сообщение и нажмите «Отправить».";
      formStatus.classList.remove("is-error");
    }
  });
}
