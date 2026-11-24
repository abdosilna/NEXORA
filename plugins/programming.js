export default {
  name: 'programming',
  command: ['code', 'programming', 'python', 'javascript', 'nodejs', 'html', 'css', 'debug', 'برمجة', 'برمجه'],
  tags: ['education', 'programming'],
  help: ['code [python|html|css|javascript|nodejs]', 'debug <code>'],

  async handler(_m, ctx) {
    const { user, repos, modules, command, args } = ctx;
    const lowerCmd = (command || '').toLowerCase();

    if (lowerCmd === 'debug') {
      if (args) {
        repos.users.setState(user.id, { menu: 'programming', data: { step: 'debug_mode' } });
        return modules.programming.handleInput({
          user,
          text: args,
          state: { menu: 'programming', data: { step: 'debug_mode' } },
        });
      }
      modules.programming.openHome(user);
      const state = repos.users.getState(user.id);
      return modules.programming.handleInput({ user, text: '6', state });
    }

    if (['python', 'javascript', 'nodejs', 'html', 'css'].includes(lowerCmd)) {
      modules.programming.openHome(user);
      const state = repos.users.getState(user.id);
      return modules.programming.handleInput({ user, text: lowerCmd, state });
    }

    if (args) {
      modules.programming.openHome(user);
      const state = repos.users.getState(user.id);
      return modules.programming.handleInput({ user, text: args, state });
    }

    return modules.programming.openHome(user);
  },
};
