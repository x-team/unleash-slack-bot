var Card = function() {
}

Card.prototype.fromJson = function(jsonCard) {
  this.id = jsonCard.id;
  this.name = jsonCard.name;
  this.description = jsonCard.description;
  this.level = jsonCard.level;
  this.achieved = jsonCard.achieved;
  this.dueDate = jsonCard.dueDate;
  this.lastNotificationSent = jsonCard.lastNotificationSent;
}

Card.prototype.getId = function() {
  return this.id;
}

Card.prototype.isAchieved = function() {
  return this.achieved;
}

Card.prototype.hasNoDueDate = function() {
  return !this.dueDate;
}

Card.prototype.getDueDate = function () {
  return this.dueDate;
}

Card.prototype.getGoalName = function() {
  var goalName = this.name;
  if (this.level) {
    goalName += ' - Level ' + this.level;
  }

  return goalName;
}

Card.prototype.hasBeenAlreadyPostedToday = function(daysToDueDate) {
  return this.lastNotificationSent === daysToDueDate;
}

module.exports = Card;
