const socket = io()


// =======================================
// ======== VARIABLES Statiques ==========
// =======================================


// Dictionnaire associant les noms d'images aux valeurs des coins
const imageValues = new Map();

// nom.jpg : [haut gauche, haut droit, bas gauche, bas droit]
imageValues.set('knight.jpg'  , [4, 4, 4, 4]);
imageValues.set('network1.jpg', [3, 0, 0, 2]);
imageValues.set('network2.jpg', [3, 0, 0, 2]);
imageValues.set('network3.jpg', [0, 0, 0, 0]);
imageValues.set('network4.jpg', [1, 2, 2, 0]);
imageValues.set('network5.jpg', [1, 2, 0, 2]);
imageValues.set('network6.jpg', [0, 1, 2, 2]);
imageValues.set('malware1.jpg', [2, 2, 2, 1]);
imageValues.set('malware2.jpg', [2, 2, 2, 2]);
imageValues.set('malware3.jpg', [2, 2, 2, 2]);
imageValues.set('malware4.jpg', [2, 3, 3, 3]);

// Dictionnaire associant les noms d'images de malware aux temps que le joueur à pour l'éliminer
const timeRemainingValues = new Map();

timeRemainingValues.set('malware1.jpg', 3);
timeRemainingValues.set('malware2.jpg', 4);
timeRemainingValues.set('malware3.jpg', 4);
timeRemainingValues.set('malware4.jpg', 4);
timeRemainingValues.set('knight.jpg',   7);


// =======================================
// ========= VARIABLES Joueur ============
// =======================================

var countCardsInHand = 0;

var countCardsPlacedConsecutivelyWithoutDrawing = 0;

var MAX_CARDS = 4;

var isPlayer = false;

var isAdmin = false;

// =======================================
// ======== VARIABLES Partagées ==========
// =======================================

// Tableau des noms d'images des cartes réseau disponibles
const networkCards = [['network1.jpg', 9], ['network2.jpg', 9], ['network3.jpg', 9], ['network4.jpg', 9], ['network5.jpg', 9], ['network6.jpg', 9]];

// Tableau des noms d'images des cartes malwares disponibles
const malwareCards = [['malware1.jpg', 3], ['malware2.jpg', 3], ['malware3.jpg', 2], ['malware4.jpg', 2], ['knight.jpg', 1]];

const allCards = networkCards.concat(malwareCards);

//Tableau des positions des cartes misent sur le game-board
var cardPositions = [[0,0]];
var malwareCardPositions = [];
var networkCardPositions = [[0,0]];

// Dictionnaire avec les valeurs des coins mis à jour pour chaque position
var boardValuesCorner = new Map();
boardValuesCorner.set(JSON.stringify([0,0]), imageValues.get('network1.jpg'));

// Dictionnaire avec les valeurs de temps restant mis à jour à chaque tour
var boardValuesTimeRemaining = new Map();

// Index d'ordre sur les cartes piochées
var idDeckCard = 1;

// Nombre de tours passés
var countTurns = 0;

const sizeDeckInit = sizeDeck();

var isTurnMode = false;

var Recup_names;

var maxCardsPlacedConsecutively = 1;

var gameLaunched = false;


// =======================================
// ======== Fonction Emission ============
// =======================================

// Fonction pour émettre les variables partagées au serveur
function emitSharedVariables() {
    console.log("On emet les variables");
    // Émettre les variables au serveur
    socket.emit('sharedVariables', {
        countTurns,
        networkCards,
        malwareCards,
        allCards,
        cardPositions,
        malwareCardPositions,
        networkCardPositions,
        boardValuesCorner: Array.from(boardValuesCorner),
        boardValuesTimeRemaining: Array.from(boardValuesTimeRemaining),
        idDeckCard,
    });
}

// Fonction pour émettre la carte placée au serveur
function emitPlacedCard(cardElement, targetElement, imageName, secondLastNumber, lastNumber) {
    console.log("On emet la carte placé");

    const cardId = cardElement.id;
    const targetId = targetElement.id;

    socket.emit('sharedCard', {
        cardId,
        targetId,
        imageName,
        secondLastNumber,
        lastNumber,
    });
}	


