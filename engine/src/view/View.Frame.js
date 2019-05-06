/*
 * Copyright 2019 WICKLETS LLC
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

Wick.View.Frame = class extends Wick.View {
    /**
     * A multiplier for the resolution for the rasterization process.
     * E.g. a multiplier of 2 will make a path 100 pixels wide rasterize into an image 200 pixels wide.
     */
    static get RASTERIZE_RESOLUTION_MODIFIER () {
        return 2;
    }

    static get RASTERIZE_RESOLUTION_MODIFIER_FOR_DEVICE () {
        return Wick.View.Frame.RASTERIZE_RESOLUTION_MODIFIER / window.devicePixelRatio;
    }

    /**
     * Create a frame view.
     */
    constructor () {
        super();

        this.clipsLayer = new this.paper.Layer();
        this.clipsLayer.remove();

        this.pathsLayer = new this.paper.Layer();
        this.pathsLayer.remove();

        this.clipsContainer = new PIXI.Container();
        this.pathsContainer = new PIXI.Container();

        this._onRasterFinishCallback = function () {};

        this._pixiSprite = null;
        this._rasterImageData = null;
    }

    /**
     * Write the changes made to the view to the frame.
     */
    applyChanges () {
        this._applyClipChanges();
        this._applyPathChanges();
    }

    /**
     * Calls a given function when the raster image is done being generated by paper.js + loaded into Pixi.
     */
    onFinishRasterize (callback) {
        this._onRasterFinishCallback = callback;
    }

    /**
     * Clears the cached rasterized SVG data.
     * Call this if the frame SVG has changed, and you need to make sure the WebGL renderer renders the updated SVG.
     */
    clearRasterCache () {
        if(this._pixiSprite) {
          this._pixiSprite.destroy(true);
        }
        this._pixiSprite = null;

        this._rasterImageData = null;
    }

    _renderSVG () {
        this._renderPathsSVG();
        this._renderClipsSVG();
    }

    _renderPathsSVG () {
        this.pathsLayer.data.wickUUID = this.model.uuid;
        this.pathsLayer.data.wickType = 'paths';

        this.pathsLayer.removeChildren();
        this.model.paths.forEach(path => {
            // path.view.render(); // Disabled for now because path views are rendered lazily when json changes
            this.pathsLayer.addChild(path.view.item);
        });
    }

    _renderClipsSVG () {
        this.clipsLayer.data.wickUUID = this.model.uuid;
        this.clipsLayer.data.wickType = 'clips';

        this.clipsLayer.removeChildren();

        this.model.clips.forEach(clip => {
            clip.view.render();
            this.clipsLayer.addChild(clip.view.group);
        });
    }

    _renderWebGL () {
        this._renderPathsWebGL();
        this._renderClipsWebGL();
    }

    _renderPathsWebGL () {
        this.pathsContainer._wickDebugData = {
            uuid: this.model.uuid,
            type: 'frame_pathscontainer',
        };

        // Don't do anything if we already have a cached raster
        if(this._pixiSprite) {
            return;
        }

        // Otherwise, generate a new Pixi sprite
        if(this.model.paths.length > 0) {
            this._rasterizeSVG();
            this._loadPixiTexture();
        } else {
            this._pixiSprite = new PIXI.Sprite();
        }
    }

    _renderClipsWebGL () {
        this.clipsContainer.removeChildren();
        this.clipsContainer._wickDebugData = {
            uuid: this.model.uuid,
            type: 'frame_clipscontainer',
        };
        this.model.clips.forEach(clip => {
            clip.view.render();
            this.clipsContainer.addChild(clip.view.container);
        });
    }

    _rasterizeSVG () {
        // Render paths using the SVG renderer
        this._renderPathsSVG();

        var rasterResoltion = this.paper.view.resolution;
        rasterResoltion *= Wick.View.Frame.RASTERIZE_RESOLUTION_MODIFIER_FOR_DEVICE;

        // get a rasterized version of the resulting SVG
        this.pathsLayer.opacity = 1;
        var raster = this.pathsLayer.rasterize(rasterResoltion, false);
        this._SVGBounds = {
            x: this.pathsLayer.bounds.x,
            y: this.pathsLayer.bounds.y
        };
        var dataURL = raster.canvas.toDataURL();

        this._rasterImageData = dataURL;
    }

    _loadPixiTexture () {
        // Generate raster image data if needed
        if(!this._rasterImageData) {
            this._rasterizeSVG();
        }

        var loader = new PIXI.Loader();
        loader.add(this.model.uuid, this._rasterImageData);
        loader.load((loader, resources) => {
            // Get the texture from the loader
            var texture = resources[this.model.uuid].texture;

            // Add a Pixi sprite using that texture to the paths container
            var sprite = new PIXI.Sprite(texture);
            sprite.scale.x = sprite.scale.x / Wick.View.Frame.RASTERIZE_RESOLUTION_MODIFIER;
            sprite.scale.y = sprite.scale.y / Wick.View.Frame.RASTERIZE_RESOLUTION_MODIFIER;
            this.pathsContainer.removeChildren();
            this.pathsContainer.addChild(sprite);

            // Position sprite correctly
            sprite.x = this._SVGBounds.x;
            sprite.y = this._SVGBounds.y;

            // Cache pixi sprite
            this._pixiSprite = sprite;
            this._pixiSprite._wickDebugData = {
                uuid: this.model.uuid,
                type: 'frame_svg',
            };

            this._onRasterFinishCallback();
        });
    }

    _applyClipChanges () {
        // Reorder clips
        var clips = this.model.clips.concat([]);
        clips.forEach(clip => {
            this.model.removeClip(clip);
        });
        this.clipsLayer.children.forEach(child => {
            this.model.addClip(clips.find(g => {
                return g.uuid === child.data.wickUUID;
            }));
        });

        // Update clip transforms
        this.clipsLayer.children.forEach(child => {
            var wickClip = this.model.getChildByUUID(child.data.wickUUID);
            wickClip.transformation.x = child.position.x;
            wickClip.transformation.y = child.position.y;
            wickClip.transformation.scaleX = child.scaling.x;
            wickClip.transformation.scaleY = child.scaling.y;
            wickClip.transformation.rotation = child.rotation;
            wickClip.transformation.opacity = child.opacity;
        });

        // TODO Update active tween / create new tween here
    }

    _applyPathChanges () {
        // This could be optimized by updating existing paths instead of completely clearing the frame.

        // Clear all WickPaths from the frame
        this.model.paths.forEach(path => {
            this.model.removePath(path);
        });

        // Create new WickPaths for the frame
        this.pathsLayer.children.filter(child => {
            return child.data.wickType !== 'gui';
        }).forEach(child => {
            if(!child.applyMatrix) {
                console.error('Path had applyMatrix set to false on Frame applyChanges(). This should never happen - check that selection was properly destroyed.')
            }
            var pathJSON = Wick.View.Path.exportJSON(child);
            var wickPath = new Wick.Path({json:pathJSON});
            this.model.addPath(wickPath);
            child.name = wickPath.uuid;
        });
    }
}
