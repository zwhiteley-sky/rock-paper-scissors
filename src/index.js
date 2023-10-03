// The fact that Node does not have a synchronous, blocking readline
// API is disgusting and one of the several reasons I despise this
// language
const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");

class Game {
    constructor(players, rules) {
        this.players = players;
        this.rules = rules;
    }

    main() {
        for ( ; ; ) {
            this.play();
            console.log();
            let play_again = prompt("Play Again? ");

            if (play_again[0].toLowerCase() !== "y") break;
            console.log();
        }

        console.log();

        for (let player of this.players) {
            console.log(`${player.name} had a score of ${player.score}`);
        }
    }

    play() {
        let choices = [];
        
        // Gather the players' choices
        for (let player of this.players) {
            choices.push(player.get_choice(this.rules));
        }

        console.log();

        // Print the player's choices
        for (let i = 0; i < this.players.length; ++i) {
            console.log(`${this.players[i].name} picked ${choices[i]}`);
        }

        console.log();

        let winner_idx = this.rules.test(choices);
        if (winner_idx === -1) {
            console.log("It was a tie!");
            return;
        }

        let winner = this.players[winner_idx];
        ++winner.score;
        console.log(`${winner.name} wins!`);
    }
}

class Rules {
    constructor(path) {
        if (path) this.load(path);
        else this._rule_board = {};
    }

    load(path) {
        let contents = fs.readFileSync(path);
        this._rule_board = JSON.parse(contents);
    }

    save(path) {
        fs.writeFileSync(path, JSON.stringify(this._rule_board));
    }

    get options() {
        return Object.keys(this._rule_board);
    }

    add_option(name) {
        if (this._rule_board[name]) return;
        this._rule_board[name] = [];
    }

    add_rule(opt_small, opt_large) {
        if (!this._rule_board[opt_small]) this.add_option(opt_small);
        if (!this._rule_board[opt_large]) this.add_option(opt_large);
        if (this._rule_board[opt_large].indexOf(opt_small) !== -1) return;
        if (this._rule_board[opt_small].indexOf(opt_large) !== -1) 
            throw new RuleError(`contradicting rule ${opt_small} > ${opt_large} exists`);

        this._rule_board[opt_large].push(opt_small);
    }

    test(options) {
        let winning_option = -1;

        // For an option to be "winning", it must beat all other options
        // -- this loop checks each option until a winning option is found.
        for (let i = 0; i < options.length; ++i) {
            winning_option = i;
            for (let j = 0; j < options.length; ++j) {
                if (i === j) continue;

                if (this._rule_board[options[i]].indexOf(options[j]) === -1) {
                    winning_option = -1;
                    break;
                }
            }

            if (winning_option !== -1) return winning_option;
        }

        return -1;
    }
}

class RuleError extends Error {
    constructor(msg) {
        super(`Invalid rule: ${msg}`)
    }
}

class Player {
    constructor(name) {
        this.name = name;
        this.score = 0;
    }
}

class AiPlayer extends Player {
    constructor(number) {
        super(`Robot ${number}`)
    }

    get_choice(rules) {
        let options = rules.options;
        return options[Math.floor(Math.random() * options.length)];
    }
}

class HumanPlayer extends Player {
    constructor(name) {
        super(name)
    }

    get_choice(rules) {
        let options = rules.options;
        for ( ; ; ) {
            console.log(`Hello ${this.name}! Choose one of ${options.join(", ")}!`)
            let choice = prompt("Choice: ");
            if (options.indexOf(choice) !== -1) return choice;
        }
    }
}

function get_rules() {
    for ( ; ; ) {
        let game_path = prompt("RPS-style game path: ");
        try {
            return new Rules(game_path);
        } catch {
            console.error("Invalid file!")
        }
    }
}

function get_players() {
    let player_count = parseInt(prompt("How many humans do you want: "))
    let ai_count = parseInt(prompt("How many AIs do you want: "));
    
    let players = [];

    for (let i = 0; i < player_count; ++i) {
        let player_name = prompt(`Enter player ${i + 1} name: `);
        players.push(new HumanPlayer(player_name));
    }

    for (let i = 0; i < ai_count; ++i) {
        players.push(new AiPlayer(i + 1));
    }

    return players;
}

function main() {
    // So users can escape my wrath
    // Also for some odd reason, `SIGINT` refuses to behave
    process.on("signal", () => process.exit(1));

    let rules = get_rules();
    let players = get_players();

    let game = new Game(players, rules);
    game.main();
}

main();