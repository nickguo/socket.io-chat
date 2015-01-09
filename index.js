// Setup basic express server
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var bodyParser = require('body-parser');
var EventEmitter = require('events').EventEmitter;

var ee = new EventEmitter();

var app = express();
var server = http.createServer(app);
var io = socketio(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing -> serve static files from public folder
app.use(express.static(__dirname + '/public'));


// API example -------------------------------------

app.use(bodyParser.json());

app.post('/api/messages', function(req,res) {
  var body = req.body;
  ee.emit('message', body.message);
  console.log('finish ee emit');

  res.json({
    message: body.message
  });
});

//--------------------------------------------------

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  ee.on('message', function(msg) {
    // we tell the client to execute 'new message'
    console.log('entered ee on message with: ' + msg);
    socket.broadcast.emit('new message', {
      username: 'hal',
      message: msg
    });
    console.log('finished hal broadcast');
  });

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

