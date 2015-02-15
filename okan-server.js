var OkanServer = (function() {
  const PORT = 80;

  // constructor
  var okanServer = function() {
    this.server = new HttpServer();
    this.ipAddress = '';
    this.portNumber = PORT;
  };

  okanServer.prototype.open = function(onOpened) {
    function _open() {
      this.server.get('/put', onPutData.bind(this));
      this.server.get('/keepalive', onKeepAlive);
      this.server.start(this.portNumber);
      this.ipAddress = getIpAddress();
      console.log('Running on ' + this.ipAddress + ':' + port);
      setTimeout(sendKeepalive, 3000);
      if (onOpened) {
        onOpened();
      }
    }
    var wifiMgr = navigator.mozWifiManager;
    if (!wifiMgr || wifiMgr.connection.status === 'connected') {
      setTimeout(_open.bind(this), 0);
    } else {
      var self = this;
      wifiMgr.onstatuschange = function (event) {
        if (event.status === 'connected') {
          _open.call(self);
        }
      };
    }
  };

  function getIpAddress() {
    if (navigator.mozWifiManager) {
      var conn = navigator.mozWifiManager.connectionInformation;
      if (conn) {
        return conn.ipAddress;
      }
    }
    return '';
  }

  function onPutData(req, res, oncomplete) {
    console.log(req);
    var query = req._queryString;

    if (query && query.length > 0) {
      var obj = {};
      var queryList = query.split('&');
      queryList.forEach(function(q) {
        var [type, value] = q.split('=');
        obj[type] = value;
      });
      if (this.onData) { // 'this' should be passed by bind()
        this.onData(obj);
      }
      res.write('ok\r\n');
    } else {
      res.write('no query\r\n');
    }

    oncomplete();
  }

  function onKeepAlive(req, res, oncomplete) {
    console.log('keepalive');
    oncomplete();
  }

  function sendKeepalive() {
    console.log('sending keepalive');
    var url = 'http://127.0.0.1:' + port + '/keepalive';
    var xhr = new XMLHttpRequest({ mozSystem: true });
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        setTimeout(sendKeepalive, 3000);
      }
    };
    xhr.open('GET', url);
    xhr.send(null);
  }

  return okanServer;
})();

