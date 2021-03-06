var CubeRealtimeUserController = function CubeRealtimeUserController(opts) {

    CubeController.apply(this, arguments);

    var cubeRealtimeUserController = this;

    var __combinedDefaultOptions = {};
    var __parentDefaultOptions = this.getDefaultOptions();
    var __parentOptionKeys = Object.keys(__parentDefaultOptions);
    for (var i = 0, numOpts = __parentOptionKeys.length; i < numOpts; i++) {
        __combinedDefaultOptions[__parentOptionKeys[i]] = __parentDefaultOptions[__parentOptionKeys[i]];
    }

    var __myDefaultOptions = {
        action: 'slide',
        writeFace: 'front',
        direction: 'back',
        stepSize: 1,
        wrap: false,
        listenForKeys: 'all',
        frameCacheSize: 100,
    };
    var __myOptionKeys = Object.keys(__myDefaultOptions);
    for (var i = 0, numOpts = __myOptionKeys.length; i < numOpts; i++) {
        __combinedDefaultOptions[__myOptionKeys[i]] = __myDefaultOptions[__myOptionKeys[i]];
    }

    var _opts = opts || {};
    var _options = {};
    var _optionKeys = Object.keys(__combinedDefaultOptions);
    for (var i = 0, numOpts = _optionKeys.length; i < numOpts; i++) {
        _options[_optionKeys[i]] = (_optionKeys[i] in _opts) ?
            _opts[_optionKeys[i]] :
            __combinedDefaultOptions[_optionKeys[i]];
    }

    var _mouseListeningCells = [];

    function __updateMouseListeningCells() {
        _mouseListeningCells = [];

        if (!cubeRealtimeUserController.cube) {
            return;
        }

        var cubeCells = cubeRealtimeUserController.cube.cells;
        for (var i = 0, numCells = cubeCells.length; i < numCells; i++)
        {
            var cell = cubeCells[i];

            var shouldBeInteractive = {
                front: (cell.z === 0),
                left: (cell.x === 0),
                back: (cell.z === 7),
                right: (cell.x === 7),
                top: (cell.y === 0),
                bottom: (cell.y === 7),
            }[_options['writeFace']];

            if (shouldBeInteractive)
            {
                _mouseListeningCells.push(cell.coordAsString);
            }
        }
    }

    function __listenForKeystrokes() {
        var controller = cubeRealtimeUserController;
        if (!controller.listeningForKeystrokes)
        {
            /**
             * By checking that controller.listeningForKeystrokes is not already set, we
             * prevent double-binding of these listeners to single events.
             */

            controller.listeningForKeystrokes = true;
            document.addEventListener('keydown', controller.validKeyFilterFn);
            document.addEventListener('keydown', controller.actionKeyListenerFn);
            document.addEventListener('keypress', controller.keyListenerFn);
        }
    };

    function __stopListeningForKeystrokes() {
        var controller = cubeRealtimeUserController;
        document.removeEventListener('keydown', controller.validKeyFilterFn);
        document.removeEventListener('keydown', controller.actionKeyListenerFn);
        document.removeEventListener('keypress', controller.keyListenerFn);
        controller.listeningForKeystrokes = false;
    };

    Object.defineProperty(this, 'validKeyFns', {
        writable: false,
        value: {
            specials: function(e) {
                return (
                    (e.keyCode === 32) ||   // spacebar
                    (e.keyCode === 8) ||    // backspace
                    (e.keyCode === 13) ||   // enter
                    (e.keyCode >= 37 && e.keyCode <= 40)    // arrow keys
                );
            },
            alpha: function(e) {
                return cubeRealtimeUserController.validKeyFns.specials(e) || (e.keyCode >= 65 && e.keyCode <= 90);
            },
            num: function(e) {
                return (
                    cubeRealtimeUserController.validKeyFns.specials(e) ||
                    (e.keyCode >= 48 && e.keyCode <= 57) || // top row
                    (e.keyCode >= 96 && e.keyCode <= 105)   // num pad
                );
            },
            symbols: function(e) {
                return (
                    cubeRealtimeUserController.validKeyFns.specials(e) ||
                    (e.keyCode >= 106 && e.keyCode <= 111) ||  // math operators
                    (e.keyCode >= 186 && e.keyCode <= 222) ||  // punctuation
                    (e.shiftKey && e.keyCode >= 48 && e.keyCode <= 57)    // "uppercase" numbers
                );
            },
            alphanum: function(e) {
                return cubeRealtimeUserController.validKeyFns.alpha(e) || cubeRealtimeUserController.validKeyFns.num(e);
            },
            all: function(e) {
                return cubeRealtimeUserController.validKeyFns.alphanum(e) || cubeRealtimeUserController.validKeyFns.symbols(e);
            },
            none: function(e) {
                return false;
            },
        },
    });

    Object.defineProperty(this, 'validListenForKeys', {
        get: function() { return Object.keys(cubeRealtimeUserController.validKeyFns); },
    });

    Object.defineProperty(this, 'validKeyFilterFn', {
        writable: false,
        value: function validKeyFilterFn(e) {
            /**
             * Call the validator for the current set of desired keys, passing in the
             * current event for evaluation. If the key is valid, allow the event to
             * proceed, otherwise don't let other listeners see it.
             */

            if (cubeRealtimeUserController.validKeyFns[cubeRealtimeUserController.listenForKeys](e))
            {
                return true;
            }

            e.preventDefault();
            e.stopPropagation();
            return false;
        },
    });

    Object.defineProperty(this, 'actionKeyListenerFn', {
        writable: false,
        value: function actionKeyListenerFn(e) {
            var controller = cubeRealtimeUserController;
            var cube = controller.cube;

            /**
             * Capture key events that are supposed to trigger an action on the cube.
             * In the event that an action is typed, we don't want to let the event
             * propagate up to this.keyListenerFn(). If it were to, the letters
             * pressed to trigger actions would appear on the cube. For example,
             * CTRL+B would both change the cube's animation direction and show a 'b'
             * on the front face.
             */

            var keyDirectionMap = {
                37: 'left',
                38: 'up',
                39: 'right',
                40: 'down',
                70: 'front',   // "Front:  CTRL+F"
                66: 'back',    // "Back:   CTRL+B"
                85: 'up',      // "Up:     CTRL+U"
                68: 'down',    // "Down:   CTRL+D"
                82: 'right',   // "Right:  CTRL+R"
                76: 'left',    // "Left:   CTRL+L"
            };

            function keyIsDirectionalAction() {
                return Object.keys(keyDirectionMap).indexOf(e.keyCode.toString()) !== -1;
            }

            if (e.keyCode === 13)  // enter
            {
                controller.togglePlaying();
            } else if ((e.keyCode === 8)) // backspace
            {
                if (e.ctrlKey)
                {
                    controller.stop();
                    cube.clear();   // clear whole cube
                }
            } else if (e.ctrlKey && (e.keyCode === 189))    // ctrl+minus
            {   // prev step
                controller.step(-1);
            } else if (e.ctrlKey && (e.keyCode === 187))    // ctrl+equals
            {   // next step
                controller.step();
            } else if (e.ctrlKey && keyIsDirectionalAction(e))
            {
                var newDirection = keyDirectionMap[e.keyCode];
                if (e.altKey)
                {
                    if (newDirection === 'up')
                    {
                        newDirection = 'back';
                    } else if (newDirection === 'down')
                    {
                        newDirection = 'forward';
                    }
                }
                controller.direction = newDirection;
            } else if (e.ctrlKey && e.keyCode >= 48 && e.keyCode <= 57) // ctrl + num row
            {
                var shapeIndex = parseInt(String.fromCharCode(e.keyCode), 10) - 1;
                var shapeNames = Object.keys(CubeAssets.activeShapeSetShapes);
                var numShapes = shapeNames.length;
                if ((shapeIndex >= 0) && (shapeIndex < numShapes))
                {
                    var shapeTile = CubeAssets.getShapeRender(shapeNames[shapeIndex]);
                    cube.writeSlice(shapeTile, controller.writeFace);
                }
            } else
            {
                return;
            }

            // fall through to this if any of the above "ifs" are true
            e.preventDefault();
            e.stopPropagation();
        },
    });

    Object.defineProperty(this, 'keyListenerFn', {
        writable: false,
        value: function keyListenerFn(e) {
            /**
             * Called for each keypress that is allowed to pass through the
             * validation function.
             */
            var controller = cubeRealtimeUserController;
            var cube = controller.cube;

            var char = String.fromCharCode(e.which);
            var colorRgb = cube.colors[controller.penColor];
            var charTile = CubeAssets.getCharacterRender(char, colorRgb);
            cube.writeSlice(charTile, controller.writeFace);
        },
    });

    Object.defineProperty(this, 'mouseListeningCells', {
        get: function() { return _mouseListeningCells; },
    });

    var _firstRenderTimeOfCurrFrame = 0;
    var _prevFrame = null;
    Object.defineProperty(this, 'getRenderFrame', {
        writable: false,
        value: function getRenderFrame(renderTime) {
            var currFrame = cubeRealtimeUserController.currentAnimationFrame;
            if (!currFrame)
            {
                _firstRenderTimeOfCurrFrame = renderTime;
                _prevFrame = currFrame;
                return cubeRealtimeUserController.getEmptyCube();
            }

            var currFrameValidDuration = currFrame.end - currFrame.start;
            var timeSinceFirstSeenFrame = renderTime - _firstRenderTimeOfCurrFrame;
            if (timeSinceFirstSeenFrame > currFrameValidDuration)
            {
                _firstRenderTimeOfCurrFrame = renderTime;
                _prevFrame = cubeRealtimeUserController.popCurrentAnimationFrame();
                return currFrame.data;
            }

            if (currFrame !== _prevFrame)
            {
                _prevFrame = currFrame;
                _firstRenderTimeOfCurrFrame = renderTime;
            }
            return currFrame.data;
        },
    });

    Object.defineProperty(this, 'writeFace', {
        get: function() { return _options['writeFace']; },
        set: function(newWriteFace) {
            _options['writeFace'] = newWriteFace;
            __updateMouseListeningCells();
        },
    });

    Object.defineProperty(this, 'action', {
        get: function() { return _options['action']; },
        set: function(newAction) {
            if (newAction !== 'slide')
            {
                console.error('Invalid action for cubeRealtimeUserController', newAction);
                throw 'Invalid action';
            }

            var prevAction = _options['action'];
            _options['action'] = newAction;

            this.emit('propertyChanged', {
                property: 'action',
                newValue: _options['action'],
                oldValue: prevAction,
            });
        },
    });

    Object.defineProperty(this, 'direction', {
        get: function() { return _options['direction']; },
        set: function(newDirection) {
            if (this.directions.indexOf(newDirection) === -1)
            {
                console.error('Invalid direction for cubeRealtimeUserController', newDirection);
                throw 'Invalid direction';
            }

            var prevDirection = _options['direction'];
            _options['direction'] = newDirection;

            this.emit('propertyChanged', {
                property: 'direction',
                newValue: _options['direction'],
                oldValue: prevDirection,
            });
        },
    });

    Object.defineProperty(this, 'stepSize', {
        get: function() { return _options['stepSize']; },
        set: function(newStepSize) {
            var parsedValue = parseInt(newStepSize, 10);
            if (isNaN(parsedValue) || (parsedValue < 0))
            {
                console.error('Invalid step size for cubeRealtimeUserController', newStepSize);
                throw 'Invalid step size';
            }

            var prevStepSize = _options['stepSize'];
            _options['stepSize'] = newStepSize;

            this.emit('propertyChanged', {
                property: 'stepSize',
                newValue: _options['stepSize'],
                oldValue: prevStepSize,
            });
        },
    });

    Object.defineProperty(this, 'wrap', {
        get: function() { return _options['wrap']; },
        set: function(newWrap) {
            var prevWrap = _options['wrap'];
            _options['wrap'] = !!newWrap;

            this.emit('propertyChanged', {
                property: 'wrapys',
                newValue: _options['wrap'],
                oldValue: prevWrap,
            });
        },
    });

    Object.defineProperty(this, 'listenForKeys', {
        get: function() { return _options['listenForKeys'] },
        set: function(newListenForKeys) {
            if (this.validListenForKeys.indexOf(newListenForKeys) === -1)
            {
                console.error('Invalid listenForKeys. ' +
                    'Valid options: ' + this.validListenForKeys.join(', '));
                throw 'Invalid listenForKeys';
            }

            var prevListenForKeys = _options['listenForKeys'];
            _options['listenForKeys'] = newListenForKeys;
            __listenForKeystrokes();

            this.emit('propertyChanged', {
                property: 'listenForKeys',
                newValue: _options['listenForKeys'],
                oldValue: prevListenForKeys,
            });
        },
    });

    this.getDefaultOptions = function() {
        return __combinedDefaultOptions;
    };

    this.on('propertyChanged', function(changeData) {
        if (changeData.property === 'animationInterval')
        {
            if (cubeRealtimeUserController.playing)
            {
                cubeRealtimeUserController.stop();
                cubeRealtimeUserController.play();
            }
        }
    });

    applyOptions.call(this, _options);

    return this;

};

