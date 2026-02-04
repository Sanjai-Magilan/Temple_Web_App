// User dropdown logic
const navUser = document.getElementById("navUser");

navUser.addEventListener("click", (e) => {
  e.stopPropagation();
  navUser.classList.toggle("open");
});

document.addEventListener("click", () => {
  navUser.classList.remove("open");
});

// Active nav link logic
const links = document.querySelectorAll(".nav-links a");
const path = window.location.pathname;

links.forEach(link => {
  const href = link.getAttribute("href");

  // Exact match or sub-route match
  if (path === href || path.startsWith(href + "/")) {
    link.classList.add("active");
  }
});

