var Playlist = function() {

    var playlist = this;

    var _container = null;
    var _cube = null;

    var _mode = 'through';
    var _face = 'front';
    var _direction = 'cw';
    var _loops = false;
    var _frequency = 125;   // ms between each "tick"
    var _spacing = 4;       // number of ticks between tile rendering before next appears
    var _focus = false;

    var _tiles = [];        // which images to show
    var _tileStrip = [];    // all tiles concatenated

    var __tileThumbs = [];
    var __tileHtmls = [];

    var __userCursorPosition = 0;
    var __userCursorEl = document.createElement('div');
    __userCursorEl.classList.add('cursor');
    var __userCursorHtml = __getOuterHTML(__userCursorEl);

    var __duration = 0;

    var __playbackInterval = -1; // interval timers are actually just ints
    var __lastRenderedStrip = null;

    var __animationCursorDim1 = 0;
    var __animationCursorDim2 = 0;
    var __animationStartTime = 0;
    var __prevStripIdx = -1;

    var __columnReader = function(){};
    var __columnWriter = function(){};
    var __animator = function(){};

    /**
     * PRIVATE HELPERS
     */

    var __xzFaces = ['front', 'left', 'back', 'right'];
    var __xzFacesCursorsMap = {
        'front-cw': [7, 0],
        'front-ccw': [0, 0],
        'left-cw': [0, 0],
        'left-ccw': [0, 7],
        'back-cw': [0, 7],
        'back-ccw': [7, 7],
        'right-cw': [7, 7],
        'right-ccw': [7, 0],
    };

    var __c = new Cell({on: false, color: [0,0,0]});
    var __emptyStrip = [__c,__c,__c,__c,__c,__c,__c,__c];

    function __makeSpacingStrips(numStrips) {
        numStrips = typeof numStrips !== 'undefined' ? numStrips : _spacing;

        var strips = [];

        for (var i = 0; i < numStrips; i++)
        {
            strips.push(__emptyStrip.slice());
        }

        return strips;
    }

    function __updateTileStrip() {
        _tileStrip = _tiles.reduce(function(strips, tile) {
            return strips.concat(tile.getAsStrips()).concat(__makeSpacingStrips());
        }, []);
        __updateDuration();
    }

    function __updateDuration() {
        __duration = _tileStrip.length * _frequency; // update duration, used for _loops
    }

    function __updateAnimator() {
        if (_mode === 'across')
        {
            __animator = __animatorAcross;
        } else if (_mode === 'around')
        {
            __animator = __animatorAround;
        } else if (_mode === 'through')
        {
            __animator = __animatorThrough;
        }
    }

    function __updateAnimationCursorPosition() {
        if ((_mode !== 'across') && (_mode !== 'around'))
        {
            __animationCursorDim1 = 0;
            __animationCursorDim2 = 0;
            return;
        }

        var cursorMapKey = [_face, _direction].join('-');

        if (Object.keys(__xzFacesCursorsMap).indexOf(cursorMapKey) === -1)
        {
            console.error('Could not update animator cursor for current settings', _face, _direction);
            return;
        }

        var cursorSettings = __xzFacesCursorsMap[cursorMapKey];
        __animationCursorDim1 = cursorSettings[0];
        __animationCursorDim2 = cursorSettings[1];
    }

    function __updateAnimationColumnTouchers() {
        var __xzFaces = ['front', 'left', 'back', 'right'];
        if (__xzFaces.indexOf(_face) !== -1)
        {
            __columnReader = 'readXZCol';
            __columnWriter = 'writeXZCol';
        } else
        {
            console.error('Cannot set cursor touchers. Can only deal with xz faces now.');
        }
    };

    function __updateAnimationSettings() {
        __updateAnimator();
        __updateAnimationCursorPosition();
        __updateAnimationColumnTouchers();
    }

    function __updateTileHtmls() {
        __tileHtmls = _tiles.map(function(tile, idx) {
            return (
                '<div class="tile" data-idx="' + idx + '">' +
                    '<img src="' + __tileThumbs[idx] + '" />' +
                '</div>'
            );
        });
    }

    function __updateTileThumbs() {
        __tileThumbs = _tiles.map(function(tile, idx) {
            return tile.getPngData();
        });
    }

    function __getOuterHTML(el) {
        var tmpEl = document.createElement('div');
        tmpEl.appendChild(el.cloneNode(false));
        var outerHTML = tmpEl.innerHTML;
        tmpEl = null;
        return outerHTML;
    }

    function __renderTileContainer() {
        if (_container)
        {
            var frags = __tileHtmls.slice();
            frags.splice(__userCursorPosition, 0, __userCursorHtml);
            _container.innerHTML = frags.join('');
        } else
        {
            console.error('Playlist cannot render(): has no container.');
        }
    }

    function __updateForTileChange() {
        __updateTileStrip();
        __updateTileThumbs();
        __updateTileHtmls();

        __renderTileContainer();
    }


    /**
     * PROPERTIES
     */
    Object.defineProperty(this, 'cube', {
        get: function() { return _cube; },
        set: function(newCube) {
            playlist.stop()
            _cube = newCube;
        }
    });

    Object.defineProperty(this, 'mode', {
        get: function() { return _mode; },
        set: function(newMode) {
            var validModes = ['through', 'across', 'around'];
            if (validModes.indexOf(newMode) === -1)
            {
                return;
            }

            _mode = newMode;

            __updateAnimationSettings();
        }
    });

    Object.defineProperty(this, 'face', {
        get: function() { return _face; },
        set: function(newFace) {
            var validFaces = ['front', 'back', 'top', 'bottom', 'left', 'right'];
            if (validFaces.indexOf(newFace) === -1)
            {
                return;
            }

            _face = newFace;

            __updateAnimationSettings();
        }
    });

    Object.defineProperty(this, 'direction', {
        get: function() { return _direction; },
        set: function(newDirection) {
            var validDirections = ['ccw', 'cw'];   // ccw: to the right, cw: to the left
            if (validDirections.indexOf(newDirection) === -1)
            {
                return;
            }

            var reverseStrips = newDirection !== _direction;
            _direction = newDirection;

            if (reverseStrips)
            {
                _tileStrip.reverse();
            }

            __updateAnimationSettings();
        }
    });

    Object.defineProperty(this, 'loops', {
        get: function() { return _loops; },
        set: function(shouldLoop) {
            _loops = !!shouldLoop;
        }
    });

    Object.defineProperty(this, 'frequency', {
        get: function() { return _frequency; },
        set: function(newFrequency) {
            var parsed = parseInt(newFrequency, 10);
            if (isNaN(parsed))
            {
                return;
            }

            _frequency = Math.max(0, parsed);   // must be int greater than 0
            __updateDuration();
        }
    });

    Object.defineProperty(this, 'spacing', {
        get: function() { return _spacing; },
        set: function(newSpacing) {
            var parsed = parseInt(newSpacing, 10);
            if (isNaN(parsed))
            {
                return;
            }

            _spacing = Math.max(0, parsed);   // must be int greater than 0
            __updateTileStrip();
        }
    });

    Object.defineProperty(this, 'isPlaying', {
        get: function() { return __animationStartTime !== 0; },
        set: function(shouldPlay) {
            if (!!shouldPlay)
            {
                playlist.play();
            } else
            {
                playlist.stop();
            }
        }
    });

    Object.defineProperty(this, 'focus', {
        get: function() { return _focus; },
        set: function(inFocus) {
            _focus = !!inFocus;

            if (_container)
            {
                _container.classList.toggle('focus', _focus);
                __renderTileContainer();
            }
        }
    });

    function __kbKeydownListener(e) {
        var keyMap = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            8: 'backspace',
        };

        if (Object.keys(keyMap).indexOf(e.keyCode.toString()) === -1)
        {
            return;
        } else if (_focus)
        {
            if (keyMap[e.keyCode] === 'backspace')
            {
                playlist.removeTile(playlist.getTile(--__userCursorPosition));
                e.stopPropagation();
                e.preventDefault();
                return;
            } else if (e.altKey && (keyMap[e.keyCode] === 'down'))
            {
                playlist.insertTile(new Tile(cube.readSlice()), __userCursorPosition++);
                return;
            }

            var directionNewValueMap = {
                'up': 0,
                'down': _tiles.length,
                'left': __userCursorPosition - 1,
                'right': __userCursorPosition + 1,
            };

            var newPosition = directionNewValueMap[keyMap[e.keyCode]];
            __userCursorPosition = Math.max(0, Math.min(_tiles.length, newPosition));
            __renderTileContainer();

            e.preventDefault();
            e.stopPropagation();
        }
    }

    function __bindContainerKeyboardListeners() {
        /**
         * Bind event listeners for typing to add to the playlist and to move
         * the cursor.
         */
        document.addEventListener('keydown', __kbKeydownListener);
    }

    function __unbindContainerKeyboardListeners() {
        /**
         * Remove all of the events bound in __bindContainerKeyboardListeners()
         */
        document.removeEventListener('keydown', __kbKeydownListener);
    }

    function __containerMouseClickListener(e) {
        e.preventDefault();
        e.stopPropagation();

        playlist.focus = true;

        var closestTile = getClosest(e.target, '.tile');
        if (closestTile)
        {
            var tileClicked = playlist.getTile(closestTile.dataset.idx);
            cube.writeSlice(tileClicked.getCells());
        }
    }

    function __documentMouseClickListener(e) {
        if (e.target !== _container)
        {
            playlist.focus = false;
        }
    }

    function __bindContainerMouseListeners() {
        /**
         * Bind event listeners for clicking and dragging to edit the playlist.
         */
        _container.addEventListener('click', __containerMouseClickListener);
        document.addEventListener('click', __documentMouseClickListener);
    }

    function __unbindContainerMouseListeners() {
        /**
         * Remove all of the events bound in __bindContainerMouseListeners()
         */
        _container.removeEventListener('click', __containerMouseClickListener);
        document.removeEventListener('click', __documentMouseClickListener);
    }

    Object.defineProperty(this, 'container', {
        get: function() { return _container; },
        set: function(newContainer) {
            // don't validate input for now
            _container = newContainer;
            __bindContainerMouseListeners();
            __bindContainerKeyboardListeners();
        }
    });


    /**
     * PUBLIC METHODS
     */

        /**
         * CHANGE LIST OF TILES
         */

    this.getTiles = function() {
        return _tiles.slice();
    };

    this.getTile = function(index) {
        return _tiles[index];
    };

    this.moveTile = function(tile, newIndex) {
        var tileIndex = _tiles.indexOf(tile);
        if (tileIndex === -1)
        {
            return;
        }

        _tiles.splice(newIndex, 0, _tiles.splice(tileIndex, 1));

        __updateForTileChange();

        return this;
    };

    this.insertTile = function(newTile, index) {
        var tileIndex = _tiles.indexOf(newTile);
        if (tileIndex !== -1)
        {
            return this.moveTile(newTile, index);
        }

        _tiles.splice(index, 0, newTile);

        __updateForTileChange();

        return this;
    };

    this.appendTile = function(newTile) {
        _tiles.push(newTile);

        __updateForTileChange();

        return this;
    };

    this.removeTile = function(tile) {
        _tiles.splice(_tiles.indexOf(tile), 1);

        __updateForTileChange();

        return this;
    };

    this.replaceTile = function(index, tile) {
        _tiles.splice(index, 1, tile);

        __updateForTileChange();

        return this;
    };

    this.getTileStrip = function() {
        return _tileStrip.slice();
    };


    /**
     * ANIMATION METHODS
     */

        /**
         * PLAYBACK HELPERS
         */

    function __getTileStripCursorAtMs(ms) {
        var tick = Math.floor((_loops ? (ms % __duration) : ms) / _frequency);
        var strip = tick > (_tileStrip.length - 1) ?
            __emptyStrip.slice() :
            _tileStrip[tick];
        return {
            idx: _tileStrip.indexOf(strip), // is actually same as tick, I think?
            strip: strip,
        };
    };

    function __getCursorColumn() {
        return [__animationCursorDim1, __animationCursorDim2];
    }

    function __nextCCXZFaceCw(dim1, dim2) {
        var nextDims = [dim1, dim2];  // nextDim1, nextDim2

        if ((dim1 === 0) && (dim2 === 0))   // front -> left corner
        {
            nextDims[1] += 1;
        } else if ((dim1 === 0) && (dim2 === 7))    // left -> back corner
        {
            nextDims[0] += 1;
        } else if ((dim1 === 7) && (dim2 === 7))   // back -> right corner
        {
            nextDims[1] -= 1;
        } else if ((dim1 === 7) && (dim2 === 0))   // right -> front corner
        {
            nextDims[0] -= 1;
        } else if (dim1 === 0)   // left edge (^)
        {
            nextDims[1] += 1;
        } else if (dim1 === 7)   // right edge (v)
        {
            nextDims[1] -= 1;
        } else if (dim2 === 0)   // front edge (<-)
        {
            nextDims[0] -= 1;
        } else if (dim2 === 7)   // back edge (->)
        {
            nextDims[0] += 1;
        }

        return nextDims;
    }

    function __nextCCXZFaceCcw(dim1, dim2) {
        var nextDims = [dim1, dim2];  // nextDim1, nextDim2

        if ((dim1 === 0) && (dim2 === 0))   // left -> front corner
        {
            nextDims[0] += 1;
        } else if ((dim1 === 0) && (dim2 === 7))   // back -> left corner
        {
            nextDims[1] -= 1;
        } else if ((dim1 === 7) && (dim2 === 7))   // right -> back corner
        {
            nextDims[0] -= 1;
        } else if ((dim1 === 7) && (dim2 === 0))   // front -> right corner
        {
            nextDims[1] += 1;
        } else if (dim1 === 0)   // left edge (v)
        {
            nextDims[1] -= 1;
        } else if (dim1 === 7)   // right edge (^)
        {
            nextDims[1] += 1;
        } else if (dim2 === 0)   // front edge (->)
        {
            nextDims[0] += 1;
        } else if (dim2 === 7)   // back edge (<-)
        {
            nextDims[0] -= 1;
        }

        return nextDims;
    }

    function __getNextCursorColumn(dim1, dim2) {
        if (__xzFaces.indexOf(_face) !== -1)
        {
            if (_direction === 'cw')
            {   // x = dim1, z = dim2
                return __nextCCXZFaceCw(dim1, dim2);
            } else
            {   // _direction === 'ccw'; x = dim1, z = dim2
                return __nextCCXZFaceCcw(dim1, dim2);
            }
        }

        return nextDims;
    }

    function __stopIfShould(renderTime) {
        if (!_loops && (renderTime > __animationStartTime + __duration))
        {
            playlist.stop();
        }
    }

    function __propigateColumns(numColumns) {
        var start = __getCursorColumn();
        var dirtyCols = [start];
        for (var i = 0; i < numColumns; i++)
        {
            var lv = dirtyCols[dirtyCols.length - 1]; // lv: last value
            var nd = __getNextCursorColumn(lv[0], lv[1]); // nd: new dimensions
            dirtyCols.push(nd);
        }

        dirtyCols.reverse();

        for (var i = 0; i < numColumns; i++)
        {
            var srcDim1 = dirtyCols[i + 1][0];
            var srcDim2 = dirtyCols[i + 1][1];
            var data = _cube[__columnReader](srcDim1, srcDim2);

            var destDim1 = dirtyCols[i][0];
            var destDim2 = dirtyCols[i][1];

            _cube[__columnWriter](destDim1, destDim2, data);
        }
    }

    function __animatorPropigateColumns(numColumns) {
        var renderTime = Date.now();
        var strip = __getTileStripCursorAtMs(renderTime - __animationStartTime);
        var stripIdx = strip.idx;
        var stripData = strip.strip;

        if ((stripIdx !== __prevStripIdx) && (stripIdx !== -1))
        {
            __propigateColumns(numColumns);
            _cube[__columnWriter](__animationCursorDim1, __animationCursorDim2, stripData);
            __prevStripIdx = stripIdx;
        }

        __stopIfShould(renderTime);
    }

    function __animatorAcross() {
        __animatorPropigateColumns(7);
    }

    function __animatorAround() {
        __animatorPropigateColumns(27);
    }

        /**
         * PLAYBACK METHODS
         */

    this.play = function() {
        if (!(_cube instanceof Cube))
        {
            console.error('Cannot play without a valid Cube assigned.', _cube);
            return;
        }

        clearInterval(__playbackInterval);
        __animationStartTime = Date.now();
        __playbackInterval = setInterval(__animator, 0);
    };

    this.stop = function() {
        clearInterval(__playbackInterval);
        __animationStartTime = 0;
    };

    return this;

};
