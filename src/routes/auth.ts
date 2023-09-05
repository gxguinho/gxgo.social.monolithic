import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

export async function authRoutes(app: FastifyInstance) {
  app.get("/login", (request, reply) => {
    if (request.cookies.token) {
      reply.redirect("/home");
    } else {
      reply.view("src/view/login.ejs");
    }
  });

  app.get("/register", (request, reply) => {
    if (!request.cookies.token) {
      reply.view("src/view/register.ejs");
    } else {
      reply.redirect("/home");
    }
  });

  app.post("/register", async (request, reply) => {
    const bodySchema = z.object({
      username: z.string(),
      email: z.string().email(),
      name: z.string(),
      password: z.string(),
      birthDate: z.string(),
    });

    const { birthDate, email, name, password, username } = bodySchema.parse(
      request.body,
    );

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: `#${username}`,
        email,
        name,
        password: passwordHash,
        birthDate,
      },
    });

    const token = app.jwt.sign(
      {
        name: user.name,
        username: user.username,
      },
      {
        sub: user.id,
        expiresIn: "30 days",
      },
    );

    return reply
      .setCookie("token", token, {
        path: "/",
        secure: false,
        httpOnly: true,
        sameSite: "strict",
      })
      .status(200)
      .send();
  });

  app.post("/login", async (request, reply) => {
    const bodySchema = z.object({
      username: z.string(),
      password: z.string(),
    });

    const { password, username } = bodySchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: {
        username: `#${username}`,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new Error("Invalid password");
    }

    const token = app.jwt.sign(
      {
        name: user.name,
        username: user.username,
      },
      {
        sub: user.id,
        expiresIn: "30 days",
      },
    );

    return reply
      .setCookie("token", token, {
        path: "/",
        secure: false,
        httpOnly: true,
        sameSite: "strict",
      })
      .status(200)
      .send();
  });

  app.get("/logout", async (_, reply) => {
    return reply.clearCookie("token").redirect("/");
  });
}
