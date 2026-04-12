const suggestionsTitle = document.getElementById('suggestionsTitle'); // Added for scroll
const suggestionCategoryFilter = document.getElementById('suggestionCategoryFilter'); // New category filter
const newSuggestionInput = document.getElementById('newSuggestionInput');
const newSuggestionCategorySelect = document.getElementById('newSuggestionCategorySelect');
const addSuggestionBtn = document.getElementById('addSuggestionBtn');
const suggestionList = document.getElementById('suggestionList');
let isDeleteMode = false;

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
    const suggestions = getSuggestions();
    // Check for existing suggestion
    if (suggestions.some(sug => sug.name.toLowerCase() === name.trim().toLowerCase() && sug.category.toLowerCase() === category.toLowerCase())) {
        alert(`"${name.trim()}" is already a suggestion in category "${category}"!`);
        return;
    }

    const newSuggestion = {
        id: Date.now(), // Simple unique ID
        name: name.trim(),
        category: category
    };
    suggestions.push(newSuggestion);
    saveSuggestions(suggestions);
    newSuggestionInput.value = '';
    loadSuggestions(); // Refresh the list
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
    const container = document.getElementById('suggestions'); // Le parent
    
    list.innerHTML = '';

    // Gestion de la classe visuelle sur le conteneur
    if (isDeleteMode) {
        container.classList.add('delete-mode-active');
    } else {
        container.classList.remove('delete-mode-active');
    }

    // Filtrage (code existant)
    const selectedCategory = suggestionCategoryFilter.value;
    let filteredSuggestions = selectedCategory === 'all'
        ? suggestions
        : suggestions.filter(sug => sug.category === selectedCategory);

    filteredSuggestions.forEach(sug => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="name">${sug.name}</span>`;
        
        li.onclick = () => {
            if (isDeleteMode) {
                deleteSuggestion(sug.id);
                loadSuggestions(); 
            } else {
                // ACTION D'AJOUT CLASSIQUE
                addItem(sug.name, 1, sug.category, currentListId);
                // Feedback visuel rapide d'ajout
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