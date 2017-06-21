/**
 * Interface describing the bare minimum requirements for an Entity that can be used with the game engine
 **/
export interface IBaseEntity {
  //user-defined entity name
  name: string;

  //position
  x: number; 
  y: number;

  //stores the previous position (note: in __onUpdate(), these will be the same as x and y)
  prevX: number;
  prevY: number;

  //velocity
  velX: number;
  velY: number;

  //higher means it will be drawn on top of other objects
  priority: number;

  //whether or not collision checks are run for this entity
  collisionType: CollisionType;

  //uniquely identifies an entity
  __guid: string;

  //internal flag for removing this entity at/after the next __onUpdate()
  __removeFlag: boolean;

  /**
   * Runs every frame.
   * Event spec: null
   **/
  __onGameStart: (event: Object)=>void;
  
  /**
   * Runs every frame.
   * Event spec: null
   **/
  __onUpdate: (event: Object)=>void;
  
  /**
   * Runs when the entity collides with another one.
   * Event spec: 
   * {
   *   other:     the entity being collided with
   *   direction: the direction the collision is coming from ("up", "down", "left", "right")
   * }
   **/
  __onCollision: (event: Object)=>void;
  
  /**
   * Draws an entity 
   **/
  __draw: (drawContext: CanvasRenderingContext2D)=>void;

  /**
   * Retrieves the bounds that an entity will use for collision detection.
   **/
  __getCollisionBounds: ()=>Object;
}

/**
 * A common base entity class.
 **/
export class Entity implements IBaseEntity {
  //user-defined entity name
  name: string = "";

  //position
  x: number = 0; 
  y: number = 0;

  //size
  width:  number = 25;
  height: number = 25;

  //velocity
  velX: number = 0;
  velY: number = 0;

  //higher means it will be drawn on top of other objects
  priority: number = 1;

  //whether or not the entity is being blocked by another (should be set manually through collision)
  blockedUp:    boolean = false;
  blockedDown:  boolean = false;
  blockedLeft:  boolean = false;
  blockedRight: boolean = false;

  //stores the previous position (note: in __onUpdate(), these will be the same as x and y)
  prevX: number = 0;
  prevY: number = 0;

  //whether or not collision checks are run for this entity
  collides: boolean = true;

  //uniquely identifies an entity
  __guid: string;

  //internal flag for removing this entity at/after the next __onUpdate()
  __removeFlag: boolean = false;

  constructor() {
    this.__guid = generateGUID();
  }

  __onGameStart(event: Object) { }
  __onUpdate(event: Object) { }
  __onCollision(event: Object) { }

  __draw(drawContext: CanvasRenderingContext2D) { }

  /**
   * Generate a pseudo GUID randomly (not guaranteed to be unique). Thanks guid.us!
   **/
  private generateGUID(): string {
    function S4() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
    }

    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
  }
}

class RectangleEntity extends Entity {


  constructor() {
    super();
  }
}