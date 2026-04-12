const shoppingListToBuy = document.getElementById('shoppingListToBuy');
const newItemInput = document.getElementById('newItemInput');
const newQuantityInput = document.getElementById('newQuantityInput');
const newCategorySelect = document.getElementById('newCategorySelect');
const addItemBtn = document.getElementById('addItemBtn');
const shoppingListTitle = document.getElementById('shoppingListTitle'); // Added for scroll
const toggleNavBtn = document.getElementById('toggleNavBtn');
const bottomNav = document.querySelector('.bottom-nav');

function toggleBottomNav() {
    const bottomNav = document.querySelector('.bottom-nav');
    const icon = toggleNavBtn.querySelector('i');

    if (bottomNav.classList.contains('hidden-nav')) {
        bottomNav.classList.remove('hidden-nav');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    } else {
        bottomNav.classList.add('hidden-nav');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    }
    updateBodyPadding(); // Update body padding after toggle
}

function updateBodyPadding() {
    const bottomNavHeight = bottomNav.offsetHeight;
    // The toggle button is outside the bottom-nav for fixed positioning.
    // We need to account for both the nav and the toggle button's height
    // to avoid content being hidden. Assuming toggle button is 40px height + 20px top margin from nav.
    const effectiveNavHeight = bottomNav.classList.contains('hidden-nav') ? 0 : bottomNavHeight;
    const toggleButtonHeight = bottomNav.classList.contains('hidden-nav') ? 40 : 0; // Only visible when nav is hidden

    document.body.style.paddingBottom = `${effectiveNavHeight + toggleButtonHeight + 20}px`;
}

async function updateItemQuantity(itemId, newQuantity) {
    if (!currentListId) return;

    const listItemElement = document.querySelector(`#shoppingListToBuy li[data-id="${itemId}"]`);
    if (!listItemElement) return;

    const quantitySpan = listItemElement.querySelector('.quantity-control span');

    // 1. GESTION DE LA SUPPRESSION
    if (newQuantity <= 0) {
        await deleteItem(itemId);
        return;
    }

    // 2. MISE À JOUR OPTIMISTE (Immédiate pour l'utilisateur)
    isUpdatingLocally = true; // On dit au listener Realtime de nous laisser tranquille
    quantitySpan.textContent = `${newQuantity}x`;
    listItemElement.dataset.quantity = newQuantity;

    try {
        const { error } = await supabaseClient
            .from('list_items')
            .update({ quantity: newQuantity })
            .eq('id', itemId);

        if (error) throw error;

    } catch (error) {
        console.error("Erreur de mise à jour:", error);
        // En cas de vraie erreur réseau, on rafraîchit pour remettre la bonne valeur
        loadShoppingList();
    } finally {
        // On redonne la main au Realtime après un petit délai pour laisser le réseau respirer
        setTimeout(() => { isUpdatingLocally = false; }, 1000);
    }
}

async function addItem(name, quantity, category, listId) {
    if (!listId) {
        alert("Please load or create a list first.");
        return;
    }
    try {
        const { data: existingItems, error: selectError } = await supabaseClient
            .from('list_items')
            .select('id, quantity')
            .eq('list_id', listId)
            .eq('name', name)
            .eq('category', category); // Include category in check

        if (selectError) throw selectError;

        if (existingItems && existingItems.length > 0) {
            // Item exists, update its quantity
            const existingItem = existingItems[0];
            const newQuantity = existingItem.quantity + quantity;
            const { data, error: updateError } = await supabaseClient
                .from('list_items')
                .update({ quantity: newQuantity })
                .eq('id', existingItem.id);
            if (updateError) throw updateError;
            console.log(`Quantity of item '${name}' updated to ${newQuantity}.`);
        } else {
            // Item does not exist, insert new
            const { data, error: insertError } = await supabaseClient
                .from('list_items')
                .insert([{ name, quantity, category, list_id: listId }]);
            if (insertError) throw insertError;
            console.log(`Item '${name}' added to list.`);
        }

        // Add category to local storage if it doesn't exist
        if (category) {
            const currentCategories = getCategories();
            if (!currentCategories.includes(category)) {
                currentCategories.push(category);
                saveCategories(currentCategories);
                updateAllCategorySelects(); // Update category dropdowns
                updateSuggestionCategoryFilter(); // Update filter dropdown
                renderCategories(); // Re-render category list in 'Manage Categories'
                loadCategoryOrder(); // Update category order list
            }
        }

        newItemInput.value = '';
        newQuantityInput.value = '1';
    } catch (error) {
        console.error("Error adding/updating item:", error);
        alert("Error adding/updating item: " + error.message);
    }
}

