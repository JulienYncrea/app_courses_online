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
    if (!name.trim() || !category) return;

    // 1. canvas → blob
    const dataURL = canvas.toDataURL("image/webp", 0.7);

    if (dataURL === "data:,") {
        alert("Draw something");
        return;
    }

    const blob = await (await fetch(dataURL)).blob();

    // 2. upload image
    const fileName = `suggestion_${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
        .from('suggestion-images')
        .upload(fileName, blob);

    if (uploadError) {
        console.error(uploadError);
        return;
    }

    // 3. get public URL
    const { data } = supabase.storage
        .from('suggestion-images')
        .getPublicUrl(fileName);

    const imageUrl = data.publicUrl;

    // 4. insert DB
    const { error: insertError } = await supabase
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    newSuggestionInput.value = '';

    loadSuggestions();
}

async function deleteSuggestion(id) {

    // récupérer image
    const { data } = await supabase
        .from('suggestions')
        .select('image_url')
        .eq('id', id)
        .single();

    if (data?.image_url) {
        const fileName = data.image_url.split('/').pop();

        await supabase.storage
            .from('suggestion-images')
            .remove([fileName]);
    }

    // delete DB
    await supabase
        .from('suggestions')
        .delete()
        .eq('id', id);

    loadSuggestions();
}

async function loadSuggestions() {
    const list = document.getElementById('suggestionList');
    list.innerHTML = '';

    const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('list_id', currentListId);

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(sug => {
        const li = document.createElement('li');

        if (sug.image_url) {
            li.style.backgroundImage = `url("${sug.image_url}")`;
            li.style.backgroundSize = 'cover';
            li.style.backgroundPosition = 'center';
        } else {
            li.style.backgroundColor = '#f0f0f0';
        }

        li.innerHTML = `<span class="name">${sug.name}</span>`;

        li.onclick = () => {
            if (isDeleteMode) {
                deleteSuggestion(sug.id);
            } else {
                addItem(sug.name, 1, sug.category, currentListId);
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