const socket = io();

// variables
let nameplayer;
let game_rules;
const countdownPreview = 600;

let gameLaunched = false;
let your_turn = false;
let cardMoved = false;
let WinCondition = 0;
let Current_player;
// variables for the game board
let taille_tab = [0, 0, 0, 0]; // 1ère ligne, dernière ligne, 1ère colonne, dernière colonne
let images = document.querySelectorAll(".deplace");
let div = document.querySelectorAll(".box");
let mapForUndo;
let rightdownForUndo;
let taille_tabforUndo;

// get references to various elements in the HTML file
const Names_list = document.getElementById("players_names_list");
let Recup_names;
const partcard = document.getElementById("partcard");
const myList = document.getElementById("myList");
const rightdown = document.getElementById("rightdown");
const gameBoard = document.getElementById("gameBoard");
const mapstart ="<div class='game_board' id='gameBoard'> <div class='map-outer'><div class='map-inner' style='cursor: grab;'><table id='table_jeu'> <tbody><tr id='L0'><td id='boxL0C0' class='box'></td></tr></tbody></table></div></div></div>";
const cardstart="<div><img src='images/cards/cutting.jpg' id='im0' class='deplace' draggable='false'><img src='images/cards/paint.jpg' id='im1' class='deplace' draggable='false'><img src='images/cards/welding.jpg' id='im2' class='deplace' draggable='false'><img src='images/cards/assembly.jpg' id='im3' class='deplace' draggable='false'><img src='images/cards/molding.jpg' id='im4' class='deplace' draggable='false'><img src='images/cards/car_assembly.jpg' id='im5' class='deplace' draggable='false'><img src='images/cards/stamping.jpg' id='im6' class='deplace' draggable='false'><img src='images/cards/cleaning.jpg' id='im7' class='deplace' draggable='false'><img src='images/cards/technical_control.jpg' id='im8' class='deplace' draggable='false'></div>";

// get references to various buttons in the HTML file
const Launch_button = document.getElementById("buttonLaunch");
const Valid_turn_button = document.getElementById("buttonValid");
const Mix_players_button = document.getElementById("buttonMix");
const End_button = document.getElementById("buttonEnd");
const Refresh_button = document.getElementById("buttonRefresh");
const Play_button = document.getElementById("start");
const Pause_button = document.getElementById("pause");
const Reset_button = document.getElementById("reset");
const Undo_button = document.getElementById("buttonUndo");
const Rules_button = document.getElementById("buttonRules");


// ============================
// =========== OTHER ==========
// ============================

socket.on("gameLaunched", (currentPhase) => {
    gameLaunched = currentPhase;
});

socket.on("setClientName", (name) => {
    nameplayer = name;
});

socket.on("setClientRules", (rules) => {
    game_rules = rules;
});


// ============================
// =========== TIMER ==========
// ============================

// when the page is loaded, initialize the timer display to 10:00
document.addEventListener('DOMContentLoaded', () => {
    const minutes = Math.floor(countdownPreview / 60);
    const seconds = countdownPreview % 60;
    const minutesDisplay = (minutes < 10 ? '0' : '') + minutes;
    const secondsDisplay = (seconds < 10 ? '0' : '') + seconds;
    document.querySelector('#timer-minutes').innerHTML = minutesDisplay;
    document.querySelector('#timer-seconds').innerHTML = secondsDisplay;

});

// when receiving a timer update from the server, update the timer display
socket.on('updateTimer', (data) => {
    let minutes = Math.floor(data.countdown / 60);
    let seconds = data.countdown % 60;
    const secondsDisplay = (seconds < 10 ? '0' : '') + seconds;
    const minutesDisplay = (minutes < 10 ? '0' : '') + minutes;
    document.querySelector('#timer-minutes').innerHTML = minutesDisplay;
    document.querySelector('#timer-seconds').innerHTML = secondsDisplay;
});

// when the timer finishes, display an alert and show the start button
socket.on('timerFinished', () => {
    if (gameLaunched === true) {
        socket.emit("finishGame", "minuteur");
        gameLaunched = false;
    }
    socket.emit("resetTimer");
    socket.emit('pauseTimer');
    gameBoard.outerHTML=mapstart;
   // rightdown.outerHTML=cardstart;
    setupPhaseButtons();
});

