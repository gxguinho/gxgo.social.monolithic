import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";

export async function notificationsRoutes(app: FastifyInstance) {
  // add paginação
  app.get("/", { onRequest: authenticate }, async (request, reply) => {
    const userId = request.user.sub;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    });

    const model = {
      notifications,
      username: request.user.username.replace("#", ""),
    };

    const html = reply.view("src/view/notifications.ejs", { model });

    return html;
  });
}
