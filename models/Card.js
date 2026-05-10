const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cardNumber: { type: Number, required: true, min: 1, max: 100 },
    matrix: [[Number]], // Kaardii 5x5
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Card', CardSchema);