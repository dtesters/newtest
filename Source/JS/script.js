let $ = document
function _ID(id) {
    return $.getElementById(id)
}
function _Query(query){
    return $.querySelector(query)
}

// --- Notification System ---
const notificationContainer = _ID('notification-container');
function showNotification(message, type = 'error', duration = 10000) {
    if (!notificationContainer) { console.error("Notification container not found!"); return; }
    const notifId = `notif-${Date.now()}`;
    const notificationPopup = document.createElement('div');
    notificationPopup.classList.add('notification-popup', type);
    notificationPopup.id = notifId;
    const messageSpan = document.createElement('span');
    messageSpan.classList.add('message-content');
    messageSpan.innerText = message;
    notificationPopup.appendChild(messageSpan);
    const closeButton = document.createElement('button');
    closeButton.classList.add('close-btn');
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.onclick = () => {
        notificationPopup.classList.remove('show');
        notificationPopup.classList.add('hide');
        setTimeout(() => { if (notificationPopup.parentNode) notificationPopup.remove(); }, 400);
    };
    notificationPopup.appendChild(closeButton);
    notificationContainer.appendChild(notificationPopup);
    void notificationPopup.offsetWidth; 
    notificationPopup.classList.add('show');
    const timeoutId = setTimeout(() => { if (document.getElementById(notifId)) closeButton.onclick(); }, duration);
    notificationPopup.dataset.timeoutId = timeoutId;
}

// --- Elements ---
let nameElem = _ID('name');
let tagElem = _ID('tag');
let avatarElem = _ID('avatar');
let statusIconElem = _ID('status-icon-img');
let customStatusBubbleElem = _ID('custom-status-text');
let myStatusElem = _ID('my-status-text');
let activityStatusElem = _ID('activity-status-text'); // This is the one on the card
let serverNameElem = _ID('server-name');
let serverIconElem = _ID('server-img');
let serverMembersElem = _ID('server-members');
let serverOnlineMembersElem = _ID('server-online-members');

const infoPanelTrigger = _ID('info-panel-trigger');
const slideInfoPanel = _ID('slide-info-panel');
const joinedDateTextElem = _ID('joined-date-text');
const externalActivityListElem = _ID('activity-list'); // For the new external bubble

// --- API ---
const yourDiscordUserID = '591534252307513347';
const apiUrlUser = `https://40.233.67.186:3009/v1/api/user/${yourDiscordUserID}`; 
const apiUrlServer = 'https://canary.discord.com/api/v10/invites/kHQjhXnxkM?with_counts=true';

if (myStatusElem) myStatusElem.innerText = ""; 
if (activityStatusElem) activityStatusElem.innerText = ""; 
if (customStatusBubbleElem) customStatusBubbleElem.style.display = 'none';
if (joinedDateTextElem) joinedDateTextElem.innerText = "Joined Discord: N/A";
if (externalActivityListElem) externalActivityListElem.innerHTML = "<li>Loading activities...</li>";


