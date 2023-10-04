// The fact that Node does not have a synchronous, blocking readline
// API is disgusting and one of the several reasons I despise this
// language
const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");
const { Player, AiPlayer, Rules } = require("./core.js");

/**
 * An RPS-style game.
 */
class Game {
  /**
   * Create a new game.
   * @param {[Player]} players - The players of the game.
   * @param {Rules} rules - The rules of the RPS-style game.
   */
  constructor(players, rules) {
    this.players = players;
    this.rules = rules;
  }

  /**
   * Start the game.
   */
  main() {
    for (;;) {
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

  /**
   * Play a round of the game.
   */
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

/**
 * A human player.
 * 
 * This class blocks on stdin.
 */
class HumanPlayer extends Player {
  /**
   * Create a new human player.
   * @param {string} name - The name the player should be referred to as.
   */
  constructor(name) {
    super(name);
  }

  /**
   * Get the choice of the player (this function blocks).
   * @param {Rules} rules - The rules of the RPS-style game.
   * @returns {string} The choice of the player (from stdin).
   */
  get_choice(rules) {
    let choices = rules.choices;
    for (;;) {
      console.log(`Hello ${this.name}! Choose one of ${choices.join(", ")}!`);
      let choice = prompt("Choice: ");
      if (choices.includes(choice)) return choice;
    }
  }
}

/**
 * Ask the player what rules they want to load.
 * @returns {Rules} The rules the player has chosen.
 */
function get_rules() {
  let choice = prompt("[C]reate or [L]oad game: ");

  if (choice[0].toLowerCase() === "c") return create_rules();

  for (;;) {
    let game_path = prompt("RPS-style game path: ");

    try {
      return new Rules(fs.readFileSync(game_path));
    } catch {
      console.error("Invalid file!");
    }
  }
}

/**
 * Ask the player to create a set of rules for the game.
 * @returns {Rules} The rules the player created.
 */
function create_rules() {
    let rules = new Rules();
    const rule_regex = /(\w+) beats (\w+)/i;

    console.log();
    console.log("NOTE: To finish inputting rules, leave the prompt blank.");
    console.log();
    for ( ; ; ) {
        let rule_str = prompt("Enter a rule in the format 'X beats Y': ");
        
        if (!rule_str) break;

        let result = rule_regex.exec(rule_str);

        if (!result) {
            console.log("Invalid format");
            continue;
        }

        try {
            rules.add_rule(result[2], result[1]);
        } catch {
            console.log("Rule conflicts with another rule!");
        }
    }

    let path = prompt("Where do you want to save the rules: ");
    fs.writeFileSync(path, rules.stringify());

    return rules;
}

/**
 * Ask the host what human and AI players they want to add.
 * @returns {[Player]} The players of the game.
 */
function get_players() {
  let player_count = parseInt(prompt("How many humans do you want: "));
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

/**
 * The main function.
 */
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
