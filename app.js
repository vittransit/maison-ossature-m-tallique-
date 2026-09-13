const STEPS = ["landing","profil","details","travaux","plans","analyzing","metre","devis","contact","confirm","partenaire","partenaire-confirm"];
const WIZARD = ["profil","details","travaux","plans","metre","devis","contact"];

let state = {
  step: 0,
  profil: null,
  travaux: null,
  fileObjs: [],
  filesInfo: [],
  noPlansYet: false,
  surface: null,
  metreRows: [],
  devis: null,
  superviseur: false,
  contactNom: "", contactEmail: "", contactTel: "", contactRegion: "",
  partnerEntreprise: "", partnerSiret: "", partnerRegion: "", partnerNom: "", partnerEmail: "", partnerTel: "", partnerMessage: "",
  error: null,
};

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

const PROFILES = {
  autoconstructeur: {
    title: "Autoconstructeur",
    desc: "Je veux construire ma maison moi-même",
    infoTitle: "Ce que vous recevez",
    image: "/images/chantier-1.jpg",
    imageCaption: "Ossature métallique posée sur un chantier d'autoconstruction",
    info: [
      ["Fourniture des produits", "Tous les éléments de structure livrés directement sur votre terrain"],
      ["Guide de montage", "Notice de pose complète, étape par étape"],
      ["Accompagnement superviseur", "Sur demande, intervention d'un superviseur — prestation en option, payante"],
    ],
  },
  artisan: {
    title: "Artisan / Constructeur",
    desc: "Je veux devenir partenaire régional Barphil",
    infoTitle: "Devenir partenaire régional",
    image: "/images/chantier-2.jpg",
    imageCaption: "Montage de l'ossature sur un chantier partenaire",
    info: [
      ["Formation", "Formation à notre système constructif et aux techniques de montage"],
      ["Convention partenaire", "Signature des accords nécessaires avec votre entreprise"],
      ["Clients de votre région", "Nous vous mettons en relation avec les clients qui nous contactent dans votre zone d'intervention"],
    ],
  },
  client: {
    title: "Client",
    desc: "Je cherche une maison clé en main",
    infoTitle: "Votre projet clé en main",
    image: "/images/exterior-2.jpg",
    imageCaption: "Exemple de réalisation livrée clé en main",
    info: [
      ["Réalisation complète", "Nous confions votre chantier à un artisan partenaire près de chez vous, du gros œuvre à la remise des clés"],
    ],
  },
};

const GALLERY = [
  { src: "/images/exterior-1.jpg", caption: "Vue aérienne, terrasse et piscine" },
  { src: "/images/exterior-2.jpg", caption: "Villa contemporaine, façade sur piscine" },
  { src: "/images/exterior-3.jpg", caption: "Réalisation au crépuscule" },
  { src: "/images/interieur-1.jpg", caption: "Salon, finitions soignées" },
  { src: "/images/interieur-2.jpg", caption: "Séjour ouvert sur cuisine" },
  { src: "/images/exterior-4.jpg", caption: "Façade encadrée d'oliviers" },
];

const TRAVAUX = {
  gros: { title: "Gros œuvre", desc: "Fondations, ossature métallique, charpente, couverture" },
  second: { title: "Second œuvre", desc: "Isolation, cloisons, menuiseries, finitions" },
  deux: { title: "Les deux", desc: "Projet complet, du terrain aux finitions" },
};

function goTo(stepName, patch) {
  state = Object.assign(state, patch || {});
  state.step = STEPS.indexOf(stepName);
  render();
  window.scrollTo(0, 0);
}
function scrollToSection(id) {
  goTo("landing");
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 30);
}
function back() {
  const s = STEPS[state.step];
  if (s === "partenaire") { goTo("details"); return; }
  const idx = WIZARD.indexOf(s);
  if (idx > 0) goTo(WIZARD[idx - 1]);
  else if (s === "profil") goTo("landing");
}

function renderRail() {
  const s = STEPS[state.step];
  const rail = document.getElementById("rail");
  if (s === "landing" || s === "confirm" || s === "partenaire" || s === "partenaire-confirm") { rail.classList.add("hidden"); return; }
  rail.classList.remove("hidden");
  const total = WIZARD.length;
  let cur = WIZARD.indexOf(s);
  if (s === "analyzing") cur = WIZARD.indexOf("plans");
  let html = "";
  for (let i = 0; i < total; i++) {
    let cls = "rail-dot";
    if (i < cur) cls += " done";
    if (i === cur) cls += " active";
    html += `<div class="${cls}"></div>`;
  }
  rail.innerHTML = html;
}

function selectProfil(p) { state.profil = p; render(); }
function selectTravaux(t) { state.travaux = t; render(); }

function handleFiles(input) {
  state.fileObjs = Array.from(input.files || []);
  state.error = null;
  render();
}

function toggleNoPlans(checked) {
  state.noPlansYet = checked;
  state.error = null;
  if (checked) {
    state.fileObjs = [];
    if (!state.surface) state.surface = 120;
  }
  render();
}

async function continueWithoutPlans() {
  state.filesInfo = [];
  state.error = null;
  await refreshMetre();
  goTo("metre");
}

