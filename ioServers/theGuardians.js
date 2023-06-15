const socketio = require("socket.io");
const bcrypt = require("bcrypt");

const { games, utilisateurs } = require("../controllers/data"); // games pour afficher les rules
const cards = require('../public/leanManagement/cards.json');
const {sessionMiddleware, wrap} = require("../controllers/sessionsController");
const {authorizeUser} = require("../controllers/socketController");

module.exports = (server) => {
    // io server
    const io = socketio(server);

    // general variables
    let AllUsers = utilisateurs;
    let Rules = games[0].rules;
    let adminHashedPassword;
    bcrypt.hash(process.env.ADMPSW, 10).then((hash) => {
        adminHashedPassword = hash;
    });

    // player variables
    let AllPlayers = []; // table of players
    let player = {}; // the player object
    let list_players_name = []; // list of players names and will be playing

    // game variables
    let gameLaunched = false;
    let countPswTried = 3;
    let current_map;
    let Current_player;
    let constraints;

    let turnMode = false;
    let speakMode = true;

    // timer
    let intervalId;
    let countdown = 60*6;
    let resetCountdown = 60*6;


    io.use(wrap(sessionMiddleware));
    io.use(authorizeUser);
    io.on("connection", function(socket) {


        // ========================================
        // =========== CONNECTION PHASE ===========
        // ========================================

        // put the user session in the player 
        const user_session_id = socket.request.session.idUtilisateur;
        player = AllUsers.find(
            (utilisateur) => utilisateur.id === user_session_id
        );
        console.log(`\n[Connected to The Guardians] ${player.firstname}`);

        // get the arriving name and rules to the client
        socket.emit("setClientName", player.firstname);
        socket.emit("setClientRules", Rules);

        // =======================================
        // ============= SETUP PHASE =============
        // =======================================

        // ======== ARRIVING PLAYER ======== 
        if (player.firstname === "admin") { // admin
            socket.isAdmin = true;
            socket.emit("admin", player.firstname)
        } 
        else if (gameLaunched === false) { // player
            socket.isAdmin = false;
            socket.emit("player", player.firstname)
        }
        else if (gameLaunched === true) { // spec
            socket.isAdmin = false;
            socket.emit("spectator", player.firstname)
        }

        AllPlayers[socket.id] = player;

        // ============= SPECTATOR =============

        list_players_name = [];

        for (const trigPlayer of Object.values(AllPlayers)) {
            if (trigPlayer.firstname !== "admin") {
                list_players_name.push(trigPlayer.firstname);
            }
        }

        io.emit("update players", list_players_name);		


        // =====================
        // ======= TIMER =======
        // =====================





        socket.on('resetTimer', () => {
            countdown = resetCountdown;
            io.sockets.emit('updateTimer', {
                countdown: countdown
            });
        });

        socket.on('pauseTimer', () => {
            io.emit("hide players btn");
            clearInterval(intervalId);
        });

        socket.on('startTimer', () => {
            io.emit("show players btn");            
            io.sockets.emit('updateTimer', {
                countdown: countdown
            });
            startTimer();
        });

        function startTimer() {
            intervalId = setInterval(function() {
                countdown--;
                io.sockets.emit('updateTimer', {
                    countdown: countdown
                });
                if (countdown === 0) {
                    clearInterval(intervalId);
                    countdown = resetCountdown;
                    io.sockets.emit('timerFinished');
                    console.log("Timer ended !");
                }
            }, 1000);
        }


        // ====================================
        // ============ GAME PHASE ============
        // ====================================



        socket.on("startGame", () => {
            if ((gameLaunched === false) && (socket.isAdmin)) {
                gameLaunched = true;
                console.log("La partie commence !");
                io.sockets.emit("adminStartGame", turnMode);
                Current_player = 0;
                if (turnMode) {
                    for (let trigId of Object.keys(AllPlayers)) {
                        if (AllPlayers[trigId].firstname === list_players_name[Current_player]) {
                            io.to(trigId).emit("your turn",list_players_name[Current_player]);
                        } else {
                            io.to(trigId).emit("is not your turn",list_players_name[Current_player]);
                        }
                    }
                    io.emit("uptdate printed player turn", Current_player);
                }

            } else {
                console.log("Unauthorized attempt to launch the game by", AllPlayers[socket.id].firstname);
            }
        });

        socket.on("turnModeOn", () => {
            turnMode = true;
            console.log("L'admin à activer le mode tour par tour");
        });

        socket.on("turnModeOff", () => {
            turnMode = false;
            console.log("L'admin à désactiver le mode tour par tour");
        });

        socket.on("speakOn", () => {
            speakMode = true;
            console.log("L'admin à activer le droit de parler");
            io.emit("adminAllowedTalk");
        });

        socket.on("speakOff", () => {
            speakMode = false;
            console.log("L'admin à désactiver le droit de parler");
            io.emit("adminDeniedTalk");
        });


        // if during the Current_player's turn the Current_player Valid,change the number of the turn 
        // uptdate the game state for the new turn
        socket.on("change turn", () => {
            if (gameLaunched === true) {
                if (AllPlayers[socket.id].firstname === list_players_name[Current_player]) {
                    io.to(socket.id).emit("is not your turn",list_players_name[Current_player]);
                    Current_player = (Current_player + 1) % list_players_name.length
                    // next player
                    for (let trigId of Object.keys(AllPlayers)) {
                        if (AllPlayers[trigId].firstname === list_players_name[Current_player]) {
                            io.to(trigId).emit("your turn",list_players_name[Current_player]);
                            break;
                        }
                    }
                    io.emit("uptdate printed player turn", Current_player);
                } else {
                    console.log(`${AllPlayers[socket.id].firstname} can't valid, this is ${list_players_name[Current_player]} to play`)
                }
            }
        });



        // ========================================
        // =========== SHARE VARIABLES ============
        // ========================================

        // Réception des variables partagées du client
        socket.on('sharedVariables', (variables) => {
            sharedVariables = variables;

            // Diffusion des variables partagées aux autres joueurs
            socket.broadcast.emit('sharedVariables', sharedVariables);

        });



        // Écoutez l'événement 'sharedCard' émis par le client
        socket.on('sharedCard', (data) => {
            console.log('Données de la carte placée reçues :', data);

            // Renvoyez les données de la carte placée à tous les clients connectés (sauf à l'expéditeur)
            socket.broadcast.emit('sharedCard', data);
        });


        // =================================
        // =========== END PHASE ===========
        // =================================


        socket.on('finishGame', (path) => {
            gameLaunched = false;
            turnMode = false;
            console.log(`Game launch : ${gameLaunched}`);
            socket.emit("gameLaunched", gameLaunched); 
            io.emit("endGame");
        });


        // if disconnection
        socket.on("disconnect", () => {
            const disconnectedUser = AllPlayers[socket.id];
            console.log(`\n[Disconnected from Lean Management (${disconnectedUser.game.status})] ${disconnectedUser.firstname}`);

            // remove disconnected player from list_players_name
            const index = list_players_name.indexOf(disconnectedUser.firstname);
            if (index !== -1) {
                list_players_name.splice(index, 1);
                io.emit("update players", list_players_name);
            }

            // delete the disconnected player in AllPlayers
            delete AllPlayers[socket.id]
        });
    });
};

