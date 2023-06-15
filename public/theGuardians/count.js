const countdownPreview = 60*6;
const Play_button = document.getElementById("start");
const Pause_button = document.getElementById("pause");
const Reset_button = document.getElementById("reset");

// ============================
// =========== TIMER ==========
// ============================

// when the page is loaded, initialize the timer display to 10:00
document.addEventListener('DOMContentLoaded', () => {
    const minutes = Math.floor(countdownPreview / 60);
    const seconds = countdownPreview % 60;
    const minutesDisplay = (minutes < 10 ? '0' : '') + minutes;
    const secondsDisplay = (seconds < 10 ? '0' : '') + seconds;
    document.querySelector('#timer-minutes').innerHTML = minutesDisplay;
    document.querySelector('#timer-seconds').innerHTML = secondsDisplay;

});

// when receiving a timer update from the server, update the timer display
socket.on('updateTimer', (data) => {
    let minutes = Math.floor(data.countdown / 60);
    let seconds = data.countdown % 60;
    const secondsDisplay = (seconds < 10 ? '0' : '') + seconds;
    const minutesDisplay = (minutes < 10 ? '0' : '') + minutes;
    document.querySelector('#timer-minutes').innerHTML = minutesDisplay;
    document.querySelector('#timer-seconds').innerHTML = secondsDisplay;
});

// when the timer finishes, display an alert and show the start button
socket.on('timerFinished', () => {
    if (gameLaunched === true) {
        socket.emit("finishGame", "minuteur");
        gameLaunched = false;
    }
    socket.emit("resetTimer");
    socket.emit('pauseTimer');
    gameBoard.outerHTML=mapstart;
   // rightdown.outerHTML=cardstart;
    setupPhaseButtons();
});

// when the reset button is clicked, emit a "reset" event to the server
// when the pause button is clicked, emit a "pause" event to the server and show the start button
// when the start button is clicked, emit a "startTimer" event to the server and hide the start button
setTimeout(function() {
    document.querySelector('#reset').addEventListener('click', function() {
        socket.emit('resetTimer');
    });
    document.querySelector('#pause').addEventListener('click', function() {
        if (gameLaunched) {
            socket.emit('pauseTimer');
            Play_button.style.visibility = 'visible';
            Reset_button.style.visibility = 'visible';
            // Mix_players_button.style.display = 'none';
        }
    });
    document.querySelector('#start').addEventListener('click', function() {
        if (gameLaunched) {
            socket.emit('startTimer');
            Play_button.style.visibility = 'hidden';
            Reset_button.style.visibility = 'hidden';
            // Mix_players_button.style.display = 'none';
        }
    });
}, 1000);