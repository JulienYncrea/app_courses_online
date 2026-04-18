
let map;
let mapInitialized = false;
let userMarker;
let currentPos = null;
let currentMarkers = [];
let markerClusterGroup;
const themeColors = { 
    food: '#ea4335', bar: '#9b59b6', shop: '#4285f4', 
    sport: '#34a853', nature: '#27ae60', culture: '#fbbc05', other: '#95a5a6' 
};

function initMap() {
    if (mapInitialized) return;
    map = L.map('map').setView([48.8566, 2.3522], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    markerClusterGroup = L.markerClusterGroup({
    disableClusteringAtZoom: 17, // Désactive le cluster quand on est très proche
    maxClusterRadius: 40 // Réduit le rayon pour qu'il faille plus de points proches pour grouper
    });
    map.addLayer(markerClusterGroup);
    map.locate({setView: true, maxZoom: 16});
    map.on('moveend', () => {
    currentPage = 1; // On revient à la page 1 quand la vue change
    renderLocationList();
    });
    map.on('locationfound', function(e) {
    currentPos = e.latlng;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker(e.latlng, {
        radius: 8, fillColor: "#3498db", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8
    }).addTo(map).bindPopup("Tu es ici");
    });

    document.getElementById('addAtCurrentPosBtn').onclick = () => {
    if (currentPos) {
        map.setView(currentPos, 17);
        fetchAddressAndOpenForm(currentPos.lat, currentPos.lng);
    } else {
        alert("Position non détectée.");
    }
    };

    document.getElementById('searchCityBtn').onclick = function() {
    const city = document.getElementById('citySearchInput').value;
    if(city) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`)
        .then(res => res.json()).then(data => {
            if(data.length > 0) map.setView([data[0].lat, data[0].lon], 13);
        });
    }
    };

    map.on('click', (e) => fetchAddressAndOpenForm(e.latlng.lat, e.latlng.lng));
    renderLocationList();
    mapInitialized = true;
}

function fetchAddressAndOpenForm(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then(res => res.json()).then(data => {
        const fullAddress = data.display_name; // L'adresse complète pour Google Maps
        const name = fullAddress.split(',')[0] || "Point personnalisé";
        openPopupForm(lat, lng, name, fullAddress); // On passe l'adresse ici
    }).catch(() => openPopupForm(lat, lng, "Point personnalisé", ""));
}

function openPopupForm(lat, lng, name, address = "") {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    const popupContent = `
    <div class="popup-form">
        <label>Nom du lieu :</label>
        <input type="text" id="popName" value="${name}">
        <label>Catégorie :</label>
        <select id="popTheme">
        <option value="food">🍴 Food</option>
        <option value="bar">🍺 Bar / Café</option>
        <option value="shop">🛍️ Shopping</option>
        <option value="sport">⚽ Sport</option>
        <option value="nature">🌳 Nature</option>
        <option value="culture">🏛️ Culture</option>
        <option value="other">📍 Autre</option>
        </select>
        <div class="star-rating" id="popStars">
        <i class="fas fa-star" data-v="1"></i><i class="far fa-star" data-v="2"></i><i class="far fa-star" data-v="3"></i><i class="far fa-star" data-v="4"></i><i class="far fa-star" data-v="5"></i>
        </div>
        <input type="hidden" id="popRating" value="1">
        <textarea id="popNote" placeholder="Ton avis..."></textarea>
        
        <a href="${googleMapsUrl}" target="_blank" style="display:block; text-align:center; margin-bottom:10px; color:#3498db; text-decoration:none; font-size:0.85em;">
        <i class="fas fa-directions"></i> Voir sur Google Maps
        </a>

        <button id="popSubmit">Enregistrer</button>
    </div>
    `;

    L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);

    setTimeout(() => {
    const stars = document.querySelectorAll('#popStars i');
    stars.forEach(s => {
        s.onclick = (e) => {
        const val = parseInt(e.target.getAttribute('data-v'));
        document.getElementById('popRating').value = val;
        stars.forEach((st, i) => { st.className = i < val ? 'fas fa-star' : 'far fa-star'; });
        };
    });
    document.getElementById('popSubmit').onclick = () => {
        saveLocation(lat, lng, document.getElementById('popName').value, document.getElementById('popNote').value, document.getElementById('popTheme').value, document.getElementById('popRating').value);
        map.closePopup();
    };
    }, 10);
}

async function saveLocation(lat, lng, name, note, theme, rating) {
    if (!currentListId) {
    alert("Veuillez d'abord charger une liste.");
    return;
    }

    try {
    const { data, error } = await supabaseClient
        .from('map_locations')
        .insert([{
        list_id: currentListId,
        name: name,
        lat: lat,
        lng: lng,
        note: note,
        theme: theme,
        rating: parseInt(rating)
        }]);

    if (error) throw error;
    
    // On recharge la liste pour afficher le nouveau point
    renderLocationList();
    } catch (error) {
    console.error("Erreur lors de l'enregistrement du lieu:", error);
    }
}

function updatePopupLink(lat, lng) {
    const newName = document.getElementById('popName').value;
    const link = document.getElementById('dynamicGMapsLink');
    if(link) {
        link.href = getGoogleMapsUrl(newName, lat, lng);
        link.innerHTML = `<i class="fas fa-directions"></i> Voir "${newName}" sur Google Maps`;
    }
}
function getGoogleMapsUrl(name, lat, lng) {
    // On combine le nom et les coordonnées pour être ultra précis
    // encodeURIComponent permet de gérer les espaces et caractères spéciaux
    const query = encodeURIComponent(`${name}, ${lat},${lng}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
let currentPage = 1; // Variable pour suivre la page actuelle
const itemsPerPage = 15; // Limite stricte de 20 par page
async function renderLocationList() {
    if (!currentListId || !map) return;

    const listContainer = document.getElementById('savedLocationsList');
    const themeFilter = document.getElementById('filterTheme').value;
    const sortVal = document.getElementById('sortLocations').value;

    try {
    const { data: locations, error } = await supabaseClient
        .from('map_locations')
        .select('*')
        .eq('list_id', currentListId);

    if (error) throw error;

    // 1. Filtrage par thème et tri
    let processedLocations = [...locations];
    if (themeFilter !== 'all') {
        processedLocations = processedLocations.filter(l => l.theme === themeFilter);
    }

    // 2. FILTRE "RADAR" : Uniquement ce qui est visible sur la carte
    const bounds = map.getBounds();
    const visibleOnMap = processedLocations.filter(loc => 
        bounds.contains([loc.lat, loc.lng])
    );

    // 3. Mise à jour de la CARTE (Clustering intelligent)
    markerClusterGroup.clearLayers();
    
    // Si moins de 10 points au total, on peut choisir de ne pas les mettre dans le cluster 
    // mais pour la fluidité, on les ajoute au groupe qui gérera l'affichage seul.
    processedLocations.forEach(loc => {
        const marker = createCustomMarker(loc); // Fonction utilitaire (voir ci-dessous)
        markerClusterGroup.addLayer(marker);
    });

    // 4. Tri de la liste visible
    if (sortVal === 'new') {
        visibleOnMap.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
        visibleOnMap.sort((a, b) => b.rating - a.rating);
    }

    // 5. Pagination de la LISTE VISIBLE
    listContainer.innerHTML = '';
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = visibleOnMap.slice(startIndex, startIndex + itemsPerPage);

    if (paginated.length === 0) {
        listContainer.innerHTML = '<p class="empty-list-message" style="text-align:center; font-size:0.8em; color:#999;">Aucun lieu dans cette zone</p>';
    }

    paginated.forEach(loc => {
        const item = createLocationItem(loc); // Fonction utilitaire
        listContainer.appendChild(item);
    });

    renderPaginationControls(visibleOnMap.length, listContainer);

    } catch (error) {
    console.error("Erreur de rendu:", error);
    }
}
function createLocationItem(loc) {
    const item = document.createElement('div');
    item.className = `location-item theme-${loc.theme || 'other'}`;
    item.innerHTML = `
        <b>📍 ${loc.name} <span>${'★'.repeat(loc.rating || 1)}</span></b>
        <span>${loc.note || ''}</span>
        <div class="date-info">${new Date(loc.created_at).toLocaleDateString()}</div>
    `;
    item.onclick = () => {
    map.setView([loc.lat, loc.lng], 17);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return item;
}

// Fonction utilitaire pour créer un marqueur
function createCustomMarker(loc) {
    const color = themeColors[loc.theme] || '#95a5a6';
    const gMapsLink = getGoogleMapsUrl(loc.name, loc.lat, loc.lng);
    return L.marker([loc.lat, loc.lng], {
    icon: L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color:${color}; width:14px; height:14px; border:2px solid white; border-radius:50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7]
    })
    }).bindPopup(`
        <b>${loc.name}</b><br>
        ${'★'.repeat(loc.rating)}<br>
        <p style="margin:5px 0;">${loc.note || ''}</p>
        <a href="${gMapsLink}" target="_blank" style="color:#3498db; text-decoration:none; font-weight:bold;">
            <i class="fas fa-map-marker-alt"></i> Itinéraire
        </a>
    `);
}
// Fonction utilitaire pour les boutons de page
function renderPaginationControls(totalItems, container) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const nav = document.createElement('div');
    nav.style.display = 'flex';
    nav.style.justifyContent = 'space-between';
    nav.style.padding = '15px 0';

    const prevBtn = document.createElement('button');
    prevBtn.innerText = "Précédent";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderLocationList(); };

    const nextBtn = document.createElement('button');
    nextBtn.innerText = "Suivant";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderLocationList(); };

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    container.appendChild(nav);
}

document.getElementById('openMapBtn').addEventListener('click', function() {
    document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.getElementById('mapSection').classList.remove('hidden');
    initMap();
    setTimeout(() => { map.invalidateSize(); }, 200);
});
