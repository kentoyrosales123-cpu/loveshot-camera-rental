if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

const reservationTable = document.getElementById("reservationTable");

async function loadReservations() {
  const res = await fetch("/api/reservations");
  const reservations = await res.json();

  displayReservations(reservations);
  updateStats(reservations);
}

function displayReservations(reservations) {
  reservationTable.innerHTML = "";

  if (reservations.length === 0) {
    reservationTable.innerHTML = `
      <tr>
        <td colspan="8">No reservations yet.</td>
      </tr>
    `;
    return;
  }

  reservations.forEach((reservation) => {
    const row = document.createElement("tr");

    row.innerHTML = `
  <td>${reservation.name}</td>
  <td>${reservation.camera}</td>
  <td>${reservation.days}</td>
  <td>₱${reservation.total}</td>
  <td>${reservation.gcashReference || "No reference"}</td>
  <td>${reservation.paymentStatus}</td>
  <td>${reservation.status}</td>
  <td>
    <button class="confirm-btn" onclick="confirmPayment('${reservation._id}')">
      Confirm Payment
    </button>

    <button class="approve-btn" onclick="updateStatus('${reservation._id}', 'approved')">
      Approve
    </button>

    <button class="reject-btn" onclick="updateStatus('${reservation._id}', 'rejected')">
      Reject
    </button>
  </td>
`;

    reservationTable.appendChild(row);
  });
}

function updateStats(reservations) {
  document.getElementById("totalReservations").textContent =
    reservations.length;

  document.getElementById("pendingPayments").textContent = reservations.filter(
    (item) => item.paymentStatus !== "confirmed",
  ).length;

  document.getElementById("approvedRentals").textContent = reservations.filter(
    (item) => item.status === "approved",
  ).length;

  const revenue = reservations
    .filter((item) => item.paymentStatus === "confirmed")
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  document.getElementById("totalRevenue").textContent = `₱${revenue}`;
}

async function confirmPayment(id) {
  await fetch(`/api/reservations/${id}/payment`, {
    method: "PATCH",
  });

  loadReservations();
}

async function updateStatus(id, status) {
  await fetch(`/api/reservations/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  loadReservations();
}

function logoutAdmin() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "admin-login.html";
}

const conversationList = document.getElementById("conversationList");
const adminMessages = document.getElementById("adminMessages");

let selectedConversationId = null;
let selectedConversationName = null;
let renderedAdminMessages = [];

async function loadConversations() {
  const res = await fetch("/api/conversations");
  const conversations = await res.json();

  conversationList.innerHTML = "";

  conversations.forEach((conversation) => {
    const button = document.createElement("button");

    button.className =
      conversation._id === selectedConversationId
        ? "conversation-btn active"
        : "conversation-btn";

    button.innerHTML = `
      <strong>${conversation.name}</strong>
      <small>Customer chat</small>
    `;

    button.onclick = () => {
      selectedConversationId = conversation._id;
      selectedConversationName = conversation.name;
      renderedAdminMessages = [];
      loadAdminMessages();
      loadConversations();
    };

    conversationList.appendChild(button);
  });
}

async function loadAdminMessages() {
  if (!selectedConversationId) {
    adminMessages.innerHTML = `<p class="empty-message">Select a customer chat.</p>`;
    return;
  }

  const res = await fetch(`/api/messages/${selectedConversationId}`);
  const messages = await res.json();

  if (JSON.stringify(messages) === JSON.stringify(renderedAdminMessages)) {
    return;
  }

  renderedAdminMessages = messages;
  adminMessages.innerHTML = "";

  messages.forEach((message) => {
    const div = document.createElement("div");

    div.className =
      message.sender === "admin"
        ? "admin-message-bubble admin-reply"
        : "admin-message-bubble user-reply";

    div.innerHTML = `
      <strong>${message.name}</strong>
      <p>${message.message}</p>
      <small>${message.sender}</small>
    `;

    adminMessages.appendChild(div);
  });

  adminMessages.scrollTop = adminMessages.scrollHeight;
}

async function sendAdminReply() {
  const input = document.getElementById("adminReplyInput");

  if (!selectedConversationId) {
    alert("Please select a customer chat first.");
    return;
  }

  if (!input.value.trim()) return;

  await fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId: selectedConversationId,
      name: "LoveShot Admin",
      message: input.value,
      sender: "admin",
    }),
  });

  input.value = "";
  loadAdminMessages();
}

loadReservations();
loadConversations();
loadAdminMessages();

setInterval(() => {
  loadConversations();
  loadAdminMessages();
}, 1000);
