const newBuyLaterItemInput = document.getElementById('newBuyLaterItemInput');
const addBuyLaterItemBtn = document.getElementById('addBuyLaterItemBtn');
const buyLaterList = document.getElementById('buyLaterList');

async function addBuyLaterItem(name) {
    if (!currentListId) {
        alert("Please load or create a list first.");
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('buy_later_items')
            .insert([{ name, list_id: currentListId }]);
        if (error) {
            console.error("Error adding 'Buy Later' item:", error);
            alert("Error adding 'Buy Later' item: " + error.message);
        } else {
            newBuyLaterItemInput.value = '';
            // loadBuyLaterList is handled by the Realtime listener
        }
    } catch (error) {
        console.error("Unexpected error adding 'Buy Later' item:", error);
        alert("An unexpected error occurred: " + error.message);
    }
}

async function deleteBuyLaterItem(itemId) {
    if (!currentListId) return;

    // Optimistic UI update: Remove the item from the DOM immediately
    const listItemElement = document.querySelector(`#buyLaterList li[data-id="${itemId}"]`);
    if (listItemElement) {
        listItemElement.remove();
    }

    try {
        const { data, error } = await supabaseClient
            .from('buy_later_items')
            .delete()
            .eq('id', itemId);
        if (error) {
            console.error("Error deleting 'Buy Later' item:", error);
            alert("Error deleting 'Buy Later' item: " + error.message);
            loadBuyLaterList(); // Reload if there's an error
        } else {
            // loadBuyLaterList is handled by the Realtime listener
        }
    } catch (error) {
        console.error("Unexpected error deleting 'Buy Later' item:", error);
        alert("An unexpected error occurred: " + error.message);
        loadBuyLaterList(); // Reload in case of unexpected JS error
    }
}

async function loadBuyLaterList() {
    if (!currentListId) {
        buyLaterList.innerHTML = '<p class="empty-list-message">Your "Buy Later" list is empty!</p>';
        return;
    }
    updateSupabaseHeaders(currentShareCode);

    try {
        const { data: items, error } = await supabaseClient
            .from('buy_later_items')
            .select('*')
            .eq('list_id', currentListId)
            .order('id', { ascending: true });

        if (error) {
            console.error("Error loading 'Buy Later' list:", error);
            alert("Error loading 'Buy Later' list: " + error.message);
            return;
        }

        buyLaterList.innerHTML = '';
        if (items.length === 0) {
            buyLaterList.innerHTML = '<p class="empty-list-message">Your "Buy Later" list is empty!</p>';
            return;
        }
        // Sort buy later items alphabetically
        items.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

        items.forEach(item => {
            // Use the shared renderListItem function
            renderListItem(item, buyLaterList);
        });
    } catch (error) {
        console.error("Unexpected error loading 'Buy Later' list:", error);
        alert("An unexpected error occurred: " + error.message);
    }
}

addBuyLaterItemBtn.addEventListener('click', () => {
    addBuyLaterItem(newBuyLaterItemInput.value);
});