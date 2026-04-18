const suggestionsTitle = document.getElementById('suggestionsTitle'); // Added for scroll
const suggestionCategoryFilter = document.getElementById('suggestionCategoryFilter'); // New category filter
const newSuggestionInput = document.getElementById('newSuggestionInput');
const newSuggestionCategorySelect = document.getElementById('newSuggestionCategorySelect');
const addSuggestionBtn = document.getElementById('addSuggestionBtn');
const suggestionList = document.getElementById('suggestionList');
let isDeleteMode = false;
let currentListId = localStorage.getItem('current_list_id'); // Assure-toi que c'est bien récupéré
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

function openDrawingModal(itemName, category) {
    const modal = document.createElement('div');
    modal.className = 'drawing-modal';
    modal.innerHTML = `
        <div class="modal-box">
            <h3>Dessin pour "${itemName}"</h3>
            <canvas id="drawCanvas" width="200" height="200"></canvas>
            <div class="modal-btns">
                <button id="defaultDrawBtn">Par défaut</button>
                <button id="saveDrawBtn" class="primary">Valider</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;

    // Support Souris + Tactile
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => { drawing = true; ctx.beginPath(); const pos = getPos(e); ctx.moveTo(pos.x, pos.y); };
    const move = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#333';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };
    const stop = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start, {passive: false});
    canvas.addEventListener('touchmove', move, {passive: false});
    canvas.addEventListener('touchend', stop);

    // Bouton Par Défaut
    document.getElementById('defaultDrawBtn').onclick = () => {
        finalizeAddSuggestion(itemName, category, null);
        modal.remove();
    };

    // Bouton Valider
    document.getElementById('saveDrawBtn').onclick = () => {
        const dataUrl = canvas.toDataURL();
        finalizeAddSuggestion(itemName, category, dataUrl);
        modal.remove();
    };
}

function finalizeAddSuggestion(name, category, drawing) {
    const suggestions = getSuggestions();
    const newSuggestion = {
        id: Date.now(),
        name: name.trim(),
        category: category,
        drawing: drawing,
        showName: true
    };
    suggestions.push(newSuggestion);
    saveSuggestions(suggestions);
    document.getElementById('newSuggestionInput').value = '';
    loadSuggestions();
}

async function loadSuggestions() {
    let suggestions = getSuggestions();
    const list = document.getElementById('suggestionList');
    list.innerHTML = '';

    const selectedCategory = document.getElementById('suggestionCategoryFilter').value;
    let filtered = selectedCategory === 'all' ? suggestions : suggestions.filter(s => s.category === selectedCategory);

    filtered.forEach(sug => {
        const li = document.createElement('li');
        li.className = 'suggestion-card';
        
        const preview = sug.drawing 
            ? `<img src="${sug.drawing}" class="draw-preview">`
            : `<div class="letter-preview">${sug.name.charAt(0).toUpperCase()}</div>`;

        li.innerHTML = `
            <div class="card-inner">
                ${preview}
                ${sug.showName ? `<span class="card-name">${sug.name}</span>` : ''}
            </div>
        `;
        
        li.onclick = () => {
            if (isDeleteMode) {
                deleteSuggestion(sug.id);
                loadSuggestions();
            } else {
                addItem(sug.name, 1, sug.category, currentListId);
                li.classList.add('added-anim');
                setTimeout(() => li.classList.remove('added-anim'), 300);
            }
        };
        list.appendChild(li);
    });
}

// Event Listeners
document.getElementById('addSuggestionBtn').onclick = () => {
    const name = document.getElementById('newSuggestionInput').value;
    const cat = document.getElementById('newSuggestionCategorySelect').value;
    if(name && cat) openDrawingModal(name, cat);
    else alert("Nom et catégorie requis !");
};

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

