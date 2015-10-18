var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');

var users = 0;
var rooms = {};

app.use(express.static(__dirname + '/sounds'));
app.use(express.static(__dirname + '/public'));

app.get('/*', function(req, res){
  res.sendFile(__dirname + '/public/room.html');
});

io.on('connection', function(socket){
  users++;
  var id = checkUrl(socket.request.headers.referer);
  if(id in rooms){
    rooms[id] ++;
  } else{
    rooms[id] = 1;
  }

  console.log("room: " + id + ", u: " + rooms[id]);


  socket.join(id);
  io.to(id).emit('soittajia', rooms[id]);
  io.to(id).emit('huone', id);
  console.log('users: ' + users);

  socket.on('painallus', function(key){
    io.to(id).emit('painallus', key);
    //console.log("painettiin: " + key);
  });

  socket.on('disconnect', function(){
    users--;
    rooms[id] --;
    if(rooms[id] == 0 && id != "DEFAULT"){
      delete rooms[id];
      console.log("Poistettiin huone: " + id);
    }
  });
});

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
