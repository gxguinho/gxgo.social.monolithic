import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";
import console from "console";

interface Timeline {
  content: string;
  id: string;
  createdAt: Date;
}

function compareDate(a: Timeline, b: Timeline) {
  const dataA = new Date(a.createdAt);
  const dataB = new Date(b.createdAt);

  if (dataA > dataB) return -1;
  if (dataA < dataB) return 1;
  return 0;
}

export async function homeRoutes(app: FastifyInstance) {
  app.get("/", { onRequest: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: {
        id: request.user.sub,
      },
      select: {
        following: {
          select: {
            followerId: true,
            followingId: true,
          },
        },
      },
    });

    if (!user) {
      return { message: "User not found" };
    }

    console.log(user.following);

    let postsFollow: any = [];

    for (const follow of user.following) {
      const posts = await prisma.post.findMany({
        where: {
          userId: follow.followerId,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: true,
        },
      });

      postsFollow = [...postsFollow, ...posts];
    }

    const timeline = postsFollow.sort(compareDate);

    const model = {
      username: request.user.username.replace("#", ""),
      timeline,
    };

    console.log(model);

    const html = reply.view("src/view/home.ejs", { model });

    return html;
  });
}
