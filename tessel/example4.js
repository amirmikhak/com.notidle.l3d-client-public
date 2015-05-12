console.log('requiring...');

console.log('\trenderer');
var Renderer = require('renderer');
console.log('\tcube');
var Cube = require('renderer/lib/cube');
console.log('\tdata');
var loadDataT0 = new Date().getTime();
var data = require('./data/sample-04');
console.log('data\'s required: ' + (new Date().getTime() - loadDataT0));

console.log('all\'s required!');

var getMoreCubesInto = function(target) {
    var loadT0 = new Date().getTime();
    var spliceArgs = [0, target.length].concat(data);
    Array.prototype.splice.apply(target, spliceArgs);   // replace target contents
    var loadT1 = new Date().getTime();
    console.log('muhcubes loaded', loadT1 - loadT0);
}

console.log('funcs declared...');

var __emptyCube = new Cube(8);
__emptyCube.clear();

var i = 0
    , muhCubes = []
    , numCubeFrames = 0
    , renderer = new Renderer()
    , getMuhCube = function() {
        if (!muhCubes.length)
        {
            // console.log('refilling cubes');
            getMoreCubesInto(muhCubes);
        }
        var ret = muhCubes.length ? muhCubes.shift() : __emptyCube;
        // console.log('tick', ret === __emptyCube);
        return ret;
    };

console.log('render loop starting');
renderer.startRenderLoop(getMuhCube);
