/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Paper.js-drawing-tools.
 *
 * Paper.js-drawing-tools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Paper.js-drawing-tools is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Paper.js-drawing-tools.  If not, see <https://www.gnu.org/licenses/>.
 */

(function () {
    var onError;
    var onFinish;

    var distance;
    var item;

    const SPLITS = 5;

    const EPSILON = 0.001;
    const MAX_ANGLE = 10; //degrees
 
    function bump() {
        if (item._class == 'Path') {
            console.log('a');
            onFinish(bumpPath(item));
        }
        else if (item._class == 'CompoundPath') {
            console.log('b');
            let new_item = new paper.CompoundPath({fillColor: item.fillColor, strokeColor: item.strokeColor, strokeWidth: item.strokeWidth});
            for (let p = 0; p < item.children.length; p++) {
                new_item.addChild(bumpPath(item.children[p]));
            }
            onFinish(new_item);
        }
        else {
            console.log('c');
            onError("Item is not a Path or CompoundPath")
        }
        console.log('bye');
    }

    // Chop up path's curves into pieces to reduce curvature per curve
    function splice(path) {
        for (let c = 0; c < path.curves.length; c++) {
            let curve = path.curves[c];
            let t0 = curve.getTangentAtTime(EPSILON);
            let t1 = t0.rotate(MAX_ANGLE);
            let t2 = t0.rotate(-MAX_ANGLE);
            let split_times = curve.getTimesWithTangent(t1);
            split_times.concat(curve.getTimesWithTangent(t2));
            let min = 1;
            for (let i = 0; i < split_times.length; i++) {
                let split_time = split_times[i];
                if (split_time < min && split_time > EPSILON) {
                    min = split_time;
                }
            }
            if (min < 1 - EPSILON) {
                curve.divideAtTime(min); // This modifies path
                console.log("split", split_times, min);
            }
        }
    }

    function bumpPath(path) {
        // for now assume it's closed
        splice(path);

        let segments = [];

        for (let i = 0; i < path.curves.length; i++) {
            let curve_before = path.curves[i];
            let curve_after = path.curves[(i + 1) % path.curves.length];
            let segment = curve_before.segment2;
            if (!segment.isSmooth()) {
                let before_seg = segment.clone();
                let before_normal = curve_before.getNormalAtTime(1.0 - EPSILON);
                
                let after_seg = segment.clone();
                let after_normal = curve_after.getNormalAtTime(EPSILON);
                
                before_seg.point = before_seg.point.add(before_normal.multiply(distance));
                before_seg.handleOut = null;
                let c = curve_before.getCurvatureAtTime(1.0 - EPSILON);
                let r_old = c === 0 ? 0 : 1 / c;
                let r_new = r_old - distance;
                before_seg.handleIn = before_seg.handleIn.multiply(c === 0 ? 1 : r_new / r_old);

                after_seg.point = after_seg.point.add(after_normal.multiply(distance));
                after_seg.handleIn = null;
                c = curve_after.getCurvatureAtTime(EPSILON);
                r_old = c === 0 ? 0 : 1 / c;
                r_new = r_old - distance;
                after_seg.handleOut = after_seg.handleOut.multiply(c === 0 ? 1 : r_new / r_old);

                let corner_seg = segment.clone();
                //Determine corner location by intersecting parametric lines of the two edges
                //l_before(b) = before_seg.point + (-before_normal.y, before_normal.x) * b
                //l_after(a) = after_seg.point + (-after_normal.y, after_normal.x) * a
                //l_before(b) = l_after(a)
                //-(b.pt.x - a.pt.x - b.n.y * b)/a.n.y = a
                //(b.pt.y - a.pt.y + b.n.x * b)/a.n.x = a
                //-(b.pt.x - a.pt.x - b.n.y * b)/a.n.y = (b.pt.y - a.pt.y + b.n.x * b)/a.n.x
                //b * (b.n.y/a.n.y - b.n.x/a.n.x) = (b.pt.y - a.pt.y) / a.n.x + (b.pt.x - a.pt.x) / a.n.y
                //l_before(b) = b.p + (-b.n.y, b.n.x) * ((b.pt.y - a.pt.y) / a.n.x + (b.pt.x - a.pt.x) / a.n.y) / (b.n.y/a.n.y - b.n.x/a.n.x)
                let b = ((before_seg.point.y - after_seg.point.y) / after_normal.x + (before_seg.point.x - after_seg.point.x) / after_normal.y) / (before_normal.y/after_normal.y - before_normal.x/after_normal.x);
                let x = before_seg.point.x - before_normal.y * b;
                let y = before_seg.point.y + before_normal.x * b;
                corner_seg.point = new paper.Point(x, y);
                corner_seg.handleIn = null;
                corner_seg.handleOut = null;

                segments.push(before_seg);
                segments.push(corner_seg);
                segments.push(after_seg);
            }
            else {
                let seg = segment.clone();
                let normal = curve_before.getNormalAtTime(1.0 - EPSILON);
                seg.point = seg.point.add(normal.multiply(distance));
                let c = curve_before.getCurvatureAtTime(1.0 - EPSILON);
                let r_old = c === 0 ? 0 : 1 / c;
                let r_new = r_old - distance;
                let scale = c === 0 ? 1 : r_new / r_old;
                seg.handleIn = seg.handleIn.multiply(scale);
                seg.handleOut = seg.handleOut.multiply(scale);

                segments.push(seg);
            }
        }

        let final_path = new paper.Path(segments);
        final_path.closePath();
        final_path.unite();
        return final_path;
    }

    /* Add hole() method to paper */
    paper.PaperScope.inject({
        bump: function(args) {
            if(!args) console.error('paper.bump: args is required');
            if(!args.path) console.error('paper.bump: args.path is required');
            if(!args.distance) console.error('paper.bump: args.distance is required');
            if(!args.onFinish) console.error('paper.bump: args.onFinish is required');
            if(!args.onError) console.error('paper.bump: args.onError is required');

            item = args.path.clone();
            console.log('hello', item);

            distance = -args.distance;

            onError = args.onError;
            onFinish = args.onFinish;

            bump();
        }
    });
})();