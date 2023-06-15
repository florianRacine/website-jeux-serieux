const socketio = require("socket.io");
const { games, utilisateurs } = require("../controllers/data"); // games pour afficher les rules
const {sessionMiddleware, wrap} = require("../controllers/sessionsController");
const {authorizeUser} = require("../controllers/socketController");

module.exports = (server) => {
    // io server
    const io = socketio(server);

    let AllUsers = utilisateurs;
    // let rules1 = games[1].rules;

    // player variables
    let AllPlayers = []; // table of players
    let player = {}; // the player object
    let list_players_name = []; // list of players names
    let playingPlayers = []; // players who are playing

    // game variables
    let countPswTried = 3;

    // timer
    let intervalId;
    var countdown = 600;

    io.use(wrap(sessionMiddleware));
    io.use(authorizeUser);
    // io.use((socket, next) => {
    //     if (socket.request.session.playingGame === "freneticMaintenance") {
    //         next();
    //     } else {
    //         console.log("bad game (freneticMaintenance)")
    //         next(new Error('Wrong game'));
    //     } 
    // });
    io.on("connection", function(socket) {

        // ========================================
        // =========== CONNECTION PHASE ===========
        // ========================================

        // put the user session in the player 
        const user_session_id = socket.request.session.idUtilisateur;
        player = AllUsers.find(
            (utilisateur) => utilisateur.id === user_session_id
        );
        console.log(`\n[Connected to Frenetic Maintenance] ${player.firstname}`);

        // get the arriving name to the client
        socket.emit("takename", player.firstname);
        
        // =======================================
        // ============= SETUP PHASE =============
        // =======================================

        // if arriving name is "admin", ask a password
        if (player.firstname === "admin") socket.emit("ask password", countPswTried)
        socket.on("sent password", (password) => {
            if (password === "aze") {
                socket.isAdmin = true;
                socket.emit("display admin buttons", true)
            } else {
                countPswTried--
                if (countPswTried <= 1) socket.emit("cest ciao");
                socket.emit("password incorrect", password, countPswTried);
            }
        });
        countPswTried = 3 // reset

        // Save the arriving player with his socket.id
        AllPlayers[socket.id] = player;

        // print all of the players arriving in the game
        list_players_name = [];
        for (const trigPlayer of Object.values(AllPlayers)) {
            if (trigPlayer.firstname !== "admin") {
                list_players_name.push(trigPlayer.firstname);
            }
        }
        io.emit("update players", list_players_name);

        // if the socket.id is an admin, then return true
        socket.on("ask is admin", () => {
            if (socket.isAdmin) {
                answer = true
            } else {
                answer = false
            }
            socket.emit("display admin buttons", answer)
        });

        // =================================
        // =========== END PHASE ===========
        // =================================


       
        socket.on("disconnect", () => {
            const disconnectedPlayer = AllPlayers[socket.id];
            console.log(`\n[Disconnected from Frenetic Maintenance] ${disconnectedPlayer.firstname}`);

            // remove disconnected player from list_players_name
            const index = list_players_name.indexOf(disconnectedPlayer.firstname);
            if (index !== -1) {
                list_players_name.splice(index, 1);
            }

            // delete the disconnected player in AllPlayers
            delete AllPlayers[socket.id]

            io.emit("update players", list_players_name);
        });

        
    });
};

