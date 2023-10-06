// Under normal circumstances, I'd just reuse core.js however, due
// to NodeJS and Javascript Web Modules being syntactically
// incompatible, I have to copy :( (or use a script but cba)

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
   * @param {string?} rule_str - A path to an RPS file to load the rules from.
   */
  constructor(rule_str) {
    if (rule_str) this._rule_board = JSON.parse(rule_str);
    else this._rule_board = {};
  }

  /**
   * Convert the `Rules` into a parse-able string.
   * @returns {string} The parse-able data.
   */
  stringify() {
    return JSON.stringify(this._rule_board);
  }

  /**
   * The choices a player can make.
   * @returns {[string]} The choices a player can make.
   */
  get choices() {
    return Object.keys(this._rule_board);
  }

  /**
   * The rules of the RPS-style game.
   * @returns {[Rule]} The rules of the game.
   */
  get rules() {
    return Object.entries(this._rule_board).flatMap((entry) =>
      entry[1].map((b) => {
        return new Rule(entry[0], b)
      })
    );
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
   * Delete a choice.
   * @param {string} name - The name of the choice to delete.
   */
  del_choice(name) {
    if (!this._rule_board[name]) return;

    for (let choice in this._rule_board) {
      this._rule_board[choice] = this._rule_board[choice].filter(
        (c) => c !== name
      );
    }

    delete this._rule_board[name];
  }

  /**
   * Adds a rule.
   *
   * It should be noted that this function will automatically add
   * the choices if they do not already exist.
   *
   * @param {Rule} rule - The rule to add.
   * @throws {RuleError} if the rule is contradictory.
   */
  add_rule(rule) {
    if (rule.beater === rule.beaten)
      throw new RuleError(
        "Cannot create rule where beater and beaten are the same"
      );

    this.add_choice(rule.beater);
    this.add_choice(rule.beaten);

    if (this._rule_board[rule.beater].includes(rule.beaten)) return;
    if (this._rule_board[rule.beaten].includes(rule.beater))
      throw new RuleError(
        `contradicting rule ${rule.beaten} > ${rule.beater} exists`
      );

    this._rule_board[rule.beater].push(rule.beaten);
  }

  /**
   * Delete a rule.
   * @param {Rule} rule - The rule to delete.
   */
  del_rule(rule) {
    if (this._rule_board[rule.beater]) {
      this._rule_board[rule.beater] = this._rule_board[rule.beater].filter(
        (choice) => choice !== rule.beaten
      );
    }
  }

  /**
   * Get a list of all choices that lose against another choice.
   * @param {string} choice - A valid choice for the rules.
   * @returns {[string]} The choices `choice` beats.
   */
  loses_against(choice) {
    return this._rule_board[choice];
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

        if (!this._rule_board[choices[i]].includes(choices[j])) {
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
 * A rule in an RPS-style game.
 */
class Rule {
  /**
   * Create a rule.
   * @param {string} beater - The choice which beats `beaten`.
   * @param {string} beaten - The choice which is beaten by `beater`.
   */
  constructor(beater, beaten) {
    this.beater = beater;
    this.beaten = beaten;
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
   * @param {string} name - The name of the player.
   * @param {Rules} rules - The rules of the game.
   */
  constructor(name, rules) {
    this.name = name;
    this.rules = rules;
    this.score = 0;
  }

  /**
   * Get the choice of the player (e.g., Rock).
   */
  get_choice() {
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
   * @param {Rules} rules - The rules of the game.
   */
  constructor(number, rules) {
    super(`Robot ${number}`, rules);
  }

  /**
   * Get the choice of the AI player.
   * @returns {string} The choice the AI player made (it is randomly chosen
   * from the list of possible choices).
   */
  get_choice() {
    let choices = this.rules.choices;
    return choices[Math.floor(Math.random() * choices.length)];
  }

}

/**
 * A pseudo-player.
 *
 * Normally, players generate their own choices (e.g., by collecting input
 * from the user) and return them. A pseudo-player allows an external
 * source to set the choice the player will return later.
 *
 * This is good for asynchronous environments or environments where the
 * player does not have access to the necessary sources.
 */
class PseudoPlayer extends Player {
  /**
   * Create a new pseudo-player.
   * @param {string} name - The name of the player.
   * @param {Rules} rules - The rules of the game.
   */
  constructor(name, rules) {
    super(name, rules);
  }

  /**
   * Set the choice the player will make next.
   *
   * It should be noted that this will be reset when get_choice is
   * called (meaning each get_choice call will need a corresponding
   * set_choice call).
   *
   * It is up to the caller to ensure that the choice is valid for
   * the ruleset of the next get_choice call.
   *
   * @param {string} choice - The choice the player will make next.
   */
  set_choice(choice) {
    this.choice = choice;
  }

  /**
   * Get the choice of the player.
   * @returns {string} The choice of the player.
   */
  get_choice() {
    // Ensure we do not reuse a previous choice
    // This is for debugging purposes (e.g., if a weird
    // circumstance occurs where a player's choice is not
    // set, reusing an old one will lead to confusion)
    // By resetting it, we'll just get a null error instead,
    // much easier to understand!
    let choice = this.choice;
    this.choice = null;

    return choice;
  }
}

module.exports = { Rules, Rule, RuleError, Player, AiPlayer, PseudoPlayer };