async function analyser() {
  state.error = null;
  goTo("analyzing");
  const form = new FormData();
  state.fileObjs.forEach((f) => form.append("files", f));
  try {
    const res = await fetch("/api/analyze-plans", { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.json()).error || "Erreur d'analyse");
    const data = await res.json();
    state.filesInfo = data.files;
    state.surface = data.suggestedSurface;
    await refreshMetre();
    goTo("metre");
  } catch (err) {
    state.error = err.message;
    goTo("plans");
  }
}

async function refreshMetre() {
  const res = await fetch("/api/metre", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ travaux: state.travaux, surface: state.surface }),
  });
  const data = await res.json();
  state.metreRows = data.rows;
}

async function updateSurface(val) {
  const n = parseInt(val, 10);
  state.surface = isNaN(n) ? 20 : Math.min(500, Math.max(20, n));
  await refreshMetre();
  render();
}

async function refreshDevis() {
  const res = await fetch("/api/devis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profil: state.profil, travaux: state.travaux,
      surface: state.surface, superviseur: state.superviseur,
    }),
  });
  state.devis = await res.json();
}

async function toggleSuperviseur() {
  state.superviseur = !state.superviseur;
  await refreshDevis();
  render();
}

async function goToDevis() {
  await refreshDevis();
  goTo("devis");
}

let submitting = false;
async function submitForm(e) {
  e.preventDefault();
  if (submitting) return;
  submitting = true;
  const btn = document.getElementById("submitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }

  state.contactNom = document.getElementById("f-nom").value;
  state.contactEmail = document.getElementById("f-email").value;
  state.contactTel = document.getElementById("f-tel").value;
  state.contactRegion = document.getElementById("f-region").value;
  const website = document.getElementById("f-website")?.value || "";

  let data;
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: state.contactNom, email: state.contactEmail, telephone: state.contactTel, region: state.contactRegion,
        profil: state.profil, travaux: state.travaux, surface: state.surface,
        superviseur: state.superviseur,
        fichiers: state.filesInfo.map((f) => f.filename),
        website,
      }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi.");
  } catch (err) {
    submitting = false;
    if (btn) { btn.disabled = false; btn.textContent = "Envoyer ma demande"; }
    state.error = err.message || "Erreur de connexion, merci de reessayer.";
    render();
    return;
  }
  state.leadId = data.id;
  goTo("confirm");
}

let partnerSubmitting = false;
async function submitPartnerForm(e) {
  e.preventDefault();
  if (partnerSubmitting) return;
  partnerSubmitting = true;
  const btn = document.getElementById("partnerSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }

  state.partnerEntreprise = document.getElementById("p-entreprise").value;
  state.partnerSiret = document.getElementById("p-siret").value;
  state.partnerRegion = document.getElementById("p-region").value;
  state.partnerNom = document.getElementById("p-nom").value;
  state.partnerEmail = document.getElementById("p-email").value;
  state.partnerTel = document.getElementById("p-tel").value;
  state.partnerMessage = document.getElementById("p-message").value;
  const website = document.getElementById("p-website")?.value || "";

  let data;
  try {
    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entreprise: state.partnerEntreprise, siret: state.partnerSiret, region: state.partnerRegion,
        nom: state.partnerNom, email: state.partnerEmail, telephone: state.partnerTel,
        message: state.partnerMessage, website,
      }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi.");
  } catch (err) {
    partnerSubmitting = false;
    if (btn) { btn.disabled = false; btn.textContent = "Envoyer ma candidature"; }
    state.error = err.message || "Erreur de connexion, merci de reessayer.";
    render();
    return;
  }
  state.partnerId = data.id;
  goTo("partenaire-confirm");
}

const WALL_DIAGRAM_SVG = `
<svg viewBox="0 0 260 320" role="img" aria-label="Coupe du mur exterieur en ossature metallique">
  <defs>
    <pattern id="hatchWall" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#2F9C8F" stroke-width="1.4" opacity="0.55"/>
    </pattern>
  </defs>
  <g font-family="Work Sans, sans-serif" font-size="9.5" fill="#1C2226">
    <rect x="30" y="4" width="8" height="290" fill="#D9D2C2"/>
    <text x="34" y="-2" text-anchor="middle" font-size="8" fill="#5B6259" transform="translate(0,6)">Enduit</text>
    <rect x="38" y="4" width="26" height="290" fill="url(#hatchWall)"/>
    <text x="51" y="308" text-anchor="middle" font-size="8" fill="#5B6259">ITE 12cm</text>
    <rect x="64" y="4" width="10" height="290" fill="#8C6F4E"/>
    <rect x="74" y="4" width="60" height="290" fill="#EFE7D6" stroke="#1C5D4C" stroke-width="1.4"/>
    <rect x="80" y="12" width="48" height="274" fill="#F6EFA8" opacity="0.55"/>
    <text x="104" y="26" text-anchor="middle" font-size="7.6" fill="#5B6259">Laine de verre</text>
    <text x="104" y="37" text-anchor="middle" font-size="7.6" fill="#5B6259">10cm</text>
    <text x="104" y="165" text-anchor="middle" font-size="9" font-weight="700" fill="#123D32">Ossature</text>
    <text x="104" y="178" text-anchor="middle" font-size="9" font-weight="700" fill="#123D32">acier 140mm</text>
    <rect x="134" y="4" width="6" height="290" fill="#8C6F4E"/>
    <rect x="140" y="4" width="14" height="290" fill="#C9C0A8"/>
    <text x="147" y="-2" text-anchor="middle" font-size="8" fill="#5B6259" transform="translate(0,6)">BA13</text>
    <line x1="24" y1="0" x2="24" y2="300" stroke="#1C2226" stroke-width="1"/>
    <line x1="160" y1="0" x2="160" y2="300" stroke="#1C2226" stroke-width="1"/>
    <text x="10" y="150" text-anchor="middle" font-size="8.5" fill="#5B6259" transform="rotate(-90 10 150)">EXTÉRIEUR</text>
    <text x="175" y="150" text-anchor="middle" font-size="8.5" fill="#5B6259" transform="rotate(-90 175 150)">INTÉRIEUR</text>
  </g>
</svg>`;

