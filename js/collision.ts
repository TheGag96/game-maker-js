export enum CollisionType {
  none = 0,
  square
  //circle
}


export class Collision {
  testCollision(a: IBaseEntity, b: IBaseEntity): boolean {
    if (a.collisionType == CollisionType.square && b.collisionType == CollisionType.square) {
      return boxIntersection(a, b);
    }
  }

  private boxIntersection(a, b) {
    return (a.x < b.x+b.width && a.x+a.width > b.x) && (a.y < b.y+b.height && a.y+a.height > b.y);
  }
}

// interface IBox {
//   x:      number;
//   y:      number;
//   width:  number;
//   height: number;
// }