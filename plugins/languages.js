export default {
  name: 'languages',
  command: ['lang', 'languages', 'japanese', 'english', 'russian', 'chinese', 'لغات'],
  tags: ['education', 'languages'],
  help: ['lang [japanese|english|russian|chinese]'],

  async handler(_m, ctx) {
    const { user, repos, modules, command, args } = ctx;
    const lowerCmd = (command || '').toLowerCase();

    if (['japanese', 'english', 'russian', 'chinese'].includes(lowerCmd)) {
      const opened = modules.languages.openHome(user);
      const state = repos.users.getState(user.id);
      return modules.languages.handleInput({ user, text: lowerCmd, state });
    }

    if (args) {
      modules.languages.openHome(user);
      const state = repos.users.getState(user.id);
      return modules.languages.handleInput({ user, text: args, state });
    }

    return modules.languages.openHome(user);
  },
};