async function deleteItem(itemId) {
    if (!currentListId) return;

    const listItemElement = document.querySelector(`#shoppingListToBuy li[data-id="${itemId}"]`);
    
    if (listItemElement) {
        // --- NOUVELLE LOGIQUE DE SUPPRESSION DE CATÉGORIE VIDE ---
        const previousElement = listItemElement.previousElementSibling;
        const nextElement = listItemElement.nextElementSibling;

        // Si l'élément précédent est un H3 et le suivant est soit un autre H3 soit rien (fin de liste)
        // Cela signifie que c'était le dernier item de cette catégorie.
        if (previousElement && previousElement.tagName === 'H3') {
            if (!nextElement || nextElement.tagName === 'H3') {
                previousElement.remove(); // On supprime le titre de la catégorie
            }
        }
        
        listItemElement.remove(); // On supprime l'item
    }

    try {
        const { data, error } = await supabaseClient
            .from('list_items')
            .delete()
            .eq('id', itemId);
            
        if (error) {
            console.error("Error deleting item:", error);
            loadShoppingList(); // En cas d'erreur, on recharge pour restaurer l'affichage
        } else {
            // Optionnel : Si la liste est maintenant totalement vide, on affiche le message "liste vide"
            if (shoppingListToBuy.children.length === 0) {
                shoppingListToBuy.innerHTML = '<p class="empty-list-message">Your list is empty for now!</p>';
            }
        }
    } catch (error) {
        console.error("Unexpected error:", error);
        loadShoppingList();
    }
}

async function loadShoppingList() {
    if (!currentListId) {
        shoppingListToBuy.innerHTML = '<p class="empty-list-message">Your list is empty for now!</p>';
        return;
    }
    updateSupabaseHeaders(currentShareCode);

    try {
        const { data: items, error } = await supabaseClient
            .from('list_items')
            .select('*')
            .eq('list_id', currentListId)
            .order('id', { ascending: true });

        if (error) {
            console.error("Error loading shopping list:", error);
            alert("Error loading list: " + error.message);
            return;
        }

        shoppingListToBuy.innerHTML = '';

        if (!items || items.length === 0) {
            shoppingListToBuy.innerHTML = '<p class="empty-list-message">Your list is empty for now!</p>';
            return;
        }

        const categories = getCategories();
        const categoryOrder = JSON.parse(localStorage.getItem('category_order')) || categories;

        // 1. Groupage des items
        const groupedItems = {};
        items.forEach(item => {
            const category = item.category || 'Autres';
            if (!groupedItems[category]) groupedItems[category] = [];
            groupedItems[category].push(item);
        });

        // 2. Déterminer l'ordre des catégories
        const allCategoriesInItems = Object.keys(groupedItems);
        const finalOrder = [...categoryOrder];
        allCategoriesInItems.forEach(cat => {
            if (!finalOrder.includes(cat)) finalOrder.push(cat);
        });

        // 3. Rendu (La correction est ici : on vérifie groupedItems[cat])
        finalOrder.forEach(cat => {
            // On ne crée l'en-tête QUE si la catégorie contient au moins 1 item
            if (groupedItems[cat] && groupedItems[cat].length > 0) {
                
                const h3 = document.createElement('h3');
                h3.className = 'category-header-clickable';
                h3.innerHTML = `<span>${cat}</span> <i class="fas fa-chevron-down toggle-icon"></i>`;
                
                h3.onclick = () => {
                    const icon = h3.querySelector('.toggle-icon');
                    const isCollapsed = h3.classList.toggle('collapsed');
                    icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
                    
                    let nextEl = h3.nextElementSibling;
                    while (nextEl && nextEl.tagName !== 'H3') {
                        nextEl.classList.toggle('collapsed-content');
                        nextEl = nextEl.nextElementSibling;
                    }
                };

                shoppingListToBuy.appendChild(h3);
                
                // Tri et rendu des items
                groupedItems[cat].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
                groupedItems[cat].forEach(item => renderListItem(item, shoppingListToBuy));
            }
        });

    } catch (error) {
        console.error("Unexpected error loading shopping list:", error);
        alert("An unexpected error occurred: " + error.message);
    }
}

