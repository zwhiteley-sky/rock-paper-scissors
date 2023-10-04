import { Rules, Rule } from "./core.js";
import { dist_to_segment, dist_to_point, Point, Vector } from "./maths.js";

/**
 * A rule editor (used to edit RPS-style rules).
 */
class RuleEditor {
  /**
   * Create a new rule editor.
   * @param {HTMLCanvasElement} canvas - The canvas on which to draw the editor.
   * @param {Rules} rules - The initial ruleset to edit.
   */
  constructor(canvas, rules) {
    /**
     * The canvas HTML element.
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas;

    /**
     * The 2D context for the canvas.
     * @type {CanvasRenderingContext2D}
     */
    this.ctx = canvas.getContext("2d");
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    /**
     * The current ruleset.
     * @type {Rules}
     */
    this.rules = rules;

    /**
     * The currently selected choice.
     * @type {string | null }
     */
    this.selected_choice = null;

    // Mouse interaction
    this.canvas.addEventListener("mousemove", (ev) => {
      this.draw({ x: ev.clientX, y: ev.clientY, button: null });
    });
    this.canvas.addEventListener("mousedown", (ev) => {
      this.draw({ x: ev.clientX, y: ev.clientY, button: ev.button });
    });

    // Prevent the right-click context menu from appearing
    this.canvas.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      return false;
    });

    this.draw();
  }

  /**
   * Add a choice.
   * @param {string} choice - The choice to add.
   */
  add(choice) {
    this.rules.add_choice(choice);
    this.draw();
  }

  /**
   * Draw the canvas.
   * @param {{x: number, y: number, button: number | null} | undefined} mouse_info - Information about the mouse.
   */
  draw(mouse_info) {
    this.clear();

    // The centre of the canvas
    const centre = new Point(this.canvas.width / 2, this.canvas.height / 2);

    // Ensures the first "bubble" is directly above the centre.
    const offset = -Math.PI / 2;

    // The angle between bubbles.
    const angle = (2 * Math.PI) / this.rules.choices.length;

    // The distance of the bubbles from the centre .
    const length = Math.max(
      Math.min(this.canvas.width / 4, this.canvas.height / 4),
      30
    );

    // The radius of the bubbles.
    const radius = Math.min(50, length);

    // The thickness of the lines.
    const line_thickness = 5;

    // The thickness of the arrow lines.
    const arrow_thickness = 1;

    // The thickness of the text.
    const text_thickness = 1;

    // If an item is currently being hovered over
    let hovering = false;

    // The positions of the centres of the choice bubbles
    let bubble_positions = {};

    for (let i = 0; i < this.rules.choices.length; ++i) {
      this.ctx.lineWidth = line_thickness;

      const current_angle = i * angle + offset;
      const bubble_centre = new Point(
        centre.x + (length + radius) * Math.cos(current_angle),
        centre.y + (length + radius) * Math.sin(current_angle)
      );

      if (
        mouse_info &&
        !hovering &&
        dist_to_point(mouse_info, bubble_centre) <= radius + line_thickness
      ) {
        // NOTE: selecting is considered hovering to stop arrows
        //       being created and then immediately deleted (i.e.,
        //       only one mouse action per draw)
        hovering = this.rules.choices[i];

        // If the user right clicks a bubble, delete it
        if (mouse_info.button === 2) {
          // Reset selected choice so a selected element can be deleted
          this.selected_choice = null;
          this.rules.del_choice(this.rules.choices[i]);

          // We need to redraw as the bubble angles will be incorrect
          this.draw({ x: mouse_info.x, y: mouse_info.y, button: null });
          return;
        }

        if (mouse_info.button === 0) {
          // If a bubble is already selected, add the rule
          if (this.selected_choice) {
            try {
              this.rules.add_rule(
                new Rule(this.selected_choice, this.rules.choices[i])
              );
            } catch (e) {
              console.log(e);
            }
            this.selected_choice = null;
          } else {
            // If a bubble isn't selected, select this one
            this.selected_choice = this.rules.choices[i];
          }
        } else {
          // Otherwise the user is only hovering, so highlight
          this.ctx.strokeStyle = "red";
        }
      } else if (this.selected_choice === this.rules.choices[i]) {
        this.ctx.strokeStyle = "red";
      } else {
        this.ctx.strokeStyle = "black";
      }

      // Draw the bubble
      this.ctx.beginPath();
      this.ctx.arc(bubble_centre.x, bubble_centre.y, radius, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Draw the text within the bubble
      this.ctx.lineWidth = text_thickness;
      this.ctx.font = "15px monospace";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        this.rules.choices[i],
        bubble_centre.x,
        bubble_centre.y
      );

      bubble_positions[this.rules.choices[i]] = bubble_centre;
    }

    // Draw arrow to mouse, if applicable
    // This is done down here, instead of above, to prevent two arrows
    // from forming -- if done above, the following could happen:
    //  1. User clicks on bubble A
    //  2. User clicks on bubble B
    //  3. Line drawn from A to mouse (as A is selected)
    //  4. Click registered -- line from A to B drawn, A deselected
    //  5. Two arrows exist.
    if (
      mouse_info &&
      this.selected_choice &&
      hovering !== this.selected_choice
    ) {
      const bubble_centre = bubble_positions[this.selected_choice];

      this.ctx.lineWidth = arrow_thickness;
      this.ctx.strokeStyle = "black";

      // Convert `bubble_centre` to a point on the bubble's
      // border (otherwise the arrow will be drawn from the
      // centre and it'll look ugly)
      let vector = new Vector(
        mouse_info.x - bubble_centre.x,
        mouse_info.y - bubble_centre.y
      )
        .unit()
        .multiply(radius);
      let start_point = bubble_centre.follow(vector);

      this.draw_arrow(start_point, mouse_info);

      this.ctx.lineWidth = line_thickness;
    }

    this.ctx.lineWidth = arrow_thickness;

    // Draw the arrows representing the rules
    for (let rule of this.rules.rules) {
      let beater_pos = bubble_positions[rule.beater];
      let beaten_pos = bubble_positions[rule.beaten];
      let vector = beater_pos.goto(beaten_pos).unit().multiply(radius);

      // This converts the bubble centres to points on the bubble border,
      // resulting in a nicer look
      let start_point = beater_pos.follow(vector);
      let end_point = beaten_pos.follow(vector.invert());

      // If the mouse is hovering near the line, highlight it
      if (
        !hovering &&
        mouse_info &&
        dist_to_segment(mouse_info, start_point, end_point) <= 10
      ) {
        hovering = true;

        if (mouse_info.button === 0) {
          this.rules.del_rule(rule);
          continue;
        }

        this.ctx.strokeStyle = "red";
      } else this.ctx.strokeStyle = "black";

      this.draw_arrow(start_point, end_point);
    }
  }

  /**
   * Draw an arrow on the canvas.
   * @param {Point} start_point - The starting point to draw the arrow from.
   * @param {Point} end_point - The end point to finish the arrow at.
   */
  draw_arrow(start_point, end_point) {
    // The length of the arrow head lines
    const length = 20;

    // The angle of the arrow head lines from the centre line
    const angle = Math.PI / 5;

    let vector = start_point.goto(end_point).unit();
    let arrow_point = end_point;

    // The vector parallel to the arrow line
    let para_vec = vector.multiply(length * Math.cos(angle));
    let perp_vec = vector.perpendiculate().multiply(length * Math.sin(angle));

    let arrow_vec_1 = para_vec.add(perp_vec);
    let arrow_vec_2 = para_vec.subtract(perp_vec);

    this.ctx.beginPath();
    this.ctx.moveTo(start_point.x, start_point.y);
    this.ctx.lineTo(end_point.x, end_point.y);
    this.ctx.moveTo(arrow_point.x, arrow_point.y);
    this.ctx.lineTo(
      arrow_point.x - arrow_vec_1.x,
      arrow_point.y - arrow_vec_1.y
    );
    this.ctx.moveTo(arrow_point.x, arrow_point.y);
    this.ctx.lineTo(
      arrow_point.x - arrow_vec_2.x,
      arrow_point.y - arrow_vec_2.y
    );
    this.ctx.stroke();
  }

  /**
   * Clear the canvas.
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}


let rules = new Rules();
rules.add_rule(new Rule("Paper", "Rock"));
rules.add_rule(new Rule("Scissors", "Paper"));
rules.add_rule(new Rule("Rock", "Scissors"));
rules.add_rule(new Rule("Fire", "Rock"));
rules.add_rule(new Rule("Fire", "Paper"));
rules.add_rule(new Rule("Fire", "Scissors"));

let g = new RuleEditor(document.getElementById("editor"), rules);