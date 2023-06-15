const socket = io();

// get references to various elements in the HTML file
const Names_list = document.getElementById("players_names_list");

// get references to various buttons in the HTML file
const Play_button = document.getElementById("start");
const Pause_button = document.getElementById("pause");
const Reset_button = document.getElementById("reset");
const heartsElement = document.getElementById("hearts");

const playerdeck = document.getElementById("mydeck");
const begin_button = document.getElementById("start-game-btn");
// ============================
// =========== TIMER ==========
// ============================

// when the page is loaded, initialize the timer display to 10:00
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#timer-minutes').innerHTML = '10';
    document.querySelector('#timer-seconds').innerHTML = '00';
});

// when receiving a timer update from the server, update the timer display
socket.on('timer', function(data) {
    let minutes = Math.floor(data.countdown / 60);
    let seconds = data.countdown % 60;
    const secondsDisplay = (seconds < 10 ? '0' : '') + seconds;
    const minutesDisplay = (minutes < 10 ? '0' : '') + minutes;
    document.querySelector('#timer-minutes').innerHTML = minutesDisplay;
    document.querySelector('#timer-seconds').innerHTML = secondsDisplay;
});

// when the timer finishes, display an alert and show the start button
socket.on('timerFinished', function() {
    alert('Le temps est écoulé !');
    document.querySelector('#start').classList.remove('hide');
});

// when the reset button is clicked, emit a "reset" event to the server
// when the pause button is clicked, emit a "pause" event to the server and show the start button
// when the start button is clicked, emit a "startTimer" event to the server and hide the start button
setTimeout(function() {
    document.querySelector('#reset').addEventListener('click', function() {
        socket.emit('reset');
    });
    document.querySelector('#pause').addEventListener('click', function() {
        socket.emit('pause');
        document.querySelector('#start').classList.remove('hide');
    });
    document.querySelector('#start').addEventListener('click', function() {
        socket.emit('startTimer');
        this.classList.add('hide');
    });
}, 1000);

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

// =============================
// ========== BUTTONS ==========
// =============================

// display buttons on the screen of the admin
socket.on("display admin buttons", (answer) => {
    if (answer) { // is admin
        // buttonName.style.display = "block";
    } else { // is not admin
        Play_button.style.display = "none";
        Pause_button.style.display = "none";
        Reset_button.style.display = "none";
    }
});

// =============================
// ====== GAMES FUNCTION =======
// =============================


////////////////////////////////////////////
///////////fonction niveau de vie //////////
////////////////////////////////////////////
function nb_vies(){
  nb_vies(rouge) + 3 - nb_vies(grisé);
}


document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', event => {
      const cardId = event.target.id;
      socket.emit('cardPlayed', cardId);
  });
});

socket.on('updateLives', (lives) => {
  document.getElementById("lives").innerHTML = `Coeur : ${lives}`;
});

socket.on('hideCard', (cardId) => {
  const card = document.getElementById(cardId);
  if (card) {
      card.style.display = 'none';
  }
});

socket.on('message', (message) => {
  alert(message);
});

/////////////
let cardData = [];

socket.on("card data", function(data) {
    cardData = data;
}); 

begin_button.addEventListener("click" , () => {
  socket.emit("begin");
})
// création des boutons cards 
socket.on("display deck", function(deck) {
	console.log("socket on 'display deck' " + deck)
  for (let i = 0; i < deck.length; i++) {

      const cardId = deck[i].CardId;
		console.log("carte " + i + " : " + deck[i].CardId)
      const cardImage = deck[i].image;
		console.log("card image : " + cardImage)
      var leconteneur = document.getElementById("card-container");

      const constraintbutton= document.createElement("button");
      constraintbutton.type = 'button';
      constraintbutton.id=cardId;
      constraintbutton.innerHTML = '<img src="..//public//extremeEvolution//"' + cardImage + '/>';
      constraintbutton.addEventListener("click", function () {
        onCardClick(constraintbutton.id);
});
// faire la fonction place carte
      leconteneur.appendChild(constraintbutton);
  }

});

// partie où les cartes sont selectionnées et envoyée au serveur 

