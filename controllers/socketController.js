// if the there is no session 
// then don't enter in the socket

const authorizeUser = (socket, next) => {
    if ( !socket.request.session || !socket.request.session.idUtilisateur){
        console.log("Bad request!");
        next (new Error ("Not authorized"));
    }
    else {
        next ();
    }
};

module.exports = {authorizeUser}