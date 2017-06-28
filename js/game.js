define(["require", "exports", "./collision", "./keys", "./enums"], function (require, exports, collision_1, keys_1, enums_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var State;
    (function (State) {
        State[State["stopped"] = 1] = "stopped";
        State[State["running"] = 2] = "running";
        State[State["paused"] = 3] = "paused";
    })(State || (State = {}));
    var GameRunner = (function () {
        /**
         * Creates a new runnable game
         **/
        function GameRunner(canvas) {
            //stores all entities in the game world
            this.entityList = [];
            //whether the game is running, paused, or stopped
            this.state = State.stopped;
            this.firstFrame = true;
            //object containing 
            this.controls = new Controls();
            this.canvas = canvas;
            this.drawContext = canvas.getContext("2d");
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            this.drawContext.textBaseline = "top";
        }
        /**
         * Starts the game
         **/
        GameRunner.prototype.start = function (list) {
            var _this = this;
            if (this.state != State.stopped)
                return;
            this.entityList = list;
            this.state = State.running;
            //run first frame entity code if it's the start
            for (var i = 0; i < this.entityList.length; i++) {
                this.tryUserFunc(function () { _this.entityList[i].__onGameStart(null); });
            }
        };
        /**
         * Stops the game
         **/
        GameRunner.prototype.stop = function () {
            this.state = State.stopped;
        };
        /**
         * Pauses the game
         **/
        GameRunner.prototype.pause = function () {
            if (this.state == State.running) {
                this.state = State.paused;
            }
        };
        /**
         * Unpauses the game
         **/
        GameRunner.prototype.unpause = function () {
            if (this.state == State.paused) {
                this.state = State.running;
            }
        };
        /**
         * Returns whether or not the game is running
         **/
        GameRunner.prototype.isRunning = function () { return this.state == State.running; };
        /**
         * Returns true if the game is paused
         **/
        GameRunner.prototype.isPaused = function () { return this.state == State.paused; };
        /**
         * Returns true if the game is stopped
         **/
        GameRunner.prototype.isStopped = function () { return this.state == State.stopped; };
        /**
         * Runs the main game loop
         **/
        GameRunner.prototype.step = function () {
            var _this = this;
            //clear screen
            this.drawContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
            //if we aren't paused, update, move, and collide all entities
            if (this.isRunning()) {
                for (var i = 0; i < this.entityList.length; i++) {
                    var ent = this.entityList[i];
                    if (!ent.__removeFlag) {
                        this.tryUserFunc(function () { _this.entityList[i].__onUpdate(null); });
                    }
                    if (ent.__removeFlag) {
                        this.entityList.splice(i, 1);
                        i--;
                    }
                }
                this.moveAndCollideEntities();
            }
            //draw them all
            for (var _i = 0, _a = this.entityList; _i < _a.length; _i++) {
                var ent_1 = _a[_i];
                ent_1.__draw(this.drawContext);
            }
            //update whether or not keys were pressed last frame
            //(allows isHeldOneFrame() to work)
            this.controls.updateKeyData();
            this.firstFrame = false;
        };
        /**
         * Adds an entity to the game world and reorders all entities based on their priority property
         **/
        GameRunner.prototype.addEntity = function (ent) {
            this.entityList.push(ent);
            this.recalcPriority();
        };
        /**
         * Sort entityList in ascending order based on their priority property.
         **/
        GameRunner.prototype.recalcPriority = function () {
            var list = this.entityList;
            setTimeout(function () {
                list.sort(function (a, b) {
                    return a.priority - b.priority;
                });
            }, 0);
        };
        /**
         * Get an entity in the world by its name in O(n) time.
         **/
        GameRunner.prototype.getEntityByName = function (s) {
            for (var i = 0; i < this.entityList.length; i++) {
                if (this.entityList[i].name === s)
                    return this.entityList[i];
            }
            return null;
        };
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
        GameRunner.prototype.moveAndCollideEntities = function () {
            var loopVar = [{ comp: "x", velComp: "velX", prevComp: "prevX", sizeComp: "width", dirs: [enums_1.Direction.left, enums_1.Direction.right] },
                { comp: "y", velComp: "velY", prevComp: "prevY", sizeComp: "height", dirs: [enums_1.Direction.up, enums_1.Direction.down] }];
            for (var _i = 0, _a = this.entityList; _i < _a.length; _i++) {
                var ent = _a[_i];
                ent.blockedUp = false;
                ent.blockedDown = false;
                ent.blockedLeft = false;
                ent.blockedRight = false;
            }
            //for generality's sake, do x collisions then y collisions by looping
            for (var z = 0; z < loopVar.length; z++) {
                var comp = loopVar[z].comp;
                var prevComp = loopVar[z].prevComp;
                var velComp = loopVar[z].velComp;
                var sizeComp = loopVar[z].sizeComp;
                var dirs = loopVar[z].dirs;
                for (var _b = 0, _c = this.entityList; _b < _c.length; _b++) {
                    var ent = _c[_b];
                    ent[prevComp] = ent[comp];
                    ent[comp] += ent[velComp] / 60 * 10;
                    ent.__recalculateCollisionBounds(loopVar[z]);
                }
                for (var a = 0; a < this.entityList.length; a++) {
                    var entA = this.entityList[a];
                    if (!entA.collides)
                        continue;
                    for (var b = a + 1; b < this.entityList.length; b++) {
                        var entB = this.entityList[b];
                        if (!entB.collides)
                            continue;
                        if (collision_1.Collision.testCollision(entA.__getCollisionBounds(), entB.__getCollisionBounds())) {
                            var entAEvent = {
                                other: entB,
                                direction: dirs[0]
                            };
                            var entBEvent = {
                                other: entA,
                                direction: dirs[1]
                            };
                            //switch direction of collision based on velocity difference
                            if (entA[velComp] - entB[velComp] >= 0) {
                                entAEvent.direction = dirs[1];
                                entBEvent.direction = dirs[0];
                            }
                            this.tryUserFunc(function () { entA.__onCollision(entAEvent); });
                            this.tryUserFunc(function () { entB.__onCollision(entBEvent); });
                            entA.__recalculateCollisionBounds(loopVar[z]);
                            entB.__recalculateCollisionBounds(loopVar[z]);
                        }
                    }
                }
            }
        };
        /**
         * Attemps to call a user-defined hook in a safe manner,
         * stopping the game if an exception is thrown.
         **/
        GameRunner.prototype.tryUserFunc = function (func) {
            try {
                func();
            }
            catch (e) {
                console.log(e);
                this.stop();
            }
        };
        return GameRunner;
    }());
    exports.GameRunner = GameRunner;
    var Controls = (function () {
        function Controls() {
            //populates with data of the form {pressed, wasPressed} as each new key is pressed for the first time
            this.keyData = {};
        }
        /**
         * Returns whether the player is holding a key.
         * Can take a string describing the key (see keys.js) or the integer keycode.
         **/
        Controls.prototype.isHeld = function (key) {
            if (typeof key !== "number")
                key = keys_1.Keys[key];
            if (!(key in this.keyData)) {
                return false;
            }
            else
                return this.keyData[key].pressed;
        };
        /**
         * Returns whether the player just pressed a key this frame.
         * Can take a string describing the key (see keys.js) or the integer keycode.
         **/
        Controls.prototype.isHeldOneFrame = function (key) {
            if (typeof key !== "number")
                key = keys_1.Keys[key];
            if (!(key in this.keyData)) {
                return false;
            }
            else {
                var data = this.keyData[key];
                return data.pressed && !data.wasPressed;
            }
        };
        /**
         * Update whether or not each key was pressed last frame
         **/
        Controls.prototype.updateKeyData = function () {
            for (var key in this.keyData) {
                var data = this.keyData[key];
                data.wasPressed = data.pressed;
            }
        };
        /**
         * Function merging the handling of key up and key down events.
         * The engine wraps these such that a user can simply poll whether or not a key was pressed whenever they want.
         **/
        Controls.prototype.handleKeyEvent = function (event, isHeldDown) {
            if (!(event.which in this.keyData)) {
                this.keyData[event.which] = { pressed: isHeldDown, wasPressed: false };
            }
            else {
                this.keyData[event.which].pressed = isHeldDown;
            }
        };
        return Controls;
    }());
});
