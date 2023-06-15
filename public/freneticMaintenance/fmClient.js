const socket = io();

// get references to various elements in the HTML file
const Names_list = document.getElementById("players_names_list");

// ==============================
// ========== PASSWORD ==========
// ==============================

// when asked for a password by the server, prompt the user and emit the password to the server
socket.on("ask password", (count) => {
    var psw = prompt(`Give a password, You got ${count} attempts`);
    socket.emit("sent password", psw);
});

socket.on("password incorrect", (psw, count) => {
    var psw = prompt(`Wrong password, ${count} attempts left`);
    socket.emit("sent password", psw);
});

socket.on("cest ciao", () => {
    window.location.href = "/deconnexion";
});

// =============================
// ========== UPDATES ==========
// =============================

// uptdate the names in the list in the HTML file
// ask if the name is an admin
socket.on("update players", (names) => {
    Names_list.innerHTML = "";
    for (var id in names) {

        if (names[id] !== "admin") {
            const li = document.createElement("li");
            li.setAttribute("name", "player_name");
            Names_list.appendChild(li);
            li.appendChild(document.createTextNode(names[id]));
        }
        socket.emit("ask is admin")
    }
});