/**
 * Enum for the different kinds of shapes that can be checked by collision detection
 **/
export enum CollisionType {
  none = 0,
  rectangle
  //circle
  //line
}

export class Collision {
  /**
   * Tests the collision between two objects, choosing the proper method depending on their shapes.
   **/
  static testCollision(a: ICollisionBounds, b: ICollisionBounds): boolean {
    if (a.type == CollisionType.rectangle && b.type == CollisionType.rectangle) {
      return Collision.boxIntersection(a as IRectangleBounds, b as IRectangleBounds);
    }
  }

  /**
   * Returns true if two boxes {x, y, width, height} are inside each other, but not simply touching at an edge.
   **/
  private static boxIntersection(a: IRectangleBounds, b: IRectangleBounds): boolean {
    return (a.x < b.x+b.width && a.x+a.width > b.x) && (a.y < b.y+b.height && a.y+a.height > b.y);
  }
}
