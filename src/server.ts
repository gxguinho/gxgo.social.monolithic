import fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import view from "@fastify/view";

const app = fastify();

app.register(cors, {
  origin: true,
});

app.register(jwt, {
  secret: "gxgo.social-monolithic",
});

app.register(view, {
  engine: {
    ejs: require("ejs"),
  },
});

app.get("/home", (request, reply) => {
  reply.view("src/view/home.ejs");
});

app
  .listen({
    port: 3333,
  })
  .then(() => console.log("🚀 HTTP server running on  http://localhost:3333"));