function renderListItem(item, listElement) {
    const li = document.createElement('li');
    li.dataset.id = item.id;

    // Check if it's a shopping list item (has quantity controls) or a buy later item
    const isShoppingListItem = listElement === shoppingListToBuy;

    if (isShoppingListItem) {
        // Container for quantity and item name
        const quantityAndNameContainer = document.createElement('div');
        quantityAndNameContainer.style.display = 'flex'; // Use flexbox
        quantityAndNameContainer.style.alignItems = 'center';
        quantityAndNameContainer.style.flexGrow = '1'; // Allow it to take available space

        const quantityControl = document.createElement('div');
        quantityControl.classList.add('quantity-control');
        quantityControl.style.display = 'flex'; // Ensure buttons are inline
        quantityControl.style.alignItems = 'center';

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        minusBtn.onclick = () => {
            const currentDisplayedQuantity = parseInt(quantitySpan.textContent.replace('x', ''));
            updateItemQuantity(item.id, currentDisplayedQuantity - 1);
        };
        quantityControl.appendChild(minusBtn);

        const quantitySpan = document.createElement('span');
        quantitySpan.textContent = `${item.quantity}x`; // Add 'x' here
        quantityControl.appendChild(quantitySpan);

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.onclick = () => {
            const currentDisplayedQuantity = parseInt(quantitySpan.textContent.replace('x', ''));
            updateItemQuantity(item.id, currentDisplayedQuantity + 1);
        };
        quantityControl.appendChild(plusBtn);

        // Add quantity controls to the container
        quantityAndNameContainer.appendChild(quantityControl);

        // Create a span for the item name, applying the new CSS class
        const itemName = document.createElement('span');
        itemName.classList.add('item-name'); /* Add this class */
        itemName.textContent = item.name;
        quantityAndNameContainer.appendChild(itemName);

        li.appendChild(quantityAndNameContainer); // Add the main container
    } else { // For buyLaterList
        const itemName = document.createElement('span');
        itemName.classList.add('item-name'); /* Add this class for consistency */
        itemName.textContent = item.name;
        itemName.style.paddingLeft = '1.2rem'; /* Match li padding-left */
        itemName.style.flexGrow = '1'; /* Allow name to take available space */
        li.appendChild(itemName);
    }


    const itemActions = document.createElement('div');
    itemActions.classList.add('item-actions');

    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-btn');
    // Use Font Awesome cross icon directly
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    if (isShoppingListItem) {
        removeBtn.onclick = () => deleteItem(item.id);
    } else { // For buyLaterList
        removeBtn.onclick = () => deleteBuyLaterItem(item.id);
    }

    itemActions.appendChild(removeBtn);

    li.appendChild(itemActions);
    listElement.appendChild(li);
}

addItemBtn.addEventListener('click', () => {
    const itemName = newItemInput.value;
    const quantity = parseInt(newQuantityInput.value) || 1;
    const category = newCategorySelect.value;
    addItem(itemName, quantity, category, currentListId);
});
toggleNavBtn.addEventListener('click', toggleBottomNav);
shoppingListTitle.addEventListener('click', (event) => { // Added event parameter
    event.preventDefault(); // Prevent default browser behavior (e.g., text selection)
    // Check if the click was on the bell icon itself, if so, don't scroll
    if (event.target.id === 'notificationBell') {
        return;
    }
    event.stopPropagation(); // Stop event propagation to avoid other actions
    document.body.scrollIntoView({ behavior: 'smooth', block: 'end' });
});