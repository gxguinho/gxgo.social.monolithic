import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      name: string;
      username: string;
      sub: string;
    };
  }
}
