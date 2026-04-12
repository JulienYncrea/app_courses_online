const shoppingListSection = document.getElementById('shoppingList');
const buyLaterSection = document.getElementById('buyLater');
const suggestionsSection = document.getElementById('suggestions');
const categoriesSection = document.getElementById('categories');
const settingsSection = document.getElementById('settings');

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById('nav' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1)).classList.add('active');

    // Specific for the settings section
    if (sectionId === 'settings') {
        activeShareCodeSpan.textContent = currentShareCode || 'N/A';
    }
    // Load section-specific data if necessary
    if (sectionId === 'buyLater') {
        loadBuyLaterList();
    } else if (sectionId === 'suggestions') {
        updateSuggestionCategoryFilter(); // Update category filter
        loadSuggestions(); // Load suggestions after filter update
    } else if (sectionId === 'categories') {
        renderCategories();
        loadCategoryOrder();
    }
}

navShoppingList.addEventListener('click', () => showSection('shoppingList'));
navBuyLater.addEventListener('click', () => showSection('buyLater'));
navSuggestions.addEventListener('click', () => showSection('suggestions'));
navCategories.addEventListener('click', () => showSection('categories'));
navSettings.addEventListener('click', () => showSection('settings'));