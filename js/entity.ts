import {CollisionType} from "./enums";

/**
 * Class describing the most basic Entity that can be used with the game engine
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

  //color the entity will be drawn
  color: string = "rgba(0, 0, 0, 1)";

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

  //whether or not to check collisions for this entity
  collides: boolean = true;

  //represents the collision bounds of this entity
  protected __collisionBounds: ICollisionBounds;
  
  //uniquely identifies an entity
  __guid: string;

  //internal flag for removing this entity at/after the next __onUpdate()
  __removeFlag: boolean = false;



  constructor() {
    this.__guid = this.__generateGUID();
    this.__collisionBounds = {type: CollisionType.rectangle};
  }



  /**
   * Sets an entity's remove flag. Will be removed before or after the entity updates next
   **/
  remove() {
    this.__removeFlag = true;
  }

  /**
   * Returns whether or not an entity is removed from the game world
   **/
  isRemoved() {
    return this.__removeFlag;
  }

  /**
   * Creates a copy of the entity.
   * Object members are attempted to be copied by JSON.parse(JSON.stringify(obj)).
   **/
  duplicate(): Entity {
    let result = new Entity();

    for (let key in this as Entity) {
      if (typeof this[key] == "object") {
        let objCopy = JSON.parse(JSON.stringify(this[key])); 
        result[key] = objCopy;
      }
      else result[key] = this[key];
    }

    return result;
  }



  __onGameStart(event: IGameStartEvent) { }
  
  __onUpdate(event: IUpdateEvent) { }

  __onCollision(event: ICollisionEvent) { }
  
  __draw(drawContext: CanvasRenderingContext2D) {
    drawContext.fillStyle = this.color;
    drawContext.fillRect(this.x, this.y, this.width, this.height);
  }

  /**
   * Recalculates the bounds that an entity will use for collision detection.
   * Ran during collision checks as well as right after a collision is made
   **/
  __recalculateCollisionBounds(compVars) {
    if (!this.collides) return null;

    let rectBounds = this.__collisionBounds as IRectangleBounds;

    let comp     = compVars.comp;
    let prevComp = compVars.prevComp;
    let velComp  = compVars.velComp;
    let sizeComp = compVars.sizeComp;
    let dirs     = compVars.dirs;

    //set up custom bounding boxes using previous and current positions to account for high entity speeds
    var bbox = {
      type:   CollisionType.rectangle,
      x:      this.x,
      y:      this.y,
      width:  this.width,
      height: this.height
    };

    rectBounds.x      = this.x;
    rectBounds.y      = this.y;
    rectBounds.width  = this.width;
    rectBounds.height = this.height;

    rectBounds[comp]     = Math.min(this[comp], this[prevComp]);
    rectBounds[sizeComp] = Math.abs(this[prevComp]-this[comp]) + this[sizeComp];
  }

  __getCollisionBounds(): ICollisionBounds { return this.__collisionBounds; }

  /**
   * Generate a pseudo GUID randomly (not guaranteed to be unique). Thanks guid.us!
   **/
  private __generateGUID(): string {
    function S4() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
    }

    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
  }

  /**
   * Take an object that looks like an entity and make a new BaseEntity with all of its properties 
   *   properly applied and copied. 
   * Can be used to duplicate any entity, though not "deep" if any members are reference types.
   **/
  static constructEntity(ent): Entity {
    var result = new Entity();

    for (var key in ent) {
      if (key === "__guid") continue;

      if (key.substring(0, 4) == "__on" && key.substring(key.length-6) == "String") {
        //all function strings will be of the form __<FuncName>String
        var memName     = key.substring(0, key.lastIndexOf("String"));
        var func        = new Function("event", ent[key]);
        result[memName] = func;
      }
      else result[key] = ent[key];
    }

    return result;
  }
}

class OvalEntity extends Entity {
  __draw(drawContext: CanvasRenderingContext2D) {
    drawContext.fillStyle = this.color;
    drawContext.save();
    drawContext.translate(this.x+this.width/2, this.y+this.height/2);
    drawContext.scale(this.width, this.height);
    drawContext.beginPath();
    drawContext.arc(0, 0, 0.5, 0, 2*Math.PI, false);
    drawContext.fill();
    drawContext.restore();
  }
}

class TextEntity extends Entity {
  text: string = "";
  font: string = "12pt Arial";

  __draw(drawContext: CanvasRenderingContext2D) {
    drawContext.fillStyle = this.color;
    drawContext.font = this.font;
    drawContext.fillText(this.text, this.x, this.y);
  }
}