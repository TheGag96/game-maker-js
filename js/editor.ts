export class Editor {
  //holds the entities viewable when editing
  entityList: IBaseEntity[] = [];

  //set to the current entity being dragged, false otherwise
  dragging: IBaseEntity = null;

  //set to the currently selected entity, false otherwise
  selected: IBaseEntity = null;

  //last position of the mouse {x, y}
  lastMouse = null;

  //reference to canvas being drawn to
  canvas: HTMLCanvasElement;
  private drawContext: CanvasRenderingContext2D;

  

  constructor(canvas: HTMLCanvasElement) {
    this.canvas          = canvas;
    this.drawContext     = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  step() {
    //draw all entities as well as a translucent box around them
    for (let ent of this.entityList) {
      ent.__draw(this.drawContext);
      
      this.drawContext.beginPath();
      this.drawContext.strokeStyle = "rgba(0,0,0,0.5)";
      this.drawContext.lineWidth = 2;
      this.drawContext.rect(ent.x-1, ent.y-1, ent.width+2, ent.height+2);
      this.drawContext.stroke();
    }

    //draw a gold outline around the selected entity on top of everything for visibility
    if (this.selected) {
      this.drawContext.beginPath();
      this.drawContext.strokeStyle = "#FFD700";
      this.drawContext.lineWidth = 2;
      this.drawContext.rect(this.selected.x-1, this.selected.y-1, this.selected.width+2, this.selected.height+2);
      this.drawContext.stroke();
    }
  }

  /**
   * Handle mouse down events:
   *   - Selecting an entity
   *   - Beginning to drag an entity
   **/
  onMouseDown(event) {
    var mouse = {x: event.pageX, y: event.pageY};

    this.selected = null;

    //check through every entity and see if we're clicking on it
    for (var i = this.entityList.length-1; i >= 0; i--) {
      if (this.pointInBox(mouse, this.entityList[i])) {
        this.dragging  = this.entityList[i];
        this.lastMouse = mouse;

        this.selected = this.entityList[i];
        break;
      }
    }

    //save last mouse position so that it can be used to detect dragging
    this.lastMouse = mouse;
  }

  /**
   * If the user releases the mouse, they are no longer dragging an entity
   **/
  onMouseUp(event) {
    this.dragging = null;
  }

  /**
   * At the moment, this hook only handles dragging entities around the canvas.
   **/
  onMouseMove(event) {
    let mouse = {x: event.clientX, y: event.clientY};

    if (this.dragging) {
      this.dragging.x += mouse.x - this.lastMouse.x;
      this.dragging.y += mouse.y - this.lastMouse.y;  
    }

    this.lastMouse = mouse;
  }
  
  /**
   * Returns true if a point {x, y} is inside (but not on the edge of) a box {x, y, width, height}
   **/
  pointInBox(point, box) {
    return point.x > box.x && point.x < box.x+box.width && point.y > box.y && point.y < box.y+box.height;
  }
}