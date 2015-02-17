(function (window, document, requestAnimationFrame) {
    
    'use strict';
    
    var BALL_NUMBER = 5,
        BALL_R_MAX = 60,
        BALL_R_MIN = 15,
        BALL_INTERVAL = 20000,
        BOUNCE_VALUE = -0.5,
        SPRING_VALUE = 1,
        RAIN_ANGLE = 10,
        RAIN_V = 100,
        RAIN_LENGTH = 80,
        RAIN_VOLUME = 2,
        LUSTER_V = 20,
        LUSTER_VOLUME = 4,
        LUSTER_R_MAX = 400,
        LUSTER_R_MIN = 200,
        BG_COLOR = "#000000",
        BG_PATTRN = 0,
        GRAVITY = 1,
        SE_CRASH = 0,
        rainMoveX = RAIN_V * Math.sin(RAIN_ANGLE * (Math.PI / 180)),
        rainMoveY = RAIN_V * Math.cos(RAIN_ANGLE * (Math.PI / 180)),
        rainLengthX = RAIN_LENGTH * Math.sin(RAIN_ANGLE * (Math.PI / 180)),
        rainLengthY = RAIN_LENGTH * Math.cos(RAIN_ANGLE * (Math.PI / 180)),
        rainArray = [],
        lusterArray = [],
        ballsArray = [],
        canvas,
        context,
        lusterTime,
        ballTime,
        clockText = "",
        motionSensor = "0",
        temperatureSensor = "1900",
        photodetector = "2000",
        server,
        requestArea,
        Weather,
        Delay,
        Noise,
        SE,
        BGM,
        audio;
    
    /**
     * サーバーオブジェクト作成
     */
    server = new OkanServer();
    //デバック
    requestArea = document.getElementById('request');
    
    /**
     * サーバー疎通リスナー
     */
    server.open(function onOpened() {
        var msg = 'Running on ' + server.ipAddress + ':' + server.portNumber;
        document.getElementById('port').textContent = msg;
    });
    
    /**
     * サーバーデータ取得リスナー
     */
    server.onData = function (data) {
        setTimeout(function () {
            var now,
                strData;
            if (data.type === "PIR") {
                motionSensor = data.value;
            } else if (data.type === "THERMO") {
                temperatureSensor = data.value;
            } else if (data.type === "LIGHT") {
                photodetector = data.value;
            }
            //デバック
            now = new Date().toString();
            strData = JSON.stringify(data, undefined, '  ');
            requestArea.textContent = now + '\n' + strData + '\n' + requestArea.textContent;
        }, 0);
    };
    
    /**
     * ブラウザでのデモ用
     * URLの後ろに #param&PIR=1&THERMO=1000&LIGHT=2000 とつけると擬似的にサーバーからの値をテストできる
     */
    function locationHashChanged() {
        if (location.hash) {
            var parameters = location.hash.split('&'),
                i,
                element = "",
                paramName = "",
                paramValue = "";
            for (i = 0; i < parameters.length; i++) {
                // パラメータ名とパラメータ値に分割する
                element = parameters[i].split('=');
                paramName = decodeURIComponent(element[0]);
                paramValue = decodeURIComponent(element[1]);
                //センサー値に代入
                if (paramName === "PIR") {
                    motionSensor = paramValue;
                } else if (paramName === "THERMO") {
                    temperatureSensor = paramValue;
                } else if (paramName === "LIGHT") {
                    photodetector = paramValue;
                }
            }
        }
    }
    window.onhashchange = locationHashChanged;
    
    
    
    /**
     * 天気の取得
     */
    Weather = function () {
        this.initialize.apply(this, arguments);
    };
    Weather.prototype = {
        ENDPOINT: "http://api.openweathermap.org/data/2.5/weather?",
        initialize: function () {
        },
        get destination() {
            return this.ENDPOINT + "lat=" + this.latitude + "&lon=" + this.longitude;
        },
        getWeather : function(){
            return new Promise((resolve, reject) =>{
                this.currentPosition().then(position => {
                    this.latitude = position.coords.latitude;
                    this.longitude = position.coords.longitude;
                    console.log("send request to " + this.destination);
                    var req = new XMLHttpRequest({mozSystem: true});
                    req.open("GET", this.destination);
                    req.onload = () => {
                        resolve(JSON.parse(req.response));
                    };
                    req.onerror = (error) => {
                        console.log(error);
                        reject(error);
                    };
                    req.send();
                });
            });
        },
        currentPosition: function(){
            return new Promise((resolve, reject) => {        
                navigator.geolocation.getCurrentPosition(resolve);
            });
        }
    };
    
    /**
     * 音 Delay
     */
    Delay = function(){
        this.initialize.apply(this, arguments);
    };

    Delay.prototype = {
        MAX: 1,
        MIN: 0,
        initialize: function(audioContext){
            this._source = audioContext.createGain();
            this._delay = audioContext.createDelay();
            this._delayVolume = audioContext.createGain();
            this._destination = audioContext.createGain();

            this._source.connect(this._delay);
            this._delay.connect(this._delayVolume);
            this._delayVolume.connect(this._destination);
            this._source.connect(this._destination);
            this._delayVolume.connect(this._destination);
        },
        connect: function(node){
            this._destination.connect(node);
        },
        disconnect: function(){
            this._destination.disconnect();
        },
        get destination(){
            return this._source;
        },
        get ammount(){
            return this._delayVolume.gain.value;
        },
        set ammount(value){
            this._delayVolume.gain.value = Math.min(Math.max(value, this.MIN), this.MAX);
        }
    };
    
    /**
     * 音 Noise
     */
    Noise = function(){
        this.initialize.apply(this, arguments);
    };
    Noise.prototype = {
        MAX: 3,
        MIN: 0,
        initialize: function(audioContext){
            this._ammount = 0.5;
            this._processor = audioContext.createScriptProcessor(4096, 1, 1);
            this._processor.onaudioprocess = (event) => {
                var input = event.inputBuffer.getChannelData(0);
                var output = event.outputBuffer.getChannelData(0);
                for (var i = 0; i < input.length; i++) {
                    output[i] = input[i] * (1 + (Math.random() * this.ammount) - this.ammount * 0.5);
                }
            };
        },
        connect: function(node){
            this._processor.connect(node);
        },
        disconnect: function(node){
            this._processor.disconnect();
        },
        get destination(){
            return this._processor;
        },
        get ammount(){
            return this._ammount;
        },
        set ammount(value){
            this._ammount = Math.min(Math.max(this.MIN, value), this.MAX);
        }
    };
    
    /**
     * 音 SE
     */
    SE = function(){
        this.initialize.apply(this, arguments);
    };

    SE.prototype = {
        initialize: function(audioContext){
            this.audioContext = audioContext;
        },
        play: function(destination){
            if(this.buffer){
                var source = this.audioContext.createBufferSource();
                source.connect(destination);
                source.buffer = this.buffer;
                source.onended = function(){
                    source.disconnect();
                    source = null;
                };
                source.start();
            }
        },
        get buffer(){
            return this._buffer;
        },
        set buffer(buf){
            this._buffer = buf;
        },
        get destination(){
            return this._destination;
        },
        get gain(){
            return this._destinatin.gain.value;
        },
        set gain(value){
            this._destination.gain.value = value;
        }
    };
    
    /**
     * 音 BGM
     */
    BGM = function(){
        this.initialize.apply(this, arguments);
    };
    BGM.prototype = {
        initialize: function(parent, audioContext){
            this._el = document.createElement("audio");
            this._el.autoplay = true;
            this._el.loop = true;
            parent.appendChild(this._el);

            this._source = audioContext.createMediaElementSource(this._el);
            this._el.addEventListener("ended", (event) =>{
                console.log("bgm leaches to its end");
                this.play();
            });
        },
        connect: function(node){
            this._source.connect(node);
        },
        disconnect: function(){
            this._source.disconnect();
        },
        play: function(){
            this._el.play();
        },
        pause: function(){
            this._el.pause();
        },
        set src(url){
            this._el.src = url;
        }
    };
    
    /**
     * 音 audio
     */
    audio ={
        _bgm: null,
        _se: null,
        context: new AudioContext(),

        init: function(conf){
            this._bgm = new BGM(document.querySelector("body"), this.context);
            this._bgm.src = conf.bgm;
            this.se = conf.se;
            this._seDestination = this.context.createGain();
            this._seDestination.gain.value = 0.25;

            this.filters = {
                delay: new Delay(this.context),
                noise: new Noise(this.context)
            };
            this.filters.delay.ammount = 0;
            this.filters.noise.ammount = 0;

            this._bgm.connect(this.filters.noise.destination);
            this.seDestination.connect(this.filters.noise.destination);
            this.filters.noise.connect(this.filters.delay.destination);
            this.filters.noise.connect(this.context.destination);
        },
        decode: function(file){
            console.log("start decoding: " + file);
            return new Promise((resolve, reject) =>{
                var request = new XMLHttpRequest();
                request.open("GET", file, true);
                request.responseType = "arraybuffer";
                request.onload = () =>{
                    console.log("loaded");
                    this.context.decodeAudioData(request.response, resolve);
                };
                request.send();
            });
        },
        playBGM: function(){
            console.log("playBGM");
            this._bgm.play();
        },
        pauseBGM: function(){
            this._bgm.pause();
        },
        playSE: function(index){
            var se = this._se[index];
            if(se){
                se.play(this.seDestination);
            }
        },
        get seDestination(){
            return this._seDestination;
        },
        set bgm(url){
            this._bgm.src = url;
        },
        set se(list){
            list = list || [];
            this._se = [];
            for(var i = 0; i < list.length; i++){
                var node = new SE(this.context);
                this.decode(list[i]).then(buffer => {
                    node.buffer = buffer;
                    console.log("decoded");
                });
                this._se[i] = node;
            }
        }
    };

    
    /**
     * ウィンドウリサイズ
     */
    function resize(e) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        context.fillStyle = BG_COLOR;
    }

    /**
     * 時計の更新
     */
    function clockAdvance() {
        var now = new Date(),
            hour = now.getHours(),
            min  = now.getMinutes(),
            sec  = now.getSeconds();
        if (hour < 10) {
            hour = "0" + hour;
        }
        if (min < 10) {
            min = "0" + min;
        }
        if (sec < 10) {
            sec = "0" + sec;
        }
        clockText = hour + ":" + min + ":" + sec;
        setTimeout(clockAdvance, 1000);
    }
    clockAdvance();
    
    /**
     * ボールオブジェクト
     */
    function Ball(x, y, r, ch, vx, vy) {
        this.x = x || 0;
        this.y = y || 0;
        this.r = r || 0; // 半径, 質量を兼ねる
        this.vx = vx || 0;
        this.vy = vy || 0;
        this.ch = ch || 0;
        this.cs = 0;
        this.cl = 100;
        this.isFnish = false;
    }
    
    /**
     * ボールの動作
     */
    function ballMove(ball) {
        //重力
        ball.vy += GRAVITY;
        //加速
        ball.x += ball.vx;
        ball.y += ball.vy;
        //壁で減速してはね返る
        if (ball.x + ball.r > window.innerWidth) {
            ball.x = window.innerWidth - ball.r;
            ball.vx *= BOUNCE_VALUE;
        } else if (ball.x - ball.r < 0) {
            ball.x = ball.r;
            ball.vx *= BOUNCE_VALUE;
        }
        if (ball.y + ball.r > window.innerHeight) {
            ball.y = window.innerHeight - ball.r;
            ball.vy *= BOUNCE_VALUE;
            
        } else if (ball.y - ball.r < 0) {
            ball.y = ball.r;
            ball.vy *= BOUNCE_VALUE;
        }
        //彩度が高くなっていたら0に戻す
        if (0 < ball.cs) {
            ball.cs = ball.cs - 2;
        }
        //明度が暗くなっていたら100に戻す
        if (ball.cl < 100) {
            ball.cl = ball.cl + 2;
        }
    }
    
    /**
     * 雨オブジェクト
     */
    function Rain(x, y, c) {
        this.x = x || 0;
        this.y = y || 0;
        this.c = c || "#ffffff";
        
    }
    
    /**
     * 雨の動作
     */
    function rainMove(rain) {
        rain.x += rainMoveX;
        rain.y += rainMoveY;
    }
    
    /**
     * 波紋オブジェクト
     */
    function Ripple(x, y, c) {
        this.x = x || 0;
        this.y = y || 0;
        this.r1 = 0;
        this.r2 = 0;
        this.r3 = 0;
        this.c = c || "#ffffff";
    }
    
    /**
     * 光彩オブジェクト
     */
    function Luster(x, y, z, r, ch) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        this.r = r || 0;
        this.ch = ch || 0;
        this.cs = 0;
        this.cl = 100;
        this.ca = 100;
    }
    /**
     * 光彩の動作
     */
    function lusterMove(luster) {
        luster.x += LUSTER_V / luster.z;
    }
    
    /**
     * 繰り返し描画処理を行う
     */
    function loop() {
        var w = canvas.width,
            h = canvas.height,
            ctx = context,
            now = new Date().getTime(),
            x0,
            y0,
            z0,
            r0,
            c0,
            rain,
            luster,
            edgecolor1,
            edgecolor2,
            gradblur,
            ball,
            i = 0,
            j = 0,
            ball0,
            ball1,
            dx = 0,
            dy = 0,
            dist = 0,
            minDist = 0,
            tx = 0,
            ty = 0,
            ax = 0,
            ay = 0;
        
        //コンテキストを初期化
        ctx.save();
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        
        if (motionSensor === "1") {
            
        }
        
        if (BG_PATTRN === 0) {
             //人感がONの時に雨を生成
            if (motionSensor === "1") {
                for (i = 0; i < RAIN_VOLUME; i++) {
                    x0 = Math.random() * window.innerWidth;
                    c0 = "hsla(" + Math.floor(Math.random() * 100 + 200) + ", 100%, 30%,1)";
                    rain = new Rain(x0, -(RAIN_LENGTH + RAIN_V), c0);
                    //配列追加
                    rainArray.push(rain);
                }
            }
            //雨の動作
            for (i = 0; i < rainArray.length - 1; i++) {
                rain = rainArray[i];
                rainMove(rain);
                //画面外に出たら削除
                if ((rain.x < 0 && rain.y < 0) || (rain.x > window.innerWidth && rain.y > window.innerHeight)) {
                    rainArray.splice(i, 1);
                    rain = null;
                    continue;
                }
                //雨を描く
                ctx.beginPath();
                ctx.moveTo(rain.x, rain.y);
                ctx.lineTo(rain.x + rainLengthX * 2, rain.y + rainLengthY * 2);
                ctx.strokeStyle = rain.c;
                ctx.stroke();
            }
        } else if (BG_PATTRN === 1) {
             //人感がONの時に光彩を生成
            if (motionSensor === "1") {
                if (now - lusterTime > 1 / LUSTER_VOLUME * 1000) {
                    y0 = Math.random() * window.innerHeight;
                    z0 = Math.random() * 10 + 1;
                    r0 = (Math.random() * (LUSTER_R_MAX - LUSTER_R_MIN) + LUSTER_R_MIN) / z0;
                    c0 = Math.floor(Math.random() * 50);
                    luster = new Luster(0, y0, z0, r0, c0);
                    //配列追加
                    lusterArray.push(luster);

                    lusterTime = now;
                }
            }
            //光彩の動作
            for (i = 0; i < lusterArray.length - 1; i++) {
                luster = lusterArray[i];
                lusterMove(luster);
                //画面外に出たら削除
                if ((luster.x < 0 && luster.y < 0) || (luster.x > window.innerWidth && luster.y > window.innerHeight)) {
                    lusterArray.splice(i, 1);
                    luster = null;
                    continue;
                }
                //光彩を描く
                ctx.beginPath();
                ctx.moveTo(luster.x, luster.y);
                ctx.arc(luster.x, luster.y, luster.r, 0, Math.PI * 2, false);
                ctx.globalCompositeOperation = "lighter";
                //光彩グラデーション設定
                edgecolor1 = "hsla(" + luster.ch + ", 100%, 30%, 0.5)";
                edgecolor2 = "hsla(" + luster.ch + ", 100%, 30%, 0)";
                gradblur = ctx.createRadialGradient(luster.x, luster.y, luster.r - (20 - luster.z * 2), luster.x, luster.y, luster.r);
                gradblur.addColorStop(0, edgecolor1);
                gradblur.addColorStop(1, edgecolor2);
                //光彩描画
                ctx.fillStyle  = gradblur;
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";

            }
        }
        
        // 人感がONの時に一定時間ごとにボールを生成
        if (motionSensor === "1") {
            //光センサーによってインターバールを調整
            if (now - ballTime > (BALL_INTERVAL / (photodetector / 1000 + 1))) {
                //初期位置
                r0 = Math.random() * (BALL_R_MAX - BALL_R_MIN) + BALL_R_MIN;
                x0 = (window.innerWidth - r0) / 2;
                y0 = -r0;
                c0 = Math.floor(Math.random() * 60 + 300);
                //ボール生成
                ball = new Ball(x0, y0, r0, c0, 0, 0);
                console.log("x:"+x0+" y:"+y0+" r:"+r0);
                //配列追加
                ballsArray.push(ball);

                ballTime = now;
            }
        }
        
        // 最大数を超えていれば古いボールを削除
        var ballMaxNumber;
        if (motionSensor === "0") {
            ballMaxNumber = 0;
        } else {
            ballMaxNumber = Math.floor(BALL_NUMBER * (photodetector / 1000));
        }
        if (ballsArray.length > ballMaxNumber) {
            ball = ballsArray[0];
            ball.isFnish = true;
        }
        
        //ボールの相互の影響を計算
        for (i = 0; i < ballsArray.length; i++) {
            //対象のボール
            ball0 = ballsArray[i];
            for (j = i + 1; j < ballsArray.length; j++) {
                if(ballsArray[j]){
                    //被対象のボール
                    ball1 = ballsArray[j];
                    //両ボール座標の相対距離
                    dx = ball1.x - ball0.x;
                    dy = ball1.y - ball0.y;
                    //3平方の定理から直線距離を出す
                    dist = Math.sqrt(dx * dx + dy * dy);
                    //両ボールの半径の合計を最小距離に
                    minDist = ball0.r + ball1.r;
                    //最小距離より縮まった場合
                    if (dist < minDist) {
                        //x座標系の最小距離
                        tx = ball0.x + dx / dist * minDist;
                        //y座標系の最小距離
                        ty = ball0.y + dy / dist * minDist;
                        //加速度
                        ax = (tx - ball1.x) * SPRING_VALUE;
                        ay = (ty - ball1.y) * SPRING_VALUE;
                        //それぞれ反対側へ反発
                        ball0.vx -= ax;
                        ball0.vy -= ay;
                        ball1.vx += ax;
                        ball1.vy += ay;
                        //彩度をMAXに
                        ball0.cs = 100;
                        ball1.cs = 100;
                        //明度を50に
                        ball0.cl = 50;
                        ball1.cl = 50;
                        audio.playSE(SE_CRASH);
                        console.log(ballsArray);
                    }
                }
            }
            //終了したボールなら縮小
            if (ball0.isFnish) {
                ball0.r -= ball0.r * 0.2;
                //半径が無くなったら削除
                if (ball0.r <= 1) {
                    ballsArray.splice(i, 1);
                    ball0 = null;
                    continue;
                }
            }
            //ボールの基本動作
            ballMove(ball0);
            //ボールを描く
            ctx.beginPath();
            ctx.moveTo(ball0.x, ball0.y);
            ctx.arc(ball0.x, ball0.y, ball0.r, 0, Math.PI * 2, false);
            //温感センサーによって色を変化
            ctx.fillStyle = "hsla(" + (ball0.ch - temperatureSensor / 100 * 3) + ", " + ball0.cs + "%, " + ball0.cl + "%,1)";
            ctx.fill();
            //ctx.strokeStyle = ball0.c;
            //ctx.stroke();  
        }
        
        //時計を描く
        ctx.beginPath();
        ctx.font = "100pt Helvetica";
        if (motionSensor === "1") {
            //人感センサーがONの時
            ctx.fillStyle = "rgba(255,255,255,1)";
        } else {
            //人感センサーがOFFの時
            ctx.fillStyle = "rgba(255,255,255,0.2)";
        }
        ctx.fillText(clockText, window.innerWidth / 2 - 270, window.innerHeight / 2 - 100);
        
        //再帰
        requestAnimationFrame(loop);
        
    }
    
    window.addEventListener('DOMContentLoaded', function () {
        
        var i = 0,
            ball,
            x0 = 0,
            y0 = 0,
            r0 = 0,
            c0 = "",
            vx0 = 0,
            vy0 = 0;
        
        canvas = document.getElementById('c');
        context = canvas.getContext('2d');

        var weather = new Weather();
        weather.getWeather().then(result =>{
          console.log(result);
        });

        audio.init({
          bgm: "sound/01.mp3",
          se: ["sound/se01.mp3"]
        });
        audio.playBGM();    
    
        window.addEventListener('resize', resize, false);
        resize(null);
        
        ballTime = lusterTime = new Date().getTime();
        
        //ループ開始
        requestAnimationFrame(loop);

    }, false);

}(
    window,
    window.document,
    (function () {
        'use strict';
        return window.requestAnimationFrame       ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
      };
  }()),
  (function(){
    "use strict";
    return window.AudioContext || window.webkitAudioContext;
  })()
));