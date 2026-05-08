const registerBox = document.getElementById("registerBox");
const registerName = document.getElementById("registerName");
const startChatBtn = document.getElementById("startChatBtn");

const chatArea = document.getElementById("chatArea");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

let currentUser = localStorage.getItem("chatUserName");
let conversationId = localStorage.getItem("conversationId");
let renderedMessages = [];

async function startChat() {
  const name = registerName.value.trim();

  if (!name) {
    alert("Please enter your name.");
    return;
  }

  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const conversation = await res.json();

  currentUser = name;
  conversationId = conversation._id;

  localStorage.setItem("chatUserName", currentUser);
  localStorage.setItem("conversationId", conversationId);

  showChat();
  loadMessages();
}

function showChat() {
  registerBox.classList.add("hidden");
  chatArea.classList.remove("hidden");
}

async function loadMessages() {
  if (!conversationId) return;

  const res = await fetch(`/api/messages/${conversationId}`);
  const messages = await res.json();

  if (JSON.stringify(messages) === JSON.stringify(renderedMessages)) {
    return;
  }

  renderedMessages = messages;
  chatMessages.innerHTML = "";

  messages.forEach((message) => {
    const div = document.createElement("div");

    div.className =
      message.sender === "admin"
        ? "message admin-message"
        : "message user-message";

    div.innerHTML = `
      <div class="message-name">${message.name}</div>
      <div>${message.message}</div>
    `;

    chatMessages.appendChild(div);
  });

  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: "smooth",
  });
}

startChatBtn.addEventListener("click", startChat);

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = chatInput.value.trim();

  if (!message) return;

  await fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      name: currentUser,
      message,
      sender: "customer",
    }),
  });

  chatInput.value = "";
  loadMessages();
});

if (currentUser) {
  registerName.value = currentUser;

  if (!conversationId) {
    startChat();
  } else {
    showChat();
    loadMessages();
  }
}

setInterval(loadMessages, 1000);
