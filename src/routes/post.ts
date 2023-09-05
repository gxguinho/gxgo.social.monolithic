import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";

export async function postRoutes(app: FastifyInstance) {
  app.get("/:postId", async (request, reply) => {
    const { postId } = request.params as { postId: string };

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        user: true,
      },
    });

    const model = {
      post,
    };

    console.log(model);

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
}
