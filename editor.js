(() => {
  "use strict";

  const COLOR_KEYS = ["hero-bg", "bg", "surface", "text", "muted", "accent", "accent-2", "line"];
  const COLOR_NAMES = {
    "hero-bg": "Fondo 1", bg: "Fondo 2", surface: "Superficie", text: "Texto",
    muted: "Texto secundario", accent: "Acento principal",
    "accent-2": "Acento secundario", line: "Bordes"
  };
  const FONT_PRESETS = [
    { name: "Barlow + Barlow Condensed", body: "Barlow, Arial, sans-serif", heading: "'Barlow Condensed', 'Arial Narrow', sans-serif" },
    { name: "Montserrat + Playfair Display", body: "Montserrat, Arial, sans-serif", heading: "'Playfair Display', Georgia, serif" },
    { name: "Lato + Oswald", body: "Lato, Arial, sans-serif", heading: "Oswald, 'Arial Narrow', sans-serif" },
    { name: "Poppins + Merriweather", body: "Poppins, Arial, sans-serif", heading: "Merriweather, Georgia, serif" },
    { name: "Nunito + DM Sans", body: "Nunito, Arial, sans-serif", heading: "'DM Sans', Arial, sans-serif" }
  ];
  const EXCLUDED_TEXT = [
    "script", "style", "noscript", "option", "textarea", "select", "input",
    "#product-grid", "#shop-grid", "#story-grid", "#feed", "#topic-filters", "#cart-count",
    "#category-list", "#subcategory-list", "#shop-filters", "#story-filters", "#pet-game-grid",
    "#date-options", "#time-options", "#cart-items", "#biz-showcase",
    "[aria-live]", ".visual-editor-panel", ".visual-editor-toggle", ".back"
  ].join(",");
  const SECTION_CANDIDATES = "section, article, div";
  const IMAGE_CANDIDATES = "img, .visual-shape, .shop-vase, .shop-arch, .biz-orbit, .editorial-feature";

  let state;
  let baselineState;
  let activeTab = "colors";
  let imageTarget = null;
  let textNodes = [];
  let sections = [];
  let imageTargets = [];
  let brandTargets = [];
  let addressTargets = [];
  let phoneTargets = [];
  let returnFocus = null;
  let statusElement;
  let panel;
  let toggle;
  let fileInput;

  const slug = location.pathname.split("/").pop().replace(/\.html?$/i, "") || "pagina";
  const storageKey = `portfolio-visual-editor:${slug}`;
  const root = document.documentElement;

  function initialState() {
    const styles = getComputedStyle(root);
    const colors = {};
    for (const key of COLOR_KEYS) {
      colors[key] = styles.getPropertyValue(`--${key}`).trim() || "#ffffff";
    }
    const currentRadius = parseFloat(styles.getPropertyValue("--radius")) || 20;
    const whatsapp = document.documentElement.innerHTML.match(/wa\.me\/(\d+)/i)?.[1] || "";
    return {
      colors,
      radius: currentRadius,
      font: 0,
      textScale: 1,
      texts: {},
      images: {},
      sections: {},
      sectionOrder: [],
      contact: { whatsapp, business: "", address: "", phone: "" }
    };
  }

  function loadState() {
    const defaults = baselineState || initialState();
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        return {
          ...defaults,
          colors: { ...defaults.colors },
          texts: {},
          images: {},
          sections: {},
          sectionOrder: [],
          contact: { ...defaults.contact }
        };
      }
      const parsed = JSON.parse(saved);
      return {
        ...defaults,
        ...parsed,
        colors: { ...defaults.colors, ...parsed.colors },
        texts: parsed.texts || {},
        images: parsed.images || {},
        sections: parsed.sections || {},
        sectionOrder: parsed.sectionOrder || [],
        contact: { ...defaults.contact, ...parsed.contact }
      };
    } catch (error) {
      console.error("No se pudieron leer las personalizaciones guardadas.", error);
      return defaults;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      setStatus("Cambios guardados en este navegador.");
      return true;
    } catch (error) {
      console.error("No se pudieron guardar las personalizaciones.", error);
      setStatus("No se pudieron guardar los cambios en este navegador.");
      return false;
    }
  }

  function setStatus(message) {
    if (statusElement) statusElement.textContent = message;
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeField(labelText, control) {
    const label = makeElement("label", "visual-editor-field", labelText);
    label.append(control);
    return label;
  }

  function buildPanel() {
    toggle = makeElement("button", "visual-editor-toggle", "Personalizar");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "visual-editor-panel");
    toggle.setAttribute("aria-label", "Abrir personalización visual");

    panel = makeElement("aside", "visual-editor-panel");
    panel.id = "visual-editor-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Personalización visual");
    panel.innerHTML = `
      <header class="visual-editor-head">
        <h2>Personalizar</h2>
        <button class="visual-editor-close" type="button" aria-label="Cerrar personalización">×</button>
      </header>
      <div class="visual-editor-tabs" role="tablist" aria-label="Opciones de personalización"></div>
      <div class="visual-editor-content"></div>
      <div class="visual-editor-actions">
        <button class="visual-editor-action visual-editor-action-primary" type="button" data-action="copy">Copiar características</button>
        <button class="visual-editor-action" type="button" data-action="reset">Restablecer</button>
        <p class="visual-editor-description">Se copia un resumen de tus cambios, no la página ni su código.</p>
        <p class="visual-editor-status" role="status" aria-live="polite"></p>
      </div>
    `;
    document.body.append(toggle, panel);

    statusElement = panel.querySelector(".visual-editor-status");
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;
    fileInput.setAttribute("aria-label", "Elegir una imagen");
    document.body.append(fileInput);

    const tabs = [
      ["colors", "Colores"],
      ["type", "Tipografía"],
      ["shape", "Forma"],
      ["texts", "Textos"],
      ["images", "Imágenes"],
      ["sections", "Secciones"],
      ["contact", "Contacto"]
    ];
    const tabList = panel.querySelector(".visual-editor-tabs");
    const pageContainer = panel.querySelector(".visual-editor-content");

    for (const [id, label] of tabs) {
      const button = makeElement("button", "visual-editor-tab", label);
      button.type = "button";
      button.id = `visual-editor-tab-${id}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", `visual-editor-page-${id}`);
      button.setAttribute("aria-selected", String(id === activeTab));
      button.tabIndex = id === activeTab ? 0 : -1;
      tabList.append(button);
      const page = makeElement("section", "visual-editor-page");
      page.id = `visual-editor-page-${id}`;
      page.setAttribute("role", "tabpanel");
      page.setAttribute("aria-labelledby", button.id);
      page.hidden = id !== activeTab;
      pageContainer.append(page);
    }

    buildColorsPage();
    buildTypePage();
    buildShapePage();
    buildTextPage();
    buildImagesPage();
    buildSectionsPage();
    buildContactPage();

    toggle.addEventListener("click", openPanel);
    panel.querySelector(".visual-editor-close").addEventListener("click", closePanel);
    panel.querySelector(".visual-editor-tabs").addEventListener("click", event => {
      const button = event.target.closest("[role=tab]");
      if (button) activateTab(button.id.replace("visual-editor-tab-", ""));
    });
    panel.querySelector(".visual-editor-tabs").addEventListener("keydown", handleTabKeydown);
    panel.addEventListener("keydown", handlePanelKeydown);
    panel.addEventListener("click", handlePanelAction);
    fileInput.addEventListener("change", handleImageFile);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        closePanel();
      }
    });
  }

  function page(id) {
    return panel.querySelector(`#visual-editor-page-${id}`);
  }

  function buildColorsPage() {
    const target = page("colors");
    target.append(makeElement("h3", "", "Paleta de colores"));
    for (const key of COLOR_KEYS) {
      const label = makeElement("label", "visual-editor-color-row", COLOR_NAMES[key]);
      const input = document.createElement("input");
      input.type = "color";
      input.dataset.color = key;
      input.value = normalizeColor(state.colors[key]);
      input.setAttribute("aria-label", COLOR_NAMES[key]);
      label.append(input);
      target.append(label);
    }
    const contrast = makeElement("p", "visual-editor-contrast");
    contrast.id = "visual-editor-contrast";
    contrast.setAttribute("aria-live", "polite");
    target.append(contrast);
    target.addEventListener("input", event => {
      const input = event.target.closest("[data-color]");
      if (!input) return;
      state.colors[input.dataset.color] = input.value;
      applyTheme();
      updateContrast();
      saveState();
    });
  }

  function normalizeColor(value) {
    const probe = document.createElement("span");
    probe.style.color = value;
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color.match(/\d+/g);
    probe.remove();
    if (!rgb || rgb.length < 3) return "#ffffff";
    return `#${rgb.slice(0, 3).map(number => Number(number).toString(16).padStart(2, "0")).join("")}`;
  }

  function luminance(hex) {
    const rgb = normalizeColor(hex).slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255);
    const linear = rgb.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  }

  function updateContrast() {
    const darker = Math.min(luminance(state.colors.text), luminance(state.colors.bg));
    const lighter = Math.max(luminance(state.colors.text), luminance(state.colors.bg));
    const ratio = (lighter + .05) / (darker + .05);
    const output = panel.querySelector("#visual-editor-contrast");
    const low = ratio < 4.5;
    output.dataset.low = String(low);
    output.textContent = low
      ? `Contraste bajo: ${ratio.toFixed(2)}:1. Se recomienda al menos 4,5:1 entre texto y fondo.`
      : `Contraste adecuado: ${ratio.toFixed(2)}:1 entre texto y fondo.`;
  }

  function buildTypePage() {
    const target = page("type");
    target.append(makeElement("h3", "", "Tipografía y tamaño"));
    const select = document.createElement("select");
    select.id = "visual-editor-font";
    FONT_PRESETS.forEach((preset, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = preset.name;
      select.append(option);
    });
    select.value = String(state.font || 0);
    target.append(makeField("Combinación tipográfica", select));
    const range = document.createElement("input");
    range.type = "range";
    range.className = "visual-editor-range";
    range.min = ".85";
    range.max = "1.25";
    range.step = ".05";
    range.value = String(state.textScale || 1);
    range.id = "visual-editor-text-scale";
    target.append(makeField("Tamaño general del texto", range));
    const size = makeElement("p", "visual-editor-description", `${Math.round(Number(range.value) * 100)} %`);
    size.id = "visual-editor-text-scale-value";
    target.append(size);
    target.addEventListener("input", event => {
      if (event.target.id === "visual-editor-font") {
        state.font = Number(event.target.value);
        applyTheme();
        saveState();
      } else if (event.target.id === "visual-editor-text-scale") {
        state.textScale = Number(event.target.value);
        size.textContent = `${Math.round(state.textScale * 100)} %`;
        applyTheme();
        saveState();
      }
    });
    target.addEventListener("change", event => {
      if (event.target.id === "visual-editor-font") {
        state.font = Number(event.target.value);
        applyTheme();
        saveState();
      }
    });
  }

  function buildShapePage() {
    const target = page("shape");
    target.append(makeElement("h3", "", "Redondeo de esquinas"));
    const range = document.createElement("input");
    range.type = "range";
    range.className = "visual-editor-range";
    range.min = "0";
    range.max = "40";
    range.step = "1";
    range.value = String(Math.max(0, Math.min(40, state.radius)));
    range.id = "visual-editor-radius";
    target.append(makeField("Radio de borde", range));
    const value = makeElement("p", "visual-editor-description", `${range.value} px`);
    target.append(value);
    range.addEventListener("input", () => {
      state.radius = Number(range.value);
      value.textContent = `${state.radius} px`;
      applyTheme();
      saveState();
    });
  }

  function buildTextPage() {
    const target = page("texts");
    target.append(makeElement("h3", "", "Editar textos"));
    const button = makeElement("button", "visual-editor-action", "Editar textos");
    button.type = "button";
    button.dataset.action = "toggle-text";
    button.setAttribute("aria-pressed", "false");
    target.append(button);
    target.append(makeElement("p", "visual-editor-description", "Activá la edición y hacé clic en un título, párrafo o texto estático. Pegá texto plano."));
  }

  function buildImagesPage() {
    const target = page("images");
    target.append(makeElement("h3", "", "Cambiar imágenes"));
    const button = makeElement("button", "visual-editor-action", "Elegir imagen al hacer clic");
    button.type = "button";
    button.dataset.action = "toggle-images";
    button.setAttribute("aria-pressed", "false");
    target.append(button);
    target.append(makeElement("p", "visual-editor-description", "Activá el modo y hacé clic sobre una imagen o un marcador visual. La imagen se guarda dentro de esta página."));
  }

  function buildSectionsPage() {
    const target = page("sections");
    target.append(makeElement("h3", "", "Orden y visibilidad"));
    target.append(makeElement("p", "visual-editor-description", "Ocultá secciones o cambiá su orden con las flechas."));
    const list = makeElement("div", "visual-editor-sections");
    list.id = "visual-editor-section-list";
    target.append(list);
  }

  function buildContactPage() {
    const target = page("contact");
    target.append(makeElement("h3", "", "Datos de contacto"));
    const whatsapp = document.createElement("input");
    whatsapp.type = "tel";
    whatsapp.id = "visual-editor-whatsapp";
    whatsapp.value = state.contact.whatsapp || "";
    whatsapp.inputMode = "numeric";
    whatsapp.autocomplete = "tel";
    target.append(makeField("WhatsApp", whatsapp));

    if (brandTargets.length) {
      const business = document.createElement("input");
      business.type = "text";
      business.id = "visual-editor-business";
      business.value = state.contact.business || directText(brandTargets[0]);
      target.append(makeField("Nombre del negocio", business));
      business.addEventListener("input", () => {
        state.contact.business = business.value;
        brandTargets.forEach(element => setDirectText(element, business.value));
        saveState();
      });
    }
    if (addressTargets.length) {
      const address = document.createElement("input");
      address.type = "text";
      address.id = "visual-editor-address";
      address.value = state.contact.address || addressTargets[0].textContent.trim();
      target.append(makeField("Dirección", address));
      address.addEventListener("input", () => {
        state.contact.address = address.value;
        addressTargets.forEach(element => { element.textContent = address.value; });
        saveState();
      });
    }
    if (phoneTargets.length) {
      const phone = document.createElement("input");
      phone.type = "tel";
      phone.id = "visual-editor-phone";
      phone.value = state.contact.phone || phoneTargets[0].textContent.trim();
      target.append(makeField("Teléfono", phone));
      phone.addEventListener("input", () => {
        state.contact.phone = phone.value;
        phoneTargets.forEach(element => {
          if (element.matches("a[href^='tel:']")) element.href = `tel:${phone.value.replace(/[^\d+]/g, "")}`;
          element.textContent = phone.value;
        });
        saveState();
      });
    }
    whatsapp.addEventListener("input", () => {
      state.contact.whatsapp = whatsapp.value.replace(/\D/g, "");
      updateWhatsAppLinks();
      saveState();
    });
  }

  function directText(element) {
    const editable = [...element.children].find(child => child.matches("[data-editor-text]"));
    if (editable) return editable.textContent.trim();
    const node = [...element.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
    return node?.textContent.trim() || element.textContent.trim();
  }

  function setDirectText(element, value) {
    const editable = [...element.children].find(child => child.matches("[data-editor-text]"));
    if (editable) {
      editable.textContent = value;
      state.texts[editable.dataset.editorText] = value;
      return;
    }
    const node = [...element.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
    if (node) node.textContent = value;
    else element.insertBefore(document.createTextNode(value), element.firstChild);
  }

  function activateTab(id) {
    activeTab = id;
    panel.querySelectorAll("[role=tab]").forEach(button => {
      const selected = button.id === `visual-editor-tab-${id}`;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panel.querySelectorAll("[role=tabpanel]").forEach(section => {
      section.hidden = section.id !== `visual-editor-page-${id}`;
    });
    panel.querySelector(`#visual-editor-tab-${id}`).focus();
  }

  function handleTabKeydown(event) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const tabs = [...panel.querySelectorAll("[role=tab]")];
    let index = tabs.indexOf(document.activeElement);
    if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") index = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") index = 0;
    if (event.key === "End") index = tabs.length - 1;
    event.preventDefault();
    activateTab(tabs[index].id.replace("visual-editor-tab-", ""));
  }

  function handlePanelKeydown(event) {
    if (event.key !== "Tab") return;
    const focusable = [...panel.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])")]
      .filter(element => !element.closest("[hidden]"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openPanel() {
    returnFocus = document.activeElement;
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    panel.querySelector(".visual-editor-close").focus();
  }

  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    (returnFocus instanceof HTMLElement ? returnFocus : toggle).focus();
  }

  function applyTheme() {
    for (const key of COLOR_KEYS) root.style.setProperty(`--${key}`, state.colors[key]);
    root.style.setProperty("--radius", `${state.radius}px`);
    const preset = FONT_PRESETS[state.font] || FONT_PRESETS[0];
    root.style.setProperty("--editor-font-body", preset.body);
    root.style.setProperty("--editor-font-heading", preset.heading);
    root.style.fontSize = `${(state.textScale || 1) * 100}%`;
    const changed = key => state.colors[key].toLowerCase() !== baselineState.colors[key].toLowerCase();
    document.body.classList.toggle("visual-editor-bg-changed", changed("bg"));
    document.body.classList.toggle("visual-editor-hero-bg-changed", changed("hero-bg"));
    document.body.classList.toggle("visual-editor-accent-2-changed", changed("accent-2"));
    document.body.classList.toggle("visual-editor-radius-changed", state.radius !== baselineState.radius);
    document.body.classList.toggle("visual-editor-surface-changed", changed("surface"));
    document.body.classList.toggle("visual-editor-line-changed", changed("line"));
    document.body.classList.toggle("visual-editor-accent-changed", changed("accent"));
    document.body.classList.toggle("visual-editor-muted-changed", changed("muted"));
    window.__demoWhatsAppNumber = state.contact.whatsapp || "";
  }

  function setTextEditing(active) {
    document.body.classList.toggle("visual-editor-text-mode", active);
    const button = panel.querySelector("[data-action=toggle-text]");
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "Terminar de editar textos" : "Editar textos";
    if (active) {
      disableImageMode();
      collectTextNodes();
      textNodes.forEach(span => { span.contentEditable = "true"; });
      setStatus("Edición de textos activada.");
    } else {
      textNodes.forEach(span => { span.contentEditable = "false"; });
      saveState();
      setStatus("Edición de textos finalizada.");
    }
  }

  function collectTextNodes() {
    if (textNodes.length) {
      textNodes.forEach(span => { span.contentEditable = "true"; });
      return;
    }
    textNodes = [];
    document.querySelectorAll("main, header, footer").forEach(container => {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const value = node.textContent.trim();
          const parent = node.parentElement;
          if (!value || !parent || parent.closest(EXCLUDED_TEXT)) return NodeFilter.FILTER_REJECT;
          if (!parent.matches("h1,h2,h3,h4,h5,h6,p,a,button,strong,em,span,small,li,b,figcaption")) return NodeFilter.FILTER_REJECT;
          if (parent.closest("select, label, .cart-close, .dialog-close, [aria-label^='Cerrar']")) return NodeFilter.FILTER_REJECT;
          if (parent.closest("[aria-hidden=true]")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        const key = `text-${textNodes.length}`;
        const span = document.createElement("span");
        span.dataset.editorText = key;
        span.textContent = node.textContent;
        node.parentNode.replaceChild(span, node);
        if (Object.hasOwn(state.texts, key)) span.textContent = state.texts[key];
        span.addEventListener("input", () => {
          state.texts[key] = span.textContent;
          saveState();
        });
        span.addEventListener("paste", event => {
          event.preventDefault();
          const text = event.clipboardData?.getData("text/plain") || "";
          document.execCommand("insertText", false, text);
        });
        textNodes.push(span);
      });
    });
  }

  function restoreTextNodes() {
    textNodes.forEach(span => {
      span.contentEditable = "false";
    });
    document.body.classList.remove("visual-editor-text-mode");
  }

  function disableImageMode() {
    document.body.classList.remove("visual-editor-image-mode");
    const button = panel.querySelector("[data-action=toggle-images]");
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Elegir imagen al hacer clic";
  }

  function setImageMode(active) {
    const button = panel.querySelector("[data-action=toggle-images]");
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "Salir del modo imágenes" : "Elegir imagen al hacer clic";
    document.body.classList.toggle("visual-editor-image-mode", active);
    if (active) setTextEditing(false);
  }

  function getImageTargets() {
    imageTargets = [...document.querySelectorAll(IMAGE_CANDIDATES)]
      .filter(element => !element.closest(".visual-editor-panel, #product-grid, #shop-grid, #story-grid, #feed, #biz-showcase"));
    imageTargets.forEach((element, index) => {
      const key = `image-${index}`;
      element.dataset.editorImage = key;
      const saved = state.images[key];
      if (saved) applyImage(element, saved);
    });
    return imageTargets;
  }

  function applyImage(element, dataUrl) {
    if (element instanceof HTMLImageElement) {
      element.src = dataUrl;
      return;
    }
    element.style.backgroundImage = `url("${dataUrl}")`;
    element.style.backgroundPosition = "center";
    element.style.backgroundSize = "cover";
  }

  function normalizeSections() {
    const main = document.querySelector("main");
    if (!main) return;
    sections = [...main.children].filter(element =>
      element.matches(SECTION_CANDIDATES) && !element.hidden && !element.matches("#biz-showcase")
    );
    sections.forEach((element, index) => {
      const key = element.id ? `id:${element.id}` : `section:${index}`;
      element.dataset.editorSection = key;
    });
    if (state.sectionOrder.length) {
      const ordered = state.sectionOrder.map(key => sections.find(element => element.dataset.editorSection === key)).filter(Boolean);
      sections.filter(element => !ordered.includes(element)).forEach(element => ordered.push(element));
      ordered.forEach(element => main.append(element));
      sections = ordered;
    }
    sections.forEach(element => { element.hidden = Boolean(state.sections[element.dataset.editorSection]); });
    renderSectionList();
  }

  function sectionName(element, index) {
    const heading = element.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > .section-heading h2, :scope > .biz-section-head h2");
    return heading?.textContent.trim() || element.getAttribute("aria-label") || element.id || `Bloque ${index + 1}`;
  }

  function renderSectionList() {
    const list = panel.querySelector("#visual-editor-section-list");
    list.replaceChildren();
    sections.forEach((element, index) => {
      const row = makeElement("div", "visual-editor-section-row");
      const name = makeElement("span", "visual-editor-section-name", sectionName(element, index));
      const label = document.createElement("label");
      const visible = document.createElement("input");
      visible.type = "checkbox";
      visible.checked = !element.hidden;
      visible.setAttribute("aria-label", `Mostrar ${name.textContent}`);
      label.append(visible, document.createTextNode("Mostrar"));
      visible.addEventListener("change", () => {
        element.hidden = !visible.checked;
        state.sections[element.dataset.editorSection] = !visible.checked;
        saveState();
      });
      const up = makeElement("button", "", "↑");
      const down = makeElement("button", "", "↓");
      up.type = down.type = "button";
      up.setAttribute("aria-label", `Subir ${name.textContent}`);
      down.setAttribute("aria-label", `Bajar ${name.textContent}`);
      up.disabled = index === 0;
      down.disabled = index === sections.length - 1;
      up.addEventListener("click", () => moveSection(index, -1));
      down.addEventListener("click", () => moveSection(index, 1));
      row.append(name, label, up, down);
      list.append(row);
    });
  }

  function moveSection(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= sections.length) return;
    [sections[index], sections[next]] = [sections[next], sections[index]];
    const main = document.querySelector("main");
    sections.forEach(element => main.append(element));
    state.sectionOrder = sections.map(element => element.dataset.editorSection);
    renderSectionList();
    saveState();
  }

  function updateWhatsAppLinks() {
    const digits = (state.contact.whatsapp || "").replace(/\D/g, "");
    if (!digits) return;
    document.querySelectorAll("a[href*='wa.me/']").forEach(anchor => {
      try {
        const url = new URL(anchor.href);
        if (url.hostname.toLowerCase() === "wa.me") {
          const previous = url.pathname.split("/").filter(Boolean).slice(1).join("/");
          url.pathname = `/${digits}${previous ? `/${previous}` : ""}`;
          anchor.href = url.href;
        }
      } catch (error) {
        console.error("No se pudo actualizar un enlace de WhatsApp.", error);
      }
    });
    window.__demoWhatsAppNumber = digits;
  }

  function handlePanelAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "toggle-text":
        setTextEditing(button.getAttribute("aria-pressed") !== "true");
        break;
      case "toggle-images":
        setImageMode(button.getAttribute("aria-pressed") !== "true");
        break;
      case "reset":
        if (window.confirm("¿Restablecer todas las personalizaciones de esta página?")) {
          try {
            localStorage.removeItem(storageKey);
            location.reload();
          } catch (error) {
            console.error("No se pudieron restablecer las personalizaciones.", error);
            setStatus("No se pudieron restablecer los cambios.");
          }
        }
        break;
      case "copy":
        copyCharacteristics();
        break;
    }
  }

  async function handleImageFile() {
    const file = fileInput.files?.[0];
    if (!file || !imageTarget) return;
    try {
      if (!file.type.startsWith("image/")) throw new Error("Elegí un archivo de imagen.");
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo procesar la imagen en este navegador.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(type, .9);
      const key = imageTarget.dataset.editorImage;
      state.images[key] = dataUrl;
      applyImage(imageTarget, dataUrl);
      saveState();
      setStatus("Imagen optimizada y guardada en este navegador.");
    } catch (error) {
      console.error("No se pudo procesar la imagen.", error);
      setStatus(error.message || "No se pudo procesar la imagen.");
    } finally {
      fileInput.value = "";
      imageTarget = null;
    }
  }

  function handleDocumentClick(event) {
    if (event.target.closest(".visual-editor-panel, .visual-editor-toggle")) return;
    if (document.body.classList.contains("visual-editor-text-mode")) {
      const control = event.target.closest("a, button");
      if (control) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    if (!document.body.classList.contains("visual-editor-image-mode")) return;
    const target = event.target.closest(IMAGE_CANDIDATES);
    if (!target || target.closest("#product-grid, #shop-grid, #story-grid, #feed, #biz-showcase")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!target.dataset.editorImage) {
      const key = `image-${imageTargets.length}`;
      target.dataset.editorImage = key;
      imageTargets.push(target);
    }
    imageTarget = target;
    fileInput.click();
  }

  function initializeContactTargets() {
    brandTargets = [...document.querySelectorAll(
      ".biz-nav > b, .shop-mark, .catalog-brand, .sur-nav b, .lua-nav b, .common-nav b, .masthead nav .brand"
    )];
    addressTargets = [...document.querySelectorAll("address, [itemprop='address'], [data-address]")];
    phoneTargets = [...document.querySelectorAll("a[href^='tel:'], [itemprop='telephone'], [data-phone]")];
    if (brandTargets[0] && state.contact.business) brandTargets.forEach(element => setDirectText(element, state.contact.business));
    if (addressTargets.length && state.contact.address) addressTargets.forEach(element => { element.textContent = state.contact.address; });
    if (phoneTargets.length && state.contact.phone) {
      phoneTargets.forEach(element => {
        if (element.matches("a[href^='tel:']")) element.href = `tel:${state.contact.phone.replace(/[^\d+]/g, "")}`;
        element.textContent = state.contact.phone;
      });
    }
  }

  function characteristicsSummary() {
    const lines = [
      `Características visuales: ${document.title}`,
      "",
      "Colores:"
    ];
    COLOR_KEYS.forEach(key => lines.push(`- ${COLOR_NAMES[key]} (--${key}): ${state.colors[key]}`));
    lines.push(
      "",
      `Tipografía: ${FONT_PRESETS[state.font]?.name || FONT_PRESETS[0].name}`,
      `Tamaño general: ${Math.round((state.textScale || 1) * 100)} %`,
      `Redondeo de esquinas: ${state.radius} px`,
      "",
      "Secciones (en el orden actual):"
    );
    sections.forEach((element, index) => {
      lines.push(`- ${index + 1}. ${sectionName(element, index)} — ${element.hidden ? "oculta" : "visible"}`);
    });

    const editedTexts = Object.entries(state.texts)
      .filter(([key, value]) => value && value !== baselineState.texts[key]);
    if (editedTexts.length) {
      lines.push("", "Textos personalizados:");
      editedTexts.forEach(([key, value]) => {
        lines.push(`- ${document.querySelector(`[data-editor-text="${CSS.escape(key)}"]`)?.textContent || key}: ${value}`);
      });
    }

    const replacedImages = Object.entries(state.images).filter(([, value]) => value);
    if (replacedImages.length) {
      lines.push(
        "",
        `Imágenes reemplazadas: ${replacedImages.length} (los archivos de imagen no se incluyen en este resumen).`
      );
    }

    const contact = Object.entries(state.contact).filter(([, value]) => value);
    if (contact.length) {
      const contactNames = { whatsapp: "WhatsApp", business: "Nombre del negocio", address: "Dirección", phone: "Teléfono" };
      lines.push("", "Contacto:");
      contact.forEach(([key, value]) => lines.push(`- ${contactNames[key]}: ${value}`));
    }
    return lines.join("\n");
  }

  async function copyCharacteristics() {
    const summary = characteristicsSummary();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        throw new Error("El navegador no ofrece acceso directo al portapapeles.");
      }
      setStatus("Características copiadas. Podés pegarlas en Claude u otra herramienta.");
    } catch (error) {
      const fallback = document.createElement("textarea");
      fallback.value = summary;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      try {
        fallback.select();
        if (document.execCommand("copy")) {
          setStatus("Características copiadas. Podés pegarlas en Claude u otra herramienta.");
          return;
        }
      } catch (fallbackError) {
        console.error("No se pudieron copiar las características.", fallbackError);
      } finally {
        fallback.remove();
      }
      console.error("No se pudieron copiar las características.", error);
      setStatus("No se pudo copiar. Revisá los permisos del portapapeles e intentá de nuevo.");
    }
  }

  function init() {
    baselineState = initialState();
    state = loadState();
    document.body.classList.add("visual-editor-ready");
    initializeContactTargets();
    applyTheme();
    buildPanel();
    updateContrast();
    normalizeSections();
    getImageTargets();
    collectTextNodes();
    textNodes.forEach(span => { span.contentEditable = "false"; });
    updateWhatsAppLinks();
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("input", event => {
      if (event.target.matches("input,textarea,select") && event.target.closest(".visual-editor-panel")) return;
      updateWhatsAppLinks();
    });
    window.addEventListener("beforeunload", () => {
      if (document.body.classList.contains("visual-editor-text-mode")) {
        textNodes.forEach(span => span.contentEditable = "false");
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