fetch (apiUrlUser)
    .then(response => {
        if (!response.ok) throw new Error(`User API: ${response.status} ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        // console.log('User Data from your API:', data); 

        nameElem.innerText = data.username || 'User';
        tagElem.innerText = data.username ? `@${data.username}` : '@username';
        if (data.avatar_url) { 
            avatarElem.setAttribute('src', data.avatar_url);
        } else {
            avatarElem.setAttribute('src', 'Source/IMG/default-avatar.png');
        }

        if (data.created_at && joinedDateTextElem) { 
            try {
                const accountCreationDate = new Date(data.created_at);
                joinedDateTextElem.innerText = `Joined Discord: ${accountCreationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
            } catch (e) {
                joinedDateTextElem.innerText = "Joined Discord: Error parsing date";
                 console.error("Error parsing user created_at date:", e);
            }
        } else if (joinedDateTextElem) {
            joinedDateTextElem.innerText = "Joined Discord: N/A";
        }

        let currentDiscordStatus = data.status || "offline"; 
        const validStatuses = ["online", "idle", "dnd", "offline"]; // "unknown" will be treated as offline
        let statusForIcon = currentDiscordStatus.toLowerCase();
        if (!validStatuses.includes(statusForIcon)) {
            statusForIcon = "offline"; 
        }
        // Assuming your status images are named online.png, idle.png, dnd.png, offline.png
        if (statusIconElem) {
            statusIconElem.setAttribute('src', `Source/IMG/${statusForIcon}.png`); 
            statusIconElem.setAttribute('alt', currentDiscordStatus);
        }
        
        if (myStatusElem) {
            myStatusElem.innerText = `${currentDiscordStatus.charAt(0).toUpperCase() + currentDiscordStatus.slice(1)}`;
        }

        let mainActivityTextForCard = ""; 
        let customStatusTextForPFPBubble = ""; 
        let allActivitiesForExternalBubble = [];

        if (data.activities && data.activities.length > 0) {
            const customActivity = data.activities.find(act => act.type === "Custom" && (act.state || act.name) );
            if (customActivity) {
                customStatusTextForPFPBubble = `${customActivity.emoji ? customActivity.emoji.name + ' ' : ''}${customActivity.state || customActivity.name}`;
            }

            data.activities.forEach(act => {
                let activityDisplayHtml;
                if (act.type === "Custom") {
                    const emojiName = act.emoji && act.emoji.name ? act.emoji.name + ' ' : '';
                    const stateText = act.state || ''; 
                    // For the external list, show Type: Emoji + State for custom status
                    activityDisplayHtml = `<strong>${act.type}:</strong> ${emojiName}${stateText}`;
                    if (!stateText && !emojiName && act.name) { // Fallback if state and emoji are empty, use name
                         activityDisplayHtml = `<strong>${act.type}:</strong> ${act.name}`;
                    } else if (!stateText && !emojiName && !act.name) { // Completely empty custom status
                        activityDisplayHtml = `<strong>${act.type}:</strong> (empty)`;
                    }
                } else {
                    // For other activities like Playing, Listening, Streaming
                    let baseString = `<strong>${act.type}:</strong> ${act.name || ''}`;
                    if (act.details) baseString += ` <span class="activity-details">(${act.details})</span>`;
                    if (act.state) baseString += ` <span class="activity-details">- ${act.state}</span>`;
                    activityDisplayHtml = baseString;
                }
                allActivitiesForExternalBubble.push(`<li>${activityDisplayHtml}</li>`);

                // Determine main activity for the card (prioritize non-custom)
                if (!mainActivityTextForCard && act.type !== "Custom") {
                    mainActivityTextForCard = `${act.type}: ${act.name}`;
                }
            });
            
            if (!mainActivityTextForCard && customActivity) {
                mainActivityTextForCard = customActivity.name; // For the card, usually "Custom Status" is enough if it's the main one
            }
        }
        
        if (customStatusBubbleElem) {
            if (customStatusTextForPFPBubble) {
                customStatusBubbleElem.innerText = customStatusTextForPFPBubble;
                customStatusBubbleElem.style.display = 'inline-block';
            } else {
                 customStatusBubbleElem.style.display = 'none';
            }
        }
        if (activityStatusElem) { 
            activityStatusElem.innerText = mainActivityTextForCard;
        }
        
        if (externalActivityListElem) {
            if (allActivitiesForExternalBubble.length > 0) {
                externalActivityListElem.innerHTML = allActivitiesForExternalBubble.join('');
            } else {
                externalActivityListElem.innerHTML = "<li>No current activities.</li>";
            }
        }
        
        if (!mainActivityTextForCard && myStatusElem && currentDiscordStatus.toLowerCase() !== "offline" && currentDiscordStatus.toLowerCase() !== "unknown") {
             if (myStatusElem.innerText.toLowerCase() === currentDiscordStatus.toLowerCase() || myStatusElem.innerText === "Online") {
             } else if (currentDiscordStatus === "online" && !myStatusElem.innerText.trim()) { 
                 myStatusElem.innerText = "Online";
             }
        } else if (!mainActivityTextForCard && !myStatusElem.innerText.trim() && currentDiscordStatus.toLowerCase() !== "offline" && currentDiscordStatus.toLowerCase() !== "unknown") {
            myStatusElem.innerText = "Online";
        }
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        showNotification(`Profile Error: ${error.message}`, 'error');
        nameElem.innerText = 'MilitaryLotus'; 
        tagElem.innerText = '@dtester';
        if (myStatusElem) myStatusElem.innerText = ""; 
        if (activityStatusElem) activityStatusElem.innerText = ""; 
        if (customStatusBubbleElem) customStatusBubbleElem.style.display = 'none';
        // Ensure this path matches your actual offline status image, e.g., 'Source/IMG/offline.png'
        if (statusIconElem) statusIconElem.setAttribute('src', 'Source/IMG/offline.png'); 
        if (joinedDateTextElem) joinedDateTextElem.innerText = "Joined Discord: Error";
        if (externalActivityListElem) externalActivityListElem.innerHTML = "<li>Could not load activities.</li>";
    });

