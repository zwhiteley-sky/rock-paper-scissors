import { AiPlayer, Player, Rules } from "./core.js";

/**
 * Asynchronously delay for timeout ms.
 * @param {number} timeout - The time to delay in milliseconds.
 * @returns {Promise}
 */
function delay(timeout) {
  return new Promise((res) => setTimeout(res, timeout));
}

/**
 * An RPS-style game with a WebUI.
 */
class Game {
  /**
   * Create a new WebUI game.
   * @param {Rules} rules - The rules of the RPS-style game.
   */
  constructor(rules) {
    /**
     * @type {Rules}
     */
    this.rules = rules;

    /**
     * The players of the game.
     * @type {[Player]}
     */
    this.players = [];

    // Create the play area.
    this.area = document.createElement("section");
    this.area.className = "playarea";
    document.body.appendChild(this.area);

    // Start the game
    this.start();
  }

  /**
   * Start the game.
   *
   * This function will be called by the constructor and should not
   * be called directly.
   */
  start() {
    this.name_selection();
  }

  /**
   * Ask the player to select their name.
   *
   * This function will be called by the constructor and should not
   * be called directly. This function should not be called more than
   * once.
   */
  name_selection() {
    this.clear();

    let title = document.createElement("h1");
    title.innerText = "What is you name?";

    let form = document.createElement("form");

    let name_input = document.createElement("input");
    name_input.name = "player-name";
    name_input.minLength = "1";
    name_input.placeholder = "Your name";

    form.appendChild(name_input);
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();

      if (!name_input.value) {
        name_input.required = true;
        return false;
      }

      this.players.push(new PseudoPlayer(name_input.value, this.rules));
      this.ai_selection();
    });

    this.area.appendChild(title);
    this.area.appendChild(form);

    name_input.focus();
  }

  /**
   * Select the number of AI players.
   *
   * This function will be called automatically when the game
   * is started and should not be called directly. This function
   * should only be called once.
   */
  ai_selection() {
    this.clear();

    let title = document.createElement("h1");
    title.innerText = "How many AIs do you want?";

    let form = document.createElement("form");

    let ai_input = document.createElement("input");
    ai_input.name = "ai-count";
    ai_input.type = "number";
    ai_input.min = "1";
    ai_input.max = "5";
    ai_input.placeholder = "Number of AIs";

    form.appendChild(ai_input);
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();

      if (!ai_input.value) {
        // Turn the box red
        ai_input.required = "";
        return false;
      }

      // Verify the input is a number (the browser should do
      // this for us anyway)
      if (!Number(ai_input.value)) {
        return false;
      }

      // NOTE: input.value is not empty, and must therefore be
      // a number
      for (let i = 1; i <= Number(ai_input.value); ++i) {
        this.players.push(new AiPlayer(i, this.rules));
      }

      this.play();
    });

    this.area.appendChild(title);
    this.area.appendChild(form);

    ai_input.focus();
  }

  /**
   * Play the game.
   *
   * This function will be called automatically and should not be
   * called directly.
   */
  play() {
    this.clear();

    let title = document.createElement("h1");
    title.innerText = `Choose your option!`;

    let container = document.createElement("div");
    container.className = "container";

    for (let choice of this.rules.choices) {
      let button = document.createElement("button");
      button.className = "choice-btn";
      button.innerText = choice;

      button.addEventListener("click", () => {
        this.players[0].set_choice(choice);
        this.reveal();
      });

      container.appendChild(button);
    }

    this.area.appendChild(title);
    this.area.appendChild(container);
  }

  /**
   * Reveal who won the game.
   *
   * This function will be called automatically and should not be
   * called directly.
   */
  async reveal() {
    // The reveal animation
    const reveal_animation = [
      { transform: "scale(0.5)", opacity: 0 },
      { transform: "scale(1.5)", opacity: 1, offset: 0.7 },
      { opacity: 1 },
    ];

    this.clear();

    // The title
    let title = document.createElement("h1");
    title.innerText = "Let's see who won!";

    // The container of the "who-chose-what" boxes
    let container = document.createElement("div");
    container.className = "container";

    let button_container = document.createElement("div");
    button_container.className = "container";

    // The play again button
    let play_again = document.createElement("button");
    play_again.innerText = "Play Again?";
    play_again.style.opacity = 0;
    play_again.style.display = "inline-block";
    play_again.style.transition = "all 0.1s, opacity 1s";
    play_again.style.width = "fit-content";

    // The scoreboard button
    let scoreboard = document.createElement("button");
    scoreboard.innerText = "Scoreboard";
    scoreboard.style.opacity = 0;
    play_again.style.display = "inline-block";
    scoreboard.style.transition = "all 0.1s, opacity 1s";

    button_container.appendChild(play_again);
    button_container.appendChild(scoreboard);

    // Get the choices of the players
    let choices = this.players.map((p) => p.get_choice());

    for (let i = 0; i < this.players.length; ++i) {
      // Create the choice block
      let choice_block = document.createElement("div");
      choice_block.className = "choice-block";

      // The header (e.g., "Zachary chose")
      let header = document.createElement("h3");
      header.innerText = `${this.players[i].name} chose`;
      header.style.transition = "color 1s";

      // The choice
      let choice = document.createElement("h2");
      choice.innerText = `${choices[i]}`;
      choice.style.transition = "color 1s";

      // Hide the choice so it can be revealed later
      choice.style.opacity = 0;

      choice_block.appendChild(header);
      choice_block.appendChild(choice);
      container.appendChild(choice_block);
    }

    this.area.appendChild(title);
    this.area.appendChild(container);
    this.area.appendChild(button_container);

    // Reveal the choices
    for (let i = 0; i < this.players.length; ++i) {
      await delay(500);

      // Get the choice element (e.g., "Rock") and run the animation for it
      let choice_el = container.children[i].children[1];
      let animation = choice_el.animate(reveal_animation, { duration: 150 });

      // Wait for the animation to complete
      await new Promise((resolve) => {
        animation.addEventListener("finish", resolve);
      });

      // Set the opacity to one so the choice doesn't disappear
      // immediately after the animation completes
      choice_el.style.opacity = 1;
    }

    await delay(100);

    // Determine the winner
    let winner_idx = this.rules.test(choices);

    // Set the title text (either a tie message or a winning message)
    // and increment the score of the winning player, if applicable.
    if (winner_idx === -1) {
      title.innerText = "It was a tie!";
    } else {
      this.players[winner_idx].score++;
      title.innerText = `${this.players[winner_idx].name} won!`;
    }

    // Change the colours of the choice boxes to match whether
    // the player won or lost
    for (let i = 0; i < this.players.length; ++i) {
      let choice_block = container.children[i];

      if (winner_idx === i) {
        choice_block.style.border = "1px solid green";
        choice_block.children[0].style.color = "green";
        choice_block.children[1].style.color = "green";
      } else {
        choice_block.style.border = "1px solid red";
        choice_block.children[0].style.color = "red";
        choice_block.children[1].style.color = "red";
      }
    }

    await delay(500);

    // Reveal play again and scoreboard buttons
    play_again.style.opacity = 1;
    play_again.addEventListener("click", this.play.bind(this));

    scoreboard.style.opacity = 1;
    scoreboard.addEventListener("click", this.scoreboard.bind(this));
  }

  /**
   * Show the scoreboard.
   *
   * This function will be called automatically and should not be
   * called directly.
   */
  scoreboard() {
    this.clear();

    let table = document.createElement("table");
    let header = document.createElement("tr");

    let player_name = document.createElement("th");
    player_name.innerText = "Name";

    let player_score = document.createElement("th");
    player_score.innerText = "Score";

    header.appendChild(player_name);
    header.appendChild(player_score);
    table.appendChild(header);

    // A clone of the array has to be used or the sorting will move the
    // PseudoPlayer to another index
    let sorted_players = [...this.players].sort((p1, p2) => p2.score - p1.score);
    for (let player of sorted_players) {
      let row = document.createElement("tr");
      let name = document.createElement("td");
      let score = document.createElement("td");

      name.innerText = player.name;
      score.innerText = player.score.toString();

      row.appendChild(name);
      row.appendChild(score);
      table.appendChild(row);
    }

    let play_again = document.createElement("button");
    play_again.innerText = "Play Again?";
    play_again.style.width = "fit-content";
    play_again.addEventListener("click", this.play.bind(this));

    this.area.appendChild(table);
    this.area.appendChild(play_again);
  }

  /**
   * Clear the play area (so new elements can be added instead).
   */
  clear() {
    while (this.area.lastChild) {
      this.area.removeChild(this.area.lastChild);
    }
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

// Load from a file
document.getElementById("loader").addEventListener("click", () => {
  const file = document.getElementById("file");
  file.click();
});
document.getElementById("file").addEventListener("change", async () => {
  const file = document.getElementById("file");
  let rules = new Rules(await file.files[0].text());
  new Game(rules);
});

// Load the standard RPS game
document.getElementById("default").addEventListener("click", async () => {
  const rule_file = await fetch("/rps.rps");
  const rules = new Rules(await rule_file.text());
  new Game(rules);
});