// when the reset button is clicked, emit a "reset" event to the server
// when the pause button is clicked, emit a "pause" event to the server and show the start button
// when the start button is clicked, emit a "startTimer" event to the server and hide the start button
setTimeout(function() {
    document.querySelector('#reset').addEventListener('click', function() {
        socket.emit('resetTimer');
    });
    document.querySelector('#pause').addEventListener('click', function() {
        if (gameLaunched) {
            socket.emit('pauseTimer');
            Play_button.style.visibility = 'visible';
            Reset_button.style.visibility = 'visible';
            // Mix_players_button.style.display = 'none';
        }
    });
    document.querySelector('#start').addEventListener('click', function() {
        if (gameLaunched) {
            socket.emit('startTimer');
            Play_button.style.visibility = 'hidden';
            Reset_button.style.visibility = 'hidden';
            // Mix_players_button.style.display = 'none';
        }
    });
}, 1000);



// =============================
// ========== UPDATES ==========
// =============================

// uptdate the names in the list in the HTML file
// ask if the name is an admin
socket.on("update players", (names) => {
    console.log("update player, game = ", gameLaunched)
    Names_list.innerHTML = "";
    for (var id in names) {
        if (names[id] !== "admin") {
            const li = document.createElement("li");
            li.setAttribute("name", "player_name");
            Names_list.appendChild(li);
            li.appendChild(document.createTextNode(names[id]));
        }
    }
    socket.emit("ask is admin buttons");
    Recup_names = document.getElementsByName("player_name");
});

// display buttons on the screen of the admin
socket.on("display admin buttons", (answer) => {
    if (answer) { // is admin
        if (gameLaunched === false) {setupPhaseButtons()}
        else {gamePhaseButtons();}
        adminButtons()
    } else { // is not admin
        playersButtons()
        Valid_turn_button.style.visibility = "hidden";
        Undo_button.style.visibility = "hidden";
        rightdown.style.visibility = "hidden";
    }
});

socket.on("display Constraints", (constraints) => {
    myList.innerHTML = "";
    for (let i = 0; i < constraints.length; i++) {
        const constraintDiv = document.createElement("div");
        constraintDiv.classList.add("constraintDiv");
        constraintDiv.innerHTML = constraints[i];
        myList.appendChild(constraintDiv);
    }
});

// update the color of the current player
socket.on("uptdate printed player turn", function(currentPlayer) {
    for (let i = 0; i < Recup_names.length; i++) {
        if (i === currentPlayer) {
          
            Recup_names[i].style.color = "#4dca34";
            Current_player=Recup_names[i].innerHTML;
            console.log("Current_player :", Current_player);
            console.log("nameplayer :", nameplayer);
            

        } else {
            Recup_names[i].style.color = "white";
        }
    }
});

// hide the valid button when timer paused
socket.on("is not your turn", (current) =>{
  
  console.log("C'est dans is not your turn");
  removeDraggable();
    Valid_turn_button.style.visibility = "hidden";
    Undo_button.style.visibility = "hidden";
    rightdown.style.visibility = "hidden";

});

// show the valid button when timer played
socket.on("your turn", (current) => {
  console.log("C'est dans your turn");
  
    beDraggable(current);
    mapForUndo = gameBoard.outerHTML;
    rightdownForUndo = rightdown.outerHTML;
    taille_tabforUndo = [...taille_tab];

    Valid_turn_button.style.visibility = "visible";
    Undo_button.style.visibility = "visible";
    rightdown.style.visibility = "visible";

  
});


