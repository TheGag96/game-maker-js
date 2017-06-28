import {Collision} from "./collision"
import {Keys}      from "./keys"
import {Direction} from "./enums"

enum State {
  stopped = 1,
  running,
  paused
}

export class GameRunner {
  //stores all entities in the game world
  entityList: IBaseEntity[] = [];

  //whether the game is running, paused, or stopped
  private state: State = State.stopped;

  firstFrame: boolean = true;

  //reference to canvas being drawn to
  canvas: HTMLCanvasElement;
  drawContext: CanvasRenderingContext2D;

  //object containing 
  controls: Controls = new Controls();

  /**
   * Creates a new runnable game
   **/
  constructor(canvas: HTMLCanvasElement) {
    this.canvas      = canvas;
    this.drawContext = canvas.getContext("2d") as CanvasRenderingContext2D;

    canvas.width  = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    this.drawContext.textBaseline = "top";
  }

  /**
   * Starts the game 
   **/
  start(list: IBaseEntity[]) {
    if (this.state != State.stopped) return;

    this.entityList = list;
    this.state = State.running;

    //run first frame entity code if it's the start
    for (var i = 0; i < this.entityList.length; i++) {
      this.tryUserFunc(() => { this.entityList[i].__onGameStart(null); });
    }
  }

  /**
   * Stops the game 
   **/
  stop() {
    this.state = State.stopped;
  }

  /**
   * Pauses the game 
   **/
  pause() {
    if (this.state == State.running) {
      this.state = State.paused;
    }
  }

  /**
   * Unpauses the game 
   **/
  unpause() {
    if (this.state == State.paused) {
      this.state = State.running;
    }
  }

  /**
   * Returns whether or not the game is running
   **/
  isRunning(): boolean { return this.state == State.running; }

  /**
   * Returns true if the game is paused
   **/
  isPaused(): boolean { return this.state == State.paused; }

  /**
   * Returns true if the game is stopped
   **/
  isStopped(): boolean { return this.state == State.stopped; }

  /**
   * Runs the main game loop
   **/
  step() {
    //clear screen
    this.drawContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

    //if we aren't paused, update, move, and collide all entities
    if (this.isRunning()) {
      for (var i = 0; i < this.entityList.length; i++) {
        var ent = this.entityList[i];

        if (!ent.__removeFlag) {
          this.tryUserFunc(() => { this.entityList[i].__onUpdate(null); });
        }

        if (ent.__removeFlag) {
          this.entityList.splice(i, 1);
          i--;
        }
      }

      this.moveAndCollideEntities();
    }

    //draw them all
    for (let ent of this.entityList) {
      ent.__draw(this.drawContext);
    }

    //update whether or not keys were pressed last frame
    //(allows isHeldOneFrame() to work)
    this.controls.updateKeyData();

    this.firstFrame = false;
  }

  /**
   * Adds an entity to the game world and reorders all entities based on their priority property
   **/
  addEntity(ent: IBaseEntity) {
    this.entityList.push(ent);
    this.recalcPriority();
  }

  /**
   * Sort entityList in ascending order based on their priority property.
   **/
  recalcPriority() {
    let list = this.entityList;
    setTimeout(function() {
      list.sort(function(a, b) {
        return a.priority - b.priority;
      });
    }, 0);
  }

  /**
   * Get an entity in the world by its name in O(n) time.
   **/
  getEntityByName(s: string): IBaseEntity {
    for (var i = 0; i < this.entityList.length; i++) {
      if (this.entityList[i].name === s) return this.entityList[i];
    }

    return null;
  }

