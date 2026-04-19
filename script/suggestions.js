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
const colorPicker = document.getElementById('colorPicker');
let brushSize = 6;
let eraserSize = 6;

// Paramètres du trait
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.strokeStyle = '#333';
let drawingBig = false;
bigCtx.lineCap = 'round';
bigCtx.lineWidth = brushSize;
bigCtx.lineCap = 'round';
bigCtx.lineJoin = 'round'; // 🔥 évite les effets pointillés
// OUVRIR
const sizeSlider = document.getElementById('sizeSlider');

let isErasing = false;
const eraserBtn = document.getElementById('eraserBtn');
const eraserSizeInput = document.getElementById('eraserSize');
const textLayer = document.getElementById('textLayer');
let mode = "draw"; // "draw" | "text"
let selectedBox = null;
document.getElementById('textModeBtn').addEventListener('click', () => {
    mode = (mode === "text") ? "draw" : "text";
    
    // Feedback visuel pour savoir qu'on a changé de mode
    const btn = document.getElementById('textModeBtn');
    btn.style.background = (mode === "text") ? "#ff4d4d" : "";
    
    if(mode === "text") {
        alert("Cliquez n'importe où sur le dessin pour ajouter du texte");
    }
});
sizeSlider.addEventListener('input', (e) => {
    brushSize = e.target.value;

    if (isErasing) {
        bigCtx.lineWidth = brushSize;
    } else {
        bigCtx.lineWidth = brushSize;
    }
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
colorPicker.addEventListener('input', (e) => {
    isErasing = false;
    bigCtx.globalCompositeOperation = 'source-over';
    bigCtx.strokeStyle = e.target.value;
});
bigCanvas.addEventListener('pointerdown', (e) => {
    if (mode !== "text") return;

    const box = document.createElement('div');

    box.contentEditable = true;
    box.innerText = "Aa";

    box.style.position = "absolute";
    box.style.left = e.offsetX + "px";
    box.style.top = e.offsetY + "px";
    box.style.fontSize = "24px";
    box.style.background = "rgba(255,255,255,0.5)";
    box.style.padding = "4px";
    box.style.border = "1px dashed #aaa";
    box.style.pointerEvents = "auto";

    document.getElementById('textLayer').appendChild(box);

    enableDrag(box);
});
bigCanvas.addEventListener('pointerdown', (e) => {
    if (mode !== "draw") return;

    drawingBig = true;

    const rect = bigCanvas.getBoundingClientRect();

    bigCtx.beginPath();
    bigCtx.moveTo(
        e.clientX - rect.left,
        e.clientY - rect.top
    );
});
bigCanvas.addEventListener('pointermove', (e) => {
    if (!drawingBig || mode !== "draw") return;

    const rect = bigCanvas.getBoundingClientRect();

    bigCtx.lineTo(
        e.clientX - rect.left,
        e.clientY - rect.top
    );

    bigCtx.stroke();
});
bigCanvas.addEventListener('pointerup', () => {
    drawingBig = false;
    bigCtx.beginPath();
});
function enableDrag(el) {
    let offsetX, offsetY;

    el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();

        selectedBox = el;

        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;

        function move(e) {
            el.style.left = (e.clientX - offsetX) + "px";
            el.style.top = (e.clientY - offsetY) + "px";
        }

        document.addEventListener('pointermove', move);

        document.addEventListener('pointerup', () => {
            document.removeEventListener('pointermove', move);
        }, { once: true });
    });

    // suppression rapide
    el.addEventListener('dblclick', () => el.remove());
}


eraserBtn.addEventListener('click', () => {
    isErasing = !isErasing;

    bigCtx.globalCompositeOperation = isErasing
        ? 'destination-out'
        : 'source-over';

    bigCtx.lineWidth = brushSize; // 👈 même valeur
});

eraserSizeInput.addEventListener('input', (e) => {
    eraserSize = e.target.value;
    if (isErasing) bigCtx.lineWidth = eraserSize;
});
document.getElementById('colorPicker').addEventListener('change', (e) => {
    bigCtx.strokeStyle = e.target.value;
});
document.addEventListener('keydown', (e) => {
    if (e.key === "Delete") {
        document.querySelectorAll('#textLayer div').forEach(el => {
            if (el.style.outline === "2px solid red") {
                el.remove();
            }
        });
    }
});
document.getElementById('closeDrawing').addEventListener('click', () => {
    // 1. Avant de fermer, on dessine le texte du textLayer SUR le bigCanvas
    const boxes = document.querySelectorAll('#textLayer div');
    const canvasRect = bigCanvas.getBoundingClientRect();

    boxes.forEach(el => {
        const elRect = el.getBoundingClientRect();
        
        // Calcul de la position relative au canvas
        const x = elRect.left - canvasRect.left;
        const y = elRect.top - canvasRect.top;

        // On applique le style au contexte du grand canvas
        bigCtx.fillStyle = colorPicker.value;
        bigCtx.font = window.getComputedStyle(el).font; // Récupère la taille et police exacte
        bigCtx.textBaseline = 'top';
        bigCtx.fillText(el.innerText, x, y);
        
        el.remove(); // On nettoie pour la prochaine fois
    });

    // 2. Transférer le grand dessin sur le petit canvas de l'aperçu
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bigCanvas, 0, 0, canvas.width, canvas.height);

    // 3. Fermer la modale
    modal.classList.add('hidden');
    isErasing = false;
    bigCtx.globalCompositeOperation = 'source-over';
});

document.getElementById('closeDrawing').addEventListener('click', () => {
    modal.classList.add('hidden');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bigCanvas, 0, 0, canvas.width, canvas.height);

    isErasing = false;
    bigCtx.globalCompositeOperation = 'source-over';
});


brushSizeInput.addEventListener('input', (e) => {
    brushSize = e.target.value;
    if (!isErasing) bigCtx.lineWidth = brushSize;
});
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
});

canvas.addEventListener('mousemove', (e) => {
    e.preventDefault();
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
});

canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    openDrawingModal();
});
// Support Tactile

function enableDrag(el) {
    let offsetX, offsetY;

    el.addEventListener('mousedown', (e) => {
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;

        function move(e) {
            el.style.left = (e.clientX - offsetX) + "px";
            el.style.top = (e.clientY - offsetY) + "px";
        }

        document.addEventListener('mousemove', move);

        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', move);
        }, { once: true });
    });
}
function enableResize(el) {
    let scale = 1;

    el.addEventListener('wheel', (e) => {
        e.preventDefault();

        scale += e.deltaY * -0.001;
        scale = Math.min(Math.max(0.5, scale), 5);

        el.style.transform = `scale(${scale})`;
    });
}
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

function openDrawingModal() {
    modal.classList.remove('hidden');

    bigCanvas.width = window.innerWidth * 0.9;
    bigCanvas.height = window.innerHeight * 0.8;

    bigCtx.lineWidth = 6;
    bigCtx.lineCap = 'round';
    bigCtx.lineJoin = 'round';
    bigCtx.strokeStyle = "#333";

    bigCtx.drawImage(canvas, 0, 0, bigCanvas.width, bigCanvas.height);
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