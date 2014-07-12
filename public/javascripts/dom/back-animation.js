// JavaScript Document
(function init() {
	var winWidth = document.documentElement.clientWidth,
		winHeight = document.documentElement.clientHeight,
		canvas = document.getElementById('backgroundCanvas'),
		context = canvas.getContext('2d'),
		animation = true,
		degree = Math.PI / 180;
	
		canvas.width = winWidth;
		canvas.height = 172;

		// document.onresize = function() {
		// 	alert('resize');
		// 	canvas.width = document.documentElement.clientWidth;
		// 	canvas.height = 172 / winWidth * document.documentElement.clientWidth;			
		// };
	var supportsOrientationChange = "onorientationchange" in window,
	    orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

	window.addEventListener(orientationEvent, function() {
	}, false);
	
	var Ball = function (ox, oy, or, r, v, change, a, color, x, y) {
		this.ox = ox;
		this.oy = oy;
		this.or = or;
		this.r = r;
		this.v = v;
		this.change = change
		this.a = a;
		this.color = color;
		this.x = x;
		this.y = y;
	}
	
	
	var balls = makeBalls();
	animeLoop();
	var frame = 0;
	function animeLoop() {
		clearCanvas();
		for (var i = 0; i < balls.length; i++) {
			drawBall(balls[i]);
			balls[i].x = balls[i].ox * (1 + Math.sin(degree*frame*balls[i].change));
			balls[i].y = balls[i].oy * (1 + Math.sin(degree*frame*balls[i].a));
			balls[i].r = Math.abs(balls[i].or * (1 + Math.sin(degree * frame * balls[i].change*10)));
		}
		
		
		frame++;
		if (animation == true) {
			setTimeout(animeLoop, 16);
		}
	}
	
	
	function clearCanvas() {
		context.clearRect(0, 0, winWidth, 172);	//important 150 -> winHeight -> 172
	}
	
	function drawBall(ball) {
			context.beginPath();
			context.arc(ball.x,ball.y,ball.r,0,2*Math.PI, true);
			context.fillStyle = ball.color
			context.fill();
	}
	
	function makeBalls() {
		var balls = [];
		var balls_num = Math.round(winWidth / 40);
		for (var i = 0; i < balls_num; i++) {
			var randR = randNum(10, 30);
			var theBall = new Ball(randNum(randR*2, (winWidth - randR * 2)), randNum(randR * 2, (100 - randR * 2)), randR, randR, randNum(1,100) * 0.01, randNum(-10,10)*0.01,randNum(1,20)*0.01, randColor(), 0, 0);
			balls.push(theBall);																// 120 -> winHeight -> 100
		}
		
		return balls;
	}
	
	function randNum(x, y) {
		return Math.round(Math.random() * (y - x) + x);
	}
	
	function randColor() {
		return 'rgba(188, 188, 188, ' + randNum(10, 80) * 0.01 + ')';
	}
	
}());