// Écouter les mises à jour du serveur
// = Réception par le client du jeu mis à jour 
socket.on('gameState', (gameState) => {
  // Mettre à jour l'affichage du client avec les nouvelles informations
  //updateClientDisplay(updatedGameState);
            //gameState.players = players;
            //gameState.level = 1;
            //gameState.lives = Object.keys(players).length;
            //gameState.meteorites = 2;
            //gameState.playedCards = [];
  
  updateGameDisplay(gameState);
  
  
});

// Vérifier qu'il y a bien une fonction pour gérer le clic sur une carte
function onCardClick(cardData) {
	console.log("on a cliqué sur la carte " + cardData)
  // Envoyez l'information de la carte cliquée au serveur
  socket.emit('cardClicked', cardData);
};



// Met à jour l'affichage en fonction de l'état du jeu reçu du serveur
function updateGameDisplay(gameState) {
  console.log("debug : updateGameDisplay")
  for (let i = 1; i <= gameState.lives; i++){
    let vie = document.getElementById("lives");
    const heart= document.createElement("img");
    heart.id="vie" + i.toString();
    heart.src = "./images/coeur.jpg";
    vie.appendChild(heart);
  }

  for (let i = 1; i <= gameState.players.length; i++){
    let vie = document.getElementById("lives");
    const heart= document.createElement("img");
    heart.id="vie_grise" + i.toString();
    heart.src = "./images/coupe.jpg";
    vie.appendChild(heart);
  }

  let level = document.getElementById("niveau");
  level.innerHTML = 'level :' + gameState.level;

  if (gameState.meteorites===0){
    bbouton = document.getElementById('use-blue-meteorite-btn');
    bbouton.disabled = true;
    wbouton = document.getElementById('use-white-meteorite-btn');
    wbouton.disabled = true;
  }
}
  
  // Passe au niveau suivant et met à jour l'affichage selon les informations reçues du serveur
  function goToNextLevel(level, faceDown) {
    // Implémentez la logique pour passer au niveau suivant et indiquer si les cartes doivent être jouées faces cachées
  
    //faire la fonction qui demande au serveur le 
  }
  // mettre un socket emit pour montrer que l'on change de niveaux à tous le monde quand toutes les cartes ont été jouées 




  // Récupère la carte sélectionnée par le joueur dans l'interface utilisateur
  function getSelectedCard() {
    // Implémentez la logique pour récupérer la carte sélectionnée par le joueur
    return selectedCard;
  }
  
  // Récupère l'ID du joueur
  function getPlayerId() {
    // Implémentez la logique pour récupérer l'ID du joueur
    return playerId;
  }
  
  // Lorsque le serveur envoie un nouvel état de jeu, met à jour l'affichage en conséquence
  socket.on('gameState', (gameState) => {
    updateGameDisplay(gameState);
  });
  
  // Lorsque le serveur indique de passer au niveau suivant, met à jour l'affichage et la logique du niveau
  socket.on('nextLevel', (level, faceDown) => {
    goToNextLevel(level, faceDown);
  });
  
  // Lorsque le joueur clique sur le bouton pour jouer une carte, envoie l'information au serveur
//  document.getElementById('play-card').addEventListener('click', () => {
//    const card = getSelectedCard();
//    const playerId = getPlayerId();
//    socket.emit('playCard', playerId, card);
//  });

// ==============================
// ========== Meteorites ========
// ==============================

  document.getElementById('start-game-btn').addEventListener('click', () => {
    socket.emit('startGame');
  });

//  document.getElementById('reset-game-btn').addEventListener('click', () => {
//    socket.emit('resetGame');
//  });

  //boutons all players 
  document.getElementById('use-blue-meteorite-btn').addEventListener('click', () => {
    socket.emit('useBlueMeteorite');
  });
  document.getElementById('use-white-meteorite-btn').addEventListener('click', () => {
    socket.emit('useWhiteMeteorite');
  });



  // Lorsque le joueur clique sur le bouton pour utiliser une météorite, envoie l'information au serveur
  document.getElementById('use-blue-meteorite-btn').addEventListener('click', () => {
    const playerId = getPlayerId();
    socket.emit('useBlueMeteorite', playerId);
  });
  
  // Lorsque le joueur clique sur le bouton pour utiliser une météorite, envoie l'information au serveur
  document.getElementById('use-white-meteorite-btn').addEventListener('click', () => {
    const playerId = getPlayerId();
    socket.emit('useWhiteMeteorite', playerId);
  });
  
