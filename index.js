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
var messages = 0;
var iplog = {};
var lastMessage = {};
var client = redis.createClient("6379", "192.168.0.182");

app.use(express.static(__dirname + '/sounds'));
app.use(express.static(__dirname + '/public'));

app.get('/room/*', function(req, res){
  res.sendFile(__dirname + '/public/room.html');
});

io.on('connection', function(socket){
  //socket.emit('mainInfo', {'msg': messages, 'users': users, 'rooms': Object.keys(rooms).length});
  logIP(socket);
  var user = checkUser(socket);
  users++;

  var id = checkUrl(socket.request.headers.referer); //get room id from Get
  client.hgetall("room_" + id, function(err, reply){
    if (reply) {
      joinChannel(id, socket);
    } else {
      newChannel(id, socket, user);
    }
    socket.join(id);
    roomUserAppend(id);
    io.to(id).emit('roomStatus', roomUpdate(id));
  });

  socket.on('haeViestit', function(id){
    var i = rooms[id].getMessages(5);
  });

  socket.on('sendMessage', function(msg){
    if(!spam(socket) && validInput(msg, 1000)){
      //get user nick from redis-database
      client.get(user, function(err, nick){
        var sender = "anon";
        if(nick){
          sender = nick;
        }
        var date = new Date();
        var message = new Message(msg, sender, date.toLocaleTimeString());
        io.to(id).emit('newMessage', message);
        client.incr('messages_send');
        messages++;
        saveMessage(message, id);
      });
    } else {
      logIP(socket);
      socket.emit('infoMessage', serverMessage('SPAM DETECTED, IP LOGGED, NETVINKED', 'error'));
    }
  });

  socket.on('changeNick', function(nick){
    if(!spam(socket) && validInput(nick, 32)){
      client.set(user, nick);
      socket.emit('roomStatus', roomUpdate(id));
    } else{
      io.to(id).emit('infoMessage', serverMessage('Häxös muchos, paha paha', 'error'));
      logIP(socket);
    }

    //console.log(socket.id + " changed nick to: " + nick);
  });

  socket.on('disconnect', function(){
    rooms[id] = rooms[id] - 1;
    socket.emit('infoMessage', serverMessage('connection lost', 'normal'));
    io.to(id).emit('roomStatus', roomUpdate(id));
    //io.to(id).emit('infoMessage', serverMessage('user disconnected'));
    users--;
  });
});

function checkUser(socket){
  data = socket.request._query['id'];
  if(data != null && data != "null"){
    client.get(data, function(err, nick){
      if(nick){
        socket.emit('userStatus', nick);
      }
    });
    return data;
  } else{
    socket.emit('newUser', socket.id);
    return socket.id;
  }
}

function roomUpdate(roomid){
  var users = rooms[roomid];
  return {
    'name': roomid,
    'users': users
  }
}

function validInput(string, maxlen){
  if(string.trim() != '' && string.length < maxlen){
    return true;
  }
  return false;
}

function spam(socket){
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

function newChannel(name, socket, user, listed){
  var id = uuid.v4();
  ch = new Channel(id, name, user, listed);
  socket.emit('infoMessage', serverMessage("created a new channel!"));
  client.hmset('room_' + name, ch);
  return ch;
}

function roomUserAppend(id){
  if(rooms[id]){
    rooms[id] = rooms[id] + 1;
  } else{
    rooms[id] = 1;
  }
}

function joinChannel(name, socket){
  socket.emit('infoMessage', serverMessage("connection established"));
  client.hgetall('room_' + name, function(err, reply){
    if(reply){
      client.lrange(reply.id, 0, -1, function(err, msg){
        socket.emit('messageHistory', msg);
      });
    }
  });

}

function saveMessage(msg, name){
  client.hgetall("room_" + name, function(err, reply){
    client.llen(reply.id, function(err2, length){
      if(length > 50){
        client.lpop(reply.id, function(err3, old){});
      }
      client.rpush([reply.id, JSON.stringify(msg)]);
    });

  });
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

function getSecret(address){
  var path = url.parse(address).pathname.split('/');
  if(path.length == 3 && path[1] == "secret"){
    return path[2];
  }
  return null;
}

http.listen(3000, function(){
  console.log('kuunnellaan: 3000');
});
