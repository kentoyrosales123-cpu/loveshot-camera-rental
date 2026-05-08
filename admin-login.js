const form = document.getElementById("adminLoginForm");
const passwordInput = document.getElementById("adminPassword");
const loginError = document.getElementById("loginError");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password: passwordInput.value,
    }),
  });

  const data = await res.json();

  if (data.success) {
    localStorage.setItem("adminLoggedIn", "true");
    window.location.href = "admin.html";
  } else {
    loginError.textContent = "Incorrect admin password.";
    passwordInput.value = "";
  }
});
