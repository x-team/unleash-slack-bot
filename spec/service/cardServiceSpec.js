var cardService = require('../../src/service/cardService');
var Card = require('../../src/model/card');

describe('Card Service', function() {
  var card;

  beforeEach(function() {
    card = new Card();
  });

  it('should indicate due date notifications as not to be posted on achieved cards', function() {
    spyOn(card, 'isAchieved').andReturn(true);

    expect(cardService.shouldDueDateNotificationBePosted(card, 0)).toBeFalsy();
  });

  it('should indicate due date notifications as not to be posted on cards without due date', function() {
    spyOn(card, 'hasNoDueDate').andReturn(true);

    expect(cardService.shouldDueDateNotificationBePosted(card, 0)).toBeFalsy();
  });

  it('should indicate due date notifications as not to be posted on cards with notifications already posted', function() {
    spyOn(card, 'hasNoDueDate').andReturn(false);
    spyOn(card, 'isAchieved').andReturn(false);
    spyOn(card, 'hasBeenAlreadyPosted').andReturn(true);

    expect(cardService.shouldDueDateNotificationBePosted(card, 0)).toBeFalsy();
  });

  it('should indicate due date notifications as to be posted on overdue cards', function() {
    spyOn(card, 'hasNoDueDate').andReturn(false);
    spyOn(card, 'hasBeenAlreadyPosted').andReturn(false);
    spyOn(card, 'getDueDate').andReturn(new Date());

    expect(cardService.shouldDueDateNotificationBePosted(card, 0)).toBeTruthy();
  });

  it('should indicate due date notifications as not to be posted on 2 days left cards', function() {
    spyOn(card, 'hasNoDueDate').andReturn(false);
    spyOn(card, 'hasBeenAlreadyPosted').andReturn(false);
    var date = new Date();
    date.setDate(date.getDate() + 1);
    spyOn(card, 'getDueDate').andReturn(date);

    expect(cardService.shouldDueDateNotificationBePosted(card, 0)).toBeFalsy();
  });
});
