/*
(function() {
  var server = new OkanServer();
  var requestArea = document.getElementById('request');

  server.open(function onOpened() {
    var msg = 'Running on ' + server.ipAddress + ':' + server.portNumber;
    document.getElementById('port').textContent = msg;
  });

  server.onData = function(data) {
    var now = new Date().toString();
    var strData = JSON.stringify(data, undefined, '  ');
    requestArea.textContent = now + '\n' + strData + '\n' + requestArea.textContent;
  };
})();
*/

(function (window, document, requestAnimationFrame) {
    
    'use strict';
    
    var BALL_NUMBER = 10,
        BALL_R_MAX = 30,
        BALL_R_MIN = 15,
        BALL_INTERVAL = 10000,
        BOUNCE_VALUE = -0.5,
        SPRING_VALUE = 1,
        RAIN_ANGLE = 10,
        RAIN_V = 300,
        RAIN_LENGTH = 80,
        RAIN_VOLUME = 2,
        LUSTER_V = 100,
        LUSTER_VOLUME = 4,
        LUSTER_R_MAX = 400,
        LUSTER_R_MIN = 200,
        BG_COLOR = "#000000",
        BG_PATTRN = 0,
        GRAVITY = 10,
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
        motionSensor = "1",
        temperatureSensor = "0",
        photodetector = "0",
        server,
        requestArea;

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
     * デモ用
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
                x0 = Math.random() * (window.innerWidth - r0 * 2) + r0;
                y0 = r0;
                c0 = Math.floor(Math.random() * 60 + 300);
                //ボール生成
                ball = new Ball(x0, y0, r0, c0, 0, 0);
                //配列追加
                ballsArray.push(ball);
                // 最大数を超えていれば古いボールを削除
                if (ballsArray.length > BALL_NUMBER) {
                    ball = ballsArray[0];
                    ball.isFnish = true;
                }
                ballTime = now;
            }
        }
        
        //ボールの相互の影響を計算
        for (i = 0; i < ballsArray.length - 1; i++) {
            //対象のボール
            ball0 = ballsArray[i];
            for (j = i + 1; j < ballsArray.length; j++) {
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
                }
            }
            //終了したボールなら縮小
            if (ball0.isFnish) {
                ball0.r -= ball0.r * 0.1;
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
            //音感センサーによって色を変化
            ctx.fillStyle = "hsla(" + (ball0.ch - temperatureSensor * 3) + ", " + ball0.cs + "%, " + ball0.cl + "%,1)";
            ctx.fill();
            //ctx.strokeStyle = ball0.c;
            //ctx.stroke();  
        }
        
        //時計を描く
        ctx.beginPath();
        ctx.font = "100pt Helvetica";
        if (motionSensor === "1") {
            ctx.fillStyle = "rgba(255,255,255,1)";
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.2)";
        }
        ctx.fillText(clockText, window.innerWidth / 2 - 250, window.innerHeight / 2 - 100);
        
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

        window.addEventListener('resize', resize, false);
        resize(null);
        
        ballTime = lusterTime = new Date().getTime();
        
        
        for (i = 0; i < BALL_NUMBER / 2; i++) {
            //初期位置
            x0 = Math.random() * window.innerWidth;
            y0 = Math.random() * window.innerHeight;
            r0 = Math.random() * (BALL_R_MAX - BALL_R_MIN) + BALL_R_MIN;
            c0 = Math.floor(Math.random() * 360);
            vx0 = Math.random() * 6 - 3;
            vy0 = Math.random() * 6 - 3;
            //ボール生成
            ball = new Ball(x0, y0, r0, c0, vx0, vy0);
            //配列追加
            ballsArray.push(ball);
        }
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
    }())
));
