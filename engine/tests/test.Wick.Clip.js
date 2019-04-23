describe('Wick.Clip', function() {
    describe('#constructor', function () {
        it('should instantiate correctly', function() {
            var clip = new Wick.Clip();
            expect(clip instanceof Wick.Base).to.equal(true);
            expect(clip instanceof Wick.Tickable).to.equal(true);
            expect(clip instanceof Wick.Clip).to.equal(true);
            expect(clip.classname).to.equal('Clip');
            expect(clip.timeline instanceof Wick.Timeline).to.equal(true);
        });
    });

/*
    describe('#serialize', function () {
        it('should serialize correctly', function() {
            var clip = new Wick.Clip();
            var data = clip.serialize();

            expect(data.classname).to.equal('Clip');
            expect(data.timeline.classname).to.equal('Timeline');
            expect(data.transform.classname).to.equal('Transformation');
        });
    });

    describe('#deserialize', function () {
        it('should deserialize correctly', function() {
            var data = {
                classname: 'Clip',
                timeline: new Wick.Timeline().serialize(),
                scripts: [],
                transform: new Wick.Transformation().serialize(),
            };

            var clip = Wick.Clip.deserialize(data);

            expect(clip instanceof Wick.Clip).to.equal(true);
            expect(clip.scripts instanceof Array).to.equal(true);
            expect(clip.timeline instanceof Wick.Timeline).to.equal(true);
            expect(clip.transform instanceof Wick.Transformation).to.equal(true);
        });
    });
*/

    describe('#lineage', function () {
        it('should determine lineage correctly', function () {
            var project = new Wick.Project();

            var greatGrandParent = new Wick.Clip();
            greatGrandParent.timeline.addLayer(new Wick.Layer());
            greatGrandParent.activeLayer.addFrame(new Wick.Frame());
            project.activeFrame.addClip(greatGrandParent);

            var grandparent = new Wick.Clip();
            grandparent.timeline.addLayer(new Wick.Layer());
            grandparent.activeLayer.addFrame(new Wick.Frame());
            greatGrandParent.activeFrame.addClip(grandparent);

            var parent = new Wick.Clip();
            parent.timeline.addLayer(new Wick.Layer());
            parent.activeLayer.addFrame(new Wick.Frame());
            grandparent.activeFrame.addClip(parent);

            var child = new Wick.Clip();
            child.timeline.addLayer(new Wick.Layer());
            child.activeLayer.addFrame(new Wick.Frame());
            parent.activeFrame.addClip(child);

            var lineage = child.lineage;
            expect(lineage[0]).to.equal(child);
            expect(lineage[1]).to.equal(parent);
            expect(lineage[2]).to.equal(grandparent);
            expect(lineage[3]).to.equal(greatGrandParent);
            expect(lineage[4]).to.equal(project.root);
        });
    });

    describe('#tick', function () {
        it('should advance timeline on update', function() {
            var clip = new Wick.Clip();
            clip.timeline.addLayer(new Wick.Layer());
            clip.timeline.layers[0].addFrame(new Wick.Frame({start:1}));
            clip.timeline.layers[0].addFrame(new Wick.Frame({start:2}));

            expect(clip.timeline.playheadPosition).to.equal(1);
            clip._onActive();
            expect(clip.timeline.playheadPosition).to.equal(2);
        });

        it('script errors from child frame should bubble up', function() {
            var clip = new Wick.Clip();
            clip.timeline.addLayer(new Wick.Layer());

            var child = new Wick.Frame();
            child.addScript('load', 'thisWillCauseAnError()');
            clip.timeline.layers[0].addFrame(child);

            var error = clip.tick();
            expect(error).to.not.equal(null);
            expect(error.message).to.equal('thisWillCauseAnError is not defined');
            expect(error.lineNumber).to.equal(1);
            expect(error.uuid).to.equal(child.uuid);
        });

        it('script errors from child clip should bubble up', function() {
            var clip = new Wick.Clip();
            clip.timeline.addLayer(new Wick.Layer());
            clip.timeline.layers[0].addFrame(new Wick.Frame());

            var child = new Wick.Clip();
            child.addScript('load', 'thisWillCauseAnError()');
            clip.timeline.activeFrame.addClip(child);

            var error = clip.tick();
            expect(error).to.not.equal(null);
            expect(error.message).to.equal('thisWillCauseAnError is not defined');
            expect(error.lineNumber).to.equal(1);
            expect(error.uuid).to.equal(child.uuid);
        });

        it('script errors from deeply nested child clips should bubble up', function() {
            function addChildClipToParentClip (clip) {
                clip.timeline.addLayer(new Wick.Layer());
                clip.timeline.layers[0].addFrame(new Wick.Frame());

                var child = new Wick.Clip();
                clip.timeline.activeFrame.addClip(child);

                return child;
            }

            var maxDepth = 10;
            for(var depth = 1; depth < maxDepth; depth ++) {
                var parentClip = new Wick.Clip();

                var clip = parentClip;
                for(var i = 0; i < depth; i++) {
                    clip = addChildClipToParentClip(clip);
                }
                clip.addScript('load', 'thisWillCauseAnError()');

                var error = parentClip.tick();
                expect(error).to.not.equal(null);
                expect(error.message).to.equal('thisWillCauseAnError is not defined');
                expect(error.lineNumber).to.equal(1);
                expect(error.uuid).to.equal(clip.uuid);
            }
        });

        it('scripts should stop execution after error', function() {
            var clip = new Wick.Clip();
            clip.timeline.addLayer(new Wick.Layer());
            clip.timeline.layers[0].addFrame(new Wick.Frame());

            var childA = new Wick.Clip();
            childA.addScript('load', 'this.__scriptDidRun = true;');
            clip.timeline.layers[0].frames[0].addClip(childA);

            var childB = new Wick.Clip();
            childB.addScript('load', 'this.__scriptDidRun = true;thisCausesAnError();');
            clip.timeline.layers[0].frames[0].addClip(childB);

            var childC = new Wick.Clip();
            childC.addScript('load', 'this.__scriptDidRun = true;');
            clip.timeline.layers[0].frames[0].addClip(childC);

            var result = clip.tick();
            expect(childA.__scriptDidRun).to.equal(true);
            expect(childB.__scriptDidRun).to.equal(true);
            expect(childC.__scriptDidRun).to.equal(undefined);
        });

        describe('#stop', function () {
            it('stop should work as expected', function() {
                var project = new Wick.Project();
                project.activeFrame.end = 10;

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'stop()');

                project.tick();
                project.tick();
                expect(project.focus.timeline.playheadPosition).to.equal(1);
                project.tick();
                expect(project.focus.timeline.playheadPosition).to.equal(1);
            });

            it('this.stop should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'this.stop()');
                clip.activeFrame.end = 10;

                project.tick();
                project.tick();
                expect(clip.timeline.playheadPosition).to.equal(1);
                project.tick();
                expect(clip.timeline.playheadPosition).to.equal(1);
            });

            it('otherClip.stop should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                clip.addScript('load', 'otherClip.stop();')
                project.activeFrame.addClip(clip);

                var otherClip = new Wick.Clip();
                otherClip.identifier = 'otherClip';
                otherClip.timeline.addLayer(new Wick.Layer());
                otherClip.timeline.layers[0].addFrame(new Wick.Frame({start:1,end:10}));
                project.activeFrame.addClip(otherClip);

                project.tick();
                project.tick();

                expect(otherClip.timeline.playheadPosition).to.equal(1);
            });
        });

        describe('#play', function () {
            it('play should work as expected', function() {
                var project = new Wick.Project();
                project.activeFrame.end = 10;
                project.focus.timeline._playing = false;

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'play()');

                project.tick();
                project.tick();
                expect(project.focus.timeline.playheadPosition).to.equal(2);
                project.tick();
                expect(project.focus.timeline.playheadPosition).to.equal(3);
            });

            it('this.play should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                clip.timeline._playing = false;
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'this.play();');
                clip.activeFrame.end = 10;

                project.tick();
                project.tick();
                expect(clip.timeline.playheadPosition).to.equal(2);
                //project.tick();
                //expect(clip.timeline.playheadPosition).to.equal(3);
            });
        });

        describe('#gotoAndStop', function () {
            it('this.gotoAndStop (frame number) should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'this.gotoAndStop(5)');
                clip.activeFrame.end = 10;

                project.tick();
                project.tick();

                expect(clip.timeline.playheadPosition).to.equal(5);

                project.tick();

                expect(clip.timeline.playheadPosition).to.equal(5);
            });

            it('this.gotoAndStop (frame name) should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'this.gotoAndStop("foo")');
                clip.activeFrame.end = 5;

                var namedFrame = new Wick.Frame({start:6,end:10});
                namedFrame.identifier = 'foo';
                clip.activeLayer.addFrame(namedFrame);

                project.tick();
                project.tick();

                expect(clip.timeline.playheadPosition).to.equal(6);
            });

            it('gotoAndStop (frame number) should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);
                project.activeFrame.end = 10;

                clip.addScript('load', 'gotoAndStop(9);');

                project.tick();
                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(9);

                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(9);
            });
        });

        describe('#gotoAndPlay', function () {
            it('this.gotoAndPlay (frame number) should work as expected', function() {
                var project = new Wick.Project();
                project.root.timeline._playing = false;

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'this.gotoAndPlay(5)');
                clip.activeFrame.end = 10;

                project.tick();
                project.tick();

                expect(clip.timeline.playheadPosition).to.equal(5);

                project.tick();

                expect(clip.timeline.playheadPosition).to.equal(6);
            });

            it('gotoAndPlay (frame number) should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);
                project.activeFrame.end = 10;

                clip.addScript('load', 'gotoAndPlay(9)');

                project.tick();
                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(9);

                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(10);
            });
        });

        describe('#gotoNextFrame', function () {
            it('gotoNextFrame should work as expected', function () {
                var project = new Wick.Project();
                project.root.timeline._playing = false;
                project.activeFrame.end = 10;

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'gotoNextFrame()');

                project.tick();
                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(2);

                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(2);
            });

            it('this.gotoNextFrame should work as expected', function () {
                // TODO
            });
        });

        describe('#gotoPrevFrame', function () {
            it('gotoPrevFrame should work as expected', function () {
                var project = new Wick.Project();
                project.activeFrame.end = 10;
                project.root.timeline._playing = false;
                project.root.timeline.playheadPosition = 5;

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'gotoPrevFrame()');

                project.tick();
                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(4);

                project.tick();

                expect(project.root.timeline.playheadPosition).to.equal(4);
            });

            it('this.gotoPrevFrame should work as expected', function () {
                //TODO
            });
        });

        describe('#x', function () {
            it('should update x correctly', function() {
                var clip = new Wick.Clip();
                clip.addScript('load', 'this.x = 100;');
                clip.addScript('update', 'this.x += 5;');

                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.x).to.equal(100);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.x).to.equal(105);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.x).to.equal(110);
            });
        });

        describe('#y', function () {
            it('should update y correctly', function() {
                var clip = new Wick.Clip();
                clip.addScript('load', 'this.y = 100;');
                clip.addScript('update', 'this.y += 5;');

                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.y).to.equal(100);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.y).to.equal(105);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.y).to.equal(110);
            });
        });

        describe('#scaleX', function () {
            it('should update scaleX correctly', function() {
                var clip = new Wick.Clip();
                clip.addScript('load', 'this.scaleX = 2;');
                clip.addScript('update', 'this.scaleX += 0.1;');

                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.scaleX).to.equal(2);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.scaleX).to.equal(2.1);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.scaleX).to.equal(2.2);
            });
        });

        describe('#scaleY', function () {
            it('should update scaleY correctly', function() {
                var clip = new Wick.Clip();
                clip.addScript('load', 'this.scaleY = 2;');
                clip.addScript('update', 'this.scaleY += 0.1;');

                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.scaleY).to.equal(2);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.scaleY).to.equal(2.1);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.scaleY).to.equal(2.2);
            });
        });

        describe('#rotation', function () {
            it('should update rotation correctly', function() {
                var clip = new Wick.Clip();
                clip.addScript('load', 'this.rotation = 180;');
                clip.addScript('update', 'this.rotation += 90;');

                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.rotation).to.equal(180);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.rotation).to.equal(270);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.rotation).to.equal(360);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.rotation).to.equal(450);
            });
        });

        describe('#opacity', function () {
            it('should update opacity correctly', function() {
                var clip = new Wick.Clip();
                clip.addScript('load', 'this.opacity = 0.5;');
                clip.addScript('update', 'this.opacity += 0.25;');

                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(0.5);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(0.75);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(1);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(1);

                clip.updateScript('update', 'this.opacity -= 0.25;');

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(0.75);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(0.5);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(0.25);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(0);

                error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.transformation.opacity).to.equal(0);
            });
        });

        describe('#project', function () {
            it('project should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'this.__project = project');
                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.__project).to.equal(project.root);
                expect(clip.__project.width).to.equal(project.width);
                expect(clip.__project.height).to.equal(project.height);
                expect(clip.__project.framerate).to.equal(project.framerate);
                expect(clip.__project.backgroundColor).to.equal(project.backgroundColor);
                expect(clip.__project.name).to.equal(project.name);
            });
        });

        describe('#parent', function () {
            it('project should work as expected', function() {
                var project = new Wick.Project();

                var clip = new Wick.Clip();
                project.activeFrame.addClip(clip);

                clip.addScript('load', 'this.__parent = parent');
                var error = clip.tick();
                expect(error).to.equal(null);
                expect(clip.__parent).to.equal(clip.parentClip);
            });
        });

        describe('#random', function () {
            it('random API should work correctly', function() {
                var numTries = 100;
                for (let i=0; i<numTries; i++) {
                    var project = new Wick.Project();

                    var clip = new Wick.Clip();
                    project.activeFrame.addClip(clip);

                    clip.addScript('load', 'this.__randomResult = random.integer(5,10);');
                    var error = clip.tick();
                    expect(error).to.equal(null);
                    expect(typeof clip.__randomResult).to.equal("number");
                    expect(clip.__randomResult >= 5).to.equal(true);
                    expect(clip.__randomResult <= 10).to.equal(true);
                }
            });
        });

        it ('clips should return current frame name', function () {
            var project = new Wick.Project();

            var clip = new Wick.Clip();
            project.activeFrame.addClip(clip);

            clip.addScript('load', 'this.__frameName = this.currentFrameName;');
            clip.addScript('update', 'this.__frameName = this.currentFrameName;');
            var error = clip.tick();
            expect(error).to.equal(null);
            expect(clip.__frameName).to.equal('');
            clip.timeline.activeFrame.identifier = "Tester";

            error = clip.tick();
            expect(clip.__frameName).to.equal("Tester");
        });


        it ('clips should return current frame number', function () {
            var project = new Wick.Project();

            var clip = new Wick.Clip();
            var clip2 = new Wick.Clip();
            clip2.timeline.activeLayer.addFrame(new Wick.Frame({start:2}));

            project.activeFrame.addClip(clip);
            project.activeFrame.addClip(clip2);

            clip.addScript('load', 'this.__frameNumber = this.currentFrameNumber;');
            clip.addScript('update', 'this.__frameNumber = this.currentFrameNumber;');

            clip2.addScript('load', 'this.__frameNumber = this.currentFrameNumber;');
            clip2.addScript('update', 'this.__frameNumber = this.currentFrameNumber;');

            var error = project.tick();
            expect(error).to.equal(null);
            error = project.tick();
            expect(error).to.equal(null);
            
            expect(clip.__frameNumber).to.equal(1);
            expect(clip2.__frameNumber).to.equal(1);
            error = project.tick();
            expect(error).to.equal(null);
            expect(clip.__frameNumber).to.equal(1);
            expect(clip2.__frameNumber).to.equal(2);
        });

        it('clips should have access to global API', function() {
            var project = new Wick.Project();

            var clip = new Wick.Clip();
            project.activeFrame.addClip(clip);

            clip.addScript('load', 'stop(); play();');
            var error = clip.tick();
            expect(error).to.equal(null);
        });

        it('clips should have access to other named objects', function() {
            var project = new Wick.Project();

            var clipA = new Wick.Clip();
            clipA.identifier = 'foo';
            project.activeFrame.addClip(clipA);

            var clipB = new Wick.Clip();
            clipB.identifier = 'bar';
            project.activeFrame.addClip(clipB);

            var clipC = new Wick.Clip();
            project.activeFrame.addClip(clipC);

            clipA.addScript('load', 'this.__foo = foo; this.__bar = bar;');
            var errorA = clipA.tick();
            expect(errorA).to.equal(null);
            expect(clipA.__foo).to.equal(clipA);
            expect(clipA.__bar).to.equal(clipB);

            clipB.addScript('load', 'this.__foo = foo; this.__bar = bar;');
            var errorB = clipB.tick();
            expect(errorB).to.equal(null);
            expect(clipB.__foo).to.equal(clipA);
            expect(clipB.__bar).to.equal(clipB);

            clipC.addScript('load', 'this.__foo = foo; this.__bar = bar;');
            var errorC = clipC.tick();
            expect(errorC).to.equal(null);
            expect(clipC.__foo).to.equal(clipA);
            expect(clipC.__bar).to.equal(clipB);
        });

        it('clips should not have access to other named objects on other frames', function() {
            var project = new Wick.Project();
            project.root.timeline.activeLayer.addFrame(new Wick.Frame({start:2}));

            var clipA = new Wick.Clip();
            clipA.identifier = 'foo';
            project.activeLayer.frames[0].addClip(clipA);

            var clipB = new Wick.Clip();
            clipB.identifier = 'bar';
            project.activeLayer.frames[1].addClip(clipB);

            clipA.addScript('load', 'this.__bar = bar;');
            var errorA = clipA.tick();
            expect(errorA).not.to.equal(null);
            expect(errorA.message).to.equal("bar is not defined");
        });

        it('clips should have access to named clips on their own timelines', function() {
            var project = new Wick.Project();
            var clip = new Wick.Clip();
            project.activeFrame.addClip(clip);

            clip.timeline.addLayer(new Wick.Layer());
            clip.timeline.activeLayer.addFrame(new Wick.Frame({start:1}));
            clip.timeline.activeLayer.addFrame(new Wick.Frame({start:2}));

            // Add these ones to the active frame
            var subclipA = new Wick.Clip();
            subclipA.identifier = 'foo';

            var subclipB = new Wick.Clip();
            subclipB.identifier = 'bar';

            clip.timeline.frames[0].addClip(subclipA);
            clip.timeline.frames[0].addClip(subclipB);

            // Add this one to the inactive frame
            var subclipC = new Wick.Clip();
            subclipC.identifier = 'baz';

            clip.timeline.frames[1].addClip(subclipC);

            clip.addScript('load', 'this.__fooRef = this.foo; this.__barRef = this.bar;');
            var noError = project.tick();
            expect(noError).to.equal(null);
            expect(clip.__fooRef).to.equal(subclipA);
            expect(clip.__barRef).to.equal(subclipB);

            clip.addScript('load', 'this.__bazRef = this.baz;');
            var error = project.tick();
            expect(error).to.equal(null);
            expect(clip.__bazRef).to.equal(undefined);
        });

        it('clips should have access to named clips on other timelines', function() {
            var project = new Wick.Project();
            var clip = new Wick.Clip();
            project.activeFrame.addClip(clip);

            var clipWithChildren = new Wick.Clip();
            project.activeFrame.addClip(clipWithChildren);
            clipWithChildren.identifier = 'otherClip';
            clipWithChildren.timeline.addLayer(new Wick.Layer());
            clipWithChildren.timeline.activeLayer.addFrame(new Wick.Frame({start:1}));
            clipWithChildren.timeline.activeLayer.addFrame(new Wick.Frame({start:2}));

            var subclipA = new Wick.Clip();
            subclipA.identifier = 'foo';

            var subclipB = new Wick.Clip();
            subclipB.identifier = 'bar';

            clipWithChildren.timeline.frames[0].addClip(subclipA);
            clipWithChildren.timeline.frames[0].addClip(subclipB);

            clip.addScript('load', 'this.__fooRef = otherClip.foo; this.__barRef = otherClip.bar;');
            var noError = project.tick();
            expect(noError).to.equal(null);
            expect(clip.__fooRef).to.equal(subclipA);
            expect(clip.__barRef).to.equal(subclipB);
        });
    });
});
