export default {
  name: 'creative',
  command: ['creative', 'studio', 'image', 'draw', 'تصميم', 'صورة', 'استوديو'],
  tags: ['ai', 'creative'],
  help: ['creative <prompt>', 'image <prompt>'],

  async handler(_m, ctx) {
    const { user, modules, args } = ctx;
    if (!modules.creative) {
      return { text: '⚠️ وحدة الاستوديو الإبداعي غير مهيأة في هذه الجلسة.' };
    }

    if (args) {
      return modules.creative.generateAndFormat({ user, prompt: args });
    }

    return modules.creative.openHome(user);
  },
};
