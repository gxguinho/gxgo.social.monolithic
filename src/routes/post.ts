import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";

export async function postRoutes(app: FastifyInstance) {
  app.get("/:postId", { onRequest: authenticate }, async (request, reply) => {
    const { postId } = request.params as { postId: string };

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        user: true,
        comments: true,
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    const isLiked = await prisma.like.findFirst({
      where: {
        postId: post?.id,
        userId: request.user.sub,
      },
    });

    const model = {
      post,
      username: request.user.username.replace("#", ""),
      isLiked,
    };

    const html = reply.view("src/view/post.ejs", { model });

    return html;
  });

  app.post("/", { onRequest: [authenticate] }, async (request) => {
    const bodySchema = z.object({
      content: z.string().max(280),
      uriMedia: z.string(),
    });

    const { content, uriMedia } = bodySchema.parse(request.body);

    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    const post = await prisma.post.create({
      data: {
        content,
        uriMedia,
        userId: request.user.sub,
      },
    });

    return { post };
  });

  // Like
  app.post("/:postId/like", { onRequest: authenticate }, async (request) => {
    const createLikeParams = z.object({
      postId: z.string().max(280),
    });

    const { postId } = createLikeParams.parse(request.params);
    const userId = request.user.sub;

    const isLikeExisted = await prisma.like.findFirst({
      where: {
        postId,
        userId,
      },
    });

    const userWhoLiked = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!userWhoLiked) {
      return { message: "invalid user" };
    }
    if (isLikeExisted) {
      await prisma.like.delete({
        where: {
          id: isLikeExisted.id,
        },
      });

      return { message: "like delete success" };
    } else {
      const like = await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });

      if (like) {
        await prisma.notification.create({
          data: {
            content: `Sua publicação foi curtida por ${userWhoLiked.name}`,
            userId: like.userId,
          },
        });
      }

      return { like };
    }
  });

  // ADD PAGINAÇÃO
  app.get("/like/:userId", async (request) => {
    const getPostWithUserIdParams = z.object({
      userId: z.string().max(280),
    });

    const { userId } = getPostWithUserIdParams.parse(request.params);

    const postsWithLike = await prisma.like.findMany({
      where: {
        userId,
      },
    });

    return { postsWithLike };
  });

  // Comments
  app.post("/:postId/comment", { onRequest: authenticate }, async (request) => {
    const createCommentSchema = z.object({
      content: z.string().max(280),
      uriMedia: z.string(),
    });

    const createCommentParams = z.object({
      postId: z.string().max(280),
    });

    const { content, uriMedia } = createCommentSchema.parse(request.body);
    const { postId } = createCommentParams.parse(request.params);

    const userId = request.user.sub;

    const userWhoComment = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!userWhoComment) {
      return { message: "invalid user" };
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        uriMedia,
        userId,
        postId,
      },
    });

    if (comment) {
      await prisma.notification.create({
        data: {
          content: `Sua publicação recebeu um comentário por ${userWhoComment.name}`,
          userId: comment.userId,
        },
      });
    }

    return { comment };
  });
}
