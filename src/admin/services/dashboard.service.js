export class DashboardService {
  constructor({ repos, healthService }) {
    this.repos = repos;
    this.healthService = healthService;
  }

  getOverview() {
    const totalUsers = this.repos.users.countUsers();
    const messageStats = this.repos.conversations.getStats();
    const courses = this.repos.curriculum.listCourses({ includeUnpublished: true });
    const lessons = this.repos.curriculum.listAllLessons();
    const resources = this.repos.resources.list({ includeUnpublished: true, limit: 200 });
    const health = this.healthService.getSnapshot();

    return {
      stats: {
        totalUsers,
        totalMessages: messageStats.totalMessages,
        inboundMessages: messageStats.inboundMessages,
        outboundMessages: messageStats.outboundMessages,
        todayMessages: messageStats.todayMessages,
        coursesCount: courses.length,
        lessonsCount: lessons.length,
        resourcesCount: resources.length,
      },
      messagesByModule: messageStats.byModule,
      health,
    };
  }
}