fetch (apiUrlServer)
    .then(response => {
        if (!response.ok) throw new Error(`Server API: ${response.status} ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        if (data.guild) {
            serverNameElem.innerText = data.guild.name || 'GamersWorld';
            if (data.guild.icon) {
                serverIconElem.setAttribute('src', `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.webp?size=96`);
            } else {
                serverIconElem.setAttribute('src', 'Source/IMG/default-server-icon.png');
            }
            serverMembersElem.innerText = `${data.approximate_member_count || 0} Members`;
            serverOnlineMembersElem.innerText = `${data.approximate_presence_count || 0} Online`;
        } else {
            throw new Error("Server data structure invalid.");
        }
    })
    .catch(error => {
        console.error('Error fetching server data:', error);
        showNotification(`Server Info Error: ${error.message}`, 'error');
        serverNameElem.innerText = 'GamersWorld';
        serverMembersElem.innerText = '-- Members';
        serverOnlineMembersElem.innerText = '-- Online';
    });

// Pages Menu
let pageMenu = $.querySelectorAll('.page');
let btnMenu = $.querySelectorAll('.btn-menu');
btnMenu.forEach(btn=> {
    btn.addEventListener('click', e=>{
        btnMenu.forEach(b => b.classList.remove('active-menu-item'));
        btn.classList.add('active-menu-item');
        pageMenu.forEach(page=>{
            if(btn.id === page.getAttribute('page')){
                page.style.display = 'flex';
            } else {
                page.style.display = 'none';
            }
        })
    })
});
const initialActiveMenuTab = _ID('myServer');
if (initialActiveMenuTab) { 
    initialActiveMenuTab.classList.add('active-menu-item');
} else { 
    if (btnMenu.length > 0) btnMenu[0].classList.add('active-menu-item');
}

// Loader
let loader = $.querySelector('.page_loader');
let pageContainer = $.querySelector('.container'); 
window.addEventListener('load', e =>{
    if (loader) loader.style.display = 'none';
    if (pageContainer) pageContainer.style.display = 'block'; 
});

// Text Animate for "Hello..."
let texts = $.querySelector('.hello-animate');
let animateHello = false;
if (texts) { 
    setInterval(e=>{
        if(!animateHello){
            texts.classList.add('enableText');
            texts.classList.remove('disableText');
            animateHello = true;
        } else {
            texts.classList.add('disableText');
            texts.classList.remove('enableText');
            animateHello = false;
        }
    }, 3000);
}

// Slide Panel Toggle
if (infoPanelTrigger && slideInfoPanel) {
    const arrowIndicator = infoPanelTrigger.querySelector('.arrow-indicator');
    infoPanelTrigger.addEventListener('click', () => {
        slideInfoPanel.classList.toggle('open');
        if (arrowIndicator) { 
            infoPanelTrigger.classList.toggle('open'); 
        }
    });
}
