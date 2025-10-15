const textarea = document.getElementById("secret");
const button = document.querySelector('button[type="submit"]');

button.disabled = true;

textarea.addEventListener("input", () => {
  button.disabled = textarea.value.trim() === "";
});

const passInput = document.getElementById("passphrase");
const toggleBtn = document.getElementById("togglePassphrase");
const eyeIcon = document.getElementById("eyeIcon");

toggleBtn.addEventListener("click", () => {
  passInput.type = passInput.type === "password" ? "text" : "password";
  eyeIcon.classList.toggle("fa-eye");
  eyeIcon.classList.toggle("fa-eye-slash");
});
