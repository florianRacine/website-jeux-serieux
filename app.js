// ==================================
// ========== DEPENDENCIES ==========
// ==================================

require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const helmet = require("helmet");

// ======= variables =======
const { sessionMiddleware } = require("./controllers/sessionsController");
const { games, utilisateurs } = require("./controllers/data");
let errorNameMessage = "";
let errorPasswordMessage = "";
let adminIncoming = false;

// ==================================
// ============= SERVER =============
// ==================================

// const Server = http.createServer(app)
// Server.listen(process.env.LEANPORT, () => {
//   console.log(`Lean Management runs on ${process.env.LEANPORT}'s port`);
// });

// ======= Lean Management server =======
const leanServer = http.createServer(app)
const ioLean = require('./ioServers/LeanManagement');
ioLean(leanServer);
leanServer.listen(process.env.LEANPORT, () => {
  console.log(`Lean Management runs on ${process.env.LEANPORT}'s port`);
});

// ======= Extreme Evolution server =======
const serverExtreme = http.createServer(app)
const ioForEE = require('./ioServers/ExtremeEvolution');
ioForEE(serverExtreme);
serverExtreme.listen(process.env.EXTREMEPORT, () => {
  console.log(`Extreme Evolution runs on ${process.env.EXTREMEPORT}'s port`);
});

// ======= Frenetic Maintenance server =======
const freneticServer = http.createServer(app)
const ioFrenetic = require('./ioServers/FreneticMaintenance');
ioFrenetic(freneticServer);
freneticServer.listen(process.env.FRENETICPORT, () => {
  console.log(`Frenetic Maintenance runs on ${process.env.FRENETICPORT}'s port`);
});

// ======= Frenetic Maintenance server =======
const guardiansServer = http.createServer(app)
const ioGuardians = require('./ioServers/theGuardians');
ioGuardians(guardiansServer);
guardiansServer.listen(process.env.GUARDIANSPORT, () => {
  console.log(`The Guardians runs on ${process.env.GUARDIANSPORT}'s port`);
});

// =====================================
// ============ APP SETTINGS ===========
// =====================================

app.use(helmet()); 

app.use(sessionMiddleware); // server use session

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // server can use json

app.use((req, res, next) => { 
  const { idUtilisateur } = req.session;
  if (idUtilisateur) {
    res.locals.utilisateur = utilisateurs.find(
      (utilisateur) => utilisateur.id === idUtilisateur
    );
  }
  next();
});

app.use(express.static(path.join(__dirname, "public"))); // set the static path

app.set("view engine", "ejs"); // set the type of views
app.set("views", path.join(__dirname, "views")); // path of all views


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

function isValidUserName(nameToTest) {
  if (!/^[a-zA-Z0-9]+$/.test(nameToTest)) {  
    errorNameMessage = 'You are using wrong caracters'
    return false;
  }

  if (nameToTest.length > 8) {
    errorNameMessage = 'This name is too long'
    return false;
  }
  
  return true;
}

app.post("/verifpassword", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMPSW){ // password's good 
    let nouvelUtilisateur = {
      "id": uuidv4(),
      "firstname": "admin",
      "game": {}
    };
    utilisateurs.push(nouvelUtilisateur);
    req.session.idUtilisateur = nouvelUtilisateur.id;
    console.log(`Welcome ${nouvelUtilisateur.firstname}`);
    adminIncoming = false;
    errorPasswordMessage = "";
    return res.redirect("/");

  } else { 
    errorPasswordMessage = "Wrong password"
    return res.redirect("/");
  }
});

app.get("/deconnexion", (req, res) => {
  adminIncoming = false;
  // delete the player in the json
  const { idUtilisateur } = req.session;
  const index = utilisateurs.findIndex(
    (utilisateur) => utilisateur.id === idUtilisateur
  );
  if (index !== -1) {
    console.log(`Bye ${utilisateurs[index].firstname}`);
    utilisateurs.splice(index, 1);
  }

  // delete the session 
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.clearCookie(process.env.SESSION_NAME);
    res.redirect("/");
  });
});


// ====================================
// ============ GAME ROADS ============
// ====================================

const protectionRoute = (req, res, next) => {
  if (!req.session.idUtilisateur) {
    errorNameMessage = "You must enter a name"
    res.redirect("/")
  } else {
    next();
  }
};

// ======= Lean Management ======= 
app.get("/leanManagement", protectionRoute, (req, res) => {
  const { utilisateur } = res.locals;
  res.render("games/leanManagement", { utilisateur });
});

// ======= Extreme Evolution =======
app.get("/extremeEvolution", protectionRoute, (req, res) => {
  const { utilisateur } = res.locals;
  res.render("games/extremeEvolution", { utilisateur });
});

// ======= Frentetique maintenance =======
app.get("/freneticMaintenance", protectionRoute, (req, res) => {
  const { utilisateur } = res.locals;
  res.render("games/freneticMaintenance", { utilisateur });
});

// ======= The Guardians =======
app.get("/theGuardians", protectionRoute, (req, res) => {
  const { utilisateur } = res.locals;
  res.render("games/theGuardians", { utilisateur });
});
