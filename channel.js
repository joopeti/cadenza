var Queue = require('./queue.js');

function Channel(id, name, socket) {
  this.id = id;
  this.name = name;
  this.admin = socket.id;
  this.nicks = [];
  this.messages = new Queue();
  this.topMessages = [];
  this.secret = "SALAINEN LINKKI";
  this.users = 0;
  this.spamLimit = 10;   //time limit of concurrent posts in seconds
};

Channel.prototype.getId = function(){
  return this.id;
}

Channel.prototype.getNumberOfUsers = function(){
  return this.users;
}

Channel.prototype.addUser = function(nick){
  this.nicks.push(nick);
  this.users++;
}

Channel.prototype.removeUser = function(nick){
  this.nicks.remove(nick);
  this.users++;
}

Channel.prototype.getName = function(){
  return this.name;
}

Channel.prototype.addMessage = function(message) {
  if(this.messages.len >= 50){
    this.messages.pop();
  }
  this.messages.push(message);
};

Channel.prototype.getMessages = function(howMany) {
  return this.messages.asArray();
}

Channel.prototype.getSecretLink = function() {
  return this.secret;
}

module.exports = Channel;
