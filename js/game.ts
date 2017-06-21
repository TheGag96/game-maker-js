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
  private drawContext: CanvasRenderingContext2D;

  //object containing 
  controls: Controls = new Controls();

  /**
   * Creates a new runnable game
   **/
  constructor(canvas: HTMLCanvasElement) {
    this.canvas      = canvas;
    this.drawContext = canvas.getContext("2D") as CanvasRenderingContext2D;
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
      this.entityList[i].__onGameStart();
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
          this.entityList[i].__onUpdate();
        }

        if (ent.__removeFlag) {
          this.entityList.splice(i, 1);
          i--;
        }
      }

      moveAndCollideEntities();
    }

    //draw them all
    for (let ent of this.entityList) {
      this.entityList[i].__draw();
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
    setTimeout(function() {
      this.entityList.sort(function(a, b) {
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
    var loopVar = [{comp:"x", velComp:"velX", prevComp:"prevX", sizeComp: "width", dirs:["left", "right"]},
                  {comp:"y", velComp:"velY", prevComp:"prevY", sizeComp: "height", dirs:["up", "down"]}];

    for (var i = 0; i < Game.entityList.length; i++) {
      var ent = Game.entityList[i]; 
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

      for (var i = 0; i < Game.entityList.length; i++) {
        var ent = Game.entityList[i]; 
        
        ent[prevComp] = ent[comp];
        ent[comp]    += Game.entityList[i][velComp] / 60 * 10;
      }

      for (var a = 0; a < Game.entityList.length; a++) {
        var entA = Game.entityList[a];
        
        if (!entA.collides) continue;
        
        //set up custom bounding boxes using previous and current positions to account for high entity speeds
        var bboxA = {x: entA.x, y: entA.y, width: entA.width, height: entA.height};

        bboxA[comp]     = Math.min(entA[comp], entA[prevComp]);
        bboxA[sizeComp] = Math.abs(entA[prevComp]-entA[comp]) + entA[sizeComp];

        for (var b = a+1; b < Game.entityList.length; b++) {
          var entB = Game.entityList[b];

          if (!entB.collides) continue;
          
          var bboxB = {x: entB.x, y: entB.y, width: entB.width, height: entB.height};

          bboxB[comp]     = Math.min(entB[comp], entB[prevComp]);
          bboxB[sizeComp] = Math.abs(entB[prevComp]-entB[comp]) + entB[sizeComp];

          if (boxIntersection(bboxA, bboxB)) {
            var entAEvent = {
              other: entB,
              direction: dirs[0]
            }

            var entBEvent = {
              other: entA,
              direction: dirs[1]
            }

            //switch direction of collision based on velocity difference
            if (entA[velComp] - entB[velComp] >= 0) {
              entAEvent.direction = dirs[1];
              entBEvent.direction = dirs[0];
            }

            entA.__onCollision(entAEvent);
            entB.__onCollision(entBEvent);
          }
        }
      }
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
    else return this..keyData[key].pressed;
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
}