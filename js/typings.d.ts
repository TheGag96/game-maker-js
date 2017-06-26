/**
 * Enum for the different kinds of shapes that can be checked by collision detection
 **/
declare enum CollisionType {
  none = 0,
  rectangle
  //circle
  //line
}

interface ICollisionBounds {
  type: CollisionType;
}

interface IRectangleBounds extends ICollisionBounds {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

interface ICollidable {
  //whether or not to check collisions for this collidable
  collides: boolean,

  //whether or not the collidable is being blocked by another (should be set manually through collision)
  blockedUp:    boolean;
  blockedDown:  boolean;
  blockedLeft:  boolean;
  blockedRight: boolean;
  
  __getCollisionBounds: ()=>ICollisionBounds;
  __recalculateCollisionBounds: ()=>ICollisionBounds;
}

interface IBaseEntity extends ICollidable {
  //user-defined entity name
  name: string

  //position
  x: number; 
  y: number;

  //previous positions
  prevX: number;
  prevY: number;

  //velocity
  velX: number;
  velY: number;

  //higher means it will be drawn on top of other objects
  priority: number;

  //uniquely identifies an entity
  __guid: string;

  //internal flag for removing this entity at/after the next __onUpdate()
  __removeFlag: boolean;

  //runs for every entity before the first call to __onUpdate()
  __onGameStart: (event: IGameStartEvent)=>void;
  
  //runs every frame
  __onUpdate: (event: IUpdateEvent)=>void;

  //runs when the entity collides with another one.
  __onCollision: (event: ICollisionEvent)=>void;

  //ran every frame to draw the entity
  __draw: (drawContext: CanvasRenderingContext2D)=>void;
}

type Direction = "up" | "down" | "left" | "right";

/**
 * Passed as an argument when __onGameStart() is triggered
 **/
interface IGameStartEvent {

}

/**
 * Passed as an argument when __onUpdate() is triggered
 **/
interface IUpdateEvent {

}

/**
 * Passed as an argument when __onCollision() is triggered
 **/
interface ICollisionEvent {
  other:     IBaseEntity;
  direction: Direction;
}