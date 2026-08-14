// js/ai-assistant.js

// chat UI handlers
const chatMessagesEl = document.getElementById('chat-messages');
const chatInputEl    = document.getElementById('chat-in');
const chatSendBtn    = document.getElementById('chat-send');

// utility to add message bubbles
function appendMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('msg', sender);
  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = (sender === 'user') ? '👤' : '🛡️';
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.textContent = text;
  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  chatMessagesEl.appendChild(msgDiv);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// simulate typing indicator
function setTyping(on) {
  if(on) {
    const typingEl = document.createElement('div');
    typingEl.classList.add('msg','assistant','typing');
    typingEl.id = 'typing-indicator';
    typingEl.innerHTML = '<div class="avatar">🛡️</div><div class="bubble">Typing…</div>';
    chatMessagesEl.appendChild(typingEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  } else {
    const el = document.getElementById('typing-indicator');
    if(el) el.remove();
  }
}

// stub API call — replace this with real fetch to backend/API
async function queryAssistant(prompt) {
  // placeholder delay
  return new Promise(resolve => {
    setTimeout(() => {
      resolve("This is a simulated response for: \"" + prompt + "\"");
    }, 1200);
  });
}

// send handler
async function sendPrompt() {
  const text = chatInputEl.value.trim();
  if(!text) return;
  chatInputEl.value = '';
  appendMessage('user', text);
  setTyping(true);
  try {
    const resp = await queryAssistant(text);
    setTyping(false);
    appendMessage('assistant', resp);
  } catch(err) {
    setTyping(false);
    appendMessage('assistant', 'Error: failed to get response.');
    console.error(err);
  }
}

chatSendBtn.addEventListener('click', sendPrompt);
chatInputEl.addEventListener('keydown', e => {
  if(e.key === 'Enter') sendPrompt();
});
