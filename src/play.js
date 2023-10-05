import { AiPlayer, Player, Rules } from "./core.js";

function delay(timeout) {
    return new Promise(res => setTimeout(res, timeout));
}

class Game {
    constructor(rules) {
        /**
         * @type {Rules}
         */
        this.rules = rules;

        this.players = [];

        this.area = document.createElement("section");
        this.area.className = "playarea";

        document.body.appendChild(this.area);

        this.setup();
    }

    setup() {
        this.clear();
        
        let title = document.createElement("h1");
        title.innerText = "What is you name?";

        let form = document.createElement("form");

        let name_input = document.createElement("input");
        name_input.name = "player-name";
        name_input.minLength = "1";

        form.appendChild(name_input);
        form.addEventListener("submit", ev => {
            ev.preventDefault();
            
            if (!name_input.value) {
                name_input.required = true;
                return false;
            }
            
            this.players.push(new PseudoPlayer(name_input.value));
            this.ai_selection();
        });
    
        this.area.appendChild(title);
        this.area.appendChild(form);

        name_input.focus();
    }

    ai_selection()  {
        this.clear();

        let title = document.createElement("h1");
        title.innerText = "How many AIs do you want?";

        let form = document.createElement("form");

        let input = document.createElement("input");
        input.name = "ai-count";
        input.type = "number";
        input.min = "1";
        input.max = "5";
        input.placeholder = "Enter a number between 1 and 5";

        form.appendChild(input);
        form.addEventListener("submit", ev => {
            ev.preventDefault();

            if (!input.value) {
                // Turn the box red
                input.required = "";
                return false;
            }

            // Verify the input is a number (the browser should do
            // this for us anyway)
            if (!Number(input.value)) {
                return false;
            }

            // NOTE: input.value is not empty, and must therefore be
            // a number
            for (let i = 1; i <= Number(input.value); ++i) {
                this.players.push(new AiPlayer(i));
            }

            this.play();
        });

        this.area.appendChild(title);
        this.area.appendChild(form);

        input.focus();
    }

    play() {
        this.clear();

        let title = document.createElement("h1");
        title.innerText = `Choose your option!`;

        let container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "space-around";

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

    async reveal() {
        const reveal_animation = [
            { transform: "scale(0.5)", opacity: 0 },
            { transform: "scale(1.5)", opacity: 1, offset: 0.7 },
            { opacity: 1 }
        ];

        this.clear();

        let title = document.createElement("h1");
        title.innerText = "Let's see who won!";

        let container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "space-around";

        let play_again = document.createElement("button");
        play_again.innerText = "Play Again?";
        play_again.style.opacity = 0;
        play_again.style.transition = "all 0.1s, opacity 1s";
        play_again.style.width = "fit-content";

        let finish = document.createElement("button");
        finish.innerText = "Finish";
        finish.style.opacity = 0;
        finish.style.transition = "all 0.1s, opacity 1s";

        let choices = this.players.map(p => p.get_choice(this.rules));

        for (let i = 0; i < this.players.length; ++i) {
            let choice_block = document.createElement("div");
            choice_block.style.textAlign = "center";
            choice_block.style.border = "1px solid black";
            choice_block.style.borderRadius = "10px";
            choice_block.style.transition = "border 1s";

            let header = document.createElement("h3");
            header.innerText = `${this.players[i].name} chose`;
            header.style.transition = "color 1s";

            let choice = document.createElement("h2");
            choice.style.opacity = 0;
            choice.innerText = `${choices[i]}`;
            choice.style.transition = "color 1s";

            choice_block.appendChild(header);
            choice_block.appendChild(choice);
            container.appendChild(choice_block);
        }

        this.area.appendChild(title);
        this.area.appendChild(container);
        this.area.appendChild(play_again);
        this.area.appendChild(finish);

        for (let i = 0; i < this.players.length; ++i) {
            await delay(500);

            let choice_el = container.children[i].children[1];
            let animation = choice_el.animate(reveal_animation, { duration: 150 });

            await new Promise(resolve => {
                animation.addEventListener("finish", resolve);
            });

            choice_el.style.opacity = 1;
        }

        await delay(100);

        let winner_idx = this.rules.test(choices);

        if (winner_idx === -1) {
            title.innerText = "It was a tie!";
        } else {
            this.players[winner_idx].score++;
            title.innerText = `${this.players[winner_idx].name} won!`;
        }

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

        play_again.style.opacity = 1;
        play_again.addEventListener("click", this.play.bind(this));

        finish.style.opacity = 1;
        finish.addEventListener("click", this.finish.bind(this));
    }

    finish() {
        this.clear();

        for (let player of this.players) {
            let score = document.createElement("h1");
            score.innerText = `${player.name} has a score of ${player.score}`;
            this.area.appendChild(score);
        }
    }

    clear() {
        while (this.area.lastChild) {
            this.area.removeChild(this.area.lastChild);
        }
    }
}

class PseudoPlayer extends Player {
    constructor(name) {
        super(name);
    }

    set_choice(choice) {
        this.choice = choice;
    }

    get_choice() {
        // Ensure we do not reuse a previous choice
        let choice = this.choice;
        this.choice = null;

        return choice;
    }
}

document.getElementById("loader").addEventListener("click", () => {
    const file = document.getElementById("file");
    file.click();
});
document.getElementById("file").addEventListener("change", async () => {
    const file = document.getElementById("file");
    let rules = new Rules(await file.files[0].text());
    new Game(rules);
});

document.getElementById("default").addEventListener("click", async () => {
    const rule_file = await fetch("/rps.rps");
    const rules = new Rules(await rule_file.text());
    new Game(rules);
});