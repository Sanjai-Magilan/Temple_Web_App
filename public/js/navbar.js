
    const navUser = document.getElementById("navUser");

    navUser.addEventListener("click", (e) => {
        e.stopPropagation();
        navUser.classList.toggle("open");
    });

    document.addEventListener("click", () => {
        navUser.classList.remove("open");
    });
