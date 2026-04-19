// --- Supabase Configuration ---
const SUPABASE_URL = 'https://kbrstkkzfsjysohjdsqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticnN0a2t6ZnNqeXNvaGpkc3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTE0NzIsImV4cCI6MjA5MDg4NzQ3Mn0._WST41JUmDD_N0rApXzmc-EB7D1hgJTJ80lXnRl5VB8'; // Replace with your actual anon key
let supabaseClient = null; // Will be initialized in window.addEventListener('load')
const VAPID_PUBLIC_KEY = "BHvMEhklZrgvkLnopsv7GlF-nm7e-OSTzur56Cu6twTpHWjHu6YdPuriz-2G6gppyFjjYQxlt2uihEXOUY0rdXs";

// --- Global Variables ---
let currentShareCode = null;
let currentListId = null;
isUpdatingLocally = true;
async function setupRealtimeListener() {
    // 1. NETTOYAGE COMPLET des deux canaux avant de commencer
    if (window.supabaseChannel) {
        await supabaseClient.removeChannel(window.supabaseChannel);
        window.supabaseChannel = null;
    }
    if (window.supabaseBuyLaterChannel) {
        await supabaseClient.removeChannel(window.supabaseBuyLaterChannel);
        window.supabaseBuyLaterChannel = null;
    }

    if (!currentListId) {
        console.warn("No currentListId defined, cannot set up Realtime listener.");
        return;
    }
    if (window.supabaseSuggestionsChannel) {
        await supabaseClient.removeChannel(window.supabaseSuggestionsChannel);
        window.supabaseSuggestionsChannel = null;
    }
    // 2. CONFIGURATION DU CANAL PRINCIPAL (list_items)
    window.supabaseChannel = supabaseClient.channel(`list_items_changes:${currentListId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'list_items',
            filter: `list_id=eq.${currentListId}`
        }, (payload) => {
            if (isUpdatingLocally && payload.eventType === 'UPDATE') return;
            console.log('Realtime UPDATE detected:', payload);
            const updatedItem = payload.new;
            const listItemElement = document.querySelector(`#shoppingListToBuy li[data-id="${updatedItem.id}"]`);
            if (listItemElement) {
                const quantitySpan = listItemElement.querySelector('.quantity-control span');
                if (quantitySpan) {
                    quantitySpan.textContent = `${updatedItem.quantity}x`;
                }
            } else {
                loadShoppingList();
            }
        })
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'list_items',
            filter: `list_id=eq.${currentListId}`
        }, (payload) => {
            console.log('Realtime INSERT detected:', payload);
            loadShoppingList();
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'list_items',
            filter: `list_id=eq.${currentListId}`
        }, (payload) => {
            console.log('Realtime DELETE detected:', payload);
            loadShoppingList();
        })
        .subscribe((status) => {
            if (status !== 'SUBSCRIBED') console.warn("List channel status:", status);
        });

    // 3. CONFIGURATION DU CANAL BUY LATER
    window.supabaseBuyLaterChannel = supabaseClient.channel(`buy_later_items_changes:${currentListId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'buy_later_items',
            filter: `list_id=eq.${currentListId}`
        }, (payload) => {
            console.log('Buy Later Realtime change detected:', payload);
            loadBuyLaterList();
        })
        .subscribe((status) => {
            if (status !== 'SUBSCRIBED') console.warn("Buy Later channel status:", status);
        });
        window.supabaseSuggestionsChannel = supabaseClient.channel(`suggestions_changes:${currentListId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'suggestions',
                filter: `list_id=eq.${currentListId}`
            }, (payload) => {
                console.log('Suggestions change detected:', payload);
                loadSuggestions(); // 🔥 IMPORTANT
            })
            .subscribe((status) => {
                if (status !== 'SUBSCRIBED') console.warn("Suggestions channel status:", status);
            });
    console.log(`Realtime listeners configured for list_id: ${currentListId}`);
}

window.addEventListener('load', async () => {
    // Initialize Supabase client
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client initialized successfully.");
    } else {
        console.error("Error: Supabase 'createClient' function is not defined or the Supabase library is not loaded correctly.");
        alert("Loading error: Supabase library could not be initialized. Check your internet connection or configuration.");
        return;
    }

    let attempts = 0;
    const maxAttempts = 20;
    const delayMs = 50;

    while (!supabaseClient.rest && attempts < maxAttempts) {
        console.log(`Waiting for supabase.rest (attempt ${attempts + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
    }

    if (supabaseClient.rest) {
        console.log("supabase.rest is now ready!");
        // Initialize categories if not present in local storage
        if (!localStorage.getItem('user_categories')) {
            localStorage.setItem('user_categories', JSON.stringify(initialDefaultCategories));
        }
        await handleInitialLoad(); // This will load data and set currentListId
        updateAllCategorySelects();
        updateSuggestionCategoryFilter();
        updateBodyPadding(); // Update body padding on initial load
        renderCategories(); // Initial rendering of categories list
        loadCategoryOrder(); // Initial load of category order list
    } else {
        console.error("Error: supabase.rest did not become ready after multiple attempts. Cannot start application.");
        alert("Startup error: Could not initialize database connection. Check your connection.");
        return;
    }
});