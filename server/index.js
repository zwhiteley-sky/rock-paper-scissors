const ws = require("ws");
const { Rules, Player, PseudoPlayer } = require("./core");
const {
  Request,
  PlayerListResponse,
  ErrorRequest,
  CreateGameRequest,
  JoinRequest,
  NotifyJoinRequest,
  JoinResponse,
  NotifyLeaveRequest,
  ChoiceRequest,
  MakeChoiceRequest,
  ResultsRequest,
} = require("./requests");

/**
 * A remote player.
 */
class RemotePlayer extends PseudoPlayer {
  /**
   * Create a new remote player.
   * @param {string} name - The name of the player.
   * @param {Rules} rules - The rules of the game.
   * @param {ws.WebSocket} connection - The connection to the player.
   */
  constructor(name, rules, connection) {
    super(name, rules);
    this.connection = connection;
  }
}

/**
 * An active game.
 */
class Game {
  /**
   * Create a new game.
   * @param {string} name - The name of the game.
   * @param {string | undefined} password - The password of the game.
   * @param {ws.WebSocket} connection - The controller's connection.
   * @param {Rules} rules - The rules of the game.
   */
  constructor(name, password, connection, rules) {
    /**
     * The name of the game.
     * @type {string}
     */
    this.name = name;

    /**
     * The password of the game.
     * @type {string | undefined}
     */
    this.password = password;

    /**
     * The controller's connection.
     * @type {ws.WebSocket}
     */
    this.connection = connection;

    /**
     * The rules of the game.
     * @type {Rules}
     */
    this.rules = rules;

    /**
     * The players of the game.
     * @type {[Player]}
     */
    this.players = {};

    /**
     * The state of the game.
     * @type {string}.
     */
    this.state = "open";
  }

  /**
   * Add a player to the game.
   * @param {string} player - The name of the player.
   * @param {ws.WebSocket} connection - The connection to the player.
   * @param {string | undefined} password - The password to the game.
   * @returns {boolean} Whether the player was added.
   */
  add_player(player, connection, password) {
    if (this.state !== "open") {
      connection.send(new ErrorRequest("game is not open").stringify());
      connection.close();
      return false;
    }

    if (this.password && this.password !== password) {
      connection.send(new ErrorRequest("incorrect password").stringify());
      connection.close();
      return false;
    }

    if (this.players[player]) {
      connection.send(
        new ErrorRequest("player with that name already exists").stringify()
      );
      connection.close();
      return false;
    }

    this.players[player] = new RemotePlayer(player, this.rules, connection);
    this.players[player].connection.send(
      new JoinResponse(this.rules, Object.keys(this.players)).stringify()
    );

    for (let p in this.players) {
      if (p === player) continue;

      this.players[p].connection.send(
        new NotifyJoinRequest(player).stringify()
      );
    }
    this.connection.send(new NotifyJoinRequest(player).stringify());

    return true;
  }

  /**
   * Delete a player from the game.
   * @param {string} player - The player to remove.
   */
  del_player(player) {
    if (!this.players[player]) return false;

    if (this.state !== "open") {
      this.close();
      return true;
    }

    delete this.players[player];

    for (let p of Object.values(this.players)) {
      p.connection.send(new NotifyLeaveRequest(player).stringify());
    }
    this.connection.send(new NotifyLeaveRequest(player).stringify());

    return false;
  }

  /**
   * Handle a request from the game controller.
   * @param {string} message - The request from the game controller.
   */
  controller_request(message) {
    let request = JSON.parse(message);
    switch (request.type) {
      case "player-list": {
        this.player_list(this.connection);
        break;
      }
      case "start-game": {
        if (this.state !== "open") {
          this.connection.send(
            new ErrorRequest("game already started").stringify()
          );
          break;
        }
        this.start_game();
        break;
      }
    }
  }

  player_request(player, message) {
    let request = JSON.parse(message);

    switch (request.type) {
      case "player-list": {
        this.player_list(this.players[player].connection);
        break;
      }
      case "make-choice": {
        request = MakeChoiceRequest.parse(message);
        this.set_choice(player, request.choice);
        break;
      }
    }
  }

