// The fact that Node does not have a synchronous, blocking readline
// API is disgusting and one of the several reasons I despise this
// language
const prompt = require("prompt-sync")({ sigint: true });
const fs = require("fs");

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
 * The rules of the Rock-Paper-Scissors-style game.
 *
 * These rules consist of two components: the choices a player can
 * make (e.g., Rock) and the choice hierarchy (e.g., Rock beats Scissors).
 */
class Rules {
  /**
   * Create a new rules.
   *
   * If `path` is ommitted, a blank instance will be created.
   *
   * @param {string?} path - A path to an RPS file to load the rules from.
   */
  constructor(path) {
    if (path) this.load(path);
    else this._rule_board = {};
  }

  /**
   * Load rules from a file.
   * @param {string} path - A path to an RPS file.
   */
  load(path) {
    let contents = fs.readFileSync(path);
    this._rule_board = JSON.parse(contents);
  }

  /**
   * Save rules to a file.
   *
   * The file will be created/overwritten.
   *
   * @param {string} path - The path to the file.
   */
  save(path) {
    fs.writeFileSync(path, JSON.stringify(this._rule_board));
  }

  /**
   *
   */
  get choices() {
    return Object.keys(this._rule_board);
  }

  /**
   * Add a choice to the game.
   *
   * It should be noted that add_rule automatically adds the choice(s)
   * of the rule, if they do not already exist.
   *
   * @param {string} name - The name of the choice.
   */
  add_choice(name) {
    if (this._rule_board[name]) return;
    this._rule_board[name] = [];
  }

  /**
   * Adds a rule.
   *
   * It should be noted that this function will automatically add
   * the choices if they do not already exist.
   *
   * @param {string} choice_small - The small choice (e.g., what is beaten).
   * @param {string} choice_large - The large choice (e.g., what choice_small is beaten by).
   * @throws {RuleError} if the rule is contradictory.
   */
  add_rule(choice_small, choice_large) {
    if (!this._rule_board[choice_small]) this.add_choice(choice_small);
    if (!this._rule_board[choice_large]) this.add_choice(choice_large);
    if (this._rule_board[choice_large].includes(choice_small)) return;
    if (this._rule_board[choice_small].includes(choice_large))
      throw new RuleError(
        `contradicting rule ${choice_small} > ${choice_large} exists`
      );

    this._rule_board[choice_large].push(choice_small);
  }

  /**
   * Test a set of choices against the rules of the game.
   *
   * @param {[string]} choices - The choices
   * @returns {number} The index of the winning choice (-1 for a tie).
   */
  test(choices) {
    let winning_choice_idx = -1;

    // For an choice to be "winning", it must beat all other options
    // -- this loop checks each option until a winning choice is found.
    for (let i = 0; i < choices.length; ++i) {
      winning_choice_idx = i;
      for (let j = 0; j < choices.length; ++j) {
        if (i === j) continue;

        if (this._rule_board[choices[i]].includes(choices[j])) {
          winning_choice_idx = -1;
          break;
        }
      }

      if (winning_choice_idx !== -1) return winning_choice_idx;
    }

    return -1;
  }
}

/**
 * A rule error.
 */
class RuleError extends Error {
  constructor(msg) {
    super(`Invalid rule: ${msg}`);
  }
}

/**
 * A player of an RPS-style game.
 *
 * This is an abstract class -- inheritors should define their own
 * get_choice function which returns the choice the player makes.
 */
class Player {
  /**
   * Create a new player.
   * @param {string} name - The name of the player
   */
  constructor(name) {
    this.name = name;
    this.score = 0;
  }

  /**
   * Get the choice of the player (e.g., Rock).
   * @param {Rules} rules - The rules of the RPS-style game.
   */
  get_choice(rules) {
    throw new TypeError("not implemented");
  }
}

/**
 * An AI player.
 */
class AiPlayer extends Player {
  /**
   * Create a new AI player.
   * @param {string} number - The number of the AI player.
   */
  constructor(number) {
    super(`Robot ${number}`);
  }

  /**
   * Get the choice of the AI player.
   * @param {Rules} rules - The rules of the RPS-style game.
   * @returns {string} The choice the AI player made (it is randomly chosen
   * from the list of possible choices).
   */
  get_choice(rules) {
    let choices = rules.choices;
    return choices[Math.floor(Math.random() * choices.length)];
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
  for (;;) {
    let game_path = prompt("RPS-style game path: ");
    try {
      return new Rules(game_path);
    } catch {
      console.error("Invalid file!");
    }
  }
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
