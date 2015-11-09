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
var joined = {};
var lastMessage = {};
var loginTries = {};
var client = redis.createClient('6379', '192.168.0.182');

app.use(express.static(__dirname + '/sounds'));
app.use(express.static(__dirname + '/public'));

app.get('/index.html', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/room/*', function(req, res){
  res.sendFile(__dirname + '/public/room.html');
});

app.get('*', function(req, res){
  res.redirect('https://www.youtube.com/watch?v=JH8gvhl4rH8');
});

io.on('connection', function(socket){
  //socket.emit('mainInfo', {'msg': messages, 'users': users, 'rooms': Object.keys(rooms).length});
  logIP(socket);
  users++;
  var user = checkUser(socket);
  var id = checkUrl(socket.request.headers.referer); //get room id from Get
  client.hgetall("room_" + id, function(err, room){
    if(room){
      joinChannel(id, socket, user, room);
    } else {
      newChannel(id, socket, user);
    }
  });

  socket.on('newRoomPass', function(newPass){
    console.log(id, newPass);
    client.hgetall('room_' + id, function(err, reply){
      if(reply && reply.admin == user){
        client.hmset('room_' + id, 'secret', newPass);
      } else{
        console.log("unauthorized access: " + socket.id, user);
      }
    });
  });
  socket.on('userLogin', function(password){
    client.hgetall('room_' + id, function(err, room){
      if(room && room.secret == password){
        client.hmset('access_' + id, user, "user");
        joinChannel(id, socket, user, room);
        joined = true;
      } else{
        client.setex("tries_" + user, 3600, 5);
        socket.emit('passwordPromt', 'väärä salasana, yrityksiä jäljellä: ');
      }
    });
  });

  socket.on('roomToggle', function(value){
    console.log("tog" + value);
    client.hgetall('room_' + id, function(err, reply){
      if(reply && reply.admin == user){
        client.hmset('room_' + id, 'isPrivate', value);
        }
      });
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
	       //message to everyone else except sender
        io.to(id).emit('newMessage', message);
        //client.incr('messages_send');
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
    if(joined[socket.id]){
      rooms[id] = rooms[id] - 1;
      joined[socket.id] = false;
      io.to(id).emit('roomStatus', roomUpdate(id));
    }
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

function newChannel(name, socket, user){
  var id = uuid.v4();
  ch = new Channel(id, name, user);
  socket.emit('infoMessage', serverMessage("created a new channel!"));
  client.hmset('room_' + name, ch);
  client.hmset('access_' + name, user, "admin");
  socket.emit('access', "admin", "false");
  socket.join(name);
  joined[socket.id] = true;
  roomUserAppend(name);
  io.to(name).emit('roomStatus', roomUpdate(name));
}

function roomUserAppend(id){
  if(rooms[id]){
    rooms[id] = rooms[id] + 1;
  } else{
    rooms[id] = 1;
  }
}

function channelInit(name, socket, room, access){
  socket.emit('infoMessage', serverMessage("connection established"));
  client.lrange(room.id, 0, -1, function(err, msg){
    socket.emit('messageHistory', msg);
  });
  socket.emit('access', access, room.isPrivate);
  socket.join(name);
  joined[socket.id] = true;
  roomUserAppend(name);
  io.to(name).emit('roomStatus', roomUpdate(name));
}

function joinChannel(name, socket, user, room){
    client.hgetall('access_' + name, function(err, access){
      if(room.isPrivate == "true"){
        if(user in access){
          channelInit(name, socket, room, access[user]);
        } else{
          socket.emit('passwordPromt');
        }
      } else{
        channelInit(name, socket, room, access[user]);
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

http.listen(80, function(){
  console.log('kuunnellaan: 80');
});
