const generateBingoCard = () => {
    let card = [];
    const ranges = [
        { min: 1, max: 15 },   // B
        { min: 16, max: 30 },  // I
        { min: 31, max: 45 },  // N
        { min: 46, max: 60 },  // G
        { min: 61, max: 75 }   // O
    ];

    let columns = [];
    for (let i = 0; i < 5; i++) {
        let column = [];
        while (column.length < 5) {
            let num = Math.floor(Math.random() * (ranges[i].max - ranges[i].min + 1)) + ranges[i].min;
            if (!column.includes(num)) {
                column.push(num);
            }
        }
        columns.push(column);
    }

    // Matrix (5x5) gara row-tti jijjiiruuf
    for (let i = 0; i < 5; i++) {
        card[i] = [];
        for (let j = 0; j < 5; j++) {
            // Gidduu kaardii sanaa "FREE" (0) gochuuf
            if (i === 2 && j === 2) {
                card[i][j] = 0; 
            } else {
                card[i][j] = columns[j][i];
            }
        }
    }
    return card;
};

module.exports = generateBingoCard;