// ==================================
// ========== DEPENDENCIES ==========
// ==================================

require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const { v4: uuidv4 } = require('uuid');

// ======= variables =======
const { sessionMiddleware } = require("./controllers/sessionsController");
const { utilisateurs } = require("./controllers/data");

// ==================================
// ============= SERVER =============
// ==================================

const server = http.createServer(app);

// ======= The Guardians server =======
const ioGuardians = require('./ioServers/theGuardians');
ioGuardians(server);

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

// =====================================
// ============ APP SETTINGS ===========
// =====================================

app.use(sessionMiddleware); // server uses session

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // server can use JSON

app.use((req, res, next) => { 
  const { idUtilisateur } = req.session;
  if (idUtilisateur) {
    res.locals.utilisateur = utilisateurs.find(
      (utilisateur) => utilisateur.id === idUtilisateur
    );
  }
  next();
});

// ===========================================
// ============ INSCRIPTION ROADS ============
// ===========================================


app.get("/", (req, res) => {
  const { utilisateur } = res.locals;
  res.render("index", { games, utilisateur, errorNameMessage, adminIncoming, errorPasswordMessage});
});

app.post("/inscription", (req, res) => {
  const { firstname } = req.body;
  errorNameMessage = "";

  if (firstname){
    let playerExist = false;
    if (firstname !== "admin") { // possible to have severals administrators
      playerExist = (utilisateurs.some(
        (user) => user.firstname === firstname
      ));
    } else {
      adminIncoming = true;
      return res.redirect("/");
    }

    if (!playerExist){
      if (isValidUserName(firstname)){
        let nouvelUtilisateur = {
          "id": uuidv4(),
          "firstname": firstname,
          "game": {}
        };
        utilisateurs.push(nouvelUtilisateur);
        req.session.idUtilisateur = nouvelUtilisateur.id;
        console.log(`Welcome ${firstname}`);
        return res.redirect("/");
      }
    } else { 
      errorNameMessage = `${firstname} is already used`
    }
  } else{
    errorNameMessage = "The field is empty"
  }

  const { utilisateur } = res.locals;
  res.render("index", {games, utilisateur, errorNameMessage, adminIncoming})
});


// ====================================
// ============ GAME ROADS ============
// ====================================

// ======= The Guardians =======
app.get("/theGuardians", (req, res) => {
  const { utilisateur } = res.locals;
  res.render("games/theGuardians", { utilisateur });
});

// =====================================
// ======== ERROR HANDLING ==============
// =====================================

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).send("404 - Page not found");
});

// Handle other errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("500 - Internal Server Error");
});