CubeRealtimeUserController.prototype = Object.create(CubeController.prototype);
CubeRealtimeUserController.prototype.constructor = CubeRealtimeUserController;

CubeRealtimeUserController.prototype.write = function write(tile) {
    this.cube.writeSlice(tile, this.writeFace);
};

CubeRealtimeUserController.prototype.getAnimationCb = function getAnimationCb() {
    var that = this;
    if (this.action === 'slide')
    {
        return {
            up: function() { that.cube.shiftPlane('Y', -1 * that.stepSize, that.wrap); },
            down: function() { that.cube.shiftPlane('Y', that.stepSize, that.wrap); },
            left: function() { that.cube.shiftPlane('X', that.stepSize, that.wrap); },
            right: function() { that.cube.shiftPlane('X', -1 * that.stepSize, that.wrap); },
            forward: function() { that.cube.shiftPlane('Z', that.stepSize, that.wrap); },
            back: function() { that.cube.shiftPlane('Z', -1 * that.stepSize, that.wrap); },
        }[this.direction];
    }
};

CubeRealtimeUserController.prototype.clear = function() {
    var prevPlaying = this.playing;
    this.stop();
    this.clearAnimationFrames();
    this.cube.clear();
    this.render();
    if (prevPlaying)
    {
        this.play();
    }
};

