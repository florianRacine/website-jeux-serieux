require("dotenv").config();

const games = [
  {
    title: "Lean Management",
    rules :`
    You have a personal objective which is to fulfill your missions by placing the cards to respect your constraints. You will have to obtain the final shape, to win the maximum of points, without revealing your constraints to the other players.\n   
    You will see 9 cards that correspond to automobile production stations. At the beginning of each turn, you may move a single production station anywhere you wish, as long as it is next to another production station.\n   
    The game ends once the shape is completed or after 10 minutes. At the end of the game, points are scored by counting the number of connections made. If you all reach the maximum number of points, you have won. If not, you have not succeeded.
          `,
    image:"/leanManagement/images/leanManagement.png",
    linkView: `http://serious-games.onrender/leanManagement`,
  },
  {
    title: "Extreme Evolution",
    rules :"",
    image:"/extremeEvolution/images/extremeEvolution.png",
    linkView: `http://serious-games.onrender/extremeEvolution`,
  },
  {
    title: "Frenetic Maintenance",
    rules :"",
    image:"/extremeEvolution/images/extremeEvolution.png",
    linkView: `http://serious-games.onrender/freneticMaintenance`,
  },
  {
    title: "The Guardians of cybersecurity",
    rules :"",
    image:"/theGuardians/images/theGuardians.png",
    linkView: `http://serious-games.onrender/theGuardians`,
  }
];

let utilisateurs = [];
 
// let adminHashedPassword;

// (async () => {
//   const salt = await bcrypt.genSalt(10);
//   adminHashedPassword = await bcrypt.hash("aze", salt);
// })();

module.exports = { games, utilisateurs };
