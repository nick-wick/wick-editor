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

Wick.Tools.FillBucket = class extends Wick.Tool {
    /**
     *
     */
    constructor() {
        super();

        this.name = 'fillbucket';
    }

    get doubleClickEnabled() {
        return false;
    }

    /**
     *
     * @type {string}
     */
    get cursor() {
        return 'url(cursors/fillbucket.png) 32 32, auto';
    }

    get isDrawingTool() {
        return true;
    }

    onActivate(e) {

    }

    onDeactivate(e) {

    }

    onMouseDown(e) {
        setTimeout(() => {
            this.setCursor('wait');
        }, 0);

        setTimeout(() => {

            // this.paper.bump({
            //     path: this.project.activeFrame.getChildren()[0].view.item,
            //     distance: 5,
            //     onFinish: (path) => {
            //         console.log('result', path);
            //         this.setCursor('default');
            //         this.addPathToProject();
            //         this.paper.project.activeLayer.addChild(path);
            //         this.paper.OrderingUtils.bringToFront([path]);
            //         this.fireEvent('canvasModified');
            //     },
            //     onError: () => {},
            // })
            
            this.paper.hole({
                point: e.point,
                bgColor: new paper.Color(this.project.backgroundColor.hex),
                gapFillAmount: this.getSetting('gapFillAmount'),
                layers: this.project.activeFrames.filter(frame => {
                    return !frame.parentLayer.hidden;
                }).map(frame => {
                    return frame.view.objectsLayer;
                }),
                fillColor: this.getSetting('fillColor'),
                onFinish: (path) => {
                    this.setCursor('default');
                    if (path) {
                        path.fillColor = this.getSetting('fillColor').rgba;
                        path.strokeWidth = this.getSetting('fillSmoothing') / 100;
                        path.strokeColor = this.getSetting('fillColor').rgba;
                        path.name = null;
                        this.addPathToProject();
                        this.paper.project.activeLayer.addChild(path);
                        this.paper.OrderingUtils.bringToFront([path]);
                        this.fireEvent('canvasModified');
                    }
                },
                onError: (message) => {
                    this.setCursor('default');
                    this.project.errorOccured(message);
                }
            });
        }, 50);
    }

    onMouseDrag(e) {

    }

    onMouseUp(e) {

    }
}
