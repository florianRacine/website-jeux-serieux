// ==================================
// ========== DEPENDENCIES ==========
// ==================================

require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
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

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// =====================================
// ============ APP SETTINGS ===========
// =====================================

app.use(helmet());

app.use(sessionMiddleware);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  const { idUtilisateur } = req.session;
  if (idUtilisateur) {
    res.locals.utilisateur = utilisateurs.find(
      (utilisateur) => utilisateur.id === idUtilisateur
    );
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===========================================
// ============ INSCRIPTION ROADS ============
// ===========================================

app.get("/", (req, res) => {
  const { utilisateur } = res.locals;
  res.render("index", {
    games,
    utilisateur,
    errorNameMessage,
    adminIncoming,
    errorPasswordMessage,
  });
});

app.post("/inscription", (req, res) => {
  const { firstname } = req.body;
  errorNameMessage = "";

  if (firstname) {
    let playerExist = false;
    if (firstname !== "admin") {
      playerExist = utilisateurs.some((user) => user.firstname === firstname);
    } else {
      adminIncoming = true;
      return res.redirect("/");
    }

    if (!playerExist) {
      if (isValidUserName(firstname)) {
        let nouvelUtilisateur = {
          id: uuidv4(),
          firstname: firstname,
          game: {},
        };
        utilisateurs.push(nouvelUtilisateur);
        req.session.idUtilisateur = nouvelUtilisateur.id;
        console.log(`Welcome ${firstname}`);
        return res.redirect("/");
      }
    } else {
      errorNameMessage = `${firstname} is already used`;
    }
  } else {
    errorNameMessage = "The field is empty";
  }

  const { utilisateur } = res.locals;
  res.render("index", {
    games,
    utilisateur,
    errorNameMessage,
    adminIncoming,
  });
});

function isValidUserName(nameToTest) {
  if (!/^[a-zA-Z0-9]+$/.test(nameToTest)) {
    errorNameMessage = "You are using wrong characters";
    return false;
  }

  if (nameToTest.length > 8) {
    errorNameMessage = "This name is too long";
    return false;
  }

  return true;
}

app.post("/verifpassword", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMPSW) {
    let nouvelUtilisateur = {
      id: uuidv4(),
      firstname: "admin",
      game: {},
    };
    utilisateurs.push(nouvelUtilisateur);
    req.session.idUtilisateur = nouvelUtilisateur.id;
    console.log(`Welcome ${nouvelUtilisateur.firstname}`);
    adminIncoming = false;
    errorPasswordMessage = "";
    return res.redirect("/");
  } else {
    errorPasswordMessage = "Wrong password";
    return res.redirect("/");
  }
});

app.get("/deconnexion", (req, res) => {
  adminIncoming = false;

  const { idUtilisateur } = req.session;
  const index = utilisateurs.findIndex(
    (utilisateur) => utilisateur.id === idUtilisateur
  );
  if (index !== -1) {
    console.log(`Bye ${utilisateurs[index].firstname}`);
    utilisateurs.splice(index, 1);
  }

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
    errorNameMessage = "You must enter a name";
    res.redirect("/");
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

// ======= Frenetic Maintenance =======
app.get("/freneticMaintenance", protectionRoute, (req, res) => {
  const { utilisateur } = res.locals;
  res.render("games/freneticMaintenance", { utilisateur });
});

// ======= The Guardians =======
app.get("/theGuardians", protectionRoute, (req, res) => {
  const { utilisateur } = res.locals;
  res.render("games/theGuardians", { utilisateur });
});

