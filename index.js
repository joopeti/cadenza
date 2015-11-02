var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');
var uuid = require('node-uuid');
var redis = require('redis');
var Channel = require('./channel.js');
var Message = require('./message.js');
var Queue = require('./queue.js');

var users = 0;
var rooms = {};
var nicks = {};
var iplog = {};
var lastMessage = {};
var client = redis.createClient("6379", "192.168.0.182");

app.use(express.static(__dirname + '/sounds'));
app.use(express.static(__dirname + '/public'));

app.get('/*', function(req, res){
  res.sendFile(__dirname + '/public/room.html');
});

io.on('connection', function(socket){
  logIP(socket);
  var user = checkUser(socket);

  users++;
  var id = checkUrl(socket.request.headers.referer); //get room id from Get
  if(rooms[id]){
    joinChannel(id, socket);
  } else{
    rooms[id] = newChannel(id, socket);
  }
  rooms[id].addUser(user);
  io.to(id).emit('roomStatus', roomUpdate(id));

  socket.on('haeViestit', function(id){
    var i = rooms[id].getMessages(5);
  });

  socket.on('sendMessage', function(msg){
    if(!isSpam(socket) && validInput(msg, 1000)){
      var nick = nicks[user] || "anon";
      var date = new Date();
      var message = new Message(msg, nick, date.toLocaleTimeString());
      rooms[id].addMessage(message);
      io.to(id).emit('newMessage', message);
    } else {
      logIP(socket);
      socket.emit('infoMessage', serverMessage('SPAM DETECTED, IP LOGGED, NETVINKED', 'error'));
  }
  });

  socket.on('changeNick', function(nick){
    if(!isSpam(socket) && validInput(nick, 32)){
      nicks[user] = nick;
      socket.emit('roomStatus', roomUpdate(id));
    } else{
      io.to(id).emit('infoMessage', serverMessage('Häxös muchos, paha paha', 'error'));
      logIP(socket);
    }

    //console.log(socket.id + " changed nick to: " + nick);
  });

  socket.on('disconnect', function(){
    rooms[id].removeUser(user);
    socket.emit('infoMessage', serverMessage('connection lost', 'normal'));
    io.to(id).emit('roomStatus', roomUpdate(id));
    //io.to(id).emit('infoMessage', serverMessage('user disconnected'));
    users--;
  });
});

function checkUser(socket){
  data = socket.request._query['id'];
  if(data != null && data != "null"){
    if(data in nicks){
      socket.emit('userStatus', nicks[data]);
    }
    return data;
  } else{
    socket.emit('newUser', socket.id);
    return socket.id;
  }
}

function roomUpdate(roomid, userid){
  var room = rooms[roomid];
  return {
    'name': roomid,
    'users': room.getNumberOfUsers(),
  }
}

function validInput(string, maxlen){
  if(string.trim() != '' && string.length < maxlen){
    return true;
  }
  return false;
}

function isSpam(socket){
  var now = Date.now();
  var spam = false;
  if(now - lastMessage[socket.id] < 300){
    spam = true;
  }
  lastMessage[socket.id] = now;
  return spam;
}

function serverMessage(content, type){
  return {
    message: content,
    timestamp: new Date().toLocaleTimeString(),
    type: type
  }
}

function logIP(socket){
  var ip = socket.request.socket.remoteAddress;
  if(ip in iplog){
    iplog[ip]++;
  } else{
    iplog[ip] = 1;
  }
  console.log("connection: " + ip);
}

function newChannel(name, socket){
  var id = uuid.v4();
  ch = new Channel(id, name, socket);
  socket.join(name);
  socket.emit('roomStatus', name);
  socket.emit('infoMessage', serverMessage("created a new channel!"));
  return ch;
}

function joinChannel(name, socket){
  socket.join(name);
  socket.emit('roomStatus', name);
  socket.emit('infoMessage', serverMessage("connection established"));
  socket.emit('messageHistory', rooms[name].getMessages(50));
}

function checkUrl(address){
  var path = url.parse(address).pathname.split('/');
  //väärän kokoinen osoite
  //palautetaan huoneen id
  if(path.length == 3 && path[1] == "room" && path[2].length < 32){
    return path[2];
  }

  return "LostAndFound";
}

http.listen(3000, function(){
  console.log('kuunnellaan: 3000');
});
