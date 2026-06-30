/* BLACK MARKET STORE V1
   Application autonome en 3 fichiers. Tout le contenu public est controle depuis
   le dashboard admin/vendeur et conserve en localStorage en attendant Supabase. */

const ADMIN_EMAIL = "admin@blackmarketstore.ci";
const ADMIN_PASSWORD = "BMS@2026!SuperAdmin#CI";
const STORE_KEY = "bms_admin_content_v2";

const BMS = {
  user: null,
  heroIndex: 0,
  filters: { q: "", category: "all", city: "all", state: "all", brand: "all", min: null, max: null },
  cart: [],
  favorites: [],
  currentDash: "Dashboard",
  content: loadContent()
};

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

function init(){
  renderAll();
  bindEvents();
  revealOnScroll();
  setInterval(nextHero, 6500);
  setInterval(updateAuctionTimers, 1000);
  setTimeout(() => $("#loader").classList.add("done"), 550);
}

function emptyContent(){
  return {
    settings: { logoText: "BMS", brandName: "BLACK MARKET STORE", supportEmail: "support@blackmarketstore.ci", supportPhone: "+225 07 00 00 00 00" },
    categories: [],
    brands: [],
    cities: ["Abidjan","Bouake","Yamoussoukro","San-Pedro","Korhogo","Daloa","Man","Grand-Bassam"],
    states: ["Neuf","Occasion","Reconditionne","Importe"],
    shops: [],
    products: [],
    sliders: [],
    banners: [],
    auctions: [],
    messages: [],
    subAdmins: []
  };
}

function loadContent(){
  try{
    return { ...emptyContent(), ...(JSON.parse(localStorage.getItem(STORE_KEY)) || {}) };
  }catch(error){
    return emptyContent();
  }
}

function saveContent(){
  localStorage.setItem(STORE_KEY, JSON.stringify(BMS.content));
}

function renderAll(){
  fillSelects();
  renderBrand();
  renderHero();
  renderMetrics();
  renderQuickFilters();
  renderCategories();
  renderProducts();
  renderPromos();
  renderShops();
  renderAuctions();
  renderFooter();
  if(BMS.user) renderDashboard();
}

function renderBrand(){
  $$(".logo-mark").forEach(el => el.textContent = BMS.content.settings.logoText || "BMS");
}

function fillSelects(){
  const categories = [["all","Toutes les categories"], ...BMS.content.categories.map(c => [c.name,c.name])];
  const cities = [["all","Toutes les villes"], ...BMS.content.cities.map(c => [c,c])];
  const brands = [["all","Toutes les marques"], ...BMS.content.brands.map(b => [b,b])];
  fill($("#categorySelect"), categories);
  fill($("#cityFilter"), cities);
  fill($("#stateFilter"), [["all","Tous les etats"], ...BMS.content.states.map(s => [s,s])]);
  fill($("#brandFilter"), brands);
}