socket.on("incoming map", (map,Rightdown,Taille_tab) => {

    taille_tab= [...Taille_tab];

    const parser = new DOMParser();
    const mapHtml = parser.parseFromString(map, 'text/html').body.firstChild;
    const RightdownHtml = parser.parseFromString(Rightdown, 'text/html').body.firstChild;

    
    rightdown.innerHTML = RightdownHtml.innerHTML;
    gameBoard.innerHTML = mapHtml.innerHTML;
    mapInner = document.querySelector(".map-inner");

    

    for(i = 0; i < Recup_names; i++){
      
    }
    // On ajoute des écouteurs d'événements pour le clic, le mouvement et le relâchement de la souris sur l'élément HTML qui contient la carte extérieure
    document.querySelector(".map-outer").addEventListener("mousedown", handleMouseDown);
    document.querySelector(".map-outer").addEventListener("mousemove", handleMouseMove);
    document.querySelector(".map-outer").addEventListener("mouseup", handleMouseUp);
    document.querySelector(".map-outer").addEventListener("wheel", handleMouseWheel);

    

    
    for(let i = Taille_tab[0]; i < Taille_tab[1]+1; i++){
      for(let j = Taille_tab[2]; j < Taille_tab[3]+1; j++){
        var div = document.getElementById("boxL" + i.toString()+"C" + j.toString());
        div.addEventListener("dragover", handleDragOver, false);
        div.addEventListener("dragenter", handleDragEnter, false);
        div.addEventListener("dragleave", handleDragLeave, false);
        div.addEventListener("drop", handleDrop, false);
        
      }
    }

    images = document.querySelectorAll(".deplace");
    for (let i = 0; i < images.length; i++) {
      images[i].addEventListener("dragstart", handleDragStart, false);
      images[i].addEventListener("dragend", handleDragEnd, false);
      images[i].style.opacity="1";

    }

    // On ajoute des écouteurs d'événements pour le clic, le mouvement et le relâchement de la souris sur l'élément HTML qui contient la carte extérieure

    
});



socket.on("incoming score", (score) => {
compteurPoint=score;
});

// ============= END GAME ============= 


socket.on("end game with minuteur", () => {
  
    myList.innerHTML = "";
    alert(`Le temps est écoulé ! Vous avez atteint ${compteurPoint} points.`)
});

socket.on("end game with end btn", () => {
    myList.innerHTML = "";
    alert(`La partie a été arrêtée ! Vous avez atteint ${compteurPoint} points.`)

});

socket.on("end game with max points", () => {
    myList.innerHTML = "";
    alert(`Bravo ! Vous avez réussi à atteindre le maximum de points avec ${compteurPoint} points.`)
});


// =============================
// ========== BUTTONS ==========
// =============================

// when the admin click, launch the game
Launch_button.addEventListener("click", function() {
    if (Recup_names.length < 3) {
        alert("There is not enough players")
    } else if (Recup_names.length > 6) {
        alert("There is too much players")
    } else {
        gamePhaseButtons();
        socket.emit("resetTimer");
        socket.emit("startTimer");
        socket.emit("launch game");
    }
});

End_button.addEventListener("click", function() {
    socket.emit("resetTimer");
    socket.emit("pauseTimer"); // hide buttons
    if (gameLaunched === true) {
        socket.emit("finishGame", "end btn"); // clear constraints
        gameLaunched = false;
    }
    setupPhaseButtons();
});

// when the move is valid, change the turn
Valid_turn_button.addEventListener("click", function() {   
    //console.log("gameboard :", gameBoard.outerHTML);
    socket.emit("send map to all", gameBoard.outerHTML, rightdown.outerHTML,taille_tab);
    socket.emit("change turn");
    
  
    
});

// when the admin click, mix the players which permit to change the constraints
Mix_players_button.addEventListener("click", function() {
    socket.emit("mix players");
});

Refresh_button.addEventListener("click", function() {
    socket.emit("make spectator playing");
});

Undo_button.addEventListener("click", function() {
    
    socket.emit("send map to all", mapForUndo, rightdownForUndo,taille_tabforUndo);

});


// hide the valid button when timer paused
socket.on("hide players btn", () => {
    Valid_turn_button.style.visibility = "hidden";
    Undo_button.style.visibility = "hidden";
    rightdown.style.visibility = "hidden";
});

// show the valid button when timer played
socket.on("show players btn", () => {
    Valid_turn_button.style.visibility = "visible";
    Undo_button.style.visibility = "visible";
    rightdown.style.visibility = "visible";
});

socket.on("admin retrieve game phase buttons", () => {
    gamePhaseButtons();
});

socket.on("spectator incomming", (name) => {
    alert(`Welcome ${name}, the game has been started, you will be spectator`);
    playersButtons();
});

// set the display of the buttons for the players
function playersButtons() {
    Launch_button.style.display = "none";
    Mix_players_button.style.display = "none";
    End_button.style.display = "none";
    Refresh_button.style.display = "none";
    Play_button.style.display = "none";
    Pause_button.style.display = "none";
    Reset_button.style.display = "none";
}

// set the display of the buttons for the admin
function adminButtons() {
    Valid_turn_button.style.display = "none";
    Undo_button.style.display = "none";
    rightdown.style.display = "none";
    partcard.style.display = "none";
}

