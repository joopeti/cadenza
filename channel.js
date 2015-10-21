function Channel(name) {
  this.id = "randomidhere";
  this.name = name;
  this.admin = "Admin";
  this.nicks = [];
  this.messages = [];
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

Channel.prototype.addMessage = function(msg) {
  this.messages.push(msg);
  //remove first if over 100 msg
};

Channel.prototype.getMessages = function(n) {
  return this.messages;
}

Channel.prototype.getSecretLink = function() {
  return this.secret;
}

module.exports = Channel;
