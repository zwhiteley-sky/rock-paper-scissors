const { Rules } = require("./core");

/**
 * A request.
 */
class Request {
  /**
   * Create a new WS request.
   * 
   * Note: all constructor overrides must be able to accept no
   * parameters.
   * 
   * @param {string} type - The type of the request.
   */
  constructor(type) {
    if (type)
      this.type = type;
  }

  /**
   * Parse a new WS request.
   * @param {string} request_string - The JSON string of the request.
   * @returns {Request} The parsed request.
   */
  static parse(request_string) {
    let obj = JSON.parse(request_string);
    return Object.assign(new this.constructor(), obj);
  }

  /**
   * Convert the request to a portable JSON string.
   * @returns {string} The JSON string of the request.
   */
  stringify() {
    return JSON.stringify(this);
  }
}

/**
 * An error occurred.
 */
class ErrorRequest extends Request {
  constructor(message) {
    super("error");
    this.message = message;
  }
}

/**
 * A game creation request.
 */
class CreateGameRequest extends Request {
  /**
   * Create a new game.
   * @param {string} name - The name of the game.
   * @param {string | undefined} password - The password of the game.
   */
  constructor(name, password, rules) {
    super("create");
    this.name = name;
    this.password = password;
    this.rules = rules;
  }

  stringify() {
    let obj = {
      type: this.type,
      name: this.name,
      password: this.password,
      rules: this.rules.stringify()
    };
    return JSON.stringify(obj);
  }

  static parse(request_string) {
    let { name, password, rules } = JSON.parse(request_string);
    return new CreateGameRequest(name, password, new Rules(rules));
  }
}

/**
 * A join game request.
 */
class JoinRequest extends Request {
  /**
   * Create a new join request.
   * @param {string} player_name - The name of the new player.
   * @param {string} game_name - The name of the game to join.
   * @param {string | undefined} game_password - The game password.
   */
  constructor(player_name, game_name, game_password) {
    super("join");
    this.player_name = player_name;
    this.game_name = game_name;
    this.game_password = game_password;
  }
}

class JoinResponse extends Request {
  constructor(rules, players) {
    super("join-response");
    this.rules = rules;
    this.players = players;
  }

  stringify() {
    let obj = {
      type: this.type,
      rules: this.rules.stringify(),
      players: this.players
    };
    return JSON.stringify(obj);
  }

  static parse(request_string) {
    let { rules, players } = JSON.parse(request_string);
    return new JoinRequest(new Rules(rules), players);
  }
}

class NotifyJoinRequest extends Request {
  constructor(name) {
    super("notify-join");
    this.name = name;
  }
}

class NotifyLeaveRequest extends Request {
  constructor(name) {
    super("notify-leave");
    this.name = name;
  }
}

/**
 * A controller request for the list of players in the game.
 */
class PlayerListRequest extends Request {
  constructor() {
    super("player-list");
  }
}

/**
 * A response for a player list request.
 */
class PlayerListResponse extends Request {
  /**
   * Create a new player list response.
   * @param {[string]} players - The list of players in the game.
   */
  constructor(players) {
    super("player-list-response");
    this.players = players;
  }
}

class StartGameRequest extends Request {
  constructor() {
    super("start-game");
  }
}

class ChoiceRequest extends Request {
  constructor() {
    super("choice");
  }
}

class MakeChoiceRequest extends Request {
  constructor(choice) {
    super("make-choice");
    this.choice = choice;
  }
}

class ResultsRequest extends Request {
  constructor(choices, winner) {
    super("results");
    this.choices = choices;
    this.winner = winner;
  }
}

module.exports = { 
  Request, 
  ErrorRequest,
  CreateGameRequest,
  JoinRequest,
  JoinResponse,
  NotifyJoinRequest,
  NotifyLeaveRequest,
  PlayerListRequest, 
  PlayerListResponse ,
  StartGameRequest,
  ChoiceRequest,
  MakeChoiceRequest,
  ResultsRequest
};