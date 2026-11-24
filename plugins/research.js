export default {
  name: 'research',
  command: ['research', 'search', 'بحث'],
  tags: ['education', 'search'],
  help: ['research <query_or_url>'],

  async handler(_m, ctx) {
    const { user, modules, args } = ctx;
    if (args) {
      return modules.research.handleInput({ user, text: args });
    }
    return modules.research.openHome(user);
  },
};
