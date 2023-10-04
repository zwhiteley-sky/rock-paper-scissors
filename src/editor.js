import { Rules, Rule } from "./core.js";

/**
 * @type {HTMLCanvasElement}
 */
const editor_canvas = document.getElementById("editor");
const ctx = editor_canvas.getContext("2d");

const arrow_length = 20;
const arrow_angle = Math.PI / 5;

let rules = new Rules();
rules.add_rule(new Rule("Paper", "Rock"));
rules.add_rule(new Rule("Scissors", "Paper"));
rules.add_rule(new Rule("Rock", "Scissors"));
rules.add_rule(new Rule("Fire", "Rock"));
rules.add_rule(new Rule("Fire", "Paper"));
rules.add_rule(new Rule("Fire", "Scissors"));

let choice_positions = {};
let selected_choice = null;

// Shamelessly stolen from StackOverflow
// Could not be asked to do the maths myself.
function sqr(x) {
  return x * x;
}

function dist2(v, w) {
  return sqr(v.x - w.x) + sqr(v.y - w.y);
}

function distToSegmentSquared(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) {
  return Math.sqrt(distToSegmentSquared(p, v, w));
}

function distToPoint(p1, p2) {
  return Math.sqrt(sqr(p1.x - p2.x) + sqr(p1.y - p2.y));
}

function unitVec(vector) {
  let modulus = Math.sqrt(sqr(vector.x) + sqr(vector.y));
  return {
    x: vector.x / modulus,
    y: vector.y / modulus
  };
}

function clear() {
  ctx.clearRect(0, 0, editor_canvas.width, editor_canvas.height);
}

function drawArrow(start_point, end_point, length, angle) {
    let vector = unitVec({
      x: end_point.x - start_point.x,
      y: end_point.y - start_point.y,
    });
    let arrow_point = {
      x: end_point.x - vector.x,
      y: end_point.y - vector.y
    };
    let para_vec = {
      x: vector.x * length * Math.cos(angle),
      y: vector.y * length * Math.cos(angle)
    };
    let perp_vec = {
      x: vector.y * length * Math.sin(angle),
      y: -vector.x * length * Math.sin(angle)
    };
    let arrow_vec_1 = {
      x: para_vec.x + perp_vec.x,
      y: para_vec.y + perp_vec.y
    };
    let arrow_vec_2 = {
      x: para_vec.x - perp_vec.x,
      y: para_vec.y - perp_vec.y
    };

    ctx.beginPath();
    ctx.moveTo(start_point.x, start_point.y);
    ctx.lineTo(end_point.x, end_point.y);
    ctx.moveTo(arrow_point.x, arrow_point.y);
    ctx.lineTo(arrow_point.x - arrow_vec_1.x, arrow_point.y - arrow_vec_1.y);
    ctx.moveTo(arrow_point.x, arrow_point.y);
    ctx.lineTo(arrow_point.x - arrow_vec_2.x, arrow_point.y - arrow_vec_2.y);
    ctx.stroke();
}

function drawNodes(mouse_info) {
  clear();

  const centre = {
    x: editor_canvas.width / 2,
    y: editor_canvas.height / 2,
  };

  const offset = -Math.PI / 2;
  const angle = (2 * Math.PI) / rules.choices.length;
  const length = 100;
  const radius = 50;
  const thickness = 5;

  for (let i = 0; i < rules.choices.length; ++i) {
    ctx.lineWidth = thickness;
    let circle_centre = {
      x:
        centre.x +
        length * Math.cos(i * angle + offset) +
        radius * Math.cos(i * angle + offset),
      y:
        centre.y +
        length * Math.sin(i * angle + offset) +
        radius * Math.sin(i * angle + offset),
    };

    if (
      mouse_info &&
      distToPoint(mouse_info, centre) > 20 &&
      distToPoint(mouse_info, circle_centre) <= (radius + thickness)
    ) {
      if (mouse_info.button === 2) {
        rules.del_choice(rules.choices[i]);
        drawNodes({ x: mouse_info.x, y: mouse_info.y, button: null });
        return;
      }

      if (mouse_info.button === 0) {
        if (selected_choice) {
          try {
            rules.add_rule(new Rule(selected_choice, rules.choices[i]));
          } catch {}
          selected_choice = null;
        } else selected_choice = rules.choices[i];
      }

      ctx.strokeStyle = "red";
    } else if (selected_choice === rules.choices[i]) {
      if (mouse_info) {
        ctx.lineWidth = 1;
        let vector = unitVec({
          x: mouse_info.x - circle_centre.x,
          y: mouse_info.y - circle_centre.y
        });
        vector.x *= radius;
        vector.y *= radius;

        let start_point = {
          x: circle_centre.x + vector.x,
          y: circle_centre.y + vector.y
        };

        drawArrow(start_point, mouse_info, arrow_length, arrow_angle);
        ctx.lineWidth = thickness;
      }

      ctx.strokeStyle = "red";
    } else {
      ctx.strokeStyle = "black";
    }

    ctx.beginPath();
    ctx.arc(circle_centre.x, circle_centre.y, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.font = "15px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rules.choices[i], circle_centre.x, circle_centre.y);

    choice_positions[rules.choices[i]] = circle_centre;
  }

  ctx.lineWidth = 1;
  let selected = false;

  for (let rule of rules.rules) {
    let beater_pos = choice_positions[rule.beater] 
    let beaten_pos = choice_positions[rule.beaten] 
    let vector = unitVec({
      x: beaten_pos.x - beater_pos.x,
      y: beaten_pos.y - beater_pos.y
    });
    vector.x *= radius;
    vector.y *= radius;

    let start_point = {
      x: beater_pos.x + vector.x,
      y: beater_pos.y + vector.y
    };
    let end_point = {
      x: beaten_pos.x - vector.x,
      y: beaten_pos.y - vector.y
    };

    if (!selected && mouse_info && distToSegment(mouse_info, start_point, end_point) <= 10) {
      if (mouse_info.button === 0) {
        rules.del_rule(rule);
        continue;
      }
      ctx.strokeStyle = "red";
      selected = true;
    } else ctx.strokeStyle = "black";

    drawArrow(start_point, end_point, arrow_length, arrow_angle);
  }
}

drawNodes();
editor_canvas.addEventListener("mousemove", (ev) => {
  drawNodes({ x: ev.offsetX, y: ev.offsetY, button: null });
});
editor_canvas.addEventListener("mousedown", (ev) => {
  drawNodes({ x: ev.offsetX, y: ev.offsetY, button: ev.button });
});
editor_canvas.addEventListener("contextmenu", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  return false;
});
