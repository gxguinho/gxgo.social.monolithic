/* eslint-disable @typescript-eslint/no-var-requires */
import fastify from "fastify";
import cors from "@fastify/cors";
import jwt, { FastifyJWTOptions } from "@fastify/jwt";
import view from "@fastify/view";
import path from "path";
import cookie, { FastifyCookieOptions } from "@fastify/cookie";
import { authRoutes } from "./routes/auth";
import { authenticate } from "./plugins/authenticate";
import { postRoutes } from "./routes/post";
import { userRoutes } from "./routes/user";
import console from "console";

const app = fastify();

app.register(cors, {
  origin: true,
});

app.register(jwt, {
  secret: "gxgo.social-monolithic",
  cookie: {
    cookieName: "token",
  },
} as FastifyJWTOptions);

app.register(cookie, {
  secret: "gxgo.social-monolithic",
  parseOptions: {},
} as FastifyCookieOptions);

app.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/public/",
});

app.register(view, {
  engine: {
    ejs: require("ejs"),
  },
});

app.register(authRoutes, { prefix: "/auth" });
app.register(postRoutes, { prefix: "/post" });
app.register(userRoutes, { prefix: "/user" });

app.get("/", (request, reply) => {
  if (request.cookies.token) {
    console.log(request.cookies.token);
    reply.redirect("/home");
  } else {
    reply.redirect("/auth/login");
  }
});

app.get(
  "/home",
  {
    onRequest: authenticate,
  },
  (request, reply) => {
    const model = {
      username: request.user.username.replace("#", ""),
    };

    reply.view("src/view/home.ejs", { model });
  },
);

app
  .listen({
    port: 3333,
  })
  .then(() => console.log("🚀 HTTP server running on  http://localhost:3333"));
