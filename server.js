var express = require('express');
var app = express();

var port = process.env.PORT || 3000;

app.use('/', express.static('./Public'));

var server = app.listen(port);

/*var io = require('socket.io').listen(server);*/

var io = require('socket.io')({
  transports: ["xhr-polling"],
  'polling duration': 10
}).listen(server);

var users = {};
var queue = [];
var votes = {
  up: 0,
  down: 0
};
var current;
var start;
var sync;
var set = false;
var switched = false;

io.on('connection', function (socket) {

  socket.on('setUser', function (username) {
    users[socket.id] = username;
    io.emit('onlineusers', users)
  });

  socket.on('getQueue', function() {
    if (queue.length) {
      io.sockets.connected[socket.id].emit('sendQueue', queue);
    }
  })

  socket.on('getCurrent', function() {
    if (current) {
      io.sockets.connected[socket.id].emit('sendCurrent', current);
    }
  })

  socket.on('getTime', function() {
    io.sockets.connected[socket.id].emit('sendTime', start);
  })

  socket.on('sendMessage', function (data) {
    io.emit('messageSent', data);
  })

  socket.on('enqueue', function (data) {
    if (current) {

      queue.push(data);
      io.emit('addVideo', data);

    } else {
      set = false;
      current = data;
      votes = {};
      io.emit('clearVotes');
      io.emit('firstVideo', data);
    }
  })

  socket.on('dequeue', function (data) {
    io.emit('removeVideo', data);
  })

  socket.on('updateQueue', function (data) {
    queue = data;
    socket.broadcast.emit('refreshQueue', queue);
  })

  socket.on('videoEnded', function () {
    if (!switched) {
      switched = true;
      set = false;
      current = queue.shift();
      votes = {};
      io.emit('clearVotes');
      io.emit('nextVideo', current);
      io.emit('refreshQueue', queue);
      setTimeout(function() {
        switched = false;
      }, 5000);
    }
  })

  socket.on('skip', function() {
    if (queue.length) {
      current = queue.shift();
      votes = {};
      io.emit('clearVotes');
      io.emit('nextVideo', current);
      io.emit('refreshQueue', queue);
    } else {
      current = null;
      votes = {};
      io.emit('clearVotes');
      io.emit('stopVideo');
      io.emit('refreshQueue', queue);
    }
  })

  socket.on('setDuration', function (data) {
    if (!set) {
      set = true;
      start = data;
      clearInterval(sync);
      sync = setInterval(function() {
        console.log(start);
        start++;
      }, 1000);
    }
  });

  socket.on('disconnect', function () {
    delete users[socket.id];
    io.emit('onlineusers', users)
  });

  socket.on('upVote', function(){
    if (votes[socket.id] === 'down'){
      votes[socket.id] = 'up';
      votes.down--;
      votes.up++;
    }
    if (votes[socket.id] === undefined) {
      votes[socket.id] = 'up';
      votes.up++;
    }
    io.emit('changeVote', votes);
  })

  socket.on('downVote', function(){
    if(votes[socket.id] === 'up'){
      votes[socket.id] = 'down';
      votes.up--;
      votes.down++;
    }
    if(votes[socket.id] === undefined){
      votes[socket.id] = 'down';
      votes.down++;
    }
    io.emit('changeVote', votes);
  })

});