// set the visibility of the buttons for the setup phase
function setupPhaseButtons() {
    // for admin
    Launch_button.style.visibility = 'visible';
    End_button.style.visibility = 'hidden';
    Mix_players_button.style.visibility = 'visible';
    Refresh_button.style.visibility = 'visible';
    Play_button.style.visibility = "hidden";
    Reset_button.style.visibility = "hidden";

    // for player
    Valid_turn_button.style.visibility = 'hidden';
    Undo_button.style.visibility = 'hidden';
    myList.innerHTML = "";
}

// set the visibility of the buttons for the game phase
function gamePhaseButtons() {
    Launch_button.style.visibility = "hidden";
    End_button.style.visibility = "visible";
    Mix_players_button.style.visibility = 'hidden';
    Refresh_button.style.visibility = 'hidden';
    Play_button.style.visibility = "hidden";
    Reset_button.style.visibility = "hidden";

    // Valid_turn_button.style.visibility = 'visible';
}



// ===========================
// ========== RULES ==========
// ===========================

socket.on("show rules", (name, rules) => {
    alert(`Welcome ${name}, \n\n${rules}`);
});

Rules_button.addEventListener("click", () => {
    alert(game_rules);
})


// =================================
// ========== DRAG & DROP ==========
// =================================

var clethis;
function handleDragStart(e) {
  if(Current_player==nameplayer){
  //changement d'opacité pour l'image que l'on drag
  this.style.opacity = "0.4";
  console.log("this.id" + this.id);
  clethis = this.id;

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", e.target.id);
  }
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDragEnter(e) {
    this.classList.add("over");
}

function handleDragLeave(e) {
    this.classList.remove("over");
}

function removeDraggable() {

  this.id = clethis;
  //empêcher les autres cartes de pouvoir être joué
  for (let i = 0; i <= 8; i++) {
    let element = document.getElementById("im" + i);
    if (element.id != this.id) {
      element.draggable = false;
    }
  }
}


function beDraggable() {
  for (let i = 0; i <= 8; i++) {
    let element = document.getElementById("im" + i);
    element.draggable = true;
}
}


var condtour2=0;
function handleDrop(e) {
  condtour2=0;


    removeDraggable();
  
    console.log("e.dataTransfert : " + e.dataTransfer.getData("Text"));
    e.preventDefault(); //rajout
  
    let data = e.dataTransfer.getData("Text");
    // rÃ©cup id en cours
    let id_en_cours = e.target.id;
    console.log("id en cours : " + id_en_cours);
    let lig_en_cours = parseInt(
      id_en_cours.substring(
        id_en_cours.indexOf("L") + 1,
        id_en_cours.indexOf("C")
      )
    );
    console.log("ligne en cours : " + lig_en_cours);
    let col_en_cours = parseInt(
      id_en_cours.substring(id_en_cours.indexOf("C") + 1)
    );
    console.log("colonne en cours : " + col_en_cours);
  
    let correct = false;
  
    //Premiere carte posée 
    if (JSON.stringify(taille_tab) === JSON.stringify([0, 0, 0, 0])) {
      correct = true;

    } else 
    {
        correct=true;
        console.log("data l516:",data);


    tab_temp = [[lig_en_cours, col_en_cours]];
    i = 0;
    while (i < tab_temp.length && i < 10) {
      console.log("data l521:",data);

      console.log("*** i : " + i + " *****");
      if (
        // au-dessus
        document.getElementById(
          "boxL" +
            (tab_temp[i][0] - 1).toString() +
            "C" +
            tab_temp[i][1].toString()
        ) !== null &&
        document.getElementById(
          "boxL" +
            (tab_temp[i][0] - 1).toString() +
            "C" +
            tab_temp[i][1].toString()
        ).childElementCount > 0 &&
        !JSON.stringify(tab_temp).includes(
          JSON.stringify([tab_temp[i][0] - 1, tab_temp[i][1]])
        ) &&
        document
          .getElementById(
            "boxL" +
              (tab_temp[i][0] - 1).toString() +
              "C" +
              tab_temp[i][1].toString()
          )
          .getElementsByTagName("img")[0]
          .getAttribute("id") !== e.dataTransfer.getData("Text")
      ) {
        console.log("y'a au-dessus");
        condtour2 =1;
        tab_temp.push([tab_temp[i][0] - 1, tab_temp[i][1]]);
      }
      if (
        // en-dessous
        document.getElementById(
          "boxL" +
            (tab_temp[i][0] + 1).toString() +
            "C" +
            tab_temp[i][1].toString()
        ) !== null &&
        document.getElementById(
          "boxL" +
            (tab_temp[i][0] + 1).toString() +
            "C" +
            tab_temp[i][1].toString()
        ).childElementCount > 0 &&
        !JSON.stringify(tab_temp).includes(
          JSON.stringify([tab_temp[i][0] + 1, tab_temp[i][1]])
        ) &&
        document
          .getElementById(
            "boxL" +
              (tab_temp[i][0] + 1).toString() +
              "C" +
              tab_temp[i][1].toString()
          )
          .getElementsByTagName("img")[0]
          .getAttribute("id") !== e.dataTransfer.getData("Text")
      ) {
        console.log("y'a en-dessous");
        condtour2 =1;
        tab_temp.push([tab_temp[i][0] + 1, tab_temp[i][1]]);
      }
  
      if (
        // Ã  gauche
        document.getElementById(
          "boxL" +
            tab_temp[i][0].toString() +
            "C" +
            (tab_temp[i][1] - 1).toString()
        ) !== null &&
        document.getElementById(
          "boxL" +
            tab_temp[i][0].toString() +
            "C" +
            (tab_temp[i][1] - 1).toString()
        ).childElementCount > 0 &&
        !JSON.stringify(tab_temp).includes(
          JSON.stringify([tab_temp[i][0], tab_temp[i][1] - 1])
        ) &&
        document
          .getElementById(
            "boxL" +
              tab_temp[i][0].toString() +
              "C" +
              (tab_temp[i][1] - 1).toString()
          )
          .getElementsByTagName("img")[0]
          .getAttribute("id") !== e.dataTransfer.getData("Text")
      ) {
        console.log(
          "y'a Ã  gauche " +
            document
              .getElementById(
                "boxL" +
                  tab_temp[i][0].toString() +
                  "C" +
                  (tab_temp[i][1] - 1).toString()
              )
              .getElementsByTagName("img")[0]
              .getAttribute("id") +
            " comparÃ© avec " +
            data
        );
        condtour2 =1;
        tab_temp.push([tab_temp[i][0], tab_temp[i][1] - 1]);
      }
  
      if (
        // Ã  droite
        document.getElementById(
          "boxL" +
            tab_temp[i][0].toString() +
            "C" +
            (tab_temp[i][1] + 1).toString()
        ) !== null &&
        document.getElementById(
          "boxL" +
            tab_temp[i][0].toString() +
            "C" +
            (tab_temp[i][1] + 1).toString()
        ).childElementCount > 0 &&
        !JSON.stringify(tab_temp).includes(
          JSON.stringify([tab_temp[i][0], tab_temp[i][1] + 1])
        ) &&
        document
          .getElementById(
            "boxL" +
              tab_temp[i][0].toString() +
              "C" +
              (tab_temp[i][1] + 1).toString()
          )
          .getElementsByTagName("img")[0]
          .getAttribute("id") !== e.dataTransfer.getData("Text")
      ) {
        console.log("y'a Ã  droite");
        condtour2 =1;
        tab_temp.push([tab_temp[i][0], tab_temp[i][1] + 1]);
      }
  
      console.log("tab_temp : " + tab_temp);
      i = i + 1;
    }
    nb_cartes = 0;
    for (let i = taille_tab[0]; i <= taille_tab[1]; i++) {
      for (let j = taille_tab[2]; j <= taille_tab[3]; j++) {
        if (
          document.getElementById("boxL" + i.toString() + "C" + j.toString()) !==
            null &&
          document.getElementById("boxL" + i.toString() + "C" + j.toString())
            .childElementCount > 0
        ) {
          nb_cartes = nb_cartes + 1;
        }
      }
    }
    console.log("nb cartes : " + nb_cartes);
    console.log("tab_temp.length : " + tab_temp.length);
    if (tab_temp.length < nb_cartes) {
      correct = false;
    }
    if (condtour2 === 0){
      correct = false;
    }
    }



    if (correct === true) {
      if (e.target.classList.contains("box")) {
        let data = e.dataTransfer.getData("Text");
        e.target.appendChild(document.getElementById(data));
  
        // ici on doit maintenant ajouter les cases autour
        // ***********************************************
        // au-dessus
        if (lig_en_cours - 1 < taille_tab[0]) {
          var table = document.getElementById("table_jeu");
          var row = table.insertRow(0);
          row.id = "L" + (lig_en_cours - 1).toString();
          for (let i = taille_tab[2]; i < taille_tab[3] + 1; i++) {
            var cell = row.insertCell();
            cell.id = "L" + (lig_en_cours - 1).toString() + "C" + i.toString();
            var div = document.createElement("div");
            div.className = "box";
            div.id = "boxL" + (lig_en_cours - 1).toString() + "C" + i.toString();
            cell.appendChild(div);
            div.addEventListener("dragover", handleDragOver, false);
            div.addEventListener("dragenter", handleDragEnter, false);
            div.addEventListener("dragleave", handleDragLeave, false);
            div.addEventListener("drop", handleDrop, false);
          }
          taille_tab[0] = taille_tab[0] - 1;
        }
        // en-dessous
        if (lig_en_cours + 1 > taille_tab[1]) {
          var table = document.getElementById("table_jeu");
          var row = table.insertRow(-1);
          row.id = "L" + (lig_en_cours + 1).toString();
          for (let i = taille_tab[2]; i < taille_tab[3] + 1; i++) {
            var cell = row.insertCell();
            cell.id = "L" + (lig_en_cours + 1).toString() + "C" + i.toString();
            var div = document.createElement("div");
            div.className = "box";
            div.id = "boxL" + (lig_en_cours + 1).toString() + "C" + i.toString();
            cell.appendChild(div);
            div.addEventListener("dragover", handleDragOver, false);
            div.addEventListener("dragenter", handleDragEnter, false);
            div.addEventListener("dragleave", handleDragLeave, false);
            div.addEventListener("drop", handleDrop, false);
          }
          taille_tab[1] = taille_tab[1] + 1;
        }
        // Ã  gauche
        if (col_en_cours - 1 < taille_tab[2]) {
          var table = document.getElementById("table_jeu");
          for (let i = taille_tab[0]; i < taille_tab[1] + 1; i++) {
            var row = document.getElementById("L" + i.toString());
            var cell = row.insertCell(0);
            cell.id = "L" + i.toString() + "C" + (taille_tab[2] - 1).toString();
            var div = document.createElement("div");
            div.className = "box";
            div.id = "boxL" + i.toString() + "C" + (taille_tab[2] - 1).toString();
            cell.appendChild(div);
            div.addEventListener("dragover", handleDragOver, false);
            div.addEventListener("dragenter", handleDragEnter, false);
            div.addEventListener("dragleave", handleDragLeave, false);
            div.addEventListener("drop", handleDrop, false);
          }
          taille_tab[2] = taille_tab[2] - 1;
        }
        // Ã  droite
        if (col_en_cours + 1 > taille_tab[3]) {
          var table = document.getElementById("table_jeu");
          for (let i = taille_tab[0]; i < taille_tab[1] + 1; i++) {
            var row = document.getElementById("L" + i.toString());
            var cell = row.insertCell(-1);
            cell.id = "L" + i.toString() + "C" + (taille_tab[3] + 1).toString();
            var div = document.createElement("div");
            div.className = "box";
            div.id = "boxL" + i.toString() + "C" + (taille_tab[3] + 1).toString();
            cell.appendChild(div);
            div.addEventListener("dragover", handleDragOver, false);
            div.addEventListener("dragenter", handleDragEnter, false);
            div.addEventListener("dragleave", handleDragLeave, false);
            div.addEventListener("drop", handleDrop, false);
          }
          taille_tab[3] = taille_tab[3] + 1;
        }
      }
      socket.emit("send map to all", gameBoard.outerHTML, rightdown.outerHTML,taille_tab);

    } else {
      console.log("Impossible to put your piece here");
    }
    return false;
}

function handleDragEnd(e) {

  

    compteurPoint = 0;
    WinCondition = 0;
    checkcartInGame();              
    countpoints();

    this.style.opacity = "1";
    console.log("dragend" + this.id);
    images.forEach(function(item) {
        console.log("item :" + item);
        item.classList.remove("over");
    });
}

function dragdrop() {

    for (let i = 0; i < div.length; i++) {
        console.log("tout ca pour ca");
        div[i].addEventListener("dragover", handleDragOver, false);
        div[i].addEventListener("dragenter", handleDragEnter, false);
        div[i].addEventListener("dragleave", handleDragLeave, false);
        div[i].addEventListener("drop", handleDrop, false);
    }
    for (let i = 0; i < images.length; i++) {
        images[i].addEventListener("dragstart", handleDragStart, false);
        images[i].addEventListener("dragend", handleDragEnd, false);
    }
}

dragdrop();

// ===============================
// ============  MAP  ============
// ===============================

// On crée une variable pour savoir si la souris est en train de cliquer et de déplacer
var isDragging = false;
// On crée un objet pour stocker la position de la souris au moment du clic
var mouseStart = {
    x: 0,
    y: 0
};
// On crée un objet pour stocker la position de départ de la carte
var translateStart = {
    x: 0,
    y: 0
};
// On récupère l'élément HTML qui contient la carte intérieure
var mapInner = document.querySelector(".map-inner");
// On crée une variable pour stocker le niveau de zoom actuel
var zoomLevel = 1;
// On définit le niveau maximum et minimum de zoom
var maxZoomLevel = 3;
var minZoomLevel = 0.5;

// On crée une fonction pour gérer le clic de la souris
function handleMouseDown(e) {
    // Si click sur img, pas de drag
    if (e.target.classList.contains("deplace")) return;
    // On active le mode "dragging"
    isDragging = true;
    // On enregistre la position de la souris au moment du clic
    mouseStart.x = e.clientX;
    mouseStart.y = e.clientY;
    // On enregistre la position de départ de la carte
    translateStart.x = parseInt(
        window
        .getComputedStyle(mapInner)
        .getPropertyValue("transform")
        .split(",")[4]
    );
    translateStart.y = parseInt(
        window
        .getComputedStyle(mapInner)
        .getPropertyValue("transform")
        .split(",")[5]
    );
    // On change le curseur pour indiquer que l'on est en train de déplacer la carte
    mapInner.style.cursor = "grabbing";
}

// On crée une fonction pour gérer le zoom avec la molette de la souris
function handleMouseWheel(e) {
    // On calcule la variation de la molette
    var delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;

    // On calcule le nouveau niveau de zoom en fonction de la variation de la molette
    if (delta > 0 && zoomLevel < maxZoomLevel) {
        zoomLevel += 0.1;
    } else if (delta < 0 && zoomLevel > minZoomLevel) {
        zoomLevel -= 0.1;
    }

    // On applique le niveau de zoom à la carte
    mapInner.style.transform =
        "translate(" +
        positionx +
        "px, " +
        positiony +
        "px) " +
        "scale(" +
        zoomLevel +
        ")";
}

// On crée une fonction pour gérer le mouvement de la souris
function handleMouseMove(e) {
    if (!isDragging) return;

    // On calcule la distance parcourue     depuis le clic de la souris
    var dx = e.clientX - mouseStart.x;
    var dy = e.clientY - mouseStart.y;
    // On déplace la carte en fonction de la distance parcourue depuis le clic et de la position de départ de la carte
    mapInner.style.transform =
        "translate(" +
        (translateStart.x + dx) +
        "px, " +
        (translateStart.y + dy) +
        "px) " +
        "scale(" +
        zoomLevel +
        ")";

    // variable pour la position de la map
    positionx = translateStart.x + dx;
    positiony = translateStart.y + dy;
}

// On crée une fonction pour gérer le relâchement de la souris
function handleMouseUp(e) {
    isDragging = false;
    mapInner.style.cursor = "grab";
}

// On ajoute des écouteurs d'événements pour le clic, le mouvement et le relâchement de la souris sur l'élément HTML qui contient la carte extérieure
document
    .querySelector(".map-outer")
    .addEventListener("mousedown", handleMouseDown);
document
    .querySelector(".map-outer")
    .addEventListener("mousemove", handleMouseMove);
document.querySelector(".map-outer").addEventListener("mouseup", handleMouseUp);
document
    .querySelector(".map-outer")
    .addEventListener("wheel", handleMouseWheel);


let cartInGame = {};
let compteurPoint = 0;

function checkcartInGame() {
  for (let i = taille_tab[0]; i <= taille_tab[1]; i++) {
    for (let j = taille_tab[2]; j <= taille_tab[3]; j++) {
            cartInGame["box" + "L" + i.toString() + "C" + j.toString()] = null;
            // Récupère l'élément td avec l'id "boxL0C0"
            const td = document.getElementById("box" + "L" + i.toString() + "C" + j.toString());

            if (td && td.querySelector('img') === null) {} else if (td) {

                // Récupère l'élément img à l'intérieur de l'élément td
                const img = td.querySelector('img');
                const id = img.getAttribute('id');
                cartInGame["box" + "L" + i.toString() + "C" + j.toString()] = id;
                // Affiche la valeur de l'attribut id de l'élément img dans la console
                // console.log("box" + "L" + i.toString() + "C" + j.toString() + ":",id);

            }
        }
    }

    console.log(cartInGame);

    for (let i = taille_tab[0]; i <= taille_tab[1]; i++) {
        for (let j = taille_tab[2]; j <= taille_tab[3]; j++) {
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im1");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im2");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im5");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im8");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im4", "im1");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im4", "im8");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im0", "im1");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im0", "im2");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im7", "im2");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im7", "im5");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im6", "im8");
            checkNeighborforWin(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im6", "im5");
        }
    }
    console.log("WinCondition : ", WinCondition);

    if (WinCondition === 12) { 
        compteurPoint=0; 
      if(Recup_names.length == 3){
        compteurPoint=9;
        socket.emit('send score', compteurPoint);

      }else if(Recup_names.length == 4){
        compteurPoint=12;
        socket.emit('send score', compteurPoint);

      }else if(Recup_names.length == 5){
        compteurPoint=10;
        socket.emit('send score', compteurPoint);

      }else if(Recup_names.length == 6){
        compteurPoint=12;
        socket.emit('send score', compteurPoint);
      }


        socket.emit("finishGame", "max points")
        gameLaunched = false;
    }
}


