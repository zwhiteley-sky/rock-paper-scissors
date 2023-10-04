// Stuf I did myself because it was simple.
export function dist_to_point(p1, p2) {
  return Math.sqrt(sqr(p1.x - p2.x) + sqr(p1.y - p2.y));
}

export function unit_vec(vector) {
  let modulus = Math.sqrt(sqr(vector.x) + sqr(vector.y));
  return {
    x: vector.x / modulus,
    y: vector.y / modulus
  };
}

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

export function dist_to_segment(p, v, w) {
  return Math.sqrt(distToSegmentSquared(p, v, w));
}

/**
 * A point.
 */
export class Point {
  /**
   * Create a new point.
   * @param {number} x - The x-coordinate of the point.
   * @param {number} y - The y-coordinate of the point.
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Follow a vector to a new point.
   * @param {Vector} vec - The vector to follow
   * @returns {Point} The new point.
   */
  follow(vec) {
    return new Point(this.x + vec.x, this.y + vec.y);
  }

  /**
   * Find the vector from this point to another point.
   * @param {Point} other - The other point.
   */
  goto(other) {
    return new Vector(other.x - this.x, other.y - this.y);
  }

  /**
   * Convert the point into a position vector.
   * @returns {Vector} The positional vector representing the point.
   */
  to_pos_vec() {
    return new Vector(this.x, this.y);
  }
}

/**
 * A vector.
 */
export class Vector {
  /**
   * A vector.
   * @param {number} x - The x-component of the vector.
   * @param {number} y - The y-component of the vector.
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Get the unit vector of the vector.
   * @returns {Vector} The unit vector
   */
  unit() {
    let vec = unit_vec({ x: this.x, y: this.y });
    return new Vector(vec.x, vec.y);
  }

  /**
   * Add two vectors together
   * @param {Vector} other - The vector to add.
   * @returns {Vector} The added vector.
   */
  add(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract a vector.
   * @param {Vector} other - The vector to subtract.
   * @returns {Vector} The new vector.
   */
  subtract(other) {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiply a vector by a scalar.
   * @param {number} scalar - The scalar to multiply the vector by.
   * @returns {Vector} The new vector.
   */
  multiply(scalar) {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  /**
   * Invert the direction of a vector.
   * @returns {Vector}
   */
  invert() {
    return this.multiply(-1);
  }

  /**
   * Get the vector perpendicular to this one.
   * @returns {Vector}
   */
  perpendiculate() {
    return new Vector(this.y, -this.x);
  }
}