/**
 * WebGL ortho demo
 *
 * Copyright:
 * Arno van der Vegt, 2011  
 *
 * Contact:
 * legoasimo@gmail.com
 *
 * Licence:  
 * Creative Commons Attribution/Share-Alike license
 * http://creativecommons.org/licenses/by-sa/3.0/
 *
 * The WebGL setup code was provided by: http://learningwebgl.com
**/

var gl,
    shaderProgram,
    mvMatrix      = mat4.create(),
    mvMatrixStack = [],
    pMatrix       = mat4.create(),
    bitmap,            // Bitmap texture and buffers
    bitmapX  = 0,      // Bitmap x position
    bitmapY  = 0,      // Bitmap y position
    stepX    = 0.2,    // Horizontal step, direction
    stepY    = 0.1,    // Vertical step, direction
    lastTime = 0;

function initGL(canvas) {
    try {
        gl = canvas.getContext('experimental-webgl');
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }
    catch (e) {
    }
    if (!gl) {
        alert('Could not initialise WebGL, sorry :-(');
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var shader,
        str = '',
        k   = shaderScript.firstChild;

    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    if (shaderScript.type == 'x-shader/x-fragment') {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else if (shaderScript.type == 'x-shader/x-vertex') {
        shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initShaders() {
    var fragmentShader = getShader(gl, 'shader-fs');
    var vertexShader = getShader(gl, 'shader-vs');

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Could not initialise shaders');
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform  = gl.getUniformLocation(shaderProgram, 'uPMatrix');
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
    shaderProgram.nMatrixUniform  = gl.getUniformLocation(shaderProgram, 'uNMatrix');
    shaderProgram.samplerUniform  = gl.getUniformLocation(shaderProgram, 'uSampler');
	shaderProgram.samplerRTTUniform  = gl.getUniformLocation(shaderProgram, 'rttSampler');
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function createTexture(width, height) {
    var that = function() {};
    
    that.checkSize = function(size) {
        var result = 1;
        while (result < size) {
            result <<= 1;
        }
        return result;
    };
    
    that.createTexture = function(width, height) {
        this.canvas = document.createElement('canvas');
        
        var context    = this.canvas.getContext('2d');

        this.canvas.width  = this.checkSize(width);
        this.canvas.height = this.checkSize(height);

        context.fillStyle = '#FF0000';
        context.fillRect(0, 0, width, height);

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.bindTexture(gl.TEXTURE_2D, null);        
    };
        
    that.createBuffers = function(width, height) {
        var vertices = [0.0,   0.0,    0.0,
                        width, 0.0,    0.0,
                        0.0,   height, 0.0,
                        width, height, 0.0];
    
        this.glPositionBuffer = gl.createBuffer();        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);        
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.glPositionBuffer.numItems = 4;

        var w             = width  / this.canvas.width,
            h             = height / this.canvas.height,
            textureCoords = [0.0, 0.0,
                             w,   0.0,
                             0.0, h,
                             w,   h];
        
        this.glTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        this.glTextureCoordBuffer.numItems = 4;        
    };
    
    that.init = function(width, height) {
        this.width  = width;
        this.height = height;
    
        this.createTexture(width, height);
        this.createBuffers(width, height);
    };

    that.render = function(x, y) {
        mat4.translate(mvMatrix, [x, y, 0]);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

        setMatrixUniforms();
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.glPositionBuffer.numItems); 
    };
    
    that.init(width, height);
    
    return that;
}

var rttFramebuffer;
var rttTexture;

function initTextureFramebuffer() {
	rttFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
	rttFramebuffer.width = 512;
	rttFramebuffer.height = 512;

	rttTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, rttTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, rttFramebuffer.width, rttFramebuffer.height);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
	
function drawScene() {

	gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
	gl.viewport(0, 0, rttFramebuffer.width, rttFramebuffer.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	pMatrix  = mat4.ortho(0, gl.viewportWidth, gl.viewportHeight, 0, 0.001, 100000);
	mvMatrix = mat4.identity(mat4.create());
	
	bitmap.render(0, 0);
	gl.bindTexture(gl.TEXTURE_2D, rttTexture);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	pMatrix  = mat4.ortho(0, gl.viewportWidth, gl.viewportHeight, 0, 0.001, 100000);
	mvMatrix = mat4.identity(mat4.create());
	
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, rttTexture);
	gl.uniform1i(shaderProgram.samplerRTTUniform, 2);
	bitmap.render(0, 0);
}

function animate() {
    var currentTime = new Date().getTime();
    var elapsedTime;
        
    if (lastTime) {
        elapsedTime = currentTime - lastTime;
		//animate
    }
  
    lastTime = currentTime;
}

function tick() {
    requestAnimFrame(tick);
    
    drawScene();
    animate();
}

function webGLStart() {
    var canvas = document.getElementById('demoCanvas');
    initGL(canvas);
    initShaders();
    initTextureFramebuffer();
	
    bitmap = createTexture(gl.viewportWidth, gl.viewportHeight);

    gl.clearColor(0.5, 0.7, 0.8, 1.0);
    gl.clearStencil(128);
    gl.enable(gl.DEPTH_TEST);

    tick();
}
