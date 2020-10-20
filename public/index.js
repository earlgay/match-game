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

async function init() {
    document.getElementById('newgame-button').onclick = () => location.reload();
    initializeBoard();
}

// Checks if matches occur, and if so then adds to the score. Otherwise, flips cards back over.
async function checkMatch() {
    CURRENT_SCORE++;
    document.getElementById('currentScore').innerHTML = CURRENT_SCORE;
    if (ACTIVE_SET.length === 2) {
        wireCards(false); // Disable flipping cards over until the failed match is reset.
        if (ACTIVE_SET[0].split('_')[0] === ACTIVE_SET[1].split('_')[0]) {
            // Match.
            M.Toast.dismissAll(); // Avoid multiple toasts.
            M.toast({ html: 'You got a match!', displayLength: 93500 });

            // Remove borders that help users know which cards are actively being matched.
            document.getElementById(ACTIVE_SET[0] + '-card').style.border = 'none';
            document.getElementById(ACTIVE_SET[1] + '-card').style.border = 'none';

            // Check if board is complete. If not, keep going.
            if (checkComplete()) {
            } else {
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

    // Check if all cards are matched.
    function checkComplete() {
        let status = null;

        BOARD_ITEMS.forEach(id => {
            if (document.getElementById(id + '-img').style.visibility === 'hidden') status = false;
        });

        if (status === false) return false;
        else {
            document.getElementById('finalScore').innerHTML = CURRENT_SCORE;
            M.Toast.dismissAll(); // Close toasts for matches.
            M.Modal.getInstance(document.getElementById('completeModal')).open();
        }
    }
}

/**
 * Retrieve the board from the cards service, and initialize it on the page.
 * The board is already shuffled when received from the cards service.
 */
function initializeBoard() {
    fetch('/cards')
        .then(response => {
            return response.json();
        })
        .then(result => {
            let cardHTML = '';
            let itemCount = 1;
            cardHTML += '<div class="row">';
            for (let i = 0; i < result.length; i++) {
                // Create rows of 4 cards each.
                if (itemCount % 5 == 0) {
                    cardHTML += '</div><div class="row">';
                    itemCount = 1;
                }

                // Give the matching card an '_1' postfix, which allows us to give them similar names and compare them by splitting off the postfix.
                if (BOARD_ITEMS.includes(result[i].id)) result[i].id = result[i].id + '_1';
                BOARD_ITEMS.push(result[i].id);
                cardHTML += `<div class="col s3"><div class="card"><div id="${result[i].id}-card" class="card-image blue darken-2"><img class="gamepiece" id="${result[i].id}-img" src="${result[i].picture}"></div></div></div>`;
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
                document.getElementById(id + '-card').style.border = '5px solid black';

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
