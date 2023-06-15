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

    // timer
    let intervalId;
    let countdown = 600;
    let resetCountdown = 600;
    
    
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
        console.log(`\n[Connected to Lean Management] ${player.firstname}`);

        // get the arriving name and rules to the client
        socket.emit("setClientName", player.firstname);
        socket.emit("setClientRules", Rules);
        
        // =======================================
        // ============= SETUP PHASE =============
        // =======================================

        // ======== ARRIVING PLAYER ======== 

        // if arriving name is "admin", ask a password
        // else if player connected show rules 
        // else if spectator connected show instructions
        if (player.firstname === "admin") { // admin
            socket.isAdmin = true;
        } 
        else if (gameLaunched === false) { // player
            socket.isAdmin = false;
            socket.emit("show rules", player.firstname, Rules)
        }
        else if (gameLaunched === true) { // spec
            socket.isAdmin = false;
            socket.emit("spectator incomming", player.firstname)
        }

        AllPlayers[socket.id] = player;

        // ============= SPECTATOR ============= 

        // if game launched don't make the user a player but a spectator unless it is an admin.
        if (gameLaunched === false) {
            AllPlayers[socket.id].game.status = "player";
            list_players_name = [];

            for (const trigPlayer of Object.values(AllPlayers)) {
                if (trigPlayer.firstname !== "admin") {
                    list_players_name.push(trigPlayer.firstname);
                }
            }

            io.emit("update players", list_players_name);

        } else if ((gameLaunched === true) && (player.firstname === "admin")) {
            socket.emit("gameLaunched", gameLaunched); // only send the game state to the client
            socket.emit("update players", list_players_name); 
            socket.emit("admin retrieve game phase buttons"); 
            socket.emit("uptdate printed player turn", Current_player);

        } else {
            socket.emit("gameLaunched", gameLaunched); // only send the game state to the client
            AllPlayers[socket.id].game.status = "spectator";
            socket.emit("update players", list_players_name);
        }
        
        // ============= SETUP SOCKET.ON ============= 


        // ask if the socket.id is an admin
        // and return a response to show the different buttons to the current users
        socket.on("ask is admin buttons", () => {
            socket.emit("display admin buttons", socket.isAdmin)
        });

        // change the status and get their first names
        socket.on("make spectator playing", () => {
            if (gameLaunched === false) {
                list_players_name = [];
                for (const trigPlayer of Object.values(AllPlayers)) {
                    trigPlayer.game.status = "player";
                    if (trigPlayer.firstname !== "admin") {
                        list_players_name.push(trigPlayer.firstname);
                    }
                }
                io.emit("update players", list_players_name);
                socket.emit("spec to player");
            }
        });


        // socket.emit("retrieveClientName")
        // socket.on("sendClientName", (TheName) => { clientName = TheName; })


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


        // begin the first turn of the first player
        socket.on("launch game", () => {
            if ((gameLaunched === false) && (socket.isAdmin)) { 
                gameLaunched = true
                console.log(`Game launch : ${gameLaunched}`);
                socket.emit("gameLaunched", gameLaunched); // only send the game state to the client

                //Recupération du nombre de joueurs
                constraints = shuffle(retrieveConstaints(list_players_name.length))

                // give constraints to players
                let i = 0;
                for (let trigId of Object.keys(AllPlayers)) {
                    if (AllPlayers[trigId].firstname !== "admin") {
                        AllPlayers[trigId].game = {
                            constraints: constraints[i],
                        };
                        i++;
                    }
                }

                // Send and show constraints to each player
                for (let trigId of Object.keys(AllPlayers)) {
                    if (AllPlayers[trigId].firstname !== "admin") {
                        io.to(trigId).emit("display Constraints", AllPlayers[trigId].game.constraints);
                    }
                }

                // launch the first turn 
                if (socket.isAdmin) {
                    Current_player = 0;
                    for (let trigId of Object.keys(AllPlayers)) {
                        if (AllPlayers[trigId].firstname === list_players_name[Current_player]) {
                            io.to(trigId).emit("your turn",list_players_name[Current_player]);
                        } else {
                            io.to(trigId).emit("is not your turn",list_players_name[Current_player]);
                        }
                    }
                    io.emit("uptdate printed player turn", Current_player);
                } else {
                    console.log("Unauthorized attempt to launch the game by", AllPlayers[socket.id].firstname);
                }
            }
        });

        // return constraints depending on the number of players
        function retrieveConstaints(numOfPlayers) {
            return cards.contrainte[`${numOfPlayers}players`]; 
        }

        // Ask to change the order of the names in Used_names
        socket.on("mix players", () => {
            io.emit("update players", shuffle(list_players_name));
        });

        // return the entered array mixed
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

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

        
        socket.on("send map to all", (map,rightdown,taille_tab)=> {
            io.emit("incoming map", map,rightdown,taille_tab);
        });

        socket.on("send score", (compteurPoint) => {
            io.emit("incoming score", compteurPoint);
        })  

        
        // =================================
        // =========== END PHASE ===========
        // =================================

        socket.on('finishGame', (path) => {
            gameLaunched = false
            console.log(`Game launch : ${gameLaunched}`);
            socket.emit("gameLaunched", gameLaunched); 

            // clear constraints
            for (let trigId of Object.keys(AllPlayers)) {
                if (AllPlayers[trigId].firstname !== "admin") {
                    AllPlayers[trigId].game = {
                        constraints: "",
                    };
                }
            }
            io.emit("update players", list_players_name);
            io.emit(`end game with ${path}`);
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