CubeRealtimeUserController.prototype.step = function(numSteps) {
    /**
     * Performs a single step of the current animation. If the number of steps
     * is negative, we take the number of steps in the "opposite" direction for
     * the current animation settings.
     */

    var DEFAULT_NUM_STEPS = 1;
    _numSteps = typeof numSteps !== 'undefined' ?
        (parseInt(numSteps, 10) || DEFAULT_NUM_STEPS) :
        DEFAULT_NUM_STEPS;

    if (_numSteps < 0)
    {   // step "backward"
        var startDirection = this.direction;
        var oppositeDirection = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left',
            'forward': 'back',
            'back': 'forward',
        }[startDirection];  // get the opposite direction

        this.direction = oppositeDirection; // apply the opposite direction for our next steps

        this.step(Math.abs(_numSteps));  // call this very function, but with a positive number of steps

        this.direction = startDirection;    // re-apply the old direction

        return;
    }

    for (var i = 0; i < _numSteps; i++)
    {
        (this.getAnimationCb())();
    }

    return this;
};

CubeRealtimeUserController.prototype.update = function(frameValidStart, frameValidEnd) {
    var preOnStates = this.cube.serializeForCompare();
    this.step();
    var postOnStates = this.cube.serializeForCompare();
    if (preOnStates !== postOnStates)
    {
        this.addAnimationFrame(this.cube.getForAnimationFrame(), frameValidStart, frameValidEnd);
    }
    return this;
};