  /**
   * Handle the moving and colliding of all entities in the game world.
   *   0) reset all blocked properties to false
   *   1) update all entity x positions based on their velX
   *   2) check all entity collisions in the x direction, triggering their event hooks
   *   3) update all entity y positions based on their velY
   *   4) check all entity collisions in the y direction, triggering their event hooks
   * 
   * Entities with collides=false will not be checked for collision.
   **/
  moveAndCollideEntities() {
    var loopVar = [{comp:"x", velComp:"velX", prevComp:"prevX", sizeComp: "width", dirs:[Direction.left, Direction.right]},
                  {comp:"y", velComp:"velY", prevComp:"prevY", sizeComp: "height", dirs:[Direction.up, Direction.down]}];

    for (let ent of this.entityList) {
      ent.blockedUp    = false;
      ent.blockedDown  = false;
      ent.blockedLeft  = false;
      ent.blockedRight = false;
    }

    //for generality's sake, do x collisions then y collisions by looping
    for (var z = 0; z < loopVar.length; z++) {
      let comp     = loopVar[z].comp;
      let prevComp = loopVar[z].prevComp;
      let velComp  = loopVar[z].velComp;
      let sizeComp = loopVar[z].sizeComp;
      let dirs     = loopVar[z].dirs;

      for (let ent of this.entityList) {
        ent[prevComp] = ent[comp];
        ent[comp]    += ent[velComp] / 60 * 10;

        ent.__recalculateCollisionBounds(loopVar[z]);        
      }

      for (var a = 0; a < this.entityList.length; a++) {
        var entA = this.entityList[a];
        
        if (!entA.collides) continue;
        
        for (var b = a+1; b < this.entityList.length; b++) {
          var entB = this.entityList[b];

          if (!entB.collides) continue;
          
          if (Collision.testCollision(entA.__getCollisionBounds(), entB.__getCollisionBounds())) {
            var entAEvent: ICollisionEvent = {
              other: entB,
              direction: dirs[0]
            } as ICollisionEvent;

            var entBEvent: ICollisionEvent = {
              other: entA,
              direction: dirs[1]
            } as ICollisionEvent;

            //switch direction of collision based on velocity difference
            if (entA[velComp] - entB[velComp] >= 0) {
              entAEvent.direction = dirs[1];
              entBEvent.direction = dirs[0];
            }

            this.tryUserFunc(() => { entA.__onCollision(entAEvent); });
            this.tryUserFunc(() => { entB.__onCollision(entBEvent); });

            entA.__recalculateCollisionBounds(loopVar[z]);
            entB.__recalculateCollisionBounds(loopVar[z]);
          }
        }
      }
    }
  }

  /**
   * Attemps to call a user-defined hook in a safe manner, 
   * stopping the game if an exception is thrown.
   **/
  tryUserFunc(func) {
    try {
      func();
    }
    catch (e) {
      console.log(e);
      this.stop();
    }
  }
}

class Controls {
  //populates with data of the form {pressed, wasPressed} as each new key is pressed for the first time
  private keyData: Object = { };

  constructor() { }

  /**
   * Returns whether the player is holding a key.
   * Can take a string describing the key (see keys.js) or the integer keycode.
   **/
  isHeld(key: number|string) {
    if (typeof key !== "number") key = Keys[key];

    if (!(key in this.keyData)) {
      return false;  
    }
    else return this.keyData[key].pressed;
  }

  /**
   * Returns whether the player just pressed a key this frame.
   * Can take a string describing the key (see keys.js) or the integer keycode.
   **/
  isHeldOneFrame(key: number|string) {
    if (typeof key !== "number") key = Keys[key];
    
    if (!(key in this.keyData)) {
      return false;  
    }
    else {
      var data = this.keyData[key];
      return data.pressed && !data.wasPressed;
    }
  }

  /**
   * Update whether or not each key was pressed last frame
   **/
  updateKeyData() {
    for (var key in this.keyData) {
      var data = this.keyData[key];
      data.wasPressed = data.pressed;
    }
  }

  /**
   * Function merging the handling of key up and key down events.
   * The engine wraps these such that a user can simply poll whether or not a key was pressed whenever they want.
   **/
  handleKeyEvent(event, isHeldDown) {
    if (!(event.which in this.keyData)) {
      this.keyData[event.which] = {pressed: isHeldDown, wasPressed: false};
    }
    else {
      this.keyData[event.which].pressed = isHeldDown;
    }
  }

}