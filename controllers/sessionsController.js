// session
const session = require("express-session");
require("dotenv").config();
const IN_PRODUCTION = process.env.NODE_ENV === "production";

const sessionMiddleware = session({
    name: process.env.SESSION_NAME,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2, // 2 hour
      sameSite: true,
      secure: IN_PRODUCTION,
    },
});

const wrap = expressMiddleware => (socket, next) =>
  expressMiddleware (socket.request, {}, next);

module.exports = {sessionMiddleware, wrap}