const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const generateBingoCard = require('../logic/bingoGenerator');

// KAARDII FILACHUU (1-100)
router.post('/select-card', async (req, res) => {
    try {
        const { userId, cardNumber } = req.body;

        // Check if card number is valid
        if (cardNumber < 1 || cardNumber > 100) {
            return res.status(400).json({ msg: "Lakkoofsi kaardii 1-100 gidduu ta'uu qaba" });
        }

        // Kaardii random uumu
        const randomMatrix = generateBingoCard();

        const newCard = new Card({
            user: userId,
            cardNumber: cardNumber,
            matrix: randomMatrix
        });

        await newCard.save();
        res.status(201).json({
            msg: `Kaardii lakkoofsa ${cardNumber} filattaniittu!`,
            card: newCard
        });

    } catch (err) {
        res.status(500).json({ msg: "Error uumameera", error: err.message });
    }
});

// Kaardii User tokkoo fiduu
router.get('/my-cards/:userId', async (req, res) => {
    const cards = await Card.find({ user: req.params.userId });
    res.json(cards);
});

module.exports = router;