function fill(select, rows){
  if(select) select.innerHTML = rows.map(([value,text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join("");
}

function renderHero(){
  const slides = BMS.content.sliders;
  if(!slides.length){
    $("#heroSlider").innerHTML = `<div class="hero-slide active empty-visual"></div>`;
    $("#heroDots").innerHTML = "";
    return;
  }
  $("#heroSlider").innerHTML = slides.map((s,i) => `<div class="hero-slide ${i===0 ? "active" : ""}" style="background-image:url('${s.image}')"></div>`).join("");
  $("#heroDots").innerHTML = slides.map((_,i) => `<button class="${i===0 ? "active" : ""}" data-hero="${i}" aria-label="Slide ${i + 1}"></button>`).join("");
}

function nextHero(index = (BMS.heroIndex + 1) % Math.max(BMS.content.sliders.length, 1)){
  if(!BMS.content.sliders.length) return;
  BMS.heroIndex = index;
  $$(".hero-slide").forEach((slide,i) => slide.classList.toggle("active", i === index));
  $$("#heroDots button").forEach((dot,i) => dot.classList.toggle("active", i === index));
}

function renderMetrics(){
  const liveProducts = BMS.content.products.filter(p => p.status === "published").length;
  $("#heroMetrics").innerHTML = [
    [BMS.content.categories.length, "Categories"],
    [liveProducts, "Annonces publiees"],
    [BMS.content.shops.length, "Boutiques"]
  ].map(([n,l]) => `<div class="metric"><strong>${n}</strong><span>${l}</span></div>`).join("");
}

function renderQuickFilters(){
  $("#quickFilters").innerHTML = ["Promotions","Nouveautes","Meilleures ventes","Encheres","Boutiques","Support"].map((label,i) =>
    `<button class="quick-card reveal" data-scroll="${["promos","products","products","auctions","shops","support"][i]}"><i class="fa-solid ${["fa-tags","fa-bolt","fa-trophy","fa-gavel","fa-store","fa-headset"][i]}"></i>${label}</button>`
  ).join("");
}

function renderCategories(){
  $("#categoryGrid").innerHTML = BMS.content.categories.map(c => `<button class="category-card reveal ${c.image ? "" : "no-image"}" ${c.image ? `style="background-image:url('${c.image}')"` : ""} data-category="${escapeHtml(c.name)}">
    <i class="fa-solid ${c.icon || "fa-layer-group"}"></i><div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.desc || "Categorie controlee depuis admin")}</p></div></button>`).join("") ||
    emptyState("Aucune categorie", "Connectez-vous en Super Admin pour creer les categories et charger leurs images.", "Categories");
}

function publicProducts(){
  return BMS.content.products.filter(p => p.status === "published");
}

function filteredProducts(){
  return publicProducts().filter(p =>
    (!BMS.filters.q || `${p.title} ${p.category} ${p.brand} ${p.shop} ${p.city}`.toLowerCase().includes(BMS.filters.q)) &&
    (BMS.filters.category === "all" || p.category === BMS.filters.category) &&
    (BMS.filters.city === "all" || p.city === BMS.filters.city) &&
    (BMS.filters.state === "all" || p.state === BMS.filters.state) &&
    (BMS.filters.brand === "all" || p.brand === BMS.filters.brand) &&
    (BMS.filters.min === null || Number(p.price) >= BMS.filters.min) &&
    (BMS.filters.max === null || Number(p.price) <= BMS.filters.max)
  );
}

function renderProducts(){
  const rows = filteredProducts();
  $("#productGrid").innerHTML = rows.map(productCard).join("") ||
    emptyState("Aucune annonce publiee", "Le site est vide volontairement. Les annonces apparaissent apres creation et validation depuis le dashboard.", "Produits");
}

function productCard(p){
  return `<article class="product-card reveal">
    <div class="product-media">${imageTag(p.image, p.title)}${p.promo ? `<span class="badge">-${p.promo}%</span>` : `<span class="badge">${escapeHtml(p.state || "Annonce")}</span>`}
      <div class="product-actions"><button class="icon-btn" data-fav="${p.id}" aria-label="Favori"><i class="fa-regular fa-heart"></i></button><button class="icon-btn" data-detail="${p.id}" aria-label="Voir"><i class="fa-solid fa-eye"></i></button></div></div>
    <div class="product-body"><h3>${escapeHtml(p.title)}</h3><div><span class="price">${money.format(Number(p.price) || 0)}</span>${p.oldPrice ? `<span class="old-price">${money.format(Number(p.oldPrice))}</span>` : ""}</div>
    <div class="meta"><span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.city || "-")}</span><span>${Number(p.stock) || 0} en stock</span><span>${escapeHtml(p.brand || "-")}</span></div>
    <div class="stars">IA: ${escapeHtml(p.aiType || "Image non analysee")}<span class="meta"> ${Number(p.reviews) || 0} avis</span></div>
    <button class="primary-btn" data-cart="${p.id}"><i class="fa-solid fa-cart-plus"></i> Ajouter</button></div></article>`;
}

function renderPromos(){
  const banner = BMS.content.banners[0];
  if(banner){
    $("#promoBanner").style.backgroundImage = banner.image ? `url('${banner.image}')` : "";
    $("#promoBanner").classList.toggle("empty-visual", !banner.image);
    $("#promoBanner").innerHTML = `<p class="eyebrow">Banniere admin</p><h2>${escapeHtml(banner.title)}</h2><p>${escapeHtml(banner.text || "Banniere controlee depuis admin.")}</p>`;
  }else{
    $("#promoBanner").style.backgroundImage = "";
    $("#promoBanner").classList.add("empty-visual");
    $("#promoBanner").innerHTML = `<p class="eyebrow">Banniere vide</p><h2>Aucune banniere</h2><p>Ajoutez vos visuels depuis le Super Admin.</p>`;
  }
  $("#newProducts").innerHTML = publicProducts().slice(-6).reverse().map(p => `<button class="mini-item reveal" data-detail="${p.id}">${imageTag(p.image, p.title)}<span><strong>${escapeHtml(p.title)}</strong><small class="meta">${escapeHtml(p.city || "-")} - ${escapeHtml(p.category || "-")}</small></span><b>${money.format(Number(p.price) || 0)}</b></button>`).join("") ||
    emptyState("Aucune nouveaute", "Publiez une annonce pour alimenter cette zone.", "Nouveautes");
}

function renderShops(){
  $("#shopGrid").innerHTML = BMS.content.shops.map(s => `<article class="shop-card reveal"><div class="shop-cover ${s.cover ? "" : "empty-visual"}" ${s.cover ? `style="background-image:url('${s.cover}')"` : ""}></div><div class="shop-body"><div class="shop-logo">${s.logoImage ? `<img src="${s.logoImage}" alt="${escapeHtml(s.name)}">` : escapeHtml((s.name || "B").slice(0,2).toUpperCase())}</div><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.category || "-")} - ${escapeHtml(s.city || "-")}</p><div class="meta"><span>${Number(s.products) || 0} produits</span><span>Boutique admin</span></div><button class="ghost-btn" data-shop="${s.id}">Voir boutique</button></div></article>`).join("") ||
    emptyState("Aucune boutique", "Creez les boutiques et leurs logos depuis le Super Admin.", "Boutiques");
}

function renderAuctions(){
  $("#auctionGrid").innerHTML = BMS.content.auctions.map(a => `<article class="auction-card reveal" data-auction="${a.id}">${imageTag(a.image, a.title)}<span class="timer">--:--:--</span><h3>${escapeHtml(a.title)}</h3><p class="meta">${Number(a.bids) || 0} encheres actives - depart ${money.format(Number(a.price) || 0)}</p><button class="primary-btn"><i class="fa-solid fa-gavel"></i> Encherir</button></article>`).join("") ||
    emptyState("Aucune enchere", "Creez une vente aux encheres depuis le dashboard admin.", "Encheres");
  updateAuctionTimers();
}

function updateAuctionTimers(){
  $$("[data-auction]").forEach(card => {
    const item = BMS.content.auctions.find(a => a.id === card.dataset.auction);
    if(!item) return;
    const left = Math.max(0, Number(item.end) - Date.now());
    const h = String(Math.floor(left / 3600000)).padStart(2,"0");
    const m = String(Math.floor(left % 3600000 / 60000)).padStart(2,"0");
    const s = String(Math.floor(left % 60000 / 1000)).padStart(2,"0");
    $(".timer", card).textContent = `${h}:${m}:${s}`;
  });
}

function renderFooter(){
  const email = BMS.content.settings.supportEmail;
  const phone = BMS.content.settings.supportPhone;
  const footer = $("#support");
  if(!footer) return;
  footer.children[1].innerHTML = `<h4>Support</h4><p>${escapeHtml(email)}</p><p>${escapeHtml(phone)}</p>`;
}

function bindEvents(){
  document.body.addEventListener("click", e => {
    const target = e.target.closest("button,a");
    if(!target) return;
    if(target.dataset.scroll) document.getElementById(target.dataset.scroll)?.scrollIntoView({behavior:"smooth"});
    if(target.dataset.dash && BMS.user){ BMS.currentDash = target.dataset.dash; renderDashPanels(); $("#dashboard").scrollIntoView({behavior:"smooth"}); }
    if(target.dataset.hero) nextHero(Number(target.dataset.hero));
    if(target.dataset.category){ BMS.filters.category = target.dataset.category; $("#categorySelect").value = target.dataset.category; renderProducts(); $("#products").scrollIntoView({behavior:"smooth"}); }
    if(target.dataset.detail) showProduct(target.dataset.detail);
    if(target.dataset.cart) addCart(target.dataset.cart);
    if(target.dataset.fav) addFavorite(target.dataset.fav);
    if(target.dataset.close) $(`#${target.dataset.close}`).classList.add("hidden");
    if(target.id === "loginOpenBtn") openAuth("login");
    if(target.id === "registerOpenBtn") openAuth("buyer");
    if(target.id === "sellerQuickBtn") openAuth("seller");
    if(target.id === "mobileMenuBtn") $("#mobilePanel").classList.toggle("open");
    if(target.id === "logoutBtn") logout();
    if(target.id === "langBtn") toast("Architecture multilingue prete: les textes peuvent etre branches FR/EN.");
  });
  $("#searchForm").addEventListener("submit", e => { e.preventDefault(); BMS.filters.q = $("#searchInput").value.trim().toLowerCase(); BMS.filters.category = $("#categorySelect").value; renderProducts(); });
  ["cityFilter","stateFilter","brandFilter"].forEach(id => $(`#${id}`).addEventListener("change", e => { BMS.filters[id.replace("Filter","")] = e.target.value; renderProducts(); }));
  $("#resetFilters").addEventListener("click", resetFilters);
  $("#applyBudget").addEventListener("click", () => { BMS.filters.min = Number($("#budgetMin").value) || null; BMS.filters.max = Number($("#budgetMax").value) || null; renderProducts(); $("#products").scrollIntoView({behavior:"smooth"}); toast("Budget applique."); });
  $("#loginTab").addEventListener("click", () => openAuth("login"));
  $("#buyerTab").addEventListener("click", () => openAuth("buyer"));
  $("#sellerTab").addEventListener("click", () => openAuth("seller"));
  $("#loginForm").addEventListener("submit", login);
  $("#buyerForm").addEventListener("submit", e => { e.preventDefault(); setUser("ACHETEUR", $("#buyerName").value || "Acheteur BMS"); });
  $("#sellerForm").addEventListener("submit", e => { e.preventDefault(); createSellerFromForm(); });
  document.addEventListener("change", handleDashboardChange);
  document.addEventListener("submit", handleDashboardSubmit);
}

function openAuth(tab){
  $("#authModal").classList.remove("hidden");
  ["login","buyer","seller"].forEach(name => {
    $(`#${name}Form`).classList.toggle("hidden", name !== tab);
    $(`#${name}Tab`)?.classList.toggle("active", name === tab);
  });
}

function login(e){
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const pass = $("#loginPassword").value;
  if(email === ADMIN_EMAIL && pass === ADMIN_PASSWORD) return setUser("SUPER ADMIN", "Super Admin BMS");
  if(email.includes("sous")) return setUser("SOUS ADMIN", "Sous Admin Validation");
  if(email.includes("vendeur") || email.includes("seller")) return setUser("VENDEUR", "Vendeur BMS");
  setUser("ACHETEUR", "Acheteur BMS");
}

function createSellerFromForm(){
  const shopName = $("#shopName").value || "Nouvelle boutique";
  const shop = { id: uid(), name: shopName, city: "A definir", category: "A definir", products: 0, cover: "", logoImage: "" };
  BMS.content.shops.push(shop);
  saveContent();
  setUser("VENDEUR", shopName);
}

function setUser(role, name){
  BMS.user = { role, name, permissions: role === "SOUS ADMIN" ? ["Validation Produits","Categories","Support","Messages","Commandes","Boutiques"] : [] };
  $("#authModal").classList.add("hidden");
  $("#loginOpenBtn").innerHTML = `<i class="fa-solid fa-user-check"></i><span>${role}</span>`;
  renderDashboard();
  $("#dashboard").classList.remove("hidden");
  $("#dashboard").scrollIntoView({behavior:"smooth"});
  toast(`Bienvenue ${name}. Dashboard ${role} ouvert.`);
}

function logout(){
  BMS.user = null;
  $("#dashboard").classList.add("hidden");
  $("#loginOpenBtn").innerHTML = `<i class="fa-solid fa-user"></i><span>Connexion</span>`;
  toast("Deconnexion reussie.");
}

function renderDashboard(){
  const role = BMS.user.role;
  const menus = {
    "ACHETEUR":["Dashboard","Mes commandes","Mes favoris","Messages","Notifications","Profil","Parametres","Deconnexion"],
    "VENDEUR":["Accueil","Ajouter produit","Mes produits","Produits publies","Produits en attente","Produits refuses","Commandes","Clients","Messages","Statistiques","Portefeuille","Publicites","Promotions","Avis","Profil","Parametres","Deconnexion"],
    "SOUS ADMIN":BMS.user.permissions.concat("Deconnexion"),
    "SUPER ADMIN":["Dashboard","Controle total","Produits","Ajouter produit","Validation Produits","Produits Refuses","Categories","Sous categories","Marques","Boutiques","Acheteurs","Vendeurs","Sous Admin","Permissions","Commandes","Paiements","Commissions","Retraits","Slider","Bannieres","Promotions","Publicites","Messages","Support","Reclamations","GPS","Intelligence Artificielle","Traductions","Rapports","Journal","Parametres","Sauvegardes","Deconnexion"]
  }[role];
  BMS.currentDash = menus[0];
  $("#dashName").textContent = BMS.user.name;
  $("#dashRole").textContent = role;
  $("#dashAvatar").textContent = role.split(" ").map(w => w[0]).join("").slice(0,2);
  $("#dashMenu").innerHTML = menus.map((m,i) => `<button class="${i===0 ? "active" : ""}" data-dash="${m}"><i class="fa-solid ${dashIcon(m)}"></i> ${m}</button>`).join("");
  $("#dashMenu").onclick = e => {
    const btn = e.target.closest("[data-dash]");
    if(!btn) return;
    if(btn.dataset.dash === "Deconnexion") return logout();
    BMS.currentDash = btn.dataset.dash;
    $$("#dashMenu button").forEach(b => b.classList.toggle("active", b === btn));
    renderDashPanels();
  };
  renderDashPanels();
}

function dashIcon(m){
  const map = {Dashboard:"fa-chart-line",Accueil:"fa-house","Controle total":"fa-sliders","Ajouter produit":"fa-plus","Validation Produits":"fa-check-double",Categories:"fa-layer-group",Boutiques:"fa-store",Messages:"fa-comments",GPS:"fa-location-crosshairs","Intelligence Artificielle":"fa-brain",Paiements:"fa-credit-card",Permissions:"fa-key",Sauvegardes:"fa-database",Portefeuille:"fa-wallet",Statistiques:"fa-chart-pie",Slider:"fa-images",Bannieres:"fa-rectangle-ad",Marques:"fa-copyright",Support:"fa-headset"};
  return map[m] || "fa-circle-dot";
}

function renderDashPanels(){
  $("#dashTitle").textContent = BMS.currentDash;
  $("#dashEyebrow").textContent = BMS.user.role;
  const cards = dashboardStats(BMS.user.role).map(s => `<div class="stat-card"><small>${s[0]}</small><strong>${s[1]}</strong><span>${s[2]}</span></div>`).join("");
  $("#dashPanels").innerHTML = `<div class="dash-grid">${cards}</div>${dashboardModule()}`;
}

function dashboardStats(role){
  const pending = BMS.content.products.filter(p => p.status === "pending").length;
  const published = BMS.content.products.filter(p => p.status === "published").length;
  if(role === "ACHETEUR") return [["Commandes","0","Compteur reel"],["Favoris",BMS.favorites.length,"Articles gardes"],["Messages","0","Aucun message"],["Notifications","0","Compte actif"]];
  if(role === "VENDEUR") return [["Annonces",BMS.content.products.length,"Creees"],["Publiees",published,"Validees"],["En attente",pending,"Admin"],["Revenus",money.format(0),"A brancher"]];
  if(role === "SOUS ADMIN") return [["A valider",pending,"Produits"],["Tickets","0","Support"],["Boutiques",BMS.content.shops.length,"A verifier"],["Permissions",BMS.user.permissions.length,"Accordees"]];
  return [["Images site",countImages(),"Chargees"],["Produits",BMS.content.products.length,"Total"],["En attente",pending,"Validation"],["Publies",published,"En ligne"]];
}

function dashboardModule(){
  const m = BMS.currentDash;
  if(["Controle total","Dashboard"].includes(m) && BMS.user.role === "SUPER ADMIN") return adminControlCenter();
  if(["Ajouter produit","Produits"].includes(m)) return productManager();
  if(m === "Validation Produits") return validationManager();
  if(m === "Produits Refuses") return productTable("refused");
  if(m === "Mes produits") return productTable();
  if(m === "Produits publies") return productTable("published");
  if(m === "Produits en attente") return productTable("pending");
  if(["Categories","Sous categories"].includes(m)) return categoryManager();
  if(m === "Marques") return listManager("brands","Marques","Nom de marque");
  if(m === "Boutiques") return shopManager();
  if(m === "Slider") return mediaManager("sliders","Slider principal");
  if(["Bannieres","Promotions","Publicites"].includes(m)) return mediaManager("banners","Bannieres / promotions");
  if(m === "Intelligence Artificielle") return aiPanel();
  if(m === "GPS") return simplePanel("Suivi GPS", "Controle des livreurs, positions, preuves de livraison et statuts colis pret a brancher.");
  if(m === "Support") return supportPanel();
  if(m === "Parametres") return settingsPanel();
  if(m === "Sauvegardes") return backupPanel();
  if(["Sous Admin","Permissions"].includes(m)) return subAdminPanel();
  return simplePanel(m, "Module cree. Ajoutez ici vos actions metier depuis le Super Admin.");
}

function adminControlCenter(){
  return `<div class="admin-actions">
    ${controlButton("Ajouter produit","fa-plus","Creer une annonce avec photos")}
    ${controlButton("Validation Produits","fa-check-double","Publier ou refuser")}
    ${controlButton("Slider","fa-images","Charger les images du hero")}
    ${controlButton("Bannieres","fa-rectangle-ad","Creer les promotions")}
    ${controlButton("Categories","fa-layer-group","Creer les rayons")}
    ${controlButton("Boutiques","fa-store","Logos et couvertures")}
    ${controlButton("Marques","fa-copyright","Liste des marques")}
    ${controlButton("Parametres","fa-gear","Logo et support")}
    ${controlButton("Sauvegardes","fa-database","Exporter / remettre a zero")}
  </div>`;
}

function controlButton(module, icon, text){
  return `<button class="control-tile" data-dash="${module}"><i class="fa-solid ${icon}"></i><strong>${module}</strong><span>${text}</span></button>`;
}

function productManager(){
  return `<div class="dash-card"><h3>Creer une annonce avec vos propres photos</h3><p>Les vendeurs envoient en attente. Le Super Admin peut publier directement ou valider ensuite.</p>
    <form id="productForm" class="cms-form">
      <div class="form-grid"><input name="title" placeholder="Titre annonce" required><input name="price" type="number" min="0" placeholder="Prix FCFA" required></div>
      <div class="form-grid"><input name="oldPrice" type="number" min="0" placeholder="Ancien prix"><input name="stock" type="number" min="0" placeholder="Stock" required></div>
      <div class="form-grid">${selectHtml("category", BMS.content.categories.map(c => c.name), "Categorie")}${selectHtml("brand", BMS.content.brands, "Marque")}</div>
      <div class="form-grid">${selectHtml("city", BMS.content.cities, "Ville")}${selectHtml("state", BMS.content.states, "Etat")}</div>
      <input name="shop" placeholder="Boutique / vendeur" value="${escapeHtml(BMS.user.role === "VENDEUR" ? BMS.user.name : "")}">
      <textarea name="description" placeholder="Description complete"></textarea>
      <label class="upload-box"><i class="fa-solid fa-cloud-arrow-up"></i><span>Charger photo principale</span><input name="image" type="file" accept="image/*" required></label>
      <label class="upload-box"><i class="fa-solid fa-images"></i><span>Charger galerie produit</span><input name="gallery" type="file" accept="image/*" multiple></label>
      <div id="productAiPreview" class="ai-result">IA: chargez une image pour connaitre le type detecte, qualite et prix conseille.</div>
      <button class="primary-btn" type="submit"><i class="fa-solid fa-paper-plane"></i> ${BMS.user.role === "SUPER ADMIN" ? "Creer et publier" : "Envoyer en validation"}</button>
    </form></div>${productTable()}`;
}

function validationManager(){
  return `<div class="dash-card"><h3>Validation des annonces</h3><p>Chaque annonce vendeur reste bloquee ici avant publication.</p>${productTable("pending", true)}</div>`;
}

function productTable(status, withActions = false){
  const rows = BMS.content.products.filter(p => !status || p.status === status);
  if(!rows.length) return `<div class="dash-card"><h3>Aucune annonce</h3><p>Le compteur est a zero tant que vous ne creez pas de contenu.</p></div>`;
  return `<div class="dash-card"><h3>Liste annonces</h3><div class="table-scroll"><table class="dash-table"><thead><tr><th>Image</th><th>Titre</th><th>Prix</th><th>IA</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows.map(p => `<tr><td class="tiny-img">${imageTag(p.image,p.title)}</td><td>${escapeHtml(p.title)}</td><td>${money.format(Number(p.price)||0)}</td><td>${escapeHtml(p.aiType || "-")}<br><small>${escapeHtml(p.aiPrice || "")}</small></td><td><span class="status ${statusClass(p.status)}">${labelStatus(p.status)}</span></td><td>${actionButtons(p, withActions)}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function actionButtons(p, withActions){
  const publish = BMS.user.role === "SUPER ADMIN" ? `<button class="mini-btn ok" data-product-action="published" data-id="${p.id}">Publier</button>` : "";
  const refuse = BMS.user.role === "SUPER ADMIN" ? `<button class="mini-btn danger" data-product-action="refused" data-id="${p.id}">Refuser</button>` : "";
  const del = BMS.user.role === "SUPER ADMIN" ? `<button class="mini-btn" data-product-action="delete" data-id="${p.id}">Supprimer</button>` : "";
  return `${publish}${refuse}${del}${withActions ? "" : `<button class="mini-btn" data-detail="${p.id}">Voir</button>`}`;
}

function categoryManager(){
  return `<div class="dash-card"><h3>Creer une categorie</h3><form id="categoryForm" class="cms-form"><div class="form-grid"><input name="name" placeholder="Nom categorie" required><input name="icon" placeholder="Icone FontAwesome ex: fa-mobile-screen-button"></div><textarea name="desc" placeholder="Description"></textarea><label class="upload-box"><i class="fa-solid fa-image"></i><span>Image categorie</span><input name="image" type="file" accept="image/*"></label><button class="primary-btn">Creer categorie</button></form></div>${listContent("categories","Categories")}`;
}

function shopManager(){
  return `<div class="dash-card"><h3>Creer une boutique</h3><form id="shopForm" class="cms-form"><div class="form-grid"><input name="name" placeholder="Nom boutique" required><input name="city" placeholder="Ville"></div><input name="category" placeholder="Categorie boutique"><label class="upload-box"><i class="fa-solid fa-id-badge"></i><span>Logo boutique</span><input name="logoImage" type="file" accept="image/*"></label><label class="upload-box"><i class="fa-solid fa-image"></i><span>Couverture boutique</span><input name="cover" type="file" accept="image/*"></label><button class="primary-btn">Creer boutique</button></form></div>${listContent("shops","Boutiques")}`;
}

function mediaManager(key, title){
  return `<div class="dash-card"><h3>${title}</h3><form id="mediaForm" data-media="${key}" class="cms-form"><input name="title" placeholder="Titre" required><textarea name="text" placeholder="Texte"></textarea><label class="upload-box"><i class="fa-solid fa-image"></i><span>Charger image</span><input name="image" type="file" accept="image/*" required></label><button class="primary-btn">Ajouter</button></form></div>${listContent(key,title)}`;
}

function listManager(key, title, placeholder){
  return `<div class="dash-card"><h3>${title}</h3><form id="simpleListForm" data-list="${key}" class="cms-form"><input name="value" placeholder="${placeholder}" required><button class="primary-btn">Ajouter</button></form><div class="chip-list">${BMS.content[key].map(v => `<span>${escapeHtml(v)} <button data-list-delete="${key}" data-value="${escapeHtml(v)}">x</button></span>`).join("")}</div></div>`;
}

function settingsPanel(){
  const s = BMS.content.settings;
  return `<div class="dash-card"><h3>Parametres du site</h3><form id="settingsForm" class="cms-form"><div class="form-grid"><input name="logoText" maxlength="5" value="${escapeHtml(s.logoText)}" placeholder="Logo texte"><input name="brandName" value="${escapeHtml(s.brandName)}" placeholder="Nom plateforme"></div><div class="form-grid"><input name="supportEmail" value="${escapeHtml(s.supportEmail)}" placeholder="Email support"><input name="supportPhone" value="${escapeHtml(s.supportPhone)}" placeholder="Telephone support"></div><button class="primary-btn">Enregistrer</button></form></div>`;
}

function backupPanel(){
  return `<div class="dash-card"><h3>Sauvegardes</h3><p>Exportez les donnees ou remettez le compteur images/produits a zero.</p><textarea readonly>${escapeHtml(JSON.stringify(BMS.content, null, 2))}</textarea><div class="hero-actions"><button class="ghost-btn" data-backup="export">Copier sauvegarde</button><button class="primary-btn danger-btn" data-backup="reset">Remettre le site a zero</button></div></div>`;
}

function subAdminPanel(){
  return `<div class="dash-card"><h3>Sous Admin et permissions</h3><form id="subAdminForm" class="cms-form"><div class="form-grid"><input name="name" placeholder="Nom Sous Admin" required><input name="email" type="email" placeholder="Email" required></div><input name="permissions" placeholder="Permissions separees par virgule"><button class="primary-btn">Creer Sous Admin</button></form></div>${listContent("subAdmins","Sous Admin")}`;
}

function aiPanel(){
  return `<div class="dash-card"><h3>Admin intelligent</h3><p>L'IA locale analyse le nom du fichier, la taille et la categorie saisie pour indiquer type d'image, qualite et prix conseille.</p><div class="ai-tags"><span>Type image</span><span>Prix conseille</span><span>Controle qualite</span><span>Alerte photo manquante</span></div></div>${productTable()}`;
}

function supportPanel(){
  return `<div class="dash-card"><h3>Support</h3><form id="supportForm" class="cms-form"><input name="name" placeholder="Nom client"><input name="subject" placeholder="Sujet"><textarea name="message" placeholder="Message"></textarea><button class="primary-btn">Ajouter ticket</button></form></div>${listContent("messages","Messages support")}`;
}

function simplePanel(title, text){
  return `<div class="dash-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p><button class="primary-btn" data-dash="Controle total"><i class="fa-solid fa-sliders"></i> Retour controle total</button></div>`;
}

function listContent(key, title){
  const rows = BMS.content[key] || [];
  if(!rows.length) return `<div class="dash-card"><h3>${title}</h3><p>Aucun element pour le moment.</p></div>`;
  return `<div class="dash-card"><h3>${title}</h3><div class="content-list">${rows.map(item => {
    const label = typeof item === "string" ? item : item.name || item.title || item.email || "Element";
    const image = typeof item === "object" ? item.image || item.cover || item.logoImage : "";
    return `<div class="content-row">${image ? `<span class="tiny-img">${imageTag(image,label)}</span>` : `<span class="row-icon"><i class="fa-solid fa-circle-dot"></i></span>`}<strong>${escapeHtml(label)}</strong><button class="mini-btn" data-delete="${key}" data-id="${escapeHtml(item.id || item)}">Supprimer</button></div>`;
  }).join("")}</div></div>`;
}

async function handleDashboardChange(e){
  const input = e.target;
  if(input.matches("#productForm input[type='file']")){
    const form = input.closest("form");
    const main = form.elements.image?.files?.[0];
    if(main) $("#productAiPreview").innerHTML = await smartImageAdvice(main, form);
  }
}

async function handleDashboardSubmit(e){
  const form = e.target;
  if(!form.matches(".cms-form")) return;
  e.preventDefault();
  if(form.id === "productForm") await saveProduct(form);
  if(form.id === "categoryForm") await saveCategory(form);
  if(form.id === "shopForm") await saveShop(form);
  if(form.id === "mediaForm") await saveMedia(form);
  if(form.id === "simpleListForm") saveSimpleList(form);
  if(form.id === "settingsForm") saveSettings(form);
  if(form.id === "subAdminForm") saveSubAdmin(form);
  if(form.id === "supportForm") saveSupport(form);
}

async function saveProduct(form){
  const imageFile = form.elements.image.files[0];
  const galleryFiles = [...form.elements.gallery.files];
  const image = await fileToDataUrl(imageFile);
  const gallery = await Promise.all(galleryFiles.map(fileToDataUrl));
  const price = Number(form.elements.price.value) || 0;
  const oldPrice = Number(form.elements.oldPrice.value) || 0;
  const advice = await analyzeImage(imageFile, form);
  BMS.content.products.unshift({
    id: uid(),
    title: form.elements.title.value,
    price,
    oldPrice,
    promo: oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0,
    stock: Number(form.elements.stock.value) || 0,
    category: form.elements.category.value,
    brand: form.elements.brand.value,
    city: form.elements.city.value,
    state: form.elements.state.value,
    shop: form.elements.shop.value || BMS.user.name,
    description: form.elements.description.value,
    image,
    gallery,
    aiType: advice.type,
    aiPrice: advice.priceText,
    reviews: 0,
    status: BMS.user.role === "SUPER ADMIN" ? "published" : "pending",
    createdAt: Date.now()
  });
  saveContent();
  form.reset();
  renderAll();
  toast(BMS.user.role === "SUPER ADMIN" ? "Annonce publiee." : "Annonce envoyee en validation.");
}

async function saveCategory(form){
  BMS.content.categories.push({ id: uid(), name: form.elements.name.value, icon: form.elements.icon.value || "fa-layer-group", desc: form.elements.desc.value, image: form.elements.image.files[0] ? await fileToDataUrl(form.elements.image.files[0]) : "" });
  saveContent(); form.reset(); renderAll(); toast("Categorie creee.");
}

async function saveShop(form){
  BMS.content.shops.push({ id: uid(), name: form.elements.name.value, city: form.elements.city.value, category: form.elements.category.value, products: 0, logoImage: form.elements.logoImage.files[0] ? await fileToDataUrl(form.elements.logoImage.files[0]) : "", cover: form.elements.cover.files[0] ? await fileToDataUrl(form.elements.cover.files[0]) : "" });
  saveContent(); form.reset(); renderAll(); toast("Boutique creee.");
}

async function saveMedia(form){
  const key = form.dataset.media;
  BMS.content[key].push({ id: uid(), title: form.elements.title.value, text: form.elements.text.value, image: await fileToDataUrl(form.elements.image.files[0]) });
  saveContent(); form.reset(); renderAll(); toast("Visuel ajoute.");
}

function saveSimpleList(form){
  const key = form.dataset.list;
  const value = form.elements.value.value.trim();
  if(value && !BMS.content[key].includes(value)) BMS.content[key].push(value);
  saveContent(); form.reset(); renderAll(); toast("Element ajoute.");
}

function saveSettings(form){
  BMS.content.settings = Object.fromEntries(new FormData(form).entries());
  saveContent(); renderAll(); toast("Parametres enregistres.");
}

function saveSubAdmin(form){
  BMS.content.subAdmins.push({ id: uid(), name: form.elements.name.value, email: form.elements.email.value, permissions: form.elements.permissions.value });
  saveContent(); form.reset(); renderAll(); toast("Sous Admin cree.");
}

function saveSupport(form){
  BMS.content.messages.push({ id: uid(), name: form.elements.name.value, title: form.elements.subject.value, text: form.elements.message.value });
  saveContent(); form.reset(); renderAll(); toast("Ticket ajoute.");
}

document.addEventListener("click", e => {
  const btn = e.target.closest("[data-product-action],[data-delete],[data-list-delete],[data-backup]");
  if(!btn) return;
  if(btn.dataset.productAction) updateProductStatus(btn.dataset.id, btn.dataset.productAction);
  if(btn.dataset.delete) deleteContent(btn.dataset.delete, btn.dataset.id);
  if(btn.dataset.listDelete) deleteListValue(btn.dataset.listDelete, btn.dataset.value);
  if(btn.dataset.backup === "export") navigator.clipboard?.writeText(JSON.stringify(BMS.content, null, 2)).then(() => toast("Sauvegarde copiee."));
  if(btn.dataset.backup === "reset" && confirm("Remettre BMS a zero ?")) { BMS.content = emptyContent(); saveContent(); renderAll(); toast("Site remis a zero."); }
});

function updateProductStatus(id, action){
  if(action === "delete") BMS.content.products = BMS.content.products.filter(p => p.id !== id);
  else BMS.content.products = BMS.content.products.map(p => p.id === id ? { ...p, status: action } : p);
  saveContent(); renderAll(); toast("Annonce mise a jour.");
}

function deleteContent(key, id){
  BMS.content[key] = BMS.content[key].filter(item => String(item.id || item) !== String(id));
  saveContent(); renderAll(); toast("Element supprime.");
}

function deleteListValue(key, value){
  BMS.content[key] = BMS.content[key].filter(item => item !== value);
  saveContent(); renderAll(); toast("Element supprime.");
}

function showProduct(id){
  const p = BMS.content.products.find(item => item.id === id);
  if(!p) return;
  $("#productDetail").innerHTML = `<div class="detail-grid"><div class="detail-gallery">${imageTag(p.image, p.title)}<div class="thumbs">${(p.gallery || []).map(g => imageTag(g,p.title)).join("")}</div></div><div><p class="eyebrow">${escapeHtml(p.category)}</p><h2>${escapeHtml(p.title)}</h2><div><span class="price">${money.format(Number(p.price) || 0)}</span>${p.oldPrice ? `<span class="old-price">${money.format(Number(p.oldPrice))}</span>` : ""}</div><p>${escapeHtml(p.description || "")}</p><div class="meta"><span>${escapeHtml(p.city || "-")}</span><span>${escapeHtml(p.state || "-")}</span><span>${escapeHtml(p.brand || "-")}</span><span>${escapeHtml(p.shop || "-")}</span></div><h3>Analyse admin intelligente</h3><p>${escapeHtml(p.aiType || "Image non analysee")} - ${escapeHtml(p.aiPrice || "Prix libre")}</p><button class="primary-btn" data-cart="${p.id}">Ajouter au panier</button></div></div>`;
  $("#productModal").classList.remove("hidden");
}

function addCart(id){ BMS.cart.push(id); $("#cartCount").textContent = BMS.cart.length; toast("Produit ajoute au panier."); }
function addFavorite(id){ if(!BMS.favorites.includes(id)) BMS.favorites.push(id); $("#favCount").textContent = BMS.favorites.length; toast("Produit ajoute aux favoris."); }

function resetFilters(){
  BMS.filters = { q:"", category:"all", city:"all", state:"all", brand:"all", min:null, max:null };
  ["searchInput","budgetMin","budgetMax"].forEach(id => $(`#${id}`).value = "");
  ["categorySelect","cityFilter","stateFilter","brandFilter"].forEach(id => $(`#${id}`).value = "all");
  renderProducts();
}

async function smartImageAdvice(file, form){
  const advice = await analyzeImage(file, form);
  return `<strong>IA image:</strong> ${escapeHtml(advice.type)}<br><strong>Qualite:</strong> ${escapeHtml(advice.quality)}<br><strong>Prix conseille:</strong> ${escapeHtml(advice.priceText)}`;
}

async function analyzeImage(file, form){
  const name = `${file.name} ${form.elements.title?.value || ""} ${form.elements.category?.value || ""}`.toLowerCase();
  let type = "Image produit standard";
  let base = 25000;
  if(/phone|iphone|samsung|tech|electron|ordinateur|macbook/.test(name)){ type = "Electronique / high-tech"; base = 180000; }
  if(/mode|robe|shirt|sneaker|chaussure|sac/.test(name)){ type = "Mode / accessoire"; base = 35000; }
  if(/car|auto|moto|toyota/.test(name)){ type = "Auto / moto"; base = 2500000; }
  if(/maison|canape|meuble|deco/.test(name)){ type = "Maison / mobilier"; base = 120000; }
  if(/terrain|immobilier|maison/.test(name)){ type = "Immobilier"; base = 8000000; }
  const sizeMb = file.size / 1024 / 1024;
  const quality = sizeMb > 0.25 ? "Bonne resolution pour publication" : "Image legere, verifiez la nettete";
  const entered = Number(form.elements.price?.value) || 0;
  const priceText = entered ? `Prix saisi ${money.format(entered)} / repere IA ${money.format(base)}` : `Repere IA environ ${money.format(base)}`;
  return { type, quality, priceText };
}

function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function selectHtml(name, values, label){
  const safeValues = values.length ? values : ["Non classe"];
  return `<select name="${name}" required><option value="">${label}</option>${safeValues.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select>`;
}

function imageTag(src, alt){
  return src ? `<img src="${src}" alt="${escapeHtml(alt || "")}">` : `<div class="image-placeholder"><i class="fa-solid fa-image"></i><span>Image admin</span></div>`;
}

function emptyState(title, text, action){
  return `<div class="empty-state reveal"><i class="fa-solid fa-cloud-arrow-up"></i><h3>${title}</h3><p>${text}</p><button class="ghost-btn" data-dash="${action}">Creer depuis admin</button></div>`;
}

function countImages(){
  return BMS.content.products.filter(p => p.image).length + BMS.content.categories.filter(c => c.image).length + BMS.content.shops.filter(s => s.cover || s.logoImage).length + BMS.content.sliders.length + BMS.content.banners.length;
}

function statusClass(status){ return status === "published" ? "ok" : status === "refused" ? "refused" : "pending"; }
function labelStatus(status){ return status === "published" ? "Publie" : status === "refused" ? "Refuse" : "En attente"; }
function uid(){ return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[char])); }

function toast(message){
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  $("#toastStack").appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function revealOnScroll(){
  const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle("visible", entry.isIntersecting)), { threshold:.12 });
  $$(".reveal").forEach(el => observer.observe(el));
  const watch = new MutationObserver(() => $$(".reveal:not(.watched)").forEach(el => { el.classList.add("watched"); observer.observe(el); }));
  watch.observe(document.body, { childList:true, subtree:true });
}
