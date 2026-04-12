const notificationBell = document.getElementById('notificationBell');
const notificationModal = document.getElementById('notificationModal');
const closeNotificationModalBtn = document.getElementById('closeNotificationModalBtn');
const notificationMessageInput = document.getElementById('notificationMessageInput');
const sendNotificationBtn = document.getElementById('sendNotificationBtn');
const saveMessageBtn = document.getElementById('saveMessageBtn');
const savedMessagesList = document.getElementById('savedMessagesList');
const emptySavedMessages = document.getElementById('emptySavedMessages');


async function sendPushNotification(message) {
    if (!currentListId) {
        alert("Please load or create a list first before sending notifications.");
        return;
    }
    if (!message || message.trim() === '') {
        alert("Please enter a message to send.");
        return;
    }

    try {
        console.log(`Attempting to send push notification for list: ${currentListId}, message: "${message}"`);
        const { data, error } = await supabaseClient.functions.invoke('send-push-notification', {
            body: {
                listId: currentListId,
                message: message // Now sending a generic message
            }
        });

        if (error) {
            console.error("Error invoking send-push-notification Edge Function:", error);
            if (error.message.includes('No subscriptions found for list')) {
                alert(`Notification sent to list ${currentShareCode} (no push subscriptions found).`);
            } else {
                alert("Failed to send push notification: " + error.message);
            }
        } else {
            console.log("Push notification Edge Function invoked successfully:", data);
            alert("Notification sent successfully!");
            closeNotificationModal(); // Close modal on success
            notificationMessageInput.value = ''; // Clear message input
        }
    } catch (error) {
        console.error("Unexpected error calling send-push-notification:", error);
        alert("An unexpected error occurred while sending notification: " + error.message);
    }
}

function openNotificationModal() {
    if (!currentListId) {
        alert("Please load or create a list first to send notifications.");
        showSection('settings');
        return;
    }
    notificationModal.classList.add('visible');
    notificationMessageInput.value = ''; // Clear input when opening
    renderSavedMessages(); // Load saved messages
}

function closeNotificationModal() {
    notificationModal.classList.remove('visible');
}

// Saved Messages management (Local Storage)
function getSavedMessages() {
    return JSON.parse(localStorage.getItem('saved_notification_messages')) || [];
}

function saveSavedMessages(messages) {
    localStorage.setItem('saved_notification_messages', JSON.stringify(messages));
}

function addSavedMessage(message) {
    if (!message || message.trim() === '') {
        alert('Cannot save an empty message.');
        return;
    }
    let messages = getSavedMessages();
    // Check for duplicates
    if (messages.some(m => m.text.trim() === message.trim())) {
        alert('This message is already saved!');
        return;
    }
    messages.push({ id: Date.now(), text: message.trim() });
    saveSavedMessages(messages);
    renderSavedMessages();
    alert('Message saved!');
}

function deleteSavedMessage(id) {
    if (!confirm('Are you sure you want to delete this saved message?')) {
        return;
    }
    let messages = getSavedMessages();
    messages = messages.filter(m => m.id !== id);
    saveSavedMessages(messages);
    renderSavedMessages();
}

function renderSavedMessages() {
    const messages = getSavedMessages();
    savedMessagesList.innerHTML = '';
    if (messages.length === 0) {
        emptySavedMessages.style.display = 'block';
    } else {
        emptySavedMessages.style.display = 'none';
    }

    messages.forEach(msg => {
        const li = document.createElement('li');
        li.dataset.id = msg.id;
        li.innerHTML = `
            <span class="message-text">${msg.text}</span>
            <div class="message-actions">
                <button class="remove-btn" data-id="${msg.id}"><i class="fas fa-times"></i></button>
            </div>
        `;
        li.querySelector('.message-text').addEventListener('click', () => {
            notificationMessageInput.value = msg.text; // Populate input with saved message
        });
        li.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent li click
            deleteSavedMessage(msg.id);
        });
        savedMessagesList.appendChild(li);
    });
}

notificationBell.addEventListener('click', openNotificationModal);
closeNotificationModalBtn.addEventListener('click', closeNotificationModal);
// Close modal if clicking outside content
notificationModal.addEventListener('click', (e) => {
    if (e.target === notificationModal) {
        closeNotificationModal();
    }
});
sendNotificationBtn.addEventListener('click', () => {
    sendPushNotification(notificationMessageInput.value);
});
saveMessageBtn.addEventListener('click', () => {
    addSavedMessage(notificationMessageInput.value);
});