function countpoints(){

  for (let i = taille_tab[0]; i <= taille_tab[1]; i++) {
    for (let j = taille_tab[2]; j <= taille_tab[3]; j++) {
      if (Recup_names.length == 3){
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im0");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im4");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im3");

      checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im3");
      checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im7");
      checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im0");

      
      checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im6", "im8");
      checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im6", "im5");
      checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im5");
      

      }

      if (Recup_names.length == 4){
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im4");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im0");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im0");
  
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im5");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im1");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im2");
  
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im7");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im7");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im6");

        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im8", "im4");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im8", "im6");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im8", "im3");
        
        }
        
      if (Recup_names.length == 5){
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im0", "im1");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im0", "im2");
     
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im3");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im4");

        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im3");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im7");
     
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im5");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im8");
     
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im6");
        checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im7");
        }

        if (Recup_names.length == 6){
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im0", "im1");
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im0", "im2");
       
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im3");
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im1", "im4");
  
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im3");
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im2", "im7");
       
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im5");
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im3", "im8");
       
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im6");
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im7");

          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im6");
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im5", "im7");

          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im8", "im4");
          checkNeighborforPoints(cartInGame, "box" + "L" + i.toString() + "C" + j.toString(), "im8", "im6");
          }
    }
  }
  console.log("compteurPoint dans countpoints : ", compteurPoint);
  socket.emit('send score', compteurPoint);
}


