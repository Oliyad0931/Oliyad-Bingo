// lobby.js

class BingoLobby {
    constructor() {
        this.cards = this.initializeCards();
        this.players = [];
    }

    initializeCards() {
        const cards = [];
        for (let i = 0; i < 30; i++) {
            cards.push({ id: i, selected: false });
        }
        return cards;
    }

    selectCard(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (card) {
            card.selected = !card.selected;
        }
    }

    getSelectedCards() {
        return this.cards.filter(card => card.selected);
    }
}

const bingoLobby = new BingoLobby();

export default bingoLobby;