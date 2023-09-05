import { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/authenticate";
import { prisma } from "../lib/prisma";
import { z } from "zod";

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/profile/:username",
    { onRequest: authenticate },
    async (request, reply) => {
      const { username } = request.params as { username: string };

      const user = await prisma.user.findUnique({
        where: {
          username: `#${username}`,
        },
        include: {
          following: true,
          followers: true,
        },
      });

      if (!user) {
        return reply.status(404).send();
      }

      const posts = await prisma.post.findMany({
        orderBy: {
          createdAt: "desc",
        },
        where: {
          userId: user.id,
        },
      });

      const isFollower = user.followers.find(
        (followers) => followers.followingId === request.user.sub,
      );

      const model = {
        user,
        posts,
        followingCount: user.following.length,
        followersCount: user.followers.length,
        username,
        isYourProfile: user.id === request.user.sub,
        isFollower,
        profileUsername: request.user.username.replace("#", ""),
        qtdPosts: `${posts.length}  ${posts.length > 1 ? "posts" : "post"}`,
      };

      const html = reply.view("src/view/profile.ejs", { model });

      return html;
    },
  );

  app.get("/", async (request) => {
    const getUsersParams = z.object({
      search: z.string(),
    });

    const { search } = getUsersParams.parse(request.query);

    if (!search) {
      return { users: [] };
    }

    const users = await prisma.$queryRaw`
      SELECT username, name FROM "User" 
      WHERE username LIKE '%' || ${search} || '%'
      LIMIT 15;
    `;

    return { users };
  });

  app.post(
    "/follow/:followerId",
    { onRequest: authenticate },
    async (request) => {
      const createFollowParams = z.object({
        followerId: z.string(),
      });

      const { followerId } = createFollowParams.parse(request.params);

      const userId = request.user.sub;

      const isUserExisted = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!isUserExisted) {
        return { message: "user not found" };
      }

      const isFollowExisted = await prisma.follower.findFirst({
        where: {
          followerId,
          followingId: userId,
        },
      });

      if (!isFollowExisted) {
        const follower = await prisma.follower.create({
          data: {
            followerId,
            followingId: userId,
          },
        });

        if (follower) {
          await prisma.notification.create({
            data: {
              content: `${isUserExisted.name} começou a seguir você`,
              userId: followerId,
            },
          });
        }

        return { follower };
      } else {
        await prisma.follower.delete({
          where: {
            id: isFollowExisted.id,
          },
        });

        return { message: "successfully unfollow" };
      }
    },
  );

  app.get(
    "/profile/:username/following",
    { onRequest: authenticate },
    async (request, reply) => {
      const { username } = request.params as { username: string };

      const followers = await prisma.follower.findMany({
        where: {
          following: {
            username: `#${username}`,
          },
        },
        include: {
          follower: true,
        },
      });

      const users: any = [];

      for (const follower of followers) {
        const usernameNoHashtag = follower.follower.username.replace("#", "");

        const isFollowed = await prisma.follower.findFirst({
          where: {
            followingId: follower.followerId,
            followerId: request.user.sub,
          },
        });

        users.push({
          ...follower.follower,
          usernameNoHashtag,
          isFollowed,
          isFollower: true,
        });
      }

      const model = {
        username: username.replace("#", ""),
        users,
        name: request.user.name,
      };

      const html = reply.view("src/view/follower.ejs", { model });

      return html;
    },
  );

  app.get(
    "/profile/:username/followers",
    { onRequest: authenticate },
    async (request, reply) => {
      const { username } = request.params as { username: string };

      const followers = await prisma.follower.findMany({
        where: {
          follower: {
            username: `#${username}`,
          },
        },
        include: {
          following: true,
        },
      });

      const users: any = [];

      for (const follower of followers) {
        const usernameNoHashtag = follower.following.username.replace("#", "");

        const isFollower = await prisma.follower.findFirst({
          where: {
            followingId: request.user.sub,
            followerId: follower.followingId,
          },
        });

        users.push({
          ...follower.following,
          usernameNoHashtag,
          isFollowed: true,
          isFollower,
        });
      }

      const model = {
        username: username.replace("#", ""),
        name: request.user.name,
        users,
        profileUsername: request.user.username.replace("#", ""),
      };

      const html = reply.view("src/view/follower.ejs", { model });

      return html;
    },
  );
}
