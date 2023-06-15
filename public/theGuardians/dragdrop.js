// =======================================
// ======= Fonction Drag and Drop ========
// =======================================

// Fonction de démarrage du glisser-déposer
function dragStart(event) {
    const cardId = event.currentTarget.id;
    const cardElement = document.getElementById(cardId);
    const imageElement = cardElement.querySelector('img');
    const imageName = imageElement.src.split('/').pop(); // Obtient le nom de l'image à partir de l'URL

    event.dataTransfer.setData("text", cardId);
    console.log("Le joueur attrape une carte :", cardId);
    console.log("Cela correspond à une image qui a pour graphique :", imageName);
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    console.log("Le joueur dépose une carte");

    event.preventDefault();
    const cardId = event.dataTransfer.getData("text");
    const cardElement = document.getElementById(cardId);
    const targetElement = event.target;

    // Vérifier si la cible est un carré vide
    if (targetElement.classList.contains('corner-box') && targetElement.childElementCount === 0) {
        // Retirer la carte de la main du joueur
        const playerHandElement = document.getElementById('player-hand');

        if (cardElement && playerHandElement) {
            const numbers = targetElement.parentNode.id.split("/").slice(-2);
            var secondLastNumber = parseInt(numbers[0]);
            var lastNumber = parseInt(numbers[1]);
            const imageElement = cardElement.querySelector('img');
            const imageName = imageElement.src.split('/').pop(); // Obtient le nom de l'image à partir de l'URL

            console.log("targetElement.classList : ", targetElement.classList);

            if (targetElement.classList[1] == "top-right") { lastNumber++; }
            if (targetElement.classList[1] == "top-left") { secondLastNumber--; }
            if (targetElement.classList[1] == "bottom-right") { secondLastNumber++; }
            if (targetElement.classList[1] == "bottom-left") { lastNumber--; }

            if (cardIsAlreadyOnBoard(secondLastNumber, lastNumber)) {
                console.log("Une carte est déjà positionnée sur le terrain à l'emplacement cible");
            } else {
				if (!isTurnMode || countCardsPlacedConsecutivelyWithoutDrawing < maxCardsPlacedConsecutively) {
					playerHandElement.removeChild(cardElement);
					cardPositions.push([secondLastNumber, lastNumber]);

					if (['network1.jpg', 'network2.jpg', 'network3.jpg', 'network4.jpg', 'network5.jpg', 'network6.jpg'].includes(imageName)) {
						networkCardPositions.push([secondLastNumber, lastNumber]);
					}
					if (['malware1.jpg', 'malware2.jpg', 'malware3.jpg', 'malware4.jpg', 'knight.jpg'].includes(imageName)) {
						malwareCardPositions.push([secondLastNumber, lastNumber]);
					}
					boardValuesTimeRemaining.set(JSON.stringify([secondLastNumber, lastNumber]), timeRemainingValues.get(imageName));

					updateBoardCornerValue(secondLastNumber, lastNumber, imageName);

					console.log("La carte posée a pour nom :", imageName);
					console.log("La carte posée a pour valeur :", imageValues.get(imageName));
					console.log("boardValuesCorner :", boardValuesCorner);

					targetElement.appendChild(cardElement); // Ajouter la carte dans la cible
					cardElement.id += `/${secondLastNumber}/${lastNumber}`;

					//On change les id des carrés vides qui sont les enfants de la carte
					var children = cardElement.children;
					updateChildren(children, secondLastNumber, lastNumber);

					console.log("Carte ajoutée, cardElement.id :", cardElement.id);

					updateMalwareAlive();
					updateTimeRemainingValue();
					incrementerCompteur();
					countCardsInHand --;
					countCardsPlacedConsecutivelyWithoutDrawing ++;

					outputVictory();
					outputGameOverHasNoTimeRemaining();
					outputGameOverLessThanFive();

					emitSharedVariables();
					emitPlacedCard(cardElement, targetElement, imageName, secondLastNumber, lastNumber);
				} else {
					console.log("Trop de cartes posées sur le terrain pour ce tour");
				}
            }
        } else {
            console.log("L'élément de la carte ou l'élément 'player-hand' n'a pas été trouvé.");
        }
    } else {
        console.log("La cible n'est pas vide");
    }
}


const gameBoardElement = document.getElementById('game-board');
gameBoardElement.addEventListener('dragover', allowDrop);


gameBoardElement.addEventListener('drop', drop);