// =======================================
// ======== Fonction Reception ===========
// =======================================

// Écoute de l'événement "sharedVariables" pour recevoir les nouvelles variables partagées
socket.on('sharedVariables', (variables) => {
    // Mettre à jour les variables partagées côté client
    updateSharedVariables(variables);
});

// Écoutez l'événement 'sharedCard' émis par le serveur pour recevoir les données de la carte placée
socket.on('sharedCard', (data) => {
    console.log('Données de la carte placée reçues depuis le serveur :', data);

    updateBoardCard(data);
});

// uptdate the names in the list in the HTML file
socket.on("update players", (names) => {
    const Names_list = document.getElementById("players_names_list");
    Names_list.innerHTML = "";
    for (var id in names) {
        if (names[id] !== "admin") {
            const li = document.createElement("li");
            li.setAttribute("name", "player_name");
            Names_list.appendChild(li);
            li.appendChild(document.createTextNode(names[id]));
        }
    }
    Recup_names = document.getElementsByName("player_name");
});

// update the color of the current player
socket.on("uptdate printed player turn", function(currentPlayer) {
    for (let i = 0; i < Recup_names.length; i++) {
        if (i === currentPlayer) {
            Recup_names[i].style.color = "#4dca34";
            Current_player=Recup_names[i].innerHTML;
        } else {
            Recup_names[i].style.color = "white";
        }
    }
});

socket.on("player", (names) => {
    console.log("Vous etes un joueur");
    MAX_CARDS = 4;
    displayPlayerView();
    isPlayer = true;

});

socket.on("spectator", (names) => {
    console.log("Vous etes un spectateur");
    MAX_CARDS = 0;
    displaySpectatorView();
});

socket.on("admin", (names) => {
    console.log("Vous etes un admin");
    MAX_CARDS = 0;
    isAdmin = true;
    displayAdminView();
});

socket.on("adminStartGame", (turnModeStart) => {
    isTurnMode = turnModeStart;
    gameLaunched = true;
    console.log("L'admin lance la partie ! Mode de jeu Tour par tour ? ", isTurnMode);

    // Le bouton "help" ouvre maintenant la page de help dans un nouvelle onglet
    const btn = document.getElementById('help');
    btn.setAttribute('target', '_blank'); // Ajoutez l'attribut target="_blank"

    if (isPlayer) {
        unfreezePage();
    } 
    if (isAdmin) {
        console.log("On retire le bouton switch");
        removeToggle("turnMode");
    }
});


// Écoute de l'événement "is not your turn"
socket.on("is not your turn", (currentPlayer) => {
    // Bloque l'interaction avec la page lorsque ce n'est pas le tour du joueur actuel
    if (!isAdmin) {
        freezePage();
        console.log(`This is not your turn, it's ${currentPlayer}'s turn to play.`);
    }
});

// Écoute de l'événement "your turn"
socket.on("your turn", (currentPlayer) => {
    // Débloque l'interaction avec la page lorsque c'est le tour du joueur actuel
    unfreezePage();
    console.log(`It's your turn to play, ${currentPlayer}.`);
});

socket.on("endGame", (names) => {
    reloadPage();
    isTurnMode = false;
    socket.emit("")
});

socket.on("adminAllowedTalk", () => {
    const talkToken = document.getElementById("talk-token");
    talkToken.textContent = "Talk: Allowed";
    talkToken.style.color = "green";
});

socket.on("adminDeniedTalk", () => {
    const talkToken = document.getElementById("talk-token");
    talkToken.textContent = "Talk: Denied";
    talkToken.style.color = "red";
});


// =======================================
// ======== Fonction Vrai/Faux ===========
// =======================================

// Fonction pour vérifier si le deck est vide (ne prends pas en considération si il reste la carte knight.jpg)
function isDeckEmpty() {
    for (let i = 0; i < allCards.length - 1; i++) {
        if (allCards[i][1] > 0) {
            return false;
        }
    }
    return true;
}

