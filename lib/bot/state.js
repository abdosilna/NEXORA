export class BotStateManager {
  constructor(usersRepo) {
    this.usersRepo = usersRepo;
  }

  get(userId) {
    return this.usersRepo.getState(userId);
  }

  set(userId, menu, data = {}) {
    this.usersRepo.setState(userId, { menu, data });
    return { menu, data };
  }

  resetHome(userId) {
    return this.set(userId, 'home', {});
  }
}