  player_list(connection) {
    connection.send(
      new PlayerListResponse(Object.keys(this.players)).stringify()
    );
  }

  start_game() {
    if (this.state !== "open") {
      this.connection.send(
        new ErrorRequest("game already started").stringify()
      );
      return;
    }

    if (!Object.keys(this.players).length) {
      this.connection.send(new ErrorRequest("not enough players").stringify());
      return;
    }

    // Update state
    this.state = "started";

    for (let player of Object.values(this.players)) {
      player.connection.send(new ChoiceRequest().stringify());
    }
  }

  set_choice(player_name, choice) {
    const player = this.players[player_name];

    if (this.state !== "started") {
      player.connection.send(
        new ErrorRequest("the game has not started").stringify()
      );
      return;
    }

    if (player.choice) {
      player.connection.send(
        new ErrorRequest("choice already submitted").stringify()
      );
      return;
    }

    if (!this.rules.choices.includes(choice)) {
      player.connection.send(
        new ErrorRequest("invalid choice submitted").stringify()
      );
    }

    player.set_choice(choice);

    this.attempt_reveal();
  }

  attempt_reveal() {
    // Unsure if Object.values is deterministic
    let players = Object.values(this.players);

    // Check to ensure all players have selected a choice
    for (let player of players) {
      if (!player.choice) return;
    }

    // NOTE: we cannot do this in the loop above as `get_choice`
    // causes the choice to be deleted.
    let choices = players.map(p => p.get_choice());

    this.state = "open";

    let winner_idx = this.rules.test(choices);
    let response;

    let player_choices = {};
    for (let i = 0; i < players.length; ++i) {
      player_choices[players[i].name] = choices[i];
    }

    if (winner_idx !== -1) {
      response = new ResultsRequest(
        player_choices,
        players[winner_idx].name
      ).stringify();
    } else {
      response = new ResultsRequest(player_choices, null).stringify();
    }

    for (let player of players) {
      player.connection.send(response);
    }
    this.connection.send(response);
  }

  /**
   * Close the connection.
   */
  close() {
    try {
      this.connection.close();
    } catch {}

    for (let player of Object.values(this.players)) {
      try {
        player.connection.close();
      } catch {}
    }
  }
}

let games = {};

let wss = new ws.WebSocketServer({
  port: 8080,
  perMessageDeflate: false,
});

wss.on("connection", function (connection) {
  let state = {
    type: "initial",
  };

  connection.on("message", function (message) {
    let request = JSON.parse(message);

    if (state.type === "initial") {
      if (request.type === "create") {
        request = CreateGameRequest.parse(message);

        if (games[request.name]) {
          connection.send(new ErrorRequest("game already exists").stringify());
          connection.close();
          return;
        }

        games[request.name] = new Game(
          request.name,
          request.password,
          connection,
          request.rules
        );

        state = {
          type: "controller",
          name: request.name,
        };

        return;
      }

      if (request.type === "join") {
        request = JoinRequest.parse(message);

        if (!games[request.game_name]) {
          connection.send(new ErrorRequest("game does not exist").stringify());
          connection.close();
          return;
        }

        let success = games[request.game_name].add_player(
          request.player_name,
          connection,
          request.game_password
        );

        if (success) {
          state = {
            type: "player",
            name: request.game_name,
            player: request.player_name,
          };
        }

        return;
      }

      connection.send(new ErrorRequest("invalid request").stringify());
      connection.close();
      return;
    }

    // Once a connection has been established, forward all
    // requests
    if (state.type === "controller") {
      games[state.name].controller_request(message);
      return;
    }

    if (state.type === "player") {
      games[state.name].player_request(state.player, message);
      return;
    }
  });

  connection.on("close", function () {
    if (!games[state.name]) return;

    if (state.type === "controller") {
      games[state.name].close();
      delete games[state.name];
      delete state;
      return;
    }

    if (state.type === "player") {
      if (games[state.name].del_player(state.player)) {
        delete games[state.name];
      }
      delete state;
      return;
    }
  });
});

wss.on("error", console.error);
