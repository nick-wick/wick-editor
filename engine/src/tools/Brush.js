/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */


Wick.Tools.Brush = class extends Wick.Tool {
    get doubleClickEnabled () {
        return false;
    }

    /**
     * Creates the brush tool.
     */
    constructor () {
        super();

        this.name = 'brush';

        this.BRUSH_POINT_SPACING = 0.2;
        this.BRUSH_STABILIZER_LEVEL = 3;
        this.POTRACE_RESOLUTION = 1.0;

        this.MIN_PRESSURE = 0.14;

        // setup WickBrush, may happen in onActivate if canvas doesn't exist yet
        this.canvas = document.getElementById('wick-brush-canvas');
        if (this.canvas) {
            this.WickBrush = new WickBrush({
                canvas: this.canvas
            });
        }

        // The frame that the brush started the current stroke on.
        this._currentDrawingFrame = null;
    }

    get cursor () {
        // the brush cursor is done in a custom way using _regenCursor().
    }

    get isDrawingTool () {
        return true;
    }

    onActivate (e) {
        if(this._isInProgress) {
            this.finishStrokeEarly();
        }
        
        // setup WickBrush
        if (!this.WickBrush) {
            this.canvas = document.getElementById('wick-brush-canvas');
            if (this.canvas) {
                this.WickBrush = new WickBrush({
                    canvas: this.canvas
                });
            }
        }

        this._isInProgress = false;
    }

    onDeactivate (e) {
        // This prevents WickBrush from leaving stuck brush strokes on the screen.
        this.finishStrokeEarly();
    }

    onMouseMove (e) {
        super.onMouseMove(e);

        // Pass move event to WickBrush
        if (this.WickBrush) {
            this.WickBrush.change({pressure: this.pressure});
            this.WickBrush.move(e.event);
        }

        this._updateCanvasAttributes();
        this._regenCursor();
    }

    onMouseDown (e) {
        if(this._isInProgress)
            this.discard();

        this._currentDrawingFrame = this.project.activeFrame;

        this._isInProgress = true;

        this._updateCanvasAttributes();

        // Update WickBrush params
        this.WickBrush.change({
            size: this._getRealBrushSize(), 
            fillStyle: this.getSetting('fillColor').hex, 
            smoothNodesSpacing: this.BRUSH_POINT_SPACING, 
            smoothing: this.getSetting('brushStabilizerWeight') * 0.8,
            pressure: this.pressure,
        });
        
        // Forward event to WickBrush
        this.WickBrush.down(e.event);
    }

    onMouseDrag (e) {
        if(!this._isInProgress) {
            return;
        }

        // Update pressure
        this.WickBrush.change({pressure: this.pressure});
    }

    onMouseUp (e) {
        if(!this._isInProgress) return;
        this._isInProgress = false;

        // Forward event to WickBrush
        this.WickBrush.up(e.event);

        this._potraceCanvas();
    }

    /**
     * The current amount of pressure applied to the paper js canvas this tool belongs to.
     */
    get pressure () {
        if(this.getSetting('pressureEnabled')) {
            var pressure = this.paper.view.pressure;
            return convertRange(pressure, [0, 1], [this.MIN_PRESSURE, 1]);
        } else {
            return 1;
        }
    }

    /**
     * Is the brush currently making a stroke?
     * @type {boolean}
     */
    isInProgress () {
        return this._isInProgress;
    }

    /**
     * Discard the current brush stroke.
     */
    discard () {
        if(!this._isInProgress) return;
        this._isInProgress = false;

        // call WickBrush.cancel and clear canvas
        this.WickBrush.cancel();
        this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Force the current stroke to be finished, and add the stroke to the project.
     */
    finishStrokeEarly () {
        if(!this._isInProgress) return;
        this._isInProgress = false;

        // Hide the WickBrush canvas so that the current stroke is never seen on the new frame.
        this.canvas.style.opacity = 0;

        // Finish WickBrush stroke
        this.WickBrush.up(null);
        
        // Add path to project
        this._potraceCanvas();
    }

    /* Generate a new circle cursor based on the brush size. */
    _regenCursor () {
        var size = (this._getRealBrushSize());
        var color = this.getSetting('fillColor').hex;
        this.cachedCursor = this.createDynamicCursor(color, size, this.getSetting('pressureEnabled'));
        this.setCursor(this.cachedCursor);
    }

    /* Get the actual pixel size of the brush to send to WickBrush. */
    _getRealBrushSize () {
        var size = this.getSetting('brushSize') + 1;
        if(!this.getSetting('relativeBrushSize')) {
            size *= this.paper.view.zoom;
        }
        return size;
    }

    /* Update canvas to reflect all current options. */
    _updateCanvasAttributes () {
        // Not sure if this is necessary
        // TODO: check if necessary with pressure enabled tablet
        this.paper.view.enablePressure(); 

        // Update canvas size so that canvas resolution matches screenspace width
        let r = this.canvas.getBoundingClientRect();
        this.canvas.width = r.width;
        this.canvas.height = r.height;

        // Fake brush opacity by changing opacity of WickBrush canvas
        this.canvas.style.opacity = this.getSetting('fillColor').a;
    }

    /* Create a paper.js path by potracing the canvas, and add the resulting path to the project. */
    _potraceCanvas () {
        this.errorOccured = false;
        let strokeBounds = new paper.Rectangle(
            this.WickBrush.bounds.left, 
            this.WickBrush.bounds.top, 
            this.WickBrush.bounds.right - this.WickBrush.bounds.left, 
            this.WickBrush.bounds.bottom - this.WickBrush.bounds.top);

        // Attempting to draw with a transparent fill color. Throw an error.
        if (this.getSetting('fillColor').a === 0) {
            this.handleBrushError('transparentColor');
            this.project.errorOccured("Fill Color is Transparent!");
            return;
        }

        let canvas = this.canvas;

        // Rip image data out of canvas
        // (and crop out empty space using strokeBounds - this massively speeds up potrace)
        var croppedCanvas = document.createElement("canvas");
        var croppedCanvasCtx = croppedCanvas.getContext("2d");
        croppedCanvas.width = strokeBounds.width;
        croppedCanvas.height = strokeBounds.height;
        if(strokeBounds.x < 0) strokeBounds.x = 0;
        if(strokeBounds.y < 0) strokeBounds.y = 0;
        croppedCanvasCtx.drawImage(
            canvas,
            strokeBounds.x, strokeBounds.y,
            strokeBounds.width, strokeBounds.height,
            0, 0, croppedCanvas.width, croppedCanvas.height);

        // Run potrace and add the resulting path to the project
        var svg = potrace.fromImage(croppedCanvas).toSVG(1/this.POTRACE_RESOLUTION/this.paper.view.zoom);
        var potracePath = this.paper.project.importSVG(svg);

        potracePath.fillColor = this.getSetting('fillColor').rgba;
        potracePath.position.x += this.paper.view.bounds.x;
        potracePath.position.y += this.paper.view.bounds.y;
        potracePath.position.x += strokeBounds.x / this.paper.view.zoom;
        potracePath.position.y += strokeBounds.y / this.paper.view.zoom;
        potracePath.remove();
        potracePath.closed = true;
        potracePath.children[0].closed = true;
        potracePath.children[0].applyMatrix = true;
        var result = potracePath.children[0];

        // Do special brush mode action
        var brushMode = this.getSetting('brushMode');
        if(this._currentDrawingFrame && this._currentDrawingFrame.view) {
            // Don't apply brush mode if there is no frame to draw on
            // (the frame is added during addPathToProject)
            result = this._applyBrushMode(brushMode, result, this._currentDrawingFrame.view.objectsLayer);
        }

        // Done! Add the path to the project
        this.addPathToProject(result, this._currentDrawingFrame);

        // clear WickBrush canvas
        this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.fireEvent({eventName: 'canvasModified', actionName: 'brush'});
    }

    _applyBrushMode (mode, path, layer) {
        if(!mode) {
            console.warn('_applyBrushMode: Invalid brush mode: ' + mode);
            console.warn('Valid brush modes are "inside" and "outside".')
            return;
        }

        if(mode === 'none') {
            return path;
        }

        var booleanOpName = {
            'inside': 'intersect',
            'outside': 'subtract',
        }[mode];

        var mask = null;
        layer.children.forEach(otherPath => {
            if(otherPath === mask) return;
            if(mask) {
                var newMask = mask.unite(otherPath);

                if((newMask.children && newMask.children.length === 0) ||
                   (newMask.segments && newMask.segments.length === 0)) {
                    // Ignore boolean ops that result in empty paths
                } else {
                    mask = newMask;
                }

                newMask.remove();
            } else {
                mask = otherPath;
            }
        });
        if(!mask) {
            // Nothing to mask with
            return path;
        }

        var result = path.clone({insert:false});
        result = result[booleanOpName](mask);
        result.remove();
        return result;
    }
}