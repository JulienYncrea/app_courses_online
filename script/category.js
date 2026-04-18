const newCategoryInput = document.getElementById('newCategoryInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryList = document.getElementById('categoryList');
const categoryOrderList = document.getElementById('categoryOrderList');

const initialDefaultCategories = [
    "Fruits et Légumes",
    "Produits Laitiers",
    "Viandes et Poissons",
    "Produits d'Épicerie",
    "Boulangerie",
    "Boissons",
    "Surgelés",
    "Entretien",
    "Hygiène",
    "Autres"
];

function getCategories() {
    return JSON.parse(localStorage.getItem('user_categories')) || initialDefaultCategories;
}

function saveCategories(categories) {
    localStorage.setItem('user_categories', JSON.stringify(categories));
}

function updateAllCategorySelects() {
    const categories = getCategories();
    const selects = document.querySelectorAll('select#newCategorySelect, select#newSuggestionCategorySelect');
    selects.forEach(select => {
        select.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    });
    if (categories.length > 0) {
        newCategorySelect.value = categories[0];
        newSuggestionCategorySelect.value = categories[0];
    }
}

function updateSuggestionCategoryFilter() {
    const categories = getCategories();
    suggestionCategoryFilter.innerHTML = '';

    // Add "All categories" option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All categories';
    suggestionCategoryFilter.appendChild(allOption);

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        suggestionCategoryFilter.appendChild(option);
    });
    suggestionCategoryFilter.value = 'all'; // Default to "All Categories"
}



function loadCategoryOrder() {
    let categories = getCategories(); // Toutes les catégories actuelles
    let savedOrder = JSON.parse(localStorage.getItem('category_order')) || []; // Ordre sauvegardé depuis localStorage

    // Filtrer les catégories de savedOrder qui n'existent plus dans getCategories()
    // Et s'assurer que les nouvelles catégories de getCategories() sont ajoutées à la fin de l'ordre
    let newOrder = savedOrder.filter(cat => categories.includes(cat));

    categories.forEach(cat => {
        if (!newOrder.includes(cat)) {
            newOrder.push(cat); // Ajouter les nouvelles catégories à la fin
        }
    });

    // Si après réconciliation, l'ordre a changé, le sauvegarder
    if (JSON.stringify(savedOrder) !== JSON.stringify(newOrder)) {
        localStorage.setItem('category_order', JSON.stringify(newOrder));
    }
    // Utiliser l'ordre réconcilié et potentiellement sauvegardé pour le rendu
    let currentOrder = newOrder;

    categoryOrderList.innerHTML = ''; // Effacer la liste d'abord

    if (currentOrder.length === 0) {
        categoryOrderList.innerHTML = '<p class="empty-list-message">Faites glisser les catégories pour définir leur ordre.</p>'; // Conserver le texte original
        return;
    }

    currentOrder.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
        li.draggable = true;
        li.classList.add('category-item'); // Ajouter une classe pour le style/la sélection
        li.innerHTML = `<i class="fas fa-grip-vertical drag-handle"></i><span>${category}</span>`;
        categoryOrderList.appendChild(li);
    });
}

function saveCategoryOrder() {
    const items = Array.from(categoryOrderList.children);
    const newOrder = items.map(li => li.querySelector('span').textContent.trim()); // Get text from span
    localStorage.setItem('category_order', JSON.stringify(newOrder));
    console.log('Category order saved!'); // Log instead of alert
    loadShoppingList(); // Reload shopping list to apply new order
}

async function addCategory(categoryName) {
    if (!categoryName.trim()) {
        alert('Please enter a category name.');
        return;
    }
    let categories = getCategories();
    if (categories.some(cat => cat.toLowerCase() === categoryName.trim().toLowerCase())) {
        alert(`Category "${categoryName.trim()}" already exists!`);
        return;
    }
    categories.push(categoryName.trim());
    saveCategories(categories);
    newCategoryInput.value = '';
    updateAllCategorySelects();
    updateSuggestionCategoryFilter();
    renderCategories();
    loadCategoryOrder(); // Refresh the order list
}
addCategoryBtn.addEventListener('click', () => {
    addCategory(newCategoryInput.value);
});
categoryOrderList.addEventListener('dragstart', (e) => {
    draggingCategoryElement = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggingCategoryElement.innerHTML);
    e.target.classList.add('dragging');
});

categoryOrderList.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('li.category-item');
    if (target && target !== draggingCategoryElement) {
        const rect = target.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > .5;
        categoryOrderList.insertBefore(draggingCategoryElement, next && target.nextSibling || target);
    }
});

categoryOrderList.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
    draggingCategoryElement = null;
    saveCategoryOrder(); // Save order immediately after drag
});

function renderCategories() {
    const categories = getCategories();
    categoryList.innerHTML = '';
    if (categories.length === 0) {
        categoryList.innerHTML = '<p class="empty-list-message">No categories defined. Add some above!</p>';
        return;
    }
    // Sort categories alphabetically for "Your Categories" list
    const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    sortedCategories.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
        li.innerHTML = `
            <span>${category}</span>
            <button class="remove-btn" data-category="${category}"><i class="fas fa-times"></i></button>
        `;
        // FIX: Use closest('.remove-btn') to get the button element that has the data-category attribute
        li.querySelector('.remove-btn').addEventListener('click', (e) => {
            deleteCategory(e.target.closest('.remove-btn').dataset.category);
        });
        categoryList.appendChild(li);
    });
}