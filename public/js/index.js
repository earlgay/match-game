/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

M.AutoInit(); // Initialize all of the Materialize Components

let BOARD_ITEMS = []; // Holds the overall board cards.
let ACTIVE_SET = []; // Holds the current selected board cards.
let CURRENT_SCORE = -16; // Boards are a static 16 squares.

let idToken; // Authentication token.

/**
 * Initialization logic that handles authentication and wiring buttons.
 */
async function init() {
    firebase.auth().onAuthStateChanged(
        async function (user) {
            if (user) {
                idToken = await user.getIdToken();
                const playerNames = document.getElementsByClassName('playerName');
                for (let i = 0; i < playerNames.length; i++) playerNames[i].innerHTML = user.displayName.split(' ')[0];
                document.getElementById('signin-section').style.visibility = 'hidden';
                document.getElementById('options-section').style.visibility = 'visible';
            } else {
                // User is signed out.
                // Initialize the FirebaseUI Widget using Firebase to allow signing in.
                const ui = new firebaseui.auth.AuthUI(firebase.auth());
                const uiConfig = {
                    signInFlow: 'popup',
                    signInOptions: [
                        // List of OAuth providers supported.
                        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                    ],
                    callbacks: {
                        signInSuccessWithAuthResult: () => false,
                    },
                };
                ui.start('#firebaseui-auth-container', uiConfig);
            }
        },
        function (error) {
            console.error(error);
        }
    );
    document.getElementById('boardSelect-button').onclick = function () {
        document.getElementById('options-section').style.display = 'none';
        document.getElementById('game-section').style.display = 'inline'; // Only make the game board visible after everything has been hooked up.
        initializeBoard();
    };

    document.getElementById('newgame-button').onclick = function () {
        location.reload();
    };

    document.getElementById('scores-button').onclick = async function () {
        M.Modal.getInstance(document.getElementById('scoresModal')).open();
        document.getElementById('scoreList').innerHTML = ''; // Reset every time it's open.
        let result = await (await fetch('/scores', { method: 'GET', headers: { authorization: idToken } })).json();
        if (!result.error) for (let i = 0; i < result.scores.length; i++) document.getElementById('scoreList').innerHTML += i + 1 + '. ' + result.scores[i].name + ': ' + result.scores[i].score + '<br>';
    };

    const signoutButtons = document.getElementsByClassName('signout');
    for (let i = 0; i < signoutButtons.length; i++) {
        signoutButtons[i].onclick = function () {
            firebase
                .auth()
                .signOut()
                .then(
                    function () {
                        console.log('Signed Out');
                        location.reload();
                    },
                    function (error) {
                        console.error('Sign Out Error', error);
                    }
                );
        };
    }
}

/**
 * Checks if matches occur, and if so then adds to the score then checks if game is complete; if complete, records score. Otherwise, flips cards back over.
 */