function checkNeighborforWin(json, key, value, neighborValue) {

    // Get the row and column indices from the key string
    const indices = key.match(/L(-?\d+)C(-?\d+)/);
    const row = parseInt(indices[1]);
    const col = parseInt(indices[2]);

    // Check the value of the current key
    if (json[key] !== value) {
        return false;
    }

    // Check the values of the neighboring keys
    if (json["boxL" + (row - 1) + "C" + col] === neighborValue ||
        json["boxL" + (row + 1) + "C" + col] === neighborValue ||
        json["boxL" + row + "C" + (col - 1)] === neighborValue ||
        json["boxL" + row + "C" + (col + 1)] === neighborValue) {
        WinCondition = WinCondition + 1;
        return WinCondition;
    }
}


function checkNeighborforPoints(json, key, value, neighborValue) {

  // Get the row and column indices from the key string
  const indices = key.match(/L(-?\d+)C(-?\d+)/);
  const row = parseInt(indices[1]);
  const col = parseInt(indices[2]);

  // Check the value of the current key
  if (json[key] !== value) {
      return false;
  }

  // Check the values of the neighboring keys
  if (json["boxL" + (row - 1) + "C" + col] === neighborValue ||
      json["boxL" + (row + 1) + "C" + col] === neighborValue ||
      json["boxL" + row + "C" + (col - 1)] === neighborValue ||
      json["boxL" + row + "C" + (col + 1)] === neighborValue) {
      compteurPoint = compteurPoint + 1;
  }
}