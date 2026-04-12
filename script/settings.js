const shareCodeInput = document.getElementById('shareCodeInput');
const loadShareCodeBtn = document.getElementById('loadShareCodeBtn');
const addItemForm = document.getElementById('addItemForm');
const activeShareCodeSpan = document.getElementById('activeShareCode');
const changeShareCodeBtn = document.getElementById('changeShareCodeBtn');

function generateShareCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function handleInitialLoad() {
    let shareCode = localStorage.getItem('lastShareCode');
    if (shareCode) {
        shareCodeInput.value = shareCode; // Set the input in settings
        await getOrCreateListByShareCode(shareCode);
        showSection('shoppingList'); // Show shopping list if connected
    } else {
        // If no share code, go to settings for the user to enter one
        showSection('settings');
        // Optionally, pre-fill with a generated code to suggest creation            shareCodeInput.value = generateShareCode();
    }
}

function updateSupabaseHeaders(shareCode) {
    if (supabaseClient && supabaseClient.rest) {
        supabaseClient.rest.headers['X-Share-Code'] = shareCode;
        console.log(`Supabase headers updated with X-Share-Code: ${shareCode}`);
    } else {
        console.warn("Supabase client not initialized or rest client not ready, cannot update headers.");
    }
}

async function getOrCreateListByShareCode(code) {
    updateSupabaseHeaders(code);

    try {
        const { data: lists, error: selectError } = await supabaseClient
            .from('lists')
            .select('id, name')
            .eq('share_code', code);

        if (selectError && selectError.code !== '406') {
            if (selectError.code === 'PGRST400' && selectError.message.includes('406')) {
            } else {
                throw selectError;
            }
        }

        if (lists && lists.length > 0) {
            console.log(`List found for code ${code}:`, lists[0]);
            currentListId = lists[0].id;
            console.log(currentListId)
            currentShareCode = code;
            await updateSubscriptionForNewList(currentListId);
            localStorage.setItem('lastShareCode', shareCodeInput.value); // Save on successful load
            setupRealtimeListener(currentListId);
            loadShoppingList();
            activeShareCodeSpan.textContent = currentShareCode; // Update display in settings
            return lists[0];
        } else {
            console.log(`No list found for code ${code}. Creating a new list.`);
            const newList = {
                name: `List ${code}`,
                share_code: code
            };
            const { data: createdList, error: insertError } = await supabaseClient
                .from('lists')
                .insert([newList])
                .select('id, name');

            if (insertError) {
                console.error("Error creating list:", insertError);
                alert("Error creating list: " + insertError.message);
                return null;
            } else {
                console.log("New list created:", createdList[0]);
                currentListId = createdList[0].id;
                currentShareCode = code;
                await updateSubscriptionForNewList(currentListId);
                localStorage.setItem('lastShareCode', shareCodeInput.value); // Save on successful creation
                setupRealtimeListener(currentListId);
                loadShoppingList();
                activeShareCodeSpan.textContent = currentShareCode; // Update display in settings
                return createdList[0];
            }
        }
    } catch (error) {
        console.error("Unexpected error in getOrCreateListByShareCode:", error);
        alert("An unexpected error occurred: " + error.message);
        return null;
    }
}

loadShareCodeBtn.addEventListener('click', async () => {
    const code = shareCodeInput.value.trim().toUpperCase();
    if (code) {
        await getOrCreateListByShareCode(code);
        if (currentListId) { // If successfully connected/created
            showSection('shoppingList'); // Go to shopping list
        }
    } else {
        alert("Please enter a share code.");
    }
});

changeShareCodeBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to change lists / disconnect? This will clear the current share code from this device.")) {
        localStorage.removeItem('lastShareCode');
        currentListId = null;
        currentShareCode = null;
        if (window.supabaseChannel) {
            supabaseClient.removeChannel(window.supabaseChannel);
            window.supabaseChannel = null;
        }
        if (window.supabaseBuyLaterChannel) {
            supabaseClient.removeChannel(window.supabaseBuyLaterChannel);
            window.supabaseBuyLaterChannel = null;
        }

        // Clear current list display
        shoppingListToBuy.innerHTML = '<p class="empty-list-message">Your list is empty for now!</p>';
        buyLaterList.innerHTML = '<p class="empty-list-message">Your "Buy Later" list is empty!</p>';
        suggestionList.innerHTML = '<p class="empty-list-message">No suggestions available at the moment.</p>';
        categoryList.innerHTML = '<p class="empty-list-message">No categories defined. Add some above!</p>';
        categoryOrderList.innerHTML = '<p class="empty-list-message">Drag categories to set their order.</p>';

        shareCodeInput.value = generateShareCode(); // Suggest a new code
        activeShareCodeSpan.textContent = 'N/A';
        showSection('settings');
        alert("You have been disconnected. Please enter a new share code or create one.");
    }
});