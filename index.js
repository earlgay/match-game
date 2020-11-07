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

const express = require('express');
const app = express();
app.use(express.json());
app.use('/', express.static('public'));

// Firebase Admin SDK
const firebase = require('firebase-admin');
firebase.initializeApp();
const auth = firebase.auth(); // Firebase Authentication
const db = firebase.firestore(); // Cloud Firestore
const port = process.env.PORT || '8080';

const collection_name = process.env.COLLECTION_NAME || 'match-high-scores';

app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});

// Load cards from JSON flat-file (pseudo database)
let hipsterDeck = require('./data/cards.json').hipster;
hipsterDeck = hipsterDeck.concat(hipsterDeck);
let dogDeck = require('./data/cards.json').dogs;
dogDeck = dogDeck.concat(dogDeck);
let vacationDeck = require('./data/cards.json').vacation;
vacationDeck = vacationDeck.concat(vacationDeck);
let gcpDeck = require('./data/cards.json').gcp;
gcpDeck = gcpDeck.concat(gcpDeck);

/**
 * Return deck of dogs if individual deck not specified.
 *
 * @param {Function} checkAuth - Middleware for authentication.
 * @returns {Object} - Card deck.
 */
app.get('/cards', checkAuth, (req, res) => res.json(shuffle(dogDeck)));

/**
 * Return requested deck.
 *
 * @param {Function} checkAuth - Middleware for authentication.
 * @returns {Object} - Card deck.
 */
app.get('/cards/:id', checkAuth, (req, res) => {
    if (req.params.id.toLowerCase() === 'hipster') res.json(shuffle(hipsterDeck));
    else if (req.params.id.toLowerCase() === 'dogs') res.json(shuffle(dogDeck));
    else if (req.params.id.toLowerCase() === 'vacation') res.json(shuffle(vacationDeck));
    else if (req.params.id.toLowerCase() === 'gcp') res.json(shuffle(gcpDeck));
    else res.status(400).json({ error: 'Deck not found' });
});

/**
 * Return list of the top 10 scores.
 *
 * @param {Function} checkAuth - Middleware for authentication.
 * @returns {Object} - Top 10 scores.
 */
app.get('/scores', checkAuth, async (req, res) => {
    console.log('Getting scores.');
    try {
        const snapshot = await db.collection(collection_name).orderBy('score', 'asc').limit(10).get();
        let scores = [];
        if (snapshot.size > 0) {
            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
                let score = doc.data();
                score.id = doc.id;
                scores.push(score);
            });
        }
        res.status(200).json({ scores: scores });
    } catch (e) {
        console.error(`Error getting scores: ${e}`);
        res.status(500).json({ error: 'Error getting scores' });
    }
});

/**
 * Return score's overall ranking.
 *
 * @param {Function} checkAuth - Middleware for authentication.
 * @returns {Object} - Score rank.
 */
app.get('/scores/:score', checkAuth, async (req, res) => {
    const scoreRank = await getRank(req.params.score);
    if (scoreRank > 0) res.status(200).json({ rank: scoreRank });
    else res.status(400).json({ error: 'Unable to get score' });
});

/**
 * Record new score to Firestore.
 *
 * @param {Function} checkAuth - Middleware for authentication.
 * @returns {Object} - Score rank.
 */
app.post('/scores', checkAuth, async (req, res) => {
    if (!req.body.score) return res.status(500).json({ error: 'No score received in request' });
    try {
        const user = await auth.verifyIdToken(req.headers.authorization);
        const scoreEntry = {
            name: user.name.split(' ')[0],
            email: user.email,
            user_id: user.user_id,
            score: req.body.score,
        };
        const doc = db.collection(collection_name).doc();
        await doc.set(scoreEntry);
        console.log(`New score entry: ${doc.id}`);
        res.status(200).json({ rank: await getRank(req.body.score) });
    } catch (e) {
        res.status(400).json({ error: 'Unable to record score' });
    }
});

/**
 * Shuffle card deck.
 *
 * @param {Array} sourceArray - Deck of cards array.
 * @returns {Array} - Shuffled array.
 */
function shuffle(sourceArray) {
    for (let i = 0; i < sourceArray.length - 1; i++) {
        const j = i + Math.floor(Math.random() * (sourceArray.length - i));
        const temp = sourceArray[j];
        sourceArray[j] = sourceArray[i];
        sourceArray[i] = temp;
    }
    return sourceArray;
}

/**
 * Verify ID tokens using the Firebase Admin SDK: https://firebase.google.com/docs/auth/admin/verify-id-tokens
 *
 * @param {Function} checkAuth - Middleware for authentication.
 */
async function checkAuth(req, res, next) {
    const idToken = req.headers.authorization;
    if (!idToken) {
        console.log(`Error: No ID Token.`);
        return res.status(403).json({ error: 'Unauthorized' });
    }
    await auth
        .verifyIdToken(idToken)
        .then(() => {
            next();
        })
        .catch(function (error) {
            res.status(403).json({ error: 'Unauthorized' });
        });
}

/**
 * Determine rank of the score provided.
 *
 * @param {Integer} score
 */
async function getRank(score) {
    try {
        const snapshot = await db.collection(collection_name).orderBy('score', 'asc').get();
        if (snapshot.size > 0) {
            let scores = [];
            snapshot.forEach(doc => {
                scores.push(doc.data().score);
            });
            return scores.indexOf(parseInt(score)) + 1;
        }
    } catch (e) {
        console.log(`Error getting score ranking: ${e}`);
        return -1;
    }
}