//Fonction pour vérifier si les cartes réseaux ont une valeur plus petite que 5
function isAllNetworkCardLessThanFive() {
    for (let i = 0; i < networkCardPositions.length; i++) {
        let sum = 0;
        for (let j = 0; j < 4; j++) {
            sum += (boardValuesCorner.get(JSON.stringify(networkCardPositions[i])))[j];
        }
        if (sum > 5) {
            return false;
        }
    }
    return true;
}

//Fonction pour vérifier si un tous les Malwares ont un temps restant positif
function isAllMalwareCardHasTimeRemaining() {
    for (let i = 0; i < malwareCardPositions.length; i++) {
        if (boardValuesTimeRemaining.get(JSON.stringify(malwareCardPositions[i])) < 0) {
            return false;
        }
    }
    return true;
}

function isPlayerHandEmpty() {
    const playerHandElement = document.getElementById('player-hand');
    return playerHandElement.childElementCount === 0;
}

function isGameWon() {
    //Si le deck est completement vide et qu'il n'y a pas de monstre en vie et que la main du joueur est vide
    if (isDeckEmpty() && allCards[allCards.length - 1][1] == 0 && malwareCardPositions.length == 0 && isPlayerHandEmpty()) {
        return true;
    } else {
        return false;
    }	
}

function cardIsAlreadyOnBoard(x, y) {

    for (let i = 0; i < cardPositions.length; i++) {
        if (cardPositions[i][0] == x && cardPositions[i][1] == y) {
            return true;
        }
    }
    return false;
}







// =======================================
// =========== Fonction Get ==============
// =======================================

// Fonction pour obtenir un indice de carte au hasard
function getRandomIndex() {
    let randomIndex = Math.floor(Math.random() * (allCards.length - 1));
    let val = allCards[randomIndex][1];
    while (val == 0) {
        randomIndex = Math.floor(Math.random() * (allCards.length - 1));
        val = allCards[randomIndex][1];
    }
    return randomIndex;
}

// Fonction pour compter le nombre de cartes
function sizeDeck() {
    let size = 0;
    for (let i = 0; i < allCards.length; i++) {
        size += allCards[i][1];
    }
    return size;
}






// =======================================
// =========== Fonction Set ==============
// =======================================

// Fonction pour initialiser la main d'un joueur avec 4 cartes aléatoires
function initializePlayerHand() {
    console.log("On distribue les cartes");
    const playerHandElement = document.getElementById('player-hand');

    for (let i = 0; i < MAX_CARDS; i++) {
        const indice = getRandomIndex();
        const card = allCards[indice][0];
        allCards[indice][1]--;
        const cardElement = createCardElement(card, i); // Ajouter l'ID unique à la création de la carte
        playerHandElement.appendChild(cardElement);
        countCardsInHand ++;
    }
}

// Fonction pour créer un élément de carte avec une image et des boîtes dans les coins
function createCardElement(card, secondLastNumber, lastNumber) {
    console.log("On cree une carte");
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.id = 'card/' + idDeckCard; // Définir l'ID unique de la carte

    if (secondLastNumber || lastNumber) {
        cardElement.id += "/" + secondLastNumber + "/" + lastNumber; // Définir l'ID unique de la carte
    }

    idDeckCard ++;

    const imageElement = document.createElement('img');
    imageElement.src = 'images/' + card;
    imageElement.alt = 'Network Card';
    cardElement.appendChild(imageElement);

    const cornerBox1 = document.createElement('div');
    cornerBox1.classList.add('corner-box');
    cornerBox1.classList.add('top-left');
    cardElement.appendChild(cornerBox1);

    const cornerBox2 = document.createElement('div');
    cornerBox2.classList.add('corner-box');
    cornerBox2.classList.add('top-right');
    cardElement.appendChild(cornerBox2);

    const cornerBox3 = document.createElement('div');
    cornerBox3.classList.add('corner-box');
    cornerBox3.classList.add('bottom-left');
    cardElement.appendChild(cornerBox3);

    const cornerBox4 = document.createElement('div');
    cornerBox4.classList.add('corner-box');
    cornerBox4.classList.add('bottom-right');
    cardElement.appendChild(cornerBox4);

    cardElement.classList.add('card-in-hand');

    if (['malware1.jpg', 'malware2.jpg', 'malware3.jpg', 'malware4.jpg', 'knight.jpg'].includes(card)) {
        // Compteur de temps restant
        const timeRemainingElement = document.createElement('div');
        timeRemainingElement.classList.add('remaining-turns');
        timeRemainingElement.textContent = timeRemainingValues.get(card);
        cardElement.appendChild(timeRemainingElement);
    }

    cardElement.draggable = true;
    cardElement.addEventListener('dragstart', dragStart);

    return cardElement;
}

