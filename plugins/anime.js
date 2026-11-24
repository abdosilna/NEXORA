export default {
  name: 'anime',
  command: ['anime', 'library', 'انمي', 'أنمي', 'مكتبة', 'مكتبه'],
  tags: ['resources', 'directory'],
  help: ['anime [query]', 'library [query]'],

  async handler(_m, ctx) {
    const { user, modules, command, args } = ctx;
    const lowerCmd = (command || '').toLowerCase();
    const isLibrary = lowerCmd === 'library' || lowerCmd === 'مكتبة' || lowerCmd === 'مكتبه';
    const kind = isLibrary ? 'knowledge' : 'anime';

    if (args) {
      return modules.library.handleInput({
        user,
        text: args,
        state: { menu: 'library', data: { kind } },
      });
    }

    return isLibrary ? modules.library.openKnowledge(user) : modules.library.openAnime(user);
  },
};