const SIM_STEPS = [
  {
    duration: 2600,
    html: `<div class="sim-eyebrow">ÉTAPE 01</div>
      <div class="sim-label">Qui êtes-vous ?</div>
      <div class="sim-pills">
        <div class="sim-pill">Autoconstructeur</div>
        <div class="sim-pill">Artisan</div>
        <div class="sim-pill" id="simPillClient">Client<span class="sim-check" style="opacity:0;">✓</span></div>
      </div>
      <div class="sim-cursor" id="simCursor"></div>`,
    mount(el) {
      const cursor = el.querySelector("#simCursor");
      const pill = el.querySelector("#simPillClient");
      requestAnimationFrame(() => {
        const pr = pill.getBoundingClientRect(), br = el.getBoundingClientRect();
        cursor.style.left = (pr.right - br.left - 16) + "px";
        cursor.style.top = (pr.top - br.top + pr.height / 2 - 8) + "px";
        requestAnimationFrame(() => cursor.classList.add("show"));
      });
      setTimeout(() => {
        pill.classList.add("active");
        pill.querySelector(".sim-check").style.opacity = "1";
        cursor.classList.add("tap");
      }, 950);
    },
  },
  {
    duration: 2600,
    html: `<div class="sim-eyebrow">ÉTAPE 04</div>
      <div class="sim-label">Vos plans</div>
      <div class="sim-file-row"><span>📄 plan-rdc.pdf</span><span class="sim-upload" data-f="0"><span class="sim-upload-fill"></span></span></div>
      <div class="sim-file-row"><span>📄 plan-etage.pdf</span><span class="sim-upload" data-f="1"><span class="sim-upload-fill"></span></span></div>`,
    mount(el) {
      const rows = el.querySelectorAll(".sim-upload");
      rows.forEach((row, idx) => {
        setTimeout(() => {
          row.querySelector(".sim-upload-fill").classList.add("fill");
          setTimeout(() => { row.innerHTML = '<span class="sim-check" style="opacity:1;">✓</span>'; }, 650);
        }, idx * 700);
      });
    },
  },
  {
    duration: 2600,
    html: `<div class="sim-eyebrow">ANALYSE AUTOMATIQUE</div>
      <div class="sim-label">Lecture du PDF en cours…</div>
      <div class="sim-scan-row"><span>📄 plan-rdc.pdf</span></div>
      <div class="sim-scan-bar"><div class="sim-scan-fill"></div></div>
      <div class="sim-scan-result" id="simScanResult" style="opacity:0;">→ Surface détectée : <b>120 m²</b></div>`,
    mount(el) {
      setTimeout(() => { el.querySelector("#simScanResult").style.transition = "opacity .4s ease"; el.querySelector("#simScanResult").style.opacity = "1"; }, 1300);
    },
  },
  {
    duration: 2600,
    html: `<div class="sim-eyebrow">ÉTAPE 05</div>
      <div class="sim-label">Métré estimatif</div>
      <div class="sim-mini-row sim-row-in" style="animation-delay:.1s"><span>Surface habitable</span><b>120 m²</b></div>
      <div class="sim-mini-row sim-row-in" style="animation-delay:.45s"><span>Emprise au sol</span><b>134 m²</b></div>`,
    mount() {},
  },
  {
    duration: 2600,
    html: `<div class="sim-eyebrow">ÉTAPE 06</div>
      <div class="sim-label">Estimation tarifaire</div>
      <div class="sim-price" id="simPrice">0 €</div>
      <div class="sim-price-tag" id="simPriceTag" style="opacity:0;">✓ Devis prêt</div>`,
    mount(el) {
      const priceEl = el.querySelector("#simPrice");
      const target = 168900;
      const start = performance.now();
      const dur = 1000;
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        priceEl.textContent = Math.round(target * eased).toLocaleString("fr-FR") + " €";
        if (t < 1) requestAnimationFrame(step);
        else {
          const tag = el.querySelector("#simPriceTag");
          tag.style.transition = "opacity .3s ease";
          tag.style.opacity = "1";
        }
      };
      requestAnimationFrame(step);
    },
  },
];

let simInterval = null;
function startHeroSimulation() {
  if (simInterval) clearInterval(simInterval);
  const screenEl = document.getElementById("simScreen");
  const dots = document.querySelectorAll("#simProgress .sim-progress-dot");
  if (!screenEl) return;
  let i = 0;
  let first = true;
  const paint = () => {
    const step = SIM_STEPS[i];
    if (first) {
      screenEl.innerHTML = step.html;
      first = false;
    } else {
      screenEl.classList.remove("sim-slide");
      void screenEl.offsetWidth;
      screenEl.innerHTML = step.html;
      screenEl.classList.add("sim-slide");
    }
    step.mount(screenEl);
    dots.forEach((d, di) => d.classList.toggle("active", di === i));
    const thisDuration = step.duration;
    i = (i + 1) % SIM_STEPS.length;
    simInterval = setTimeout(paint, thisDuration);
  };
  paint();
}

