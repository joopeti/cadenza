function Channel(id, name, user) {
  this.id = id;
  this.name = name;
  this.admin = user;
  this.isPrivate = false;
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
  //this.nicks.push(nick);
  this.users++;
}

Channel.prototype.removeUser = function(nick){
  //this.nicks.delete(nick);
  this.users--;
}

Channel.prototype.getName = function(){
  return this.name;
}

Channel.prototype.getSecretLink = function() {
  return this.secret;
}

module.exports = Channel;