function incrementerCompteur() {
    // Récupérer l'élément du compteur
    const compteurElement = document.getElementById("turn-counter");
    // Récupérer la valeur actuelle du compteur
    //let countTurns = parseInt(compteurElement.innerText.split(":")[1]);
    // Incrémenter le compteur
    countTurns++;
    // Mettre à jour le texte du compteur avec la nouvelle valeur
    compteurElement.innerText = "Turns: " + countTurns + "/" + sizeDeckInit;
}

// Fonction pour piocher une nouvelle carte depuis le deck
function drawCard() {
    if (MAX_CARDS > countCardsInHand) {
        console.log("Le joueur pioche une carte");

        const deckCard = document.getElementById('deck-card');
        deckCard.classList.add('animate');

        // Attendre la fin de l'animation avant de retirer la classe animate
        setTimeout(() => {
            deckCard.classList.remove('animate');
        }, 500);

        countCardsInHand ++;
        countCardsPlacedConsecutivelyWithoutDrawing = 0;

        let randomIndex;
        if (isDeckEmpty() && allCards[allCards.length - 1][1] == 0) {
            console.log("Le deck est vide. Impossible de piocher une nouvelle carte.");
            const deckContainer = document.getElementById('deck');
            deckContainer.parentNode.removeChild(deckContainer);
            return;
        } else if (isDeckEmpty() && allCards[allCards.length - 1][1] == 1) {
            randomIndex = allCards.length - 1;
            console.log("Il ne reste que le chevalier noir dans le deck.");
        } else {
            randomIndex = getRandomIndex();
        }

        const card = allCards[randomIndex][0];
        allCards[randomIndex][1]--;

        const playerHandElement = document.getElementById('player-hand');
        const cardElement = createCardElement(card);
        playerHandElement.appendChild(cardElement);

        outputCardDeck();
        if (isTurnMode) {
            socket.emit("change turn");
        }

    } else {
        console.log("Le joueur à trop de cartes : ", countCardsInHand);
    }
}


function endGame() {
    socket.emit("resetTimer");
    socket.emit("pauseTimer"); // hide buttons
    console.log("La partie est fini");
    gameLaunched = false;
    socket.emit("finishGame");
}






// =======================================
// ========== Fonction Update ============
// =======================================

function updateBoardCornerValue(secondLastNumber, lastNumber, imageName) {
    boardValuesCorner.set(JSON.stringify([secondLastNumber, lastNumber]), [...imageValues.get(imageName)]);

    if (boardValuesCorner.has(JSON.stringify([secondLastNumber - 1, lastNumber]))) {
        console.log("On change la valeur du coin inférieur droit par :", boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[0]);
        let topLeftCard = [...boardValuesCorner.get(JSON.stringify([secondLastNumber - 1, lastNumber]))];
        topLeftCard[3] = boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[0];
        boardValuesCorner.set(JSON.stringify([secondLastNumber - 1, lastNumber]), topLeftCard);
    }
    if (boardValuesCorner.has(JSON.stringify([secondLastNumber + 1, lastNumber]))) {
        console.log("On change la valeur du coin supérieur gauche par :", boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[3]);
        let bottomRightCard = [...boardValuesCorner.get(JSON.stringify([secondLastNumber + 1, lastNumber]))];
        bottomRightCard[0] = boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[3];
        boardValuesCorner.set(JSON.stringify([secondLastNumber + 1, lastNumber]), bottomRightCard);
    }
    if (boardValuesCorner.has(JSON.stringify([secondLastNumber, lastNumber - 1]))) {
        console.log("On change la valeur du coin supérieur droit par :", boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[2]);
        let bottomLeftCard = [...boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber - 1]))];
        bottomLeftCard[1] = boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[2];
        boardValuesCorner.set(JSON.stringify([secondLastNumber, lastNumber - 1]), bottomLeftCard);
    }
    if (boardValuesCorner.has(JSON.stringify([secondLastNumber, lastNumber + 1]))) {
        console.log("On change la valeur du coin inférieur gauche par :", boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[1]);
        let topRightCard = [...boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber + 1]))];
        topRightCard[2] = boardValuesCorner.get(JSON.stringify([secondLastNumber, lastNumber]))[1];
        boardValuesCorner.set(JSON.stringify([secondLastNumber, lastNumber + 1]), topRightCard);
    }
}