async function checkMatch() {
    CURRENT_SCORE++;
    document.getElementById('currentScore').innerHTML = CURRENT_SCORE;
    if (ACTIVE_SET.length === 2) {
        wireCards(false); // Disable flipping cards over until the failed match is reset.
        if (ACTIVE_SET[0].split('_')[0] === ACTIVE_SET[1].split('_')[0]) {
            // Match.
            M.Toast.dismissAll(); // Avoid multiple toasts.
            M.toast({ html: 'You got a match! <br> <img id="unicorntoast" src="/img/npgunicorn.png">', classes: 'toastText', displayLength: 3500 });

            // Remove borders that help users know which cards are actively being matched.
            document.getElementById(ACTIVE_SET[0] + '-card').style.border = 'none';
            document.getElementById(ACTIVE_SET[1] + '-card').style.border = 'none';

            // Check if board is complete. If not, keep going.
            if ((await checkComplete()) === false) {
                ACTIVE_SET = [];
                wireCards(true);
            }
        } else {
            // No match.
            setTimeout(() => {
                // Use a timeout so user can process what was compared.
                document.getElementById(ACTIVE_SET[0] + '-img').style.visibility = 'hidden';
                document.getElementById(ACTIVE_SET[1] + '-img').style.visibility = 'hidden';
                document.getElementById(ACTIVE_SET[0] + '-card').style.border = 'none';
                document.getElementById(ACTIVE_SET[1] + '-card').style.border = 'none';
                ACTIVE_SET = [];
                wireCards(true);
            }, 1500);
        }
    }

    /**
     * Check if all cards are matched.
     * @returns {Boolean} - true if board is complete, false if not.
     */
    async function checkComplete() {
        let status = null;

        BOARD_ITEMS.forEach(id => {
            if (document.getElementById(id + '-img').style.visibility === 'hidden') status = false;
        });

        if (status === false) {
            return false;
        } else {
            document.getElementById('finalScore').innerHTML = CURRENT_SCORE;
            await recordHighScore();
            document.getElementById('scoreRank').innerHTML = (await (await fetch('/scores/' + CURRENT_SCORE, { method: 'GET', headers: { authorization: idToken } })).json()).rank;
            M.Toast.dismissAll(); // Close toasts for matches.
            M.Modal.getInstance(document.getElementById('completeModal')).open();
        }
    }

    /**
     * Make a POST call to the scores service to record high score.
     */
    async function recordHighScore() {
        await fetch('/scores', {
            method: 'POST',
            headers: { authorization: idToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: CURRENT_SCORE }),
        });
    }
}

/**
 * Retrieve the board from the cards service, and initialize it on the page.
 * The board is already shuffled when received from the cards service.
 */
function initializeBoard() {
    let boardSelect = document.getElementById('board-select');
    fetch('/cards/' + boardSelect.options[boardSelect.selectedIndex].value, {
        method: 'GET',
        headers: { authorization: idToken },
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (result) {
            let cardHTML = '';
            let itemCount = 1;
            cardHTML += '<div class="row">';
            for (let i = 0; i < result.length; i++) {
                // Create rows of 4 cards each.
                if (itemCount % 5 == 0) {
                    cardHTML += '</div>';
                    cardHTML += '<div class="row">';
                    itemCount = 1;
                }

                // Give the matching card an '_1' postfix, which allows us to give them similar names and compare them by splitting off the postfix.
                if (BOARD_ITEMS.includes(result[i].id)) {
                    result[i].id = result[i].id + '_1';
                }
                BOARD_ITEMS.push(result[i].id);
                cardHTML += '<div class="col s3"><div class="card"><div id="' + result[i].id + '-card" class="card-image green darken-2"><img class="gamepiece" id="' + result[i].id + '-img" src="' + result[i].picture + '"></div>';
                cardHTML += '</div></div>';
                itemCount++;
            }
            if (itemCount % 5 !== 0) cardHTML += '</div>';
            document.getElementById('game-board').innerHTML += cardHTML;
            BOARD_ITEMS.forEach(id => {
                document.getElementById(id + '-img').style.visibility = 'hidden'; // Flip every card face down at start.
                wireCards(true);
            });
        });
}

/**
 * Allow enabling or disabling the onclick functionality on the cards on the board.
 * This is required to prevent the user from clicking before actions are handled.
 *
 * @param {boolean} status: true to wire, false to unwire.
 */
function wireCards(status) {
    if (status) {
        BOARD_ITEMS.forEach(id => {
            // Handle clicking on cards.
            document.getElementById(id + '-card').onclick = function () {
                // Add a border of actively matching cards to help user understand what they are trying to match.
                document.getElementById(id + '-card').style.border = '5px solid #004011';

                // If the card is face down, flip it over then push that card into the active set variable.
                if (document.getElementById(id + '-img').style.visibility === 'hidden') {
                    document.getElementById(id + '-img').style.visibility = 'visible';
                    ACTIVE_SET.push(id);
                    // Finally, run the function to check if there is a match (and count as match, or flip both back over).
                    checkMatch();
                }
            };
        });
    } else {
        BOARD_ITEMS.forEach(id => {
            // Disable onclicks to unwire.
            document.getElementById(id + '-card').onclick = null;
        });
    }
}

window.onload = init;
