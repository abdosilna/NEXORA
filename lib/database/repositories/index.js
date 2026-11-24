import { UsersRepository } from './users.repo.js';
import { ProgressRepository } from './progress.repo.js';
import { CurriculumRepository } from './curriculum.repo.js';
import { ConversationsRepository } from './conversations.repo.js';
import { ResourcesRepository } from './resources.repo.js';
import { AdminRepository } from './admin.repo.js';

export function createRepositories(db) {
  return {
    users: new UsersRepository(db),
    progress: new ProgressRepository(db),
    curriculum: new CurriculumRepository(db),
    conversations: new ConversationsRepository(db),
    resources: new ResourcesRepository(db),
    admin: new AdminRepository(db),
  };
}