function updateTimeRemainingValue() {
    const remainingTurnsElements = document.getElementsByClassName('remaining-turns');

    for (let i = 0; i < remainingTurnsElements.length; i++) {
        const remainingTurnsElement = remainingTurnsElements[i];
        const cardId = remainingTurnsElement.parentNode.id;
        const cardPositions = cardId.split('/').slice(-2);
        const cardPosition = JSON.stringify(cardPositions.map(Number));

        if (boardValuesTimeRemaining.has(cardPosition)) {
            let currentValue = boardValuesTimeRemaining.get(cardPosition);
            let decrementedValue = currentValue - 1;
            boardValuesTimeRemaining.set(cardPosition, decrementedValue);

            let sum = 0;
            for (let j = 0; j < 4; j++) {
                sum += boardValuesCorner.get(cardPosition)[j];
            }
            if (sum <= 5) {
                remainingTurnsElement.textContent = "Killed";
            } else if (decrementedValue >= 0) {
                remainingTurnsElement.textContent = decrementedValue;
            } else {
                // La valeur est devenue 0 ou négative, donc supprimer la div time-remaining
                const parentElement = remainingTurnsElement.parentNode;
                parentElement.removeChild(remainingTurnsElement);
            }
        }
    }

    console.log("boardValuesTimeRemaining : ", boardValuesTimeRemaining);
}

function updateTimeRemainingValueToFitData() {
    const remainingTurnsElements = document.getElementsByClassName('remaining-turns');

    for (let i = 0; i < remainingTurnsElements.length; i++) {
        const remainingTurnsElement = remainingTurnsElements[i];
        const cardId = remainingTurnsElement.parentNode.id;
        const cardPositions = cardId.split('/').slice(-2);
        const cardPosition = JSON.stringify(cardPositions.map(Number));

        if (boardValuesTimeRemaining.has(cardPosition)) {
            let currentValue = boardValuesTimeRemaining.get(cardPosition);

            let sum = 0;
            for (let j = 0; j < 4; j++) {
                sum += boardValuesCorner.get(cardPosition)[j];
            }
            if (sum <= 5) {
                remainingTurnsElement.textContent = "Killed";
            } else if (currentValue >= 0) {
                remainingTurnsElement.textContent = currentValue;
            } else {
                // La valeur est devenue 0 ou négative, donc supprimer la div time-remaining
                const parentElement = remainingTurnsElement.parentNode;
                parentElement.removeChild(remainingTurnsElement);
            }
        }
    }
}

function updateMalwareAlive() {
    for (let i = 0; i < malwareCardPositions.length; i++) {
        let sum = 0;
        for (let j = 0; j < 4; j++) {
            sum += boardValuesCorner.get(JSON.stringify(malwareCardPositions[i]))[j];
        }
        if (sum <= 5) {
            malwareCardPositions.splice(i, 1);
            console.log("Malware killed");
        }
    }
}

// Fonction pour mettre à jour les variables partagées côté client
function updateSharedVariables(variables) {
    console.log("On met à jour les variables");


    // Mettre à jour les variables partagées dans le code du client
    countTurns = variables.countTurns;
    cardPositions = variables.cardPositions;
    malwareCardPositions = variables.malwareCardPositions;
    networkCardPositions = variables.networkCardPositions;
    boardValuesCorner = new Map(variables.boardValuesCorner);
    boardValuesTimeRemaining = new Map(variables.boardValuesTimeRemaining);
    idDeckCard = variables.idDeckCard;

    updateScreen();
}

