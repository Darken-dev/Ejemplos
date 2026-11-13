(() => {
  "use strict";

  const STORAGE_KEY = "portfolio-pet-demo";
  const models = [
    { id: "gaviota", name: "Gaviota", description: "Curiosa, veloz y lista para despegar." },
    { id: "foca", name: "Foca", description: "Juguetona y feliz cerca del agua." },
    { id: "estrella", name: "Estrella de mar", description: "Pequeña, brillante y llena de energía." }
  ];
  const gameGrid = document.getElementById("pet-game-grid");
  const modelOptions = document.getElementById("pet-model-options");
  const mascot = document.getElementById("tolo");
  const mascotSprite = document.getElementById("pet-mascot-sprite");
  const nameInput = document.getElementById("pet-name");
  const greeting = document.getElementById("pet-greeting");
  const caption = document.getElementById("pet-scene-caption");
  const brandName = document.getElementById("pet-brand-name");
  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        model: models.some(model => model.id === saved.model) ? saved.model : "foca",
        name: typeof saved.name === "string" ? saved.name.slice(0, 24) : "Mimi"
      };
    } catch (error) {
      console.error("No se pudo leer la mascota guardada.", error);
      return { model: "foca", name: "Mimi" };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("No se pudo guardar la mascota elegida.", error);
    }
  }

  function mascotSvg(modelId) {
    const sharedEyes = `
      <g class="eye"><ellipse cx="46" cy="59" rx="6.5" ry="8" fill="#132d52"/><circle cx="44" cy="56" r="2.5" fill="#fff"/><circle cx="49" cy="62" r="1.2" fill="#fff"/></g>
      <g class="eye"><ellipse cx="74" cy="59" rx="6.5" ry="8" fill="#132d52"/><circle cx="72" cy="56" r="2.5" fill="#fff"/><circle cx="77" cy="62" r="1.2" fill="#fff"/></g>`;
    const sharedMouth = `<g class="mouth"><path d="M52 76Q60 84 68 76" fill="none" stroke="#783e48" stroke-width="3" stroke-linecap="round"/></g>`;
    const art = {
      gaviota: `
        <ellipse cx="60" cy="143" rx="34" ry="5" fill="#17304d" opacity=".18"/>
        <path d="M46 111L43 137M74 111L77 137" stroke="#e79336" stroke-width="6" stroke-linecap="round"/>
        <path d="M43 137l-12 5h17M77 137l12 5H72" fill="none" stroke="#e79336" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <g class="pet-body">
          <g class="arm l"><path d="M34 94Q12 91 12 108Q14 120 40 114Z" fill="#a8b4c6" stroke="#64758c" stroke-width="2"/></g>
          <g class="arm r"><path d="M86 94Q108 91 108 108Q106 120 80 114Z" fill="#a8b4c6" stroke="#64758c" stroke-width="2"/></g>
          <ellipse cx="60" cy="104" rx="37" ry="34" fill="#edf2f7" stroke="#64758c" stroke-width="2"/>
          <ellipse cx="60" cy="53" rx="39" ry="36" fill="#f8fbff" stroke="#64758c" stroke-width="2"/>
          <ellipse cx="34" cy="72" rx="7" ry="4" fill="#f4a5aa" opacity=".6"/>
          ${sharedEyes}
          <path d="M50 72L70 72L60 85Z" fill="#f39b2f" stroke="#b65c21" stroke-width="2" stroke-linejoin="round"/>
        </g>`,
      foca: `
        <ellipse cx="60" cy="143" rx="38" ry="6" fill="#17304d" opacity=".18"/>
        <g class="pet-body">
          <g class="arm l"><path d="M27 100Q8 102 11 117Q15 130 40 116Z" fill="#85543e" stroke="#674332" stroke-width="2"/></g>
          <g class="arm r"><path d="M93 100Q112 102 109 117Q105 130 80 116Z" fill="#85543e" stroke="#674332" stroke-width="2"/></g>
          <ellipse cx="60" cy="105" rx="43" ry="35" fill="#9a6549" stroke="#674332" stroke-width="2"/>
          <ellipse cx="60" cy="58" rx="39" ry="37" fill="#b87953" stroke="#674332" stroke-width="2"/>
          <ellipse cx="60" cy="77" rx="23" ry="16" fill="#e1b18d"/>
          <ellipse cx="60" cy="70" rx="5" ry="3.5" fill="#382a2a"/>
          <path d="M45 79Q36 82 29 79M45 84Q35 89 28 87M75 79Q84 82 91 79M75 84Q85 89 92 87" fill="none" stroke="#674332" stroke-width="1.6" stroke-linecap="round"/>
          <ellipse cx="35" cy="72" rx="6" ry="3.5" fill="#f4a5aa" opacity=".55"/>
          <ellipse cx="85" cy="72" rx="6" ry="3.5" fill="#f4a5aa" opacity=".55"/>
          ${sharedEyes}
          ${sharedMouth}
        </g>`,
      estrella: `
        <ellipse cx="60" cy="141" rx="34" ry="5" fill="#7c442a" opacity=".2"/>
        <g class="pet-body">
          <path d="M60 13L73 44L108 42L82 65L92 101L60 82L28 101L38 65L12 42L47 44Z" fill="#f48b43" stroke="#bf542e" stroke-width="3" stroke-linejoin="round"/>
          <path d="M60 21L70 48L99 47L78 65L86 91L60 77L36 91L43 65L23 47L50 48Z" fill="#ffb05d" opacity=".75"/>
          <ellipse cx="42" cy="76" rx="5" ry="3" fill="#f28d9b" opacity=".65"/>
          <ellipse cx="78" cy="76" rx="5" ry="3" fill="#f28d9b" opacity=".65"/>
          ${sharedEyes}
          ${sharedMouth}
        </g>`
    };
    const title = models.find(model => model.id === modelId)?.name || "Mascota";
    return `<svg viewBox="0 0 120 150" role="img" aria-label="${title}, tu mascota">${art[modelId] || art.foca}</svg>`;
  }

  function displayName() {
    return state.name.trim() || "Mascota";
  }

  function updateMascot() {
    const name = displayName();
    mascotSprite.innerHTML = mascotSvg(state.model);
    mascot.setAttribute("aria-label", `Saludar a ${name}`);
    greeting.textContent = `¡Hola, soy ${name}!`;
    caption.textContent = `${name} te espera para jugar.`;
    brandName.textContent = name;
    document.title = `${name} | Mascota virtual`;
    document.querySelectorAll(".pet-model-card").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.model === state.model));
    });
    window.dispatchEvent(new CustomEvent("mascota:changed", { detail: { ...state } }));
  }

  function renderModels() {
    modelOptions.replaceChildren(...models.map(model => {
      const button = document.createElement("button");
      button.className = "pet-model-card";
      button.type = "button";
      button.dataset.model = model.id;
      button.setAttribute("aria-pressed", String(model.id === state.model));
      button.setAttribute("aria-label", `${model.name}. ${model.description}`);
      const preview = document.createElement("span");
      preview.className = "pet-model-preview";
      preview.setAttribute("aria-hidden", "true");
      preview.innerHTML = mascotSvg(model.id);
      const copy = document.createElement("span");
      copy.className = "pet-model-copy";
      const title = document.createElement("strong");
      title.textContent = model.name;
      const description = document.createElement("small");
      description.textContent = model.description;
      copy.append(title, description);
      button.append(preview, copy);
      return button;
    }));
  }

  function gameText(text) {
    return String(text).replace(/Yeti/gi, () => displayName());
  }

  function renderGames() {
    if (!Array.isArray(window.yetiGames)) {
      gameGrid.textContent = "No se pudieron cargar los juegos. Recargá la página para volver a intentar.";
      return;
    }
    gameGrid.replaceChildren(...window.yetiGames.map(game => {
      const button = document.createElement("button");
      button.className = "pet-game-card";
      button.type = "button";
      button.dataset.gameId = game.id;
      const category = document.createElement("span");
      category.className = "pet-game-category";
      category.textContent = game.category;
      const title = document.createElement("strong");
      title.textContent = gameText(game.title);
      const help = document.createElement("small");
      help.textContent = gameText(game.help);
      const arrow = document.createElement("span");
      arrow.className = "pet-game-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      button.append(category, title, help, arrow);
      return button;
    }));
  }

  modelOptions.addEventListener("click", event => {
    const button = event.target.closest("[data-model]");
    if (!button) return;
    state.model = button.dataset.model;
    saveState();
    updateMascot();
  });
  nameInput.addEventListener("input", () => {
    state.name = nameInput.value.slice(0, 24);
    saveState();
    updateMascot();
    renderGames();
  });
  document.querySelectorAll("[data-open-games]").forEach(button => {
    button.addEventListener("click", () => window.dispatchEvent(new CustomEvent("yeti:games:open")));
  });
  gameGrid.addEventListener("click", event => {
    const card = event.target.closest("[data-game-id]");
    if (card) window.dispatchEvent(new CustomEvent("yeti:games:open-game", { detail: { id: card.dataset.gameId } }));
  });
  mascot.addEventListener("click", () => {
    mascot.classList.remove("pet-wave", "pet-jump");
    void mascot.offsetWidth;
    mascot.classList.add("pet-wave", "pet-jump");
    window.setTimeout(() => mascot.classList.remove("pet-wave", "pet-jump"), 1400);
  });

  nameInput.value = state.name;
  renderModels();
  updateMascot();
  renderGames();
})();
