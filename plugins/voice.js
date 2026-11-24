export default {
  name: 'voice',
  command: ['voice', 'tts', 'say', 'صوت', 'نطق'],
  tags: ['education', 'audio'],
  help: ['voice <text>'],

  async handler(_m, ctx) {
    const { user, repos, modules, args } = ctx;
    repos.users.setState(user.id, { menu: 'audio', data: {} });
    const input = args ? `نطق ${args}` : '';
    return modules.audio.handleMenuAction({ user, text: input, repos });
  },
};