function updateScreen() {

    // Récupérer l'élément du compteur
    const compteurElement = document.getElementById("turn-counter");

    // On actualise le compteur
    compteurElement.innerText = "Turns: " + countTurns + "/" + sizeDeckInit;


    outputVictory();
    outputGameOverHasNoTimeRemaining();
    outputGameOverLessThanFive();

}

function updateChildren(children, secondLastNumber = 0, lastNumber = 0) {

    let child1 = children[1]; // cornerBox1.classList  ('top-left');
    child1NewId = "target/" + (secondLastNumber - 1) + "/" + lastNumber;
    child1.id = child1NewId;
    console.log(child1NewId);

    let child2 = children[2]; // cornerBox2.classList  ('top-right');
    child2NewId = "target/" + secondLastNumber + "/" + (lastNumber + 1);
    child2.id = child2NewId;
    console.log(child2NewId);

    let child3 = children[3]; // cornerBox3.classList  ('bottom-left');
    child3NewId = "target/" + secondLastNumber + "/" + (lastNumber - 1);
    child3.id = child3NewId;
    console.log(child3NewId);

    let child4 = children[4]; // cornerBox4.classList  ('bottom-right');
    child4NewId = "target/" + (secondLastNumber + 1) + "/" + lastNumber;
    child4.id = child4NewId;
    console.log(child4NewId);
}

function updateBoardCard(data) {
    console.log("On met le game-board à jour");

    const cardId = data.cardId;
    const targetId = data.targetId;
    const imageName = data.imageName;
    const secondLastNumber = data.secondLastNumber;
    const lastNumber = data.lastNumber;

    // On retrouve le target à partir de l' ID
    const targetID = "target/" + secondLastNumber + "/" + lastNumber;
    console.log("targetID = ", targetID);
    const targetElement = document.getElementById(targetID);
    console.log("targetElement = ", targetElement);

    let cardElement = createCardElement(imageName, secondLastNumber, lastNumber);

    //On change les id des carrés vides qui sont les enfants de la carte
    let children = cardElement.children;
    updateChildren(children, secondLastNumber, lastNumber);



    if (cardElement && targetElement) {
        targetElement.appendChild(cardElement); // Ajouter la carte dans la cible
    } else {
        console.error("Les éléments DOM n'ont pas été trouvés ou ne sont pas valides.");
    }

    updateTimeRemainingValueToFitData();

}

function reloadPage() {
    location.reload();
}






// =======================================
// ========== Fonction Display ===========
// =======================================

// Fonction pour afficher le nombre de cartes restantes pour chaque type
function outputCardDeck() {
    console.log("Deck :");
    for (let i = 0; i < allCards.length; i++) {
        console.log(allCards[i]);
    }
}

//Fonction pour afficher la victoire des joueurs
function outputVictory() {
    if (isGameWon ()){
        console.log("Victoire !");
        window.alert("Victoire !");
        freezePage();
        endGame();
    }
}

//Fonction pour afficher Game over (Une carte Network a plus que 5)
function outputGameOverLessThanFive() {
    if (! isAllNetworkCardLessThanFive()) {
        console.log("Une carte Network a plus que 5 (Donc game over)");
        window.alert("GAME OVER !! (Un carte a plus que 5 points)");
        freezePage();
        endGame();
    }
}

//Fonction pour afficher Game over (Le compteur d'une carte malware est arrivé à 0)
function outputGameOverHasNoTimeRemaining() {
    if (! isAllMalwareCardHasTimeRemaining()) {
        console.log("Une carte Malware a moin de 0 (Donc game over)");
        window.alert("GAME OVER !! (Vous n'avez pas elimine un malware)");
        freezePage();
        endGame();
    }
}

function outputGameOverTimeOut() {
    console.log("Time out !");
    window.alert("Time out !");
    freezePage();
    endGame();
}

function freezePage() {
    const freezeOverlay = document.getElementById('freeze-overlay');
    freezeOverlay.style.pointerEvents = 'auto'; // Permet aux événements de pointer d'être capturés par l'overlay
    document.body.classList.add('freeze');
}

