

// serial test

var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/cu.usbserial", {
  baudrate: 57600,       "rts": false,
      "dtr" : false
});

    var buf = new Buffer([0xAA, 0x55, 0x55, 0x55, 0x55, 0xaa]);

 var delay = (2+buf.length+2)*10/57.600;
console.log(delay);

serialPort.on("open", function () {

  serialPort.set({rts: false}, function(err, result) {
  });

  serialPort.set({ rts: true }, function(err, result) {
  });


 serialPort.write(buf, function(err, results) {
    //console.log('err ' + err);
    //console.log('results ' + results);
    //serialPort.close();
    //process.exit(0);
  });

  setTimeout( function() {
    serialPort.set({ rts: false }, function(err, result) {
    });

  },delay);

// serialPort.drain( function(err) {
//console.log( err);
//    serialPort.set({ rts: false }, function(err, result) {

 //   });

  setTimeout( function() {
        serialPort.close();
    process.exit();
  },1500);

 //});

/*
  serialPort.on('data', function(data) {
    console.log('data received: ' + data);
  });


  setTimeout( function() {
    serialPort.set({ rts: true }, function(err, result) {

    });

  },500);

  setTimeout( function() {
    serialPort.set({ rts: false },function(err, result) {

    });

  },1000);

  setTimeout( function() {
    serialPort.close();
    process.exit();

  },1500);
*/

/*
  serialPort.write("ls\n", function(err, results) {
    console.log('err ' + err);
    console.log('results ' + results);
    serialPort.close();
    process.exit(0);
  });

*/
});
