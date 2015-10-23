var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');
var uuid = require('node-uuid');
var Channel = require('./channel.js');
var Message = require('./message.js');
var Queue = require('./queue.js');

var users = 0;
var rooms = {};

app.use(express.static(__dirname + '/sounds'));
app.use(express.static(__dirname + '/public'));

app.get('/*', function(req, res){
  res.sendFile(__dirname + '/public/room.html');
});

io.on('connection', function(socket){
  users++;
  var id = checkUrl(socket.request.headers.referer); //get room id from Get
  if(rooms[id]){
    joinChannel(id, socket);
  } else{
    rooms[id] = newChannel(id, socket);
  }

  socket.on('haeViestit', function(id){
    var i = rooms[id].getMessages(5);
  });

  socket.on('sendMessage', function(msg){
    var date = new Date();
    var message = new Message(msg, socket.id, date.toLocaleTimeString());
    rooms[id].addMessage(message);
    io.to(id).emit('newMessage', message);
  });

  socket.on('disconnect', function(){
    socket.emit('infoMessage', serverMessage('connection lost'));
    io.to(id).emit('infoMessage', serverMessage('user disconnected'));
    users--;
  });
});

function serverMessage(content){
  return {
    message: content,
    timestamp: new Date().toLocaleTimeString()
  }
}

function newChannel(name, socket){
  var id = uuid.v4();
  ch = new Channel(id, name, socket);
  ch.addUser(socket.id);
  socket.join(name);
  socket.emit('infoMessage', serverMessage("created a new channel!"));
  return ch;
}

function joinChannel(name, socket){
  socket.join(name);
  socket.emit('huone', name);
  socket.emit('infoMessage', serverMessage("connection established"));
  socket.emit('messageHistory', rooms[name].getMessages(50));
}

function checkUrl(address){
  var path = url.parse(address).pathname.split('/');
  //väärän kokoinen osoite
  if(path.length != 3){
    return "DEFAULT";
  }
  //palautetaan huoneen id
  if(path[1] == "room"){
    return path[2];
  }
}

http.listen(3000, function(){
  console.log('kuunnellaan: 3000');
});