function renderHeaderExtra(s) {
  const el = document.getElementById("headerExtra");
  if (s !== "landing") { el.innerHTML = ""; return; }
  el.innerHTML = `
    <nav class="nav-chips">
      <button class="nav-chip" onclick="scrollToSection('about')">Qui sommes-nous</button>
      <button class="nav-chip" onclick="scrollToSection('method')">Notre méthode</button>
      <button class="nav-chip" onclick="scrollToSection('quality')">Qualité</button>
      <button class="nav-chip" onclick="scrollToSection('org')">Organisation</button>
      <button class="nav-chip" onclick="scrollToSection('gallery')">Réalisations</button>
      <button class="nav-chip" onclick="scrollToSection('faq')">FAQ</button>
    </nav>`;
}

function render() {
  renderRail();
  const app = document.getElementById("app");
  const footer = document.getElementById("footer");
  const s = STEPS[state.step];
  renderHeaderExtra(s);
  footer.classList.remove("hidden");
  if (s !== "landing" && simInterval) { clearInterval(simInterval); simInterval = null; }

  if (s === "landing") {
    app.innerHTML = `
      <div class="eyebrow">MAISONS OSSATURE MÉTALLIQUE</div>
      <h1 class="hero">Chiffrez votre projet en 5 minutes</h1>
      <p class="lede">Autoconstruction, chantier professionnel ou maison clé en main — obtenez un métré et une estimation à partir de vos plans.</p>

      <div class="sim-card">
        <div class="sim-header">
          <span class="sim-dot"></span><span class="sim-dot"></span><span class="sim-dot"></span>
          <span class="sim-title">Aperçu du parcours</span>
        </div>
        <div class="sim-screen" id="simScreen"></div>
        <div class="sim-progress" id="simProgress">
          <div class="sim-progress-dot"></div><div class="sim-progress-dot"></div><div class="sim-progress-dot"></div><div class="sim-progress-dot"></div><div class="sim-progress-dot"></div>
        </div>
        <div class="sim-caption">Moins de 5 minutes, sans rendez-vous — pas de compte à créer pour voir votre estimation.</div>
      </div>

      <button class="btn-primary hero-cta" onclick="goTo('profil')">Démarrer mon projet</button>

      <div class="hero-photo-wrap">
        <img class="hero-photo" src="/images/hero.jpg" alt="Maison ossature métallique Barphil">
        <div class="hero-photo-tag">Réalisation Barphil</div>
      </div>
      <div class="stat-row">
        <div class="stat"><div class="stat-value">1 400 €</div><div class="stat-label">/M² CLÉ EN MAIN</div></div>
        <div class="stat"><div class="stat-value">−33%</div><div class="stat-label">BESOIN ÉNERGÉTIQUE RE2020</div></div>
        <div class="stat"><div class="stat-value">A</div><div class="stat-label">ÉTIQUETTE DPE</div></div>
      </div>

      <div class="trust-bar">
        <div><span>SAS</span> immatriculée · SIREN 914 926 100</div>
        <div><span>Depuis 2022</span> · Venelles (13)</div>
        <div><span>~5 mois</span> délai moyen de construction</div>
        <div><span>France entière</span> depuis notre base à Venelles</div>
      </div>


      <section class="section" id="why">
        <div class="eyebrow">POURQUOI BARPHIL CONCEPT</div>
        <h2>Une construction pensée pour aujourd'hui</h2>
        <div class="why-grid">
          <div class="why-item"><div class="why-num">01</div><div><b>Construction rapide</b><span>Ossature préfabriquée, délais réduits — en moyenne sous 5 mois</span></div></div>
          <div class="why-item"><div class="why-num">02</div><div><b>Prix maîtrisés</b><span>Coûts réduits sans compromis sur la qualité</span></div></div>
          <div class="why-item"><div class="why-num">03</div><div><b>Performance mesurée</b><span>−33% de besoin énergétique par rapport au seuil RE2020, étude à l'appui</span></div></div>
          <div class="why-item"><div class="why-num">04</div><div><b>Construction écologique</b><span>Matériaux durables et recyclables, faible impact environnemental</span></div></div>
          <div class="why-item"><div class="why-num">05</div><div><b>Solutions clé en main</b><span>De la conception à la livraison, un accompagnement complet</span></div></div>
        </div>
      </section>

      <section class="section" id="about">
        <div class="eyebrow">QUI SOMMES-NOUS</div>
        <h2>Un constructeur spécialisé, basé en Provence</h2>
        <p class="body-text">Barphil Concept est une entreprise spécialisée dans la construction de maisons individuelles en ossature métallique, basée à Venelles et intervenant partout en France. Nous concevons des maisons modernes, durables et économiques, avec des structures en acier galvanisé performantes et des matériaux de qualité.</p>
        <p class="body-text">Chaque projet fait l'objet d'une étude personnalisée. Notre engagement repose sur la transparence, le respect des délais et la satisfaction client, pour livrer des maisons confortables et pensées pour durer.</p>
        <img class="about-photo" src="/images/chantier-1.jpg" alt="Ossature métallique en construction">
      </section>

      <section class="section" id="method">
        <div class="eyebrow">NOTRE MÉTHODE</div>
        <h2>Une structure pensée par couches</h2>
        <p class="body-text">Fondation, ossature, isolation, fermeture, finitions : chaque maison Barphil suit la même coupe technique, du sol au toit.</p>
        <div style="display:flex; justify-content:center; background:var(--bg); border-radius:12px; padding:20px 10px; margin-bottom:18px;">${WALL_DIAGRAM_SVG.replace('<svg ', '<svg style="width:180px;height:auto;" ')}</div>
        <div class="legend-list">
          <div class="legend-item"><div class="legend-num">1</div><div class="legend-text"><b>Fondation</b><span>Semelle en béton armé et membrane d'étanchéité</span></div></div>
          <div class="legend-item"><div class="legend-num">2</div><div class="legend-text"><b>Structure</b><span>Ossature complète en acier galvanisé — murs, plancher, charpente</span></div></div>
          <div class="legend-item"><div class="legend-num">3</div><div class="legend-text"><b>Isolation</b><span>Double isolation : 12cm ITE extérieure + 10cm laine de verre dans l'ossature</span></div></div>
          <div class="legend-item"><div class="legend-num">4</div><div class="legend-text"><b>Fermeture</b><span>Double OSB, pare-vapeur, menuiseries aluminium double vitrage</span></div></div>
          <div class="legend-item"><div class="legend-num">5</div><div class="legend-text"><b>Finitions</b><span>Parquet, carrelage, couverture tuiles canal haut de gamme</span></div></div>
        </div>
        <div class="method-photos">
          <img src="/images/chantier-1.jpg" alt="Chantier ossature métallique">
          <img src="/images/chantier-2.jpg" alt="Montage sur chantier">
        </div>
        <div class="note-box info">ℹ Une structure acier conçue dans l'esprit des exigences thermiques RE2020 en vigueur pour les constructions neuves en France.</div>
      </section>

      <section class="section" id="quality">
        <div class="eyebrow">QUALITÉ DE MISE EN ŒUVRE</div>
        <h2>Chaque couche compte</h2>
        <p class="body-text">Des matériaux référencés, une structure visible et contrôlable à chaque étape du chantier.</p>
        <div class="gallery-grid">
          <div class="gallery-item"><img src="/images/detail-1.jpg" alt="Profilés acier et isolant"><div class="gallery-caption">Profilés &amp; isolant certifié</div></div>
          <div class="gallery-item"><img src="/images/detail-2.jpg" alt="Isolation tracée sur chantier"><div class="gallery-caption">Isolation tracée</div></div>
        </div>
        <div class="gallery-grid">
          <div class="gallery-item"><img src="/images/detail-3.jpg" alt="Panneau OSB pose interieure"><div class="gallery-caption">Doublage OSB intérieur</div></div>
          <div class="gallery-item"><img src="/images/chantier-4.jpg" alt="Elements prefabriques"><div class="gallery-caption">Éléments préfabriqués</div></div>
        </div>
      </section>

      <section class="section" id="org">
        <div class="eyebrow">ORGANISATION</div>
        <h2>Une structure agile, un réseau de partenaires qualifiés</h2>
        <p class="body-text">Barphil Concept fonctionne avec une équipe resserrée et un réseau d'artisans et d'entreprises partenaires, formés à notre système constructif. Chaque chantier reste suivi par un interlocuteur unique, du premier chiffrage à la remise des clés.</p>
        <div class="org-row"><div class="info-card"><div class="opt-title">Bureau d'études</div><div class="opt-desc">Analyse des plans, métré et chiffrage de chaque projet</div></div></div>
        <div class="org-row"><div class="info-card"><div class="opt-title">Réseau d'artisans partenaires</div><div class="opt-desc">Montage et installation réalisés localement, dans votre région</div></div></div>
        <div class="org-row"><div class="info-card"><div class="opt-title">Suivi client</div><div class="opt-desc">Un interlocuteur unique du devis à la remise des clés</div></div></div>
      </section>

      <section class="section" id="gallery">
        <div class="eyebrow">RÉALISATIONS</div>
        <h2>Nos réalisations</h2>
        <div class="gallery-grid">
          ${GALLERY.map((g) => `
            <div class="gallery-item">
              <img src="${g.src}" alt="${g.caption}">
              <div class="gallery-caption">${g.caption}</div>
            </div>`).join("")}
        </div>
      </section>

      <section class="section" id="faq">
        <div class="eyebrow">QUESTIONS FRÉQUENTES</div>
        <h2>Ce que l'on nous demande le plus</h2>
        <div class="legend-list">
          <div class="legend-item"><div class="legend-num">?</div><div class="legend-text"><b>Quels délais pour construire ma maison ?</b><span>En moyenne 5 mois de construction, hors délais d'obtention du permis de construire.</span></div></div>
          <div class="legend-item"><div class="legend-num">?</div><div class="legend-text"><b>Intervenez-vous partout en France ?</b><span>Oui, Barphil Concept intervient sur l'ensemble du territoire, depuis notre base de Venelles.</span></div></div>
          <div class="legend-item"><div class="legend-num">?</div><div class="legend-text"><b>Le tarif clé en main inclut-il les fondations ?</b><span>Non, les fondations sont chiffrées séparément selon l'étude de votre terrain.</span></div></div>
          <div class="legend-item"><div class="legend-num">?</div><div class="legend-text"><b>Puis-je construire moi-même ?</b><span>Oui, en autoconstruction : fourniture des matériaux, guide de montage, et superviseur en option.</span></div></div>
          <div class="legend-item"><div class="legend-num">?</div><div class="legend-text"><b>Comment obtenir un chiffrage précis ?</b><span>Utilisez le configurateur ci-dessous : profil, travaux, plans et devis en 5 minutes.</span></div></div>
        </div>
      </section>

      <div class="cta-banner">
        <h3>Prêt à chiffrer votre projet ?</h3>
        <p>Profil, plans, métré et devis — en 5 minutes, sans engagement.</p>
        <button onclick="goTo('profil')">Démarrer mon projet</button>
      </div>

      <footer class="site-footer">
        <div class="foot-brand">Barphil Concept</div>
        <div>302 rue de La Gare, 13770 Venelles</div>
        <div>Tél. 06 22 03 42 32 · contact@barphil.fr</div>
        <div>SAS · SIREN 914 926 100 · TVA FR61914926100</div>
      </footer>
    `;
    footer.innerHTML = ``;
    footer.classList.add("hidden");
    startHeroSimulation();

  }

  else if (s === "profil") {
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 01</div>
      <h1>Qui êtes-vous ?</h1>
      <p class="lede">Le parcours s'adapte selon votre profil.</p>
      <div class="card-group">
        ${Object.entries(PROFILES).map(([k, p]) => `
          <button class="opt-card ${state.profil === k ? "selected" : ""}" onclick="selectProfil('${k}')">
            <div class="opt-title">${p.title}</div><div class="opt-desc">${p.desc}</div>
          </button>`).join("")}
      </div>`;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" ${!state.profil ? "disabled" : ""} onclick="goTo('details')">Continuer</button>
    </div>`;
  }

  else if (s === "details") {
    const p = PROFILES[state.profil];
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 02 — ${p.title.toUpperCase()}</div>
      <h1>${p.infoTitle}</h1>
      <div class="photo-card">
        <img src="${p.image}" alt="${p.imageCaption}">
        <div class="photo-caption">${p.imageCaption}</div>
      </div>
      <div>${p.info.map(([t, d]) => `<div class="info-card"><div class="opt-title">${t}</div><div class="opt-desc">${d}</div></div>`).join("")}</div>`;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" onclick="goTo('${state.profil === "artisan" ? "partenaire" : "travaux"}')">Continuer</button>
    </div>`;
  }

  else if (s === "travaux") {
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 03</div>
      <h1>Quels travaux chiffrer ?</h1>
      <p class="lede">Sélectionnez le périmètre de votre projet.</p>
      <div class="card-group">
        ${Object.entries(TRAVAUX).map(([k, t]) => `
          <button class="opt-card ${state.travaux === k ? "selected" : ""}" onclick="selectTravaux('${k}')">
            <div class="opt-title">${t.title}</div><div class="opt-desc">${t.desc}</div>
          </button>`).join("")}
      </div>
      <div style="display:flex; justify-content:center; background:var(--bg); border-radius:12px; padding:20px 10px;">${WALL_DIAGRAM_SVG.replace('<svg ', '<svg style="width:170px;height:auto;" ')}</div>
      <div class="photo-caption" style="text-align:center; margin-top:10px;">Coupe technique — structure, isolation et finitions par couche</div>`;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" ${!state.travaux ? "disabled" : ""} onclick="goTo('plans')">Continuer</button>
    </div>`;
  }

  else if (s === "plans") {
    const canContinue = state.fileObjs.length > 0 || state.noPlansYet;
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 04</div>
      <h1>Vos plans</h1>
      <p class="lede">Déposez le plan de chaque niveau, au format PDF.</p>
      <div class="dropzone" style="${state.noPlansYet ? "opacity:0.45; pointer-events:none;" : ""}">
        <div style="font-size:13.5px;color:var(--ink-soft);">Plans de niveau — PDF</div>
        <label class="file-btn">Choisir un fichier
          <input type="file" accept="application/pdf" multiple style="display:none" onchange="handleFiles(this)" ${state.noPlansYet ? "disabled" : ""}>
        </label>
        ${state.fileObjs.length ? `<div class="file-list">${state.fileObjs.map((f) => `<div class="file-row"><span>${escapeHtml(f.name)}</span><span>${(f.size / 1024).toFixed(0)} Ko</span></div>`).join("")}</div>` : ""}
      </div>
      <label class="consent-row" style="margin-top:14px;">
        <input type="checkbox" id="f-noplans" ${state.noPlansYet ? "checked" : ""} onchange="toggleNoPlans(this.checked)">
        <span>Je n'ai pas encore mes plans — je donne une surface estimée et je les enverrai plus tard</span>
      </label>
      ${state.noPlansYet ? `
        <div class="field" style="margin-top:16px;">
          <label>Surface habitable estimée (m²)</label>
          <input type="number" value="${state.surface || 120}" min="20" max="500" onchange="updateSurface(this.value)">
        </div>` : ""}
      ${state.error ? `<div class="note-box error">⚠ ${escapeHtml(state.error)}</div>` : state.noPlansYet
        ? `<div class="note-box info">ℹ Un conseiller Barphil vous recontactera pour récupérer vos plans dès qu'ils seront prêts. Votre estimation reste basée sur la surface indiquée ci-dessus.</div>`
        : `<div class="note-box info">ℹ Vos plans sont transmis à notre bureau d'études et nous aident à affiner l'estimation (nombre de niveaux, format). La surface reste modifiable à l'étape suivante.</div>`}
    `;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" ${!canContinue ? "disabled" : ""} onclick="${state.noPlansYet ? "continueWithoutPlans()" : "analyser()"}">${state.noPlansYet ? "Continuer" : "Analyser les plans"}</button>
    </div>`;
  }

  else if (s === "analyzing") {
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 04 — ANALYSE</div>
      <h1>Lecture des plans</h1>
      <div class="scan-wrap">
        <div class="scan-bar"><div class="scan-fill"></div></div>
        <div class="scan-status">Envoi au serveur et lecture des fichiers PDF…</div>
      </div>`;
    footer.innerHTML = ``;
    footer.classList.add("hidden");
  }

  else if (s === "metre") {
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 05 — MÉTRÉ</div>
      <h1>Métré estimatif</h1>
      <p class="lede">${state.filesInfo.length ? `Surface de départ suggérée à partir de vos plans (${state.filesInfo.map((f) => `${escapeHtml(f.filename)}: ${f.pageCount}p · ${f.format}`).join(", ")}).` : "Indiquez la surface habitable de votre projet."} Ajustez si besoin.</p>
      <div class="field">
        <label>Surface habitable (m²)</label>
        <input type="number" value="${state.surface}" min="20" max="500" onchange="updateSurface(this.value)">
        <div class="field-hint">${state.filesInfo.length ? "Suggestion basée sur le nombre de pages et le format des plans — à corriger manuellement" : "Renseignez votre meilleure estimation — elle sera confirmée lors de l'étude technique"}</div>
      </div>
      <table class="spec-table">${state.metreRows.map((r) => `<tr><td>${r.label}</td><td>${r.value}</td></tr>`).join("")}</table>
      <div class="note-box">⚠ Métré indicatif — à confirmer lors de l'étude technique.</div>`;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" onclick="goToDevis()">Voir le chiffrage</button>
    </div>`;
  }

  else if (s === "devis") {
    const d = state.devis;
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 06 — CHIFFRAGE</div>
      <h1>Estimation tarifaire</h1>
      <div class="price-block">
        <div class="price-label">${d.priceTag.toUpperCase()} · ${TRAVAUX[state.travaux].title.toUpperCase()} · ${state.surface} M²</div>
        <div class="price-value">${d.total.toLocaleString("fr-FR")} €</div>
        <div class="price-sub">${state.profil === "artisan" ? `${Math.round(d.total / state.surface)} €/m² · matériaux seuls, hors pose et fondations` : `${d.rate} €/m² · hors fondations et options non cochées`}</div>
      </div>
      ${d.breakdown.map((b) => `<div class="breakdown-row ${b.addon ? "addon" : ""}"><span>${b.label}</span><span>${b.addon ? "+" : ""}${b.amount.toLocaleString("fr-FR")} €</span></div>`).join("")}
      <div class="breakdown-row total"><span>Total estimé</span><span>${d.total.toLocaleString("fr-FR")} €</span></div>
      ${state.profil === "autoconstructeur" ? `
        <div class="toggle-row ${state.superviseur ? "on" : ""}" onclick="toggleSuperviseur()">
          <div class="toggle-box">${state.superviseur ? "✓" : ""}</div>
          <div><div class="opt-title" style="font-size:14.5px;">Ajouter un accompagnement superviseur</div>
          <div class="opt-desc">Intervention ponctuelle sur chantier — forfait 900 €</div></div>
        </div>` : ""}
      <div class="note-box">⚠ ${d.note}</div>`;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" onclick="goTo('contact')">Être recontacté</button>
    </div>`;
  }

  else if (s === "contact") {
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 07</div>
      <h1>Finalisons votre projet</h1>
      <div class="recap">
        <div class="recap-line"><span>Profil</span><b>${PROFILES[state.profil].title}</b></div>
        <div class="recap-line"><span>Travaux</span><b>${TRAVAUX[state.travaux].title}</b></div>
        <div class="recap-line"><span>Surface</span><b>${state.surface} m²</b></div>
        <div class="recap-line"><span>Estimation</span><b>${state.devis.total.toLocaleString("fr-FR")} €</b></div>
      </div>
      <form class="contact-form" onsubmit="submitForm(event)" id="contactForm">
        <div class="field"><label>Nom</label><input id="f-nom" value="${escapeHtml(state.contactNom)}" required></div>
        <div class="field"><label>Email</label><input id="f-email" type="email" value="${escapeHtml(state.contactEmail)}" required></div>
        <div class="field"><label>Téléphone</label><input id="f-tel" type="tel" value="${escapeHtml(state.contactTel)}"></div>
        <div class="field"><label>Ville ou code postal du projet</label><input id="f-region" value="${escapeHtml(state.contactRegion)}" required><div class="field-hint">Pour vous orienter vers l'artisan partenaire de votre secteur</div></div>
        <label class="consent-row">
          <input type="checkbox" id="f-consent" required>
          <span>J'accepte que Barphil Concept utilise ces informations pour me recontacter au sujet de mon projet. Voir notre politique de confidentialité.</span>
        </label>
        <div style="position:absolute; left:-9999px; opacity:0;" aria-hidden="true">
          <label>Site web</label><input id="f-website" name="website" tabindex="-1" autocomplete="off">
        </div>
      </form>
      ${state.error ? `<div class="note-box error">⚠ ${escapeHtml(state.error)}</div>` : `<div class="note-box info">ℹ Vous préférez appeler ? <a href="tel:0622034232" style="color:var(--brand);font-weight:700;">06 22 03 42 32</a> · <a href="mailto:contact@barphil.fr" style="color:var(--brand);font-weight:700;">contact@barphil.fr</a></div>`}`;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" id="submitBtn" onclick="document.getElementById('contactForm').requestSubmit()">Envoyer ma demande</button>
    </div>`;
  }

  else if (s === "confirm") {
    app.innerHTML = `
      <div class="confirm-wrap">
        <div class="confirm-mark">✓</div>
        <h1>Demande envoyée</h1>
        <p class="lede">Un conseiller Barphil recontacte ${escapeHtml(state.contactNom) || "vous"} sous 48h à l'adresse ${escapeHtml(state.contactEmail)}.</p>
        <div class="recap">
          <div class="recap-line"><span>Référence</span><b>#${state.leadId}</b></div>
          <div class="recap-line"><span>Profil</span><b>${PROFILES[state.profil].title}</b></div>
          <div class="recap-line"><span>Travaux</span><b>${TRAVAUX[state.travaux].title}</b></div>
          <div class="recap-line"><span>Estimation</span><b>${state.devis.total.toLocaleString("fr-FR")} €</b></div>
        </div>
        <ul class="next-steps">
          <li>Un conseiller vérifie votre métré sous 48h</li>
          <li>Étude technique et devis détaillé</li>
          <li>Signature et lancement du chantier</li>
        </ul>
      </div>`;
    footer.innerHTML = ``;
    footer.classList.add("hidden");
  }

  else if (s === "partenaire") {
    app.innerHTML = `
      <div class="eyebrow">DEVENIR PARTENAIRE</div>
      <h1>Rejoindre le réseau régional</h1>
      <p class="lede">Renseignez votre entreprise et votre zone d'intervention — nous vous recontactons pour la formation et la convention partenaire, et vous mettons en relation avec les clients de votre secteur.</p>
      <form class="contact-form" onsubmit="submitPartnerForm(event)" id="partnerForm">
        <div class="field"><label>Entreprise</label><input id="p-entreprise" value="${escapeHtml(state.partnerEntreprise)}" required></div>
        <div class="field"><label>SIRET</label><input id="p-siret" value="${escapeHtml(state.partnerSiret)}"></div>
        <div class="field"><label>Zone d'intervention (départements / région)</label><input id="p-region" value="${escapeHtml(state.partnerRegion)}" required><div class="field-hint">Ex. Bouches-du-Rhône, Var, Vaucluse…</div></div>
        <div class="field"><label>Nom du contact</label><input id="p-nom" value="${escapeHtml(state.partnerNom)}" required></div>
        <div class="field"><label>Email</label><input id="p-email" type="email" value="${escapeHtml(state.partnerEmail)}" required></div>
        <div class="field"><label>Téléphone</label><input id="p-tel" type="tel" value="${escapeHtml(state.partnerTel)}"></div>
        <div class="field"><label>Message (optionnel)</label><textarea id="p-message" rows="3">${escapeHtml(state.partnerMessage)}</textarea></div>
        <label class="consent-row">
          <input type="checkbox" id="p-consent" required>
          <span>J'accepte que Barphil Concept utilise ces informations pour étudier ma candidature de partenaire. Voir notre politique de confidentialité.</span>
        </label>
        <div style="position:absolute; left:-9999px; opacity:0;" aria-hidden="true">
          <label>Site web</label><input id="p-website" name="website" tabindex="-1" autocomplete="off">
        </div>
      </form>
      ${state.error ? `<div class="note-box error">⚠ ${escapeHtml(state.error)}</div>` : ""}
    `;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" id="partnerSubmitBtn" onclick="document.getElementById('partnerForm').requestSubmit()">Envoyer ma candidature</button>
    </div>`;
  }

  else if (s === "partenaire-confirm") {
    app.innerHTML = `
      <div class="confirm-wrap">
        <div class="confirm-mark">✓</div>
        <h1>Candidature envoyée</h1>
        <p class="lede">Un conseiller Barphil recontacte ${escapeHtml(state.partnerNom) || "vous"} sous 48h à l'adresse ${escapeHtml(state.partnerEmail)}.</p>
        <div class="recap">
          <div class="recap-line"><span>Référence</span><b>#${state.partnerId}</b></div>
          <div class="recap-line"><span>Entreprise</span><b>${escapeHtml(state.partnerEntreprise)}</b></div>
          <div class="recap-line"><span>Zone</span><b>${escapeHtml(state.partnerRegion)}</b></div>
        </div>
        <ul class="next-steps">
          <li>Un conseiller étudie votre candidature sous 48h</li>
          <li>Formation à notre système constructif et signature de la convention</li>
          <li>Mise en relation avec les clients de votre zone</li>
        </ul>
      </div>`;
    footer.innerHTML = ``;
    footer.classList.add("hidden");
  }
}

render();
