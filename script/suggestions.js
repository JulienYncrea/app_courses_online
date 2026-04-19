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
const modal = document.getElementById('drawingModal');
const bigCanvas = document.getElementById('bigCanvas');
const bigCtx = bigCanvas.getContext('2d');
const brushSizeInput = document.getElementById('brushSize');

// Paramètres du trait
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.strokeStyle = '#333';
let drawingBig = false;
bigCtx.lineWidth = 3;
bigCtx.lineCap = 'round';
bigCtx.lineWidth = 6; // valeur par défaut plus élevée
bigCtx.lineCap = 'round';
bigCtx.lineJoin = 'round'; // 🔥 évite les effets pointillés
// OUVRIR

const emojiSizeInput = document.getElementById('emojiSize');
let currentEmojiSize = 40;


canvas.addEventListener('click', () => {
    modal.classList.remove('hidden');

    bigCanvas.width = window.innerWidth * 0.9;
    bigCanvas.height = window.innerHeight * 0.8;

    // copier le petit dessin dans le grand
    bigCtx.drawImage(canvas, 0, 0, bigCanvas.width, bigCanvas.height);
});
bigCanvas.addEventListener('mousedown', (e) => {
    drawingBig = true;

    const rect = bigCanvas.getBoundingClientRect();
    bigCtx.beginPath();
    bigCtx.moveTo(
        e.clientX - rect.left,
        e.clientY - rect.top
    );
});
bigCanvas.addEventListener('mouseup', () => {
    drawingBig = false;
    bigCtx.beginPath();
});
emojiSizeInput.addEventListener('input', (e) => {
    currentEmojiSize = e.target.value;
});
bigCanvas.addEventListener('mousemove', (e) => {
    if (!drawingBig) return;

    const rect = bigCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    bigCtx.lineTo(x, y);
    bigCtx.stroke();
});
document.getElementById('colorPicker').addEventListener('change', (e) => {
    bigCtx.strokeStyle = e.target.value;
});
document.getElementById('emojiBtn').addEventListener('click', () => {
    const emoji = prompt("Enter emoji (😊🔥❤️)");

    if (!emoji) return;

    function placeEmoji(e) {
        const rect = bigCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        bigCtx.font = `${currentEmojiSize}px Arial`;
        bigCtx.fillText(emoji, x, y);

        bigCanvas.removeEventListener('click', placeEmoji);
    }

    bigCanvas.addEventListener('click', placeEmoji);
});
document.getElementById('closeDrawing').addEventListener('click', () => {
    modal.classList.add('hidden');

    // copier le grand vers le petit
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bigCanvas, 0, 0, canvas.width, canvas.height);
});


brushSizeInput.addEventListener('input', (e) => {
    bigCtx.lineWidth = e.target.value;
});


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


async function addSuggestion(name, category) {
    if (!name.trim() || !category) {
        alert("Please enter a name and choose a category for the suggestion.");
        return;
    }

    // 1. Vérifier si existe déjà (comme avant)
    const { data: existing, error: checkError } = await supabaseClient
        .from('suggestions')
        .select('*')
        .eq('name', name.trim())
        .eq('category', category)
        .eq('list_id', currentListId);

    if (checkError) {
        console.error(checkError);
        return;
    }

    if (existing.length > 0) {
        alert(`"${name.trim()}" already exists in "${category}"`);
        return;
    }

    // 2. Canvas → image
    const dataURL = canvas.toDataURL("image/webp", 0.7);

    let imageUrl = null;

    if (dataURL !== "data:,") {
        const blob = await (await fetch(dataURL)).blob();
        const fileName = `suggestion_${Date.now()}.webp`;

        const { error: uploadError } = await supabaseClient.storage
            .from('suggestion-images')
            .upload(fileName, blob);

        if (uploadError) {
            console.error(uploadError);
            return;
        }

        const { data } = supabaseClient.storage
            .from('suggestion-images')
            .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
    }

    // 3. Insert (comme ton ancien push)
    const { error: insertError } = await supabaseClient
        .from('suggestions')
        .insert([{
            name: name.trim(),
            category: category,
            image_url: imageUrl,
            list_id: currentListId
        }]);

    if (insertError) {
        console.error(insertError);
        return;
    }

    // reset
    newSuggestionInput.value = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    loadSuggestions();
}

async function deleteSuggestion(suggestionId) {

    // 1. récupérer image
    const { data } = await supabaseClient
        .from('suggestions')
        .select('image_url')
        .eq('id', suggestionId)
        .single();

    // 2. supprimer image storage
    if (data?.image_url) {
        const fileName = data.image_url.split('/').pop();

        await supabaseClient.storage
            .from('suggestion-images')
            .remove([fileName]);
    }

    // 3. supprimer DB (équivalent filter)
    const { error } = await supabaseClient
        .from('suggestions')
        .delete()
        .eq('id', suggestionId);

    if (error) {
        console.error(error);
        return;
    }

    loadSuggestions();
}

async function loadSuggestions() {
    const list = document.getElementById('suggestionList');
    const container = document.getElementById('suggestions');

    list.innerHTML = '';

    // delete mode visuel (inchangé)
    if (isDeleteMode) {
        container.classList.add('delete-mode-active');
    } else {
        container.classList.remove('delete-mode-active');
    }

    // récupérer depuis Supabase (remplace localStorage)
    const { data: suggestions, error } = await supabaseClient
        .from('suggestions')
        .select('*')
        .eq('list_id', currentListId);

    if (error) {
        console.error(error);
        return;
    }

    // filtrage (inchangé)
    const selectedCategory = suggestionCategoryFilter.value;

    let filteredSuggestions = selectedCategory === 'all'
        ? suggestions
        : suggestions.filter(sug => sug.category === selectedCategory);

    filteredSuggestions.forEach(sug => {
        const li = document.createElement('li');

        // 👉 IMAGE (nouveau)
        if (sug.image_url) {
            li.style.backgroundImage = `url("${sug.image_url}")`;
            li.style.backgroundSize = 'cover';
            li.style.backgroundPosition = 'center';
            li.style.backgroundRepeat = 'no-repeat';
        } else {
            li.style.backgroundColor = '#f0f0f0';
        }

        li.innerHTML = `<span class="name">${sug.name}</span>`;

        li.onclick = () => {
            if (isDeleteMode) {
                deleteSuggestion(sug.id);
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