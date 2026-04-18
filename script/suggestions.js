const suggestionsTitle = document.getElementById('suggestionsTitle'); // Added for scroll
const suggestionCategoryFilter = document.getElementById('suggestionCategoryFilter'); // New category filter
const newSuggestionInput = document.getElementById('newSuggestionInput');
const newSuggestionCategorySelect = document.getElementById('newSuggestionCategorySelect');
const addSuggestionBtn = document.getElementById('addSuggestionBtn');
const suggestionList = document.getElementById('suggestionList');
let isDeleteMode = false;
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;

// Paramètres du trait
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.strokeStyle = '#333';

canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener('mousemove', draw);

// Support Tactile
canvas.addEventListener('touchstart', (e) => { drawing = true; e.preventDefault(); });
canvas.addEventListener('touchend', () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    draw({ clientX: touch.clientX, clientY: touch.clientY });
    e.preventDefault();
});

function draw(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

document.getElementById('clearCanvasBtn').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white"; // On remet le blanc
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});
function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    const btn = document.getElementById('toggleDeleteModeBtn');
    if (isDeleteMode){
        if (confirm(`You have activate the delete mode, tape yes for continue or cancel for desactivate delete mode. You can deactivate delete mode with click to the trash icon back`)) {
                isDeleteMode = true;
            }
        else {
            isDeleteMode = false;
        }
    }
    if (isDeleteMode) {
        btn.style.backgroundColor = "#000000"; // Bouton devient rouge
        btn.style.color = "white";
    } else {
        btn.style.backgroundColor = "#ff4d4d"; // Retour au style d'origine
        btn.style.color = "white";
    }
    
    loadSuggestions(); // Relance le rendu avec la nouvelle couleur de liste
}


function getSuggestions() {
    return JSON.parse(localStorage.getItem('shopping_suggestions') || '[]');
}

function saveSuggestions(suggestions) {
    localStorage.setItem('shopping_suggestions', JSON.stringify(suggestions));
}

async function addSuggestion(name, category) {
    if (!name.trim() || !category) {
        alert("Please enter a name and choose a category for the suggestion.");
        return;
    }

    // On crée un canvas temporaire pour fusionner le fond blanc et le dessin
    // Cela garantit que l'image sauvegardée n'est jamais transparente
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // 1. Remplir le fond en blanc
    tempCtx.fillStyle = "white";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // 2. Dessiner le contenu de ton canvas par-dessus
    tempCtx.drawImage(canvas, 0, 0);

    // 3. Récupérer l'image finale
    const imageData = tempCanvas.toDataURL("image/jpeg", 0.8); // JPEG est plus léger et ne gère pas la transparence

    const suggestions = getSuggestions();
    
    if (suggestions.some(sug => sug.name.toLowerCase() === name.trim().toLowerCase() && sug.category.toLowerCase() === category.toLowerCase())) {
        alert(`"${name.trim()}" is already a suggestion in category "${category}"!`);
        return;
    }

    const newSuggestion = {
        id: Date.now(),
        name: name.trim(),
        category: category,
        image: imageData 
    };

    suggestions.push(newSuggestion);
    saveSuggestions(suggestions);
    
    newSuggestionInput.value = '';
    
    // Nettoyer et remettre le fond blanc pour le prochain dessin
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    loadSuggestions();
}

async function deleteSuggestion(suggestionId) {
    const suggestions = getSuggestions();
    const suggestionToDelete = suggestions.find(sug => sug.id === suggestionId);
    const suggestionName = suggestionToDelete ? suggestionToDelete.name : "this suggestion";
    // 3. On affiche le confirm avec le vrai nom
    const listItemElement = document.querySelector(`#suggestionList li[data-id="${suggestionId}"]`);
    if (listItemElement) {
        listItemElement.remove();
    }

    // Mise à jour du Local Storage
    const updatedSuggestions = suggestions.filter(sug => sug.id !== suggestionId);
    saveSuggestions(updatedSuggestions);

    // Message si vide
    if (updatedSuggestions.length === 0) {
        document.getElementById('suggestionList').innerHTML = '<p class="empty-list-message">No suggestions available at the moment.</p>';
    }
}

async function loadSuggestions() {
    let suggestions = getSuggestions();
    const list = document.getElementById('suggestionList');
    list.innerHTML = '';

    const selectedCategory = suggestionCategoryFilter.value;
    let filteredSuggestions = selectedCategory === 'all'
        ? suggestions
        : suggestions.filter(sug => sug.category === selectedCategory);

    filteredSuggestions.forEach(sug => {
        const li = document.createElement('li');
        
        // Vérification et application de l'image
        if (sug.image && sug.image !== "data:,") { // "data:," est un canvas vide
            li.style.backgroundImage = `url(${sug.image})`;
            li.style.backgroundSize = 'cover';
            li.style.backgroundPosition = 'center';
            li.style.backgroundRepeat = 'no-repeat';
        } else {
            li.style.backgroundColor = '#f0f0f0'; // Fond gris clair si pas de dessin
        }

        li.innerHTML = `<span class="name">${sug.name}</span>`;
        
        li.onclick = () => {
            if (isDeleteMode) {
                deleteSuggestion(sug.id);
                loadSuggestions(); 
            } else {
                addItem(sug.name, 1, sug.category, currentListId);
                li.style.transform = "scale(0.95)";
                setTimeout(() => li.style.transform = "scale(1)", 100);
            }
        };

        list.appendChild(li);
    });
}
document.getElementById('toggleDeleteModeBtn').addEventListener('click', toggleDeleteMode);

addSuggestionBtn.addEventListener('click', () => {
    addSuggestion(newSuggestionInput.value, newSuggestionCategorySelect.value);
});

suggestionCategoryFilter.addEventListener('change', loadSuggestions);
suggestionsTitle.addEventListener('click', (event) => { // Added event parameter
    event.preventDefault(); // Prevent default browser behavior (e.g., text selection)
    event.stopPropagation(); // Stop event propagation to avoid other actions
    document.body.scrollIntoView({ behavior: 'smooth', block: 'end' });
});