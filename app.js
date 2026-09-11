const STEPS = ["landing","profil","details","travaux","plans","analyzing","metre","devis","contact","confirm"];
const WIZARD = ["profil","details","travaux","plans","metre","devis","contact"];

let state = {
  step: 0,
  profil: null,
  travaux: null,
  fileObjs: [],
  filesInfo: [],
  surface: null,
  metreRows: [],
  devis: null,
  superviseur: false,
  contactNom: "", contactEmail: "", contactTel: "",
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
    desc: "Je suis un professionnel du bâtiment",
    infoTitle: "Comment ça fonctionne",
    image: "/images/chantier-2.jpg",
    imageCaption: "Montage de l'ossature sur un chantier partenaire",
    info: [
      ["Formation", "Formation à notre système constructif et aux techniques de montage"],
      ["Convention partenaire", "Signature des accords nécessaires avec votre entreprise"],
      ["Chantiers clients", "Montage et installation réalisés pour vos clients, via le réseau d'entreprises partenaires de votre secteur"],
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
  const idx = WIZARD.indexOf(s);
  if (idx > 0) goTo(WIZARD[idx - 1]);
  else if (s === "profil") goTo("landing");
}

function renderRail() {
  const s = STEPS[state.step];
  const rail = document.getElementById("rail");
  if (s === "landing" || s === "confirm") { rail.classList.add("hidden"); return; }
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
  render();
}

async function analyser() {
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

async function submitForm(e) {
  e.preventDefault();
  state.contactNom = document.getElementById("f-nom").value;
  state.contactEmail = document.getElementById("f-email").value;
  state.contactTel = document.getElementById("f-tel").value;
  const website = document.getElementById("f-website")?.value || "";

  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: state.contactNom, email: state.contactEmail, telephone: state.contactTel,
      profil: state.profil, travaux: state.travaux, surface: state.surface,
      superviseur: state.superviseur,
      fichiers: state.filesInfo.map((f) => f.filename),
      website,
    }),
  });
  const data = await res.json();
  state.leadId = data.id;
  goTo("confirm");
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

function render() {
  renderRail();
  const app = document.getElementById("app");
  const footer = document.getElementById("footer");
  const s = STEPS[state.step];

  if (s === "landing") {
    app.innerHTML = `
      <div class="hero-photo-wrap">
        <img class="hero-photo" src="/images/hero.jpg" alt="Maison ossature métallique Barphil">
        <div class="hero-photo-tag">Réalisation Barphil</div>
      </div>
      <div class="eyebrow">MAISONS OSSATURE MÉTALLIQUE</div>
      <h1 class="hero">Chiffrez votre projet en 5 minutes</h1>
      <p class="lede">Autoconstruction, chantier professionnel ou maison clé en main — obtenez un métré et une estimation à partir de vos plans.</p>
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

      <nav class="nav-chips">
        <button class="nav-chip" onclick="scrollToSection('about')">Qui sommes-nous</button>
        <button class="nav-chip" onclick="scrollToSection('method')">Notre méthode</button>
        <button class="nav-chip" onclick="scrollToSection('quality')">Qualité</button>
        <button class="nav-chip" onclick="scrollToSection('org')">Organisation</button>
        <button class="nav-chip" onclick="scrollToSection('gallery')">Réalisations</button>
        <button class="nav-chip" onclick="scrollToSection('faq')">FAQ</button>
      </nav>

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
    footer.innerHTML = `<div class="actions-row"><button class="btn-primary" onclick="goTo('profil')">Démarrer mon projet</button></div>`;
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
      <button class="btn-primary" onclick="goTo('travaux')">Continuer</button>
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
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 04</div>
      <h1>Vos plans</h1>
      <p class="lede">Déposez le plan de chaque niveau, au format PDF.</p>
      <div class="dropzone">
        <div style="font-size:13.5px;color:var(--ink-soft);">Plans de niveau — PDF</div>
        <label class="file-btn">Choisir un fichier
          <input type="file" accept="application/pdf" multiple style="display:none" onchange="handleFiles(this)">
        </label>
        ${state.fileObjs.length ? `<div class="file-list">${state.fileObjs.map((f) => `<div class="file-row"><span>${escapeHtml(f.name)}</span><span>${(f.size / 1024).toFixed(0)} Ko</span></div>`).join("")}</div>` : ""}
      </div>
      ${state.error ? `<div class="note-box error">⚠ ${escapeHtml(state.error)}</div>` : `<div class="note-box info">ℹ Le serveur lit réellement vos PDF (nombre de pages, format) pour proposer une surface de départ.</div>`}
    `;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" ${!state.fileObjs.length ? "disabled" : ""} onclick="analyser()">Analyser les plans</button>
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
  }

  else if (s === "metre") {
    app.innerHTML = `
      <div class="eyebrow">ÉTAPE 05 — MÉTRÉ</div>
      <h1>Métré estimatif</h1>
      <p class="lede">Surface de départ suggérée à partir de vos plans (${state.filesInfo.map((f) => `${escapeHtml(f.filename)}: ${f.pageCount}p · ${f.format}`).join(", ")}). Ajustez si besoin.</p>
      <div class="field">
        <label>Surface habitable (m²)</label>
        <input type="number" value="${state.surface}" min="20" max="500" onchange="updateSurface(this.value)">
        <div class="field-hint">Suggestion basée sur le nombre de pages et le format des plans — à corriger manuellement</div>
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
        <div class="price-sub">${d.rate} €/m² · hors fondations et options non cochées</div>
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
        <div class="field"><label>Nom</label><input id="f-nom" required></div>
        <div class="field"><label>Email</label><input id="f-email" type="email" required></div>
        <div class="field"><label>Téléphone</label><input id="f-tel" type="tel"></div>
        <div style="position:absolute; left:-9999px; opacity:0;" aria-hidden="true">
          <label>Site web</label><input id="f-website" name="website" tabindex="-1" autocomplete="off">
        </div>
      </form>
      <div class="note-box info">ℹ Vous préférez appeler ? <a href="tel:0622034232" style="color:var(--brand);font-weight:700;">06 22 03 42 32</a> · <a href="mailto:contact@barphil.fr" style="color:var(--brand);font-weight:700;">contact@barphil.fr</a></div>`;
    footer.innerHTML = `<div class="actions-row">
      <button class="btn-back" onclick="back()">← Retour</button>
      <button class="btn-primary" onclick="document.getElementById('contactForm').requestSubmit()">Envoyer ma demande</button>
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
  }
}

render();