function unfreezePage() {
    const freezeOverlay = document.getElementById('freeze-overlay');
    freezeOverlay.style.pointerEvents = 'none'; // Bloque les événements de pointer pour l'overlay
    document.body.classList.remove('freeze');
}


function displayAdminView() {
    // Remove Deck
    const deckContainer = document.getElementById('deck');
    deckContainer.parentNode.removeChild(deckContainer);
    displayAdminButtons();
}

function displayAdminButtons() {
    // Créer le bouton "Start"
    const startButton = document.createElement('button');
    startButton.textContent = 'Start';
    startButton.classList.add('header_btn');

    // Créer le bouton "End"
    const endButton = document.createElement('button');
    endButton.textContent = 'End';
    endButton.classList.add('header_btn');

    // Sélectionner l'élément où afficher les boutons
    const buttonContainer1 = document.body;

    // Ajouter les boutons au conteneur
    buttonContainer1.appendChild(startButton);
    buttonContainer1.appendChild(endButton);

    // Ajouter l'événement click aux boutons
    startButton.addEventListener('click', () => {
        // Envoyer un message de démarrage au serveur
        socket.emit('startTimer');
        socket.emit('startGame');
    });

    endButton.addEventListener('click', () => {
        // Envoyer un message de fin au serveur
        endGame();
    });
    displayToggle("turnMode", buttonContainer1, "turnModeOn", "turnModeOff");

    displayToggle("talk", buttonContainer1, "speakOn", "speakOff");
}


function displayToggle(idInput, buttonContainer, state1, state2) {
    // Créer le bouton toggle
    const toggleLabel = document.createElement('label');
    toggleLabel.classList.add('toggle');
    toggleLabel.id = idInput;

    const toggleInput = document.createElement('input');
    toggleInput.classList.add('toggle-checkbox');
    toggleInput.type = 'checkbox';
    toggleInput.checked = false;

    const toggleSwitch = document.createElement('div');
    toggleSwitch.classList.add('toggle-switch');

    const toggleSpan = document.createElement('span');
    toggleSpan.classList.add('toggle-label');
    toggleSpan.textContent = idInput;

    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSwitch);
    toggleLabel.appendChild(toggleSpan);

    // Sélectionner l'élément où afficher le bouton toggle
    buttonContainer.classList.add('button-container');

    // Ajouter le bouton toggle au conteneur
    buttonContainer.appendChild(toggleLabel);

    // Ajouter les événements de changement d'état du bouton toggle
    toggleInput.addEventListener('change', () => {
        if (toggleInput.checked) {
            // Envoyer un message "turnModeOn" au serveur
            socket.emit(state1);
        } else {
            // Envoyer un message "turnModeOff" au serveur
            socket.emit(state2);
        }
    });
}

function removeToggle(idInput) {
    // Sélectionner l'élément contenant le bouton toggle avec l'ID spécifié
    const toggleElement = document.getElementById(idInput);
    // Vérifier si l'élément existe avant de le supprimer
    if (toggleElement) {
        // Supprimer l'élément contenant le bouton toggle
        toggleElement.remove();
    }
}

function displayPlayerView() {
    // Ajoutez un écouteur d'événement sur le deck pour appeler la fonction drawCard(id) lors d'un clic
    const deckElement = document.getElementById('deck');
    deckElement.addEventListener('click', drawCard);

    // Supprimer les éléments "Pause", "Unpause" et "Reset" du minuteur
    const timerButtonsContainer = document.getElementById('timer-buttons');
    timerButtonsContainer.innerHTML = '';


    // Appel de la fonction pour initialiser la main du joueur
    initializePlayerHand();
    outputCardDeck();
    freezePage();
}

function displaySpectatorView() {
    // Remove Deck
    const deckContainer = document.getElementById('deck');
    deckContainer.parentNode.removeChild(deckContainer);

    // Supprimer les éléments "Pause", "Unpause" et "Reset" du minuteur
    const timerButtonsContainer = document.getElementById('timer-buttons');
    timerButtonsContainer.innerHTML = '';

    freezePage();
}
