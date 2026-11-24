export default {
  name: 'ai-tutor',
  command: ['tutor', 'ai', 'quiz', 'lesson', 'معلم'],
  tags: ['education', 'ai'],
  help: ['tutor <question>', 'quiz [topic]', 'lesson <topic>'],

  async handler(_m, ctx) {
    const { user, repos, modules, command, args } = ctx;
    const lowerCmd = (command || '').toLowerCase();

    if (lowerCmd === 'quiz') {
      repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });
      return modules.tutor.handleInput({
        user,
        text: args ? `اختبار ${args}` : '2',
        state: { menu: 'tutor', data: { mode: 'chat' } },
      });
    }

    if (lowerCmd === 'lesson') {
      repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });
      return modules.tutor.handleInput({
        user,
        text: args ? `درس ${args}` : '1',
        state: { menu: 'tutor', data: { mode: 'chat' } },
      });
    }

    if (args) {
      repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });
      return modules.tutor.handleInput({
        user,
        text: args,
        state: { menu: 'tutor', data: { mode: 'chat' } },
      });
    }

    return modules.tutor.openHome(user);
  },